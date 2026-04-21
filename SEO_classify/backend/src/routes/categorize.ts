import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { generateCategories, categorizeQueries, mergeCategories, refineCategory } from '../services/openrouter.js';
import { generateCsv } from '../services/csvExporter.js';
import { spendTokens } from '../lib/middleware.js';

const router = Router();

/**
 * Match a query to the most relevant sitemap page by word overlap.
 */
function findBestPage(
  queryText: string,
  pages: { url: string; title: string | null }[]
): string | null {
  if (pages.length === 0) return null;

  const qWords = new Set(
    queryText
      .toLowerCase()
      .replace(/[^a-zа-яёА-ЯЁáéíóúñü0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  if (qWords.size === 0) return null;

  let bestScore = 0;
  let bestUrl: string | null = null;

  for (const page of pages) {
    // Build word set from URL path + title
    const pageText = [
      decodeURIComponent(page.url).replace(/[\-_/\.]+/g, ' '),
      page.title || '',
    ]
      .join(' ')
      .toLowerCase()
      .replace(/[^a-zа-яёА-ЯЁáéíóúñü0-9\s]/gi, ' ');
    const pWords = new Set(pageText.split(/\s+/).filter((w) => w.length > 2));

    let score = 0;
    for (const w of qWords) {
      if (pWords.has(w)) score++;
    }
    // Normalize by query length for fair comparison
    const normalized = score / qWords.size;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestUrl = page.url;
    }
  }

  return bestScore >= 0.3 ? bestUrl : null;
}

// In-memory progress tracking
const progressStore = new Map<string, { current: number; total: number; status: string }>();

// Step 1: Generate categories using AI
router.post('/generate', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });

    const session = await prisma.appSession.findUnique({
      where: { id: sessionId },
      include: { sitemapPages: true },
    });
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

    const groups = await prisma.lexicalGroup.findMany({ where: { appSessionId: sessionId } });
    if (groups.length === 0) return res.status(400).json({ error: 'Сначала загрузите запросы' });

    const representatives = groups.map((g: any) => g.representativeQuery);

    const result = await generateCategories(representatives, {
      url: session.url,
      pages: session.sitemapPages.map((p: any) => ({ url: p.url, title: p.title })),
    });

    // Spend tokens if user is logged in (1 token per AI call for category generation)
    if (req.user) {
      await spendTokens(req.user.id, 1, 'AI_CATEGORIES').catch(() => {});
    }

    await prisma.category.deleteMany({ where: { appSessionId: sessionId } });

    const savedCategories = await Promise.all(
      result.categories.map((name) =>
        prisma.category.create({
          data: { name, approved: false, appSessionId: sessionId },
        })
      )
    );

    res.json({
      categories: savedCategories.map((c: any) => ({
        id: c.id, name: c.name, approved: c.approved,
      })),
    });
  } catch (error: any) {
    console.error('Generate categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Step 1b: Merge similar categories using AI
router.post('/merge', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories[] обязательны' });
    }

    const result = await mergeCategories(categories);
    res.json({ categories: result.categories });
  } catch (error: any) {
    console.error('Merge categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Approve categories
router.post('/approve', async (req, res) => {
  try {
    const { sessionId, categories } = req.body;
    if (!sessionId || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'sessionId и categories[] обязательны' });
    }

    await prisma.category.deleteMany({ where: { appSessionId: sessionId } });

    const saved = await Promise.all(
      categories.map((name: string) =>
        prisma.category.create({
          data: { name, approved: true, appSessionId: sessionId },
        })
      )
    );

    res.json({
      categories: saved.map((c: any) => ({ id: c.id, name: c.name, approved: c.approved })),
    });
  } catch (error: any) {
    console.error('Approve categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Step 3: Run batch categorization (Asynchronous)
router.post('/run', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });

    const categories = await prisma.category.findMany({
      where: { appSessionId: sessionId, approved: true },
    });
    if (categories.length === 0) return res.status(400).json({ error: 'Сначала утвердите категории' });

    const groups = await prisma.lexicalGroup.findMany({
      where: { appSessionId: sessionId },
      include: { queries: true },
    });

    const user = req.user; // Capture user for background task

    // Run in background
    (async () => {
      try {
        const representatives = groups.map((g: any) => g.representativeQuery);
        const categoryNames = categories.map((c: any) => c.name);

        progressStore.set(sessionId, { current: 0, total: representatives.length, status: 'processing' });

        const aiResults = await categorizeQueries(
          representatives,
          categoryNames,
          (processed, total) => {
            progressStore.set(sessionId, { current: processed, total, status: 'processing' });
          }
        );

        // Spend tokens (1 token per representative query)
        if (user) {
          await spendTokens(user.id, representatives.length, 'AI_CLASSIFY').catch(err => {
            console.error('Token deduction error:', err);
          });
        }

        progressStore.set(sessionId, {
          current: representatives.length,
          total: representatives.length,
          status: 'applying',
        });

        const categoryMap = new Map<string, string>();
        for (const cat of categories) {
          categoryMap.set((cat as any).name, (cat as any).id);
        }

        for (const group of groups) {
          const repCategory = aiResults[(group as any).representativeQuery];
          if (!repCategory) continue;

          let categoryId: string | null = null;
          if (categoryMap.has(repCategory)) {
            categoryId = categoryMap.get(repCategory)!;
          } else {
            // fuzzy match
            for (const [catName, catId] of categoryMap) {
              if (
                catName.toLowerCase() === repCategory.toLowerCase() ||
                catName.toLowerCase().includes(repCategory.toLowerCase()) ||
                repCategory.toLowerCase().includes(catName.toLowerCase())
              ) {
                categoryId = catId;
                break;
              }
            }
          }

          if (categoryId) {
            await prisma.query.updateMany({
              where: { groupId: (group as any).id },
              data: { categoryId },
            });
          }
        }

        progressStore.set(sessionId, {
          current: representatives.length,
          total: representatives.length,
          status: 'done',
        });
      } catch (err: any) {
        console.error('Background categorization error:', err);
        progressStore.set(sessionId, { current: 0, total: 0, status: 'error' });
      }
    })();

    // Return immediately
    res.json({ success: true, message: 'Categorization started' });
  } catch (error: any) {
    console.error('Run categorization setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// SSE progress
router.get('/progress/:sessionId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const progress = progressStore.get(req.params.sessionId) || {
      current: 0, total: 0, status: 'waiting',
    };
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
    if (progress.status === 'done' || progress.status === 'error') {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
});

// Refine a specific category: AI re-evaluates all its queries
router.post('/refine', async (req, res) => {
  try {
    const { sessionId, categoryName } = req.body;
    if (!sessionId || !categoryName) {
      return res.status(400).json({ error: 'sessionId и categoryName обязательны' });
    }

    // Get all categories for this session
    const categories = await prisma.category.findMany({
      where: { appSessionId: sessionId, approved: true },
    });
    if (categories.length < 2) {
      return res.status(400).json({ error: 'Нужно минимум 2 категории для уточнения' });
    }

    // Find the target category
    const targetCat = categories.find((c: any) => c.name === categoryName);
    if (!targetCat) {
      return res.status(404).json({ error: `Категория "${categoryName}" не найдена` });
    }

    // Get all queries in this category
    const queries = await prisma.query.findMany({
      where: { appSessionId: sessionId, categoryId: (targetCat as any).id },
    });

    if (queries.length === 0) {
      return res.json({ moved: 0, moves: [] });
    }

    const queryTexts = queries.map((q: any) => q.text);
    const allCategoryNames = categories.map((c: any) => c.name);

    // AI refine
    const result = await refineCategory(categoryName, queryTexts, allCategoryNames);

    // Build category name -> id map
    const catMap = new Map<string, string>();
    for (const cat of categories) {
      catMap.set((cat as any).name, (cat as any).id);
    }

    // Apply moves
    let movedCount = 0;
    const appliedMoves: { query: string; from: string; to: string }[] = [];

    for (const move of result.moves) {
      const newCatId = catMap.get(move.to);
      if (!newCatId) continue;

      // Find the query in DB (fuzzy match on text)
      const dbQuery = queries.find((q: any) =>
        q.text === move.query || q.text.toLowerCase() === move.query.toLowerCase()
      );
      if (!dbQuery) continue;

      await prisma.query.update({
        where: { id: (dbQuery as any).id },
        data: { categoryId: newCatId },
      });

      movedCount++;
      appliedMoves.push({ query: move.query, from: categoryName, to: move.to });
    }

    res.json({ moved: movedCount, total: queries.length, moves: appliedMoves });
  } catch (error: any) {
    console.error('Refine category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename a category
router.patch('/rename-category', async (req, res) => {
  try {
    const { sessionId, oldName, newName } = req.body;
    if (!sessionId || !oldName || !newName) {
      return res.status(400).json({ error: 'sessionId, oldName, newName обязательны' });
    }

    // Find the category by name within the session
    const category = await prisma.category.findFirst({
      where: { appSessionId: sessionId, name: oldName },
    });
    if (!category) {
      return res.status(404).json({ error: `Категория "${oldName}" не найдена` });
    }

    await prisma.category.update({
      where: { id: category.id },
      data: { name: newName.trim() },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Rename category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a query's page URL
router.patch('/update-page', async (req, res) => {
  try {
    const { queryId, pageUrl } = req.body;
    if (!queryId) {
      return res.status(400).json({ error: 'queryId обязателен' });
    }

    await prisma.query.update({
      where: { id: queryId },
      data: { pageUrl: pageUrl || null },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update page error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a query's category
router.patch('/update-query-category', async (req, res) => {
  try {
    const { queryId, sessionId, categoryName } = req.body;
    if (!queryId || !sessionId || !categoryName) {
      return res.status(400).json({ error: 'queryId, sessionId, categoryName обязательны' });
    }

    // Find the category by name
    const category = await prisma.category.findFirst({
      where: { appSessionId: sessionId, name: categoryName },
    });
    if (!category) {
      return res.status(404).json({ error: `Категория "${categoryName}" не найдена` });
    }

    await prisma.query.update({
      where: { id: queryId },
      data: { categoryId: (category as any).id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update query category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new category and optionally redistribute queries into it via AI
router.post('/add-category', async (req, res) => {
  try {
    const { sessionId, categoryName, scanExisting } = req.body;
    if (!sessionId || !categoryName) {
      return res.status(400).json({ error: 'sessionId и categoryName обязательны' });
    }

    // Check if category already exists
    const existing = await prisma.category.findFirst({
      where: { appSessionId: sessionId, name: categoryName.trim() },
    });
    if (existing) {
      return res.status(400).json({ error: `Категория "${categoryName}" уже существует` });
    }

    // Create the new category
    const newCat = await prisma.category.create({
      data: { name: categoryName.trim(), appSessionId: sessionId, approved: true },
    });

    let movedCount = 0;
    const moves: { query: string; from: string; to: string }[] = [];

    // If scanExisting, use AI to find queries that belong to this new category
    if (scanExisting) {
      const categories = await prisma.category.findMany({
        where: { appSessionId: sessionId, approved: true },
      });
      const allCatNames = categories.map((c: any) => c.name);

      // Get all queries NOT in the new category
      const queries = await prisma.query.findMany({
        where: { appSessionId: sessionId },
        include: { category: true },
      });

      const otherQueries = queries.filter(
        (q: any) => q.category?.name !== categoryName.trim()
      );

      if (otherQueries.length > 0) {
        // Use AI to check which queries fit better in the new category
        const { refineCategory } = await import('../services/openrouter.js');

        // We need a targeted approach: ask AI which of these queries belong to the new category
        const model = process.env.OPENROUTER_MODEL_CLASSIFY || 'google/gemini-2.0-flash-001';
        const batchSize = 50;

        const catList = allCatNames.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n');
        const newCatIdx = allCatNames.indexOf(categoryName.trim()) + 1;

        for (let i = 0; i < otherQueries.length; i += batchSize) {
          const batch = otherQueries.slice(i, i + batchSize);
          const batchTexts = batch.map((q: any) => q.text);

          const messages = [
            {
              role: 'system' as const,
              content: `Ты — SEO-специалист. Была создана НОВАЯ категория "${categoryName.trim()}" (номер ${newCatIdx}).

Доступные категории:
${catList}

Ниже — запросы из ДРУГИХ категорий. Проверь каждый запрос: если он ЛУЧШЕ подходит к новой категории "${categoryName.trim()}", укажи его.

Правила:
1. Перемещай только те запросы, которые ЯВНО лучше подходят к новой категории.
2. Если запрос хорошо сидит в текущей категории — НЕ трогай.

Верни JSON:
{
  "moves": ["запрос 1", "запрос 2", ...]
}

Если ни один запрос не подходит: { "moves": [] }`,
            },
            {
              role: 'user' as const,
              content: `Запросы для проверки:\n${batchTexts.join('\n')}`,
            },
          ];

          try {
            const axios = (await import('axios')).default;
            const apiKey = process.env.OPENROUTER_API_KEY;
            const response = await axios.post(
              'https://openrouter.ai/api/v1/chat/completions',
              {
                model,
                messages,
                temperature: 0.3,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
              },
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: 120000,
              }
            );

            const raw = response.data.choices?.[0]?.message?.content || '{}';
            const parsed = JSON.parse(raw);
            const toMove = parsed.moves || [];

            for (const queryText of toMove) {
              const dbQuery = batch.find(
                (q: any) => q.text === queryText || q.text.toLowerCase() === queryText.toLowerCase()
              );
              if (dbQuery) {
                await prisma.query.update({
                  where: { id: (dbQuery as any).id },
                  data: { categoryId: (newCat as any).id },
                });
                movedCount++;
                moves.push({
                  query: queryText,
                  from: (dbQuery as any).category?.name || 'Без категории',
                  to: categoryName.trim(),
                });
              }
            }
          } catch (e) {
            console.warn('Add-category AI scan batch failed:', e);
          }
        }
      }
    }

    res.json({ success: true, categoryId: (newCat as any).id, moved: movedCount, moves });
  } catch (error: any) {
    console.error('Add category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get results
router.get('/results/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Fetch queries and sitemap pages in parallel
    const [queries, sitemapPages] = await Promise.all([
      prisma.query.findMany({
        where: { appSessionId: sessionId },
        include: { category: true, group: true },
        orderBy: [{ category: { name: 'asc' } }, { text: 'asc' }],
      }),
      prisma.sitemapPage.findMany({
        where: { appSessionId: sessionId },
        select: { url: true, title: true },
      }),
    ]);

    const results = queries.map((q: any) => {
      // Prefer stored pageUrl, fall back to auto-match
      const page = q.pageUrl || findBestPage(q.text, sitemapPages as any[]) || '';
      return {
        id: q.id,
        query: q.text,
        category: q.category?.name || 'Без категории',
        group: q.group?.representativeQuery || '',
        isRepresentative: q.group?.representativeQuery === q.text,
        page,
        pageManual: !!q.pageUrl,
      };
    });

    const summary: Record<string, number> = {};
    for (const r of results) {
      summary[r.category] = (summary[r.category] || 0) + 1;
    }

    res.json({ results, summary });
  } catch (error: any) {
    console.error('Results error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export CSV
router.get('/export/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    const [queries, sitemapPages] = await Promise.all([
      prisma.query.findMany({
        where: { appSessionId: sessionId },
        include: { category: true, group: true },
        orderBy: [{ category: { name: 'asc' } }, { text: 'asc' }],
      }),
      prisma.sitemapPage.findMany({
        where: { appSessionId: sessionId },
        select: { url: true, title: true },
      }),
    ]);

    const rows = queries.map((q: any) => ({
      query: q.text,
      category: q.category?.name || 'Без категории',
      group: q.group?.representativeQuery || '',
      isRepresentative: q.group?.representativeQuery === q.text,
      page: q.pageUrl || findBestPage(q.text, sitemapPages as any[]) || '',
    }));

    const csv = generateCsv(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=seo_categories.csv');
    res.send(csv);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Generate llms.txt ────────────────────────────────────────────────────────

router.post('/generate-llms', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });

    // Gather all session data
    const [session, sitemapPages, categories, queries] = await Promise.all([
      prisma.appSession.findUnique({ where: { id: sessionId } }),
      prisma.sitemapPage.findMany({ where: { appSessionId: sessionId } }),
      prisma.category.findMany({ where: { appSessionId: sessionId, approved: true } }),
      prisma.query.findMany({
        where: { appSessionId: sessionId },
        include: { category: true },
      }),
    ]);

    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

    const siteUrl = (session as any).url;
    let siteDomain = siteUrl;
    try { siteDomain = new URL(siteUrl).hostname; } catch {}

    // Map sitemap pages to categories by finding overlap with queries
    const pagesList = sitemapPages.map((p: any) => ({
      url: p.url,
      title: p.title || '',
      h1: p.h1 || '',
    }));

    // Build category → queries + pages mapping
    const catData: Record<string, { queries: string[]; pages: string[] }> = {};
    for (const cat of categories) {
      catData[(cat as any).name] = { queries: [], pages: [] };
    }
    for (const q of queries) {
      const catName = (q as any).category?.name || 'Без категории';
      if (!catData[catName]) catData[catName] = { queries: [], pages: [] };
      catData[catName].queries.push((q as any).text);

      const pageUrl = (q as any).pageUrl || findBestPage((q as any).text, pagesList as any[]) || null;
      if (pageUrl) {
        catData[catName].pages.push(pageUrl);
      }
    }

    // Build prompt for AI
    const categorySection = Object.entries(catData)
      .map(([name, data]) => {
        const uniquePages = [...new Set(data.pages)];
        return `- ${name}: ${data.queries.length} запросов. Привязанные страницы: ${uniquePages.length > 0 ? uniquePages.join(', ') : 'НЕТ'}`;
      })
      .join('\n');

    const pagesSection = pagesList
      .map((p: any) => `- ${p.url} (${p.title || p.h1 || 'без заголовка'})`)
      .join('\n');

    const axios = (await import('axios')).default;
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_CLASSIFY || 'google/gemini-2.0-flash-001';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: `Ты — SEO-эксперт. Создай файл llms.txt для сайта ${siteDomain} (${siteUrl}).

llms.txt — это Markdown-файл в корне сайта, который помогает LLM-моделям понять структуру и содержание сайта.

ФОРМАТ llms.txt:
\`\`\`
# Название сайта

> Краткое описание сайта (1-2 предложения)

Дополнительная информация о сайте, его услугах/продуктах

## Основные страницы
- [Название страницы](URL): Краткое описание содержимого

## Категории контента
- [Название категории](URL связанной страницы): Описание + ключевые темы

## Optional
- [Дополнительные страницы](URL): Описание
\`\`\`

ДАННЫЕ ДЛЯ АНАЛИЗА:

Категории запросов:
${categorySection}

Страницы сайта:
${pagesSection}

ПРАВИЛА:
1. H1 — название сайта/бренда (определи из URL и страниц)
2. Blockquote — краткое описание бизнеса на основе категорий и страниц
3. Основные страницы — ключевые страницы с сайтмапа с описаниями
4. Категории контента — каждая категория запросов привязана к наиболее подходящей странице
5. Optional — второстепенные страницы
6. Всё на языке сайта (определи по URL и содержимому)
7. Выводи ТОЛЬКО содержимое файла llms.txt, без обёртки в блок кода`,
          },
          {
            role: 'user',
            content: 'Сгенерируй файл llms.txt',
          },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '';
    res.json({ content });
  } catch (error: any) {
    console.error('Generate llms.txt error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Generate SEO Recommendations ─────────────────────────────────────────────

router.post('/generate-recommendations', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId обязателен' });

    // Gather all session data
    const [session, sitemapPages, categories, queries] = await Promise.all([
      prisma.appSession.findUnique({ where: { id: sessionId } }),
      prisma.sitemapPage.findMany({ where: { appSessionId: sessionId } }),
      prisma.category.findMany({ where: { appSessionId: sessionId, approved: true } }),
      prisma.query.findMany({
        where: { appSessionId: sessionId },
        include: { category: true },
      }),
    ]);

    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

    const siteUrl = (session as any).url;

    const pagesList = sitemapPages.map((p: any) => ({
      url: p.url,
      title: p.title || '',
      h1: p.h1 || '',
    }));

    // Build detailed analysis data
    const catMap: Record<string, { queries: string[]; matchedPages: string[] }> = {};
    for (const cat of categories) {
      catMap[(cat as any).name] = { queries: [], matchedPages: [] };
    }
    for (const q of queries) {
      const catName = (q as any).category?.name || 'Без категории';
      if (!catMap[catName]) catMap[catName] = { queries: [], matchedPages: [] };
      catMap[catName].queries.push((q as any).text);

      const pageUrl = (q as any).pageUrl || findBestPage((q as any).text, pagesList as any[]) || null;
      if (pageUrl) {
        catMap[catName].matchedPages.push(pageUrl);
      }
    }

    // Find pages not matched to any query
    const allMatchedPages = new Set<string>();
    for (const q of queries) {
      const pageUrl = (q as any).pageUrl || findBestPage((q as any).text, pagesList as any[]) || null;
      if (pageUrl) allMatchedPages.add(pageUrl);
    }
    const unmatchedPages = pagesList.filter((p: any) => !allMatchedPages.has(p.url));

    // Categories data for prompt
    const catAnalysis = Object.entries(catMap)
      .map(([name, data]) => {
        const uniquePages = [...new Set(data.matchedPages)];
        return `### ${name}\n- Запросов: ${data.queries.length}\n- Привязанных страниц: ${uniquePages.length}\n- Пример запросов: ${data.queries.slice(0, 5).join(', ')}`;
      })
      .join('\n\n');

    const unmatchedSection = unmatchedPages.length > 0
      ? `Страницы без запросов (${unmatchedPages.length}):\n${unmatchedPages.map((p: any) => `- ${p.url} (${p.title || 'без заголовка'})`).join('\n')}`
      : 'Все страницы имеют привязанные запросы.';

    const axios = (await import('axios')).default;
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_CLASSIFY || 'google/gemini-2.0-flash-001';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: `Ты — SEO-аналитик. Проведи анализ сайта ${siteUrl} и дай рекомендации.

ДАННЫЕ:

Всего страниц в sitemap: ${pagesList.length}
Всего запросов: ${queries.length}
Всего категорий: ${categories.length}

${catAnalysis}

${unmatchedSection}

ЗАДАЧА:
Создай подробный отчёт с рекомендациями в формате Markdown:

1. **Общий анализ** — краткая оценка текущего состояния сайта
2. **Несоответствия структуры** — категории запросов, для которых недостаточно страниц на сайте
3. **Недоиспользованные страницы** — страницы из sitemap, которые не привязаны к запросам
4. **Рекомендации по созданию контента** — какие новые страницы или разделы стоит создать
5. **Рекомендации по оптимизации** — как улучшить существующие страницы для лучшего покрытия
6. **Приоритеты** — ранжируй рекомендации по важности (высокий/средний/низкий)

Пиши на языке сайта (определи по URL). Будь конкретным, указывай URL страниц и запросы.`,
          },
          {
            role: 'user',
            content: 'Проведи анализ и дай рекомендации',
          },
        ],
        temperature: 0.5,
        max_tokens: 6000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '';
    res.json({ content });
  } catch (error: any) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
