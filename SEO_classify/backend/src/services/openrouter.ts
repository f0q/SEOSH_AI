import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

async function callOpenRouter(
  messages: ChatMessage[],
  model: string,
  jsonMode: boolean = true
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new Error('OPENROUTER_API_KEY не задан. Укажите валидный ключ в .env файле.');
  }

  const body: any = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await axios.post<OpenRouterResponse>(
    `${OPENROUTER_BASE}/chat/completions`,
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'SEO Classify',
      },
      timeout: 120000,
    }
  );

  const content = response.data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Пустой ответ от OpenRouter');
  }
  return content;
}

/**
 * Generate category suggestions from representative queries + site context.
 */
export async function generateCategories(
  representatives: string[],
  siteContext: { url: string; pages: { url: string; title: string | null }[] }
): Promise<{ categories: string[] }> {
  const model = process.env.OPENROUTER_MODEL_CATEGORIES || 'google/gemini-2.0-flash-001';

  const pagesContext = siteContext.pages
    .slice(0, 20)
    .map((p) => `- ${p.title || p.url}`)
    .join('\n');

  const queriesList = representatives.join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты — SEO-эксперт. Твоя задача — проанализировать список ключевых запросов и предложить структуру категорий для их группировки.

Правила:
1. Категории должны быть логичными и отражать пользовательские намерения (intent)
2. Количество категорий: от 5 до 25 (зависит от разнообразия запросов)
3. Каждая категория должна иметь краткое, но ёмкое название (2-5 слов)
4. КРИТИЧЕСКИ ВАЖНО: Категории не должны пересекаться по смыслу. Не создавай близкие по значению категории (например, "Купить кроссовки" и "Покупка обуви" должны быть одной категорией).
5. Группируй похожие сущности в одну широкую категорию, если они не требуют раздельного SEO-подхода.
6. Учитывай тематику сайта при создании категорий

Верни JSON в формате:
{
  "categories": ["Категория 1", "Категория 2", ...]
}`,
    },
    {
      role: 'user',
      content: `Сайт: ${siteContext.url}

Структура сайта:
${pagesContext}

Репрезентативные запросы для категоризации:
${queriesList}

Предложи структуру категорий для этих запросов в формате JSON.`,
    },
  ];

  const raw = await callOpenRouter(messages, model, true);

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error('Неверный формат ответа от ИИ');
    }
    return { categories: parsed.categories };
  } catch (e) {
    // Try to extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { categories: parsed.categories || [] };
    }
    throw new Error(`Не удалось распарсить ответ ИИ: ${raw.substring(0, 200)}`);
  }
}

/**
 * Merge similar categories using AI.
 */
export async function mergeCategories(
  categories: string[]
): Promise<{ categories: string[] }> {
  const model = process.env.OPENROUTER_MODEL_CATEGORIES || 'google/gemini-2.0-flash-001';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты — SEO-эксперт. Твоя задача — проанализировать список категорий ключевых слов и максимально сократить его, объединяя похожие по смыслу пункты.
      
Правила:
1. Будь агрессивен в объединении. Если два пункта можно логику объединить в один общий — сделай это.
2. Пример: "Доставка цветов", "Заказ цветов", "Купить цветы онлайн" -> "Доставка и заказ цветов".
3. Оставляй только финальный список уникальных названий.
4. Категорий должно стать значительно меньше.

Верни JSON: { "categories": ["Название 1", "Название 2", ...] }`,
    },
    {
      role: 'user',
      content: `Список для сжатия:\n${categories.join('\n')}`,
    },
  ];

  const raw = await callOpenRouter(messages, model, true);
  try {
    const parsed = JSON.parse(raw);
    return { categories: (parsed.categories || []).filter(Boolean) };
  } catch {
    return { categories };
  }
}

/**
 * Categorize a batch of representative queries into given categories.
 * onProgress(processed, total) is called after each AI batch completes.
 */
/**
 * Categorize high-accuracy mode: Uses IDs/indices to avoid naming collisions.
 */
export async function categorizeQueries(
  queries: string[],
  categories: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<Record<string, string>> {
  const model = process.env.OPENROUTER_MODEL_CLASSIFY || 'google/gemini-2.0-flash-001';
  const batchSize = 40;
  const allResults: Record<string, string> = {};
  
  // Create indexed map for strict matching
  const catList = categories.map((c, i) => `${i + 1}. ${c}`).join('\n');

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Ты — SEO-специалист. Твоя задача — распределить запросы по категориям.
Для каждого запроса выбери наиболее подходящую категорию и верни её НОМЕР.

Доступные категории:
${catList}

Верни JSON в формате:
{
  "results": {
    "запрос": номер_категории,
    ...
  }
}`,
      },
      {
        role: 'user',
        content: `Запросы для обработки:\n${batch.join('\n')}`,
      },
    ];

    const raw = await callOpenRouter(messages, model, true);
    try {
      const parsed = JSON.parse(raw);
      const results = parsed.results || parsed;

      for (const [query, catIdx] of Object.entries(results)) {
        const idx = Number(catIdx) - 1;
        if (categories[idx]) {
          allResults[query] = categories[idx];
        } else {
          // fallback search
          allResults[query] = 'Other';
        }
      }
    } catch (e) {
      console.warn('Categorize batch failed to parse:', raw);
    }

    onProgress?.(i + batch.length, queries.length);
  }

  return allResults;
}

/**
 * Refine a single category: re-evaluate its queries against all categories.
 * Returns a list of moves: { query, from, to } for queries that should be relocated.
 */
export async function refineCategory(
  categoryName: string,
  queriesInCategory: string[],
  allCategories: string[]
): Promise<{ moves: { query: string; to: string }[] }> {
  const model = process.env.OPENROUTER_MODEL_CLASSIFY || 'google/gemini-2.0-flash-001';
  const batchSize = 50;
  const allMoves: { query: string; to: string }[] = [];

  const catList = allCategories.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const currentIdx = allCategories.indexOf(categoryName) + 1;

  for (let i = 0; i < queriesInCategory.length; i += batchSize) {
    const batch = queriesInCategory.slice(i, i + batchSize);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Ты — SEO-специалист с глубоким пониманием пользовательских интентов.

Все запросы ниже сейчас находятся в категории "${categoryName}" (номер ${currentIdx}).
Твоя задача — проверить, правильно ли каждый запрос отнесён к этой категории.

Доступные категории:
${catList}

Правила:
1. Если запрос ПРАВИЛЬНО находится в текущей категории — НЕ включай его в ответ.
2. Если запрос ЛУЧШЕ подходит к другой категории — укажи номер новой категории.
3. Будь внимателен к нюансам: "курсы испанского" и "испанский разговорник" — это разные интенты.
4. Перемещай запрос ТОЛЬКО если уверен, что другая категория подходит значительно лучше.

Верни JSON:
{
  "moves": [
    { "query": "текст запроса", "to": номер_категории },
    ...
  ]
}

Если все запросы на своём месте, верни: { "moves": [] }`,
      },
      {
        role: 'user',
        content: `Запросы из категории "${categoryName}" для проверки:\n${batch.join('\n')}`,
      },
    ];

    const raw = await callOpenRouter(messages, model, true);
    try {
      const parsed = JSON.parse(raw);
      const moves = parsed.moves || [];
      for (const move of moves) {
        const idx = Number(move.to) - 1;
        if (allCategories[idx] && allCategories[idx] !== categoryName) {
          allMoves.push({ query: move.query, to: allCategories[idx] });
        }
      }
    } catch (e) {
      console.warn('Refine batch failed to parse:', raw);
    }
  }

  return { moves: allMoves };
}

/**
 * Generate a hierarchical site structure based on sitemap URLs and titles.
 */
export async function generateSiteStructure(
  pages: { url: string; title: string | null; h1: string | null }[]
): Promise<any> {
  const model = process.env.OPENROUTER_MODEL_CATEGORIES || 'google/gemini-2.0-flash-001';

  // Format pages for the prompt, limit to first 150 to keep it manageable
  const pageList = pages
    .slice(0, 150)
    .map((p) => `- URL: ${p.url}\n  Title: ${p.title || 'N/A'}\n  H1: ${p.h1 || 'N/A'}`)
    .join('\n\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты — эксперт по SEO и информационной архитектуре сайтов. Твоя задача — проанализировать список URL и их заголовков и воссоздать логическую иерархическую структуру сайта (дерево страниц).

Правила:
1. Сгруппируй страницы по логическим разделам (папкам/категориям), основываясь на структуре URL и смысле заголовков.
2. Корень дерева должен называться "Главная" или соответствовать домену.
3. Каждая нода должна иметь поля:
   - "name": Понятное название (лучше всего взять из H1 или Title, если они есть, иначе из URL).
   - "url": Полный URL страницы (если это реальная страница).
   - "children": Список вложенных страниц или разделов (если есть).
4. Если в URL есть явные папки (например, /blog/...), создай соответствующий узел-контейнер, даже если самой страницы "blog" нет в списке (в таком случае поле url у контейнера может отсутствовать).
5. Результат должен быть чистым JSON.

Формат ответа:
{
  "structure": {
    "name": "Главная",
    "url": "https://...",
    "children": [
      {
        "name": "Раздел",
        "url": "/...",
        "children": [...]
      }
    ]
  }
}`,
    },
    {
      role: 'user',
      content: `Список страниц сайта:\n\n${pageList}\n\nПострой иерархическую структуру сайта и верни её в формате JSON.`,
    },
  ];

  const raw = await callOpenRouter(messages, model, true);
  try {
    const parsed = JSON.parse(raw);
    return parsed.structure || parsed;
  } catch (e) {
    // Attempt fallback parsing
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.structure || parsed;
    }
    throw new Error(`Не удалось распарсить структуру сайта: ${raw.substring(0, 200)}`);
  }
}
