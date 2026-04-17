/**
 * @module @seosh/semantic-core
 * @description Semantic Core Service — migrated from SEO_classify.
 *
 * pipeline:
 *   1. Parse sitemap → SitemapPage[]
 *   2. User uploads keywords (CSV/text)
 *   3. groupQueriesLexically() → LexicalGroup[] (centroid-based, no transitive chaining)
 *   4. generateCategories() via AI → Category[]
 *   5. User approves/edits categories
 *   6. categorizeQueries() via AI (batched, with SSE progress)
 *   7. Auto-match query → page (word overlap, findBestPage)
 *   8. Results: query → category → page mapping
 *   9. Export CSV / generate llms.txt / SEO recommendations
 */

export { groupQueriesLexically, normalizeForStorage } from './services/lexicalGrouper.js';
export type { LexicalGroupResult } from './services/lexicalGrouper.js';
export { parseSitemap } from './services/sitemapParser.js';
export { generateCsv } from './services/csvExporter.js';

// ─── Page matching (migrated from categorize route) ──────────────────────────

/**
 * Match a query to the most relevant sitemap page by word overlap.
 * Returns the best-matching URL, or null if confidence is below 0.3.
 */
export function findBestPage(
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
    const normalized = score / qWords.size;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestUrl = page.url;
    }
  }

  return bestScore >= 0.3 ? bestUrl : null;
}

// ─── AI Operations (migrated from openrouter.ts) ─────────────────────────────

export interface SemanticAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Generate category names from representative queries via AI.
 * Uses OpenRouter (or any OpenAI-compatible API).
 */
export async function generateCategories(
  representatives: string[],
  context: { url: string; pages: { url: string; title: string | null }[] },
  config: SemanticAIConfig
): Promise<{ categories: string[] }> {
  const model = config.model || 'google/gemini-2.0-flash-001';
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';

  const pagesList = context.pages
    .slice(0, 50)
    .map((p) => `- ${p.url}${p.title ? ` (${p.title})` : ''}`)
    .join('\n');

  const prompt = `Ты — SEO-специалист. Проанализируй эти ключевые запросы для сайта ${context.url}.

Страницы сайта (первые 50):
${pagesList}

Запросы (репрезентативные из каждой группы):
${representatives.join('\n')}

Создай КАТЕГОРИИ для систематизации этих запросов.

Правила:
1. 5-15 категорий максимум
2. Каждая категория — чёткая тема (не слишком широкая, не слишком узкая)
3. Названия краткие (2-5 слов)
4. На языке запросов
5. Учитывай существующую структуру сайта

Верни JSON:
{"categories": ["Название 1", "Название 2", ...]}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return { categories: parsed.categories || [] };
}

/**
 * Classify a batch of representative queries into categories via AI.
 * Returns a map of query → category name.
 */
export async function categorizeQueries(
  representatives: string[],
  categories: string[],
  config: SemanticAIConfig,
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, string>> {
  const model = config.model || 'google/gemini-2.0-flash-001';
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  const BATCH_SIZE = 50;
  const results: Record<string, string> = {};
  const catList = categories.map((c, i) => `${i + 1}. ${c}`).join('\n');

  for (let i = 0; i < representatives.length; i += BATCH_SIZE) {
    const batch = representatives.slice(i, i + BATCH_SIZE);

    const prompt = `Ты — SEO-специалист. Классифицируй каждый запрос в одну из категорий.

Категории:
${catList}

Запросы для классификации:
${batch.join('\n')}

Правила:
1. Каждый запрос → ОДНА категория (точное название из списка)
2. Если запрос не подходит ни к одной — выбери ближайшую
3. Верни JSON: {"results": {"запрос": "Категория", ...}}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    Object.assign(results, parsed.results || {});

    onProgress?.(Math.min(i + BATCH_SIZE, representatives.length), representatives.length);
  }

  return results;
}

/**
 * Re-evaluate queries in a specific category and suggest moves to other categories.
 */
export async function refineCategory(
  categoryName: string,
  queryTexts: string[],
  allCategories: string[],
  config: SemanticAIConfig
): Promise<{ moves: Array<{ query: string; to: string }> }> {
  const model = config.model || 'google/gemini-2.0-flash-001';
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';

  const catList = allCategories.map((c, i) => `${i + 1}. ${c}`).join('\n');

  const prompt = `Ты — SEO-специалист. Проверь запросы в категории "${categoryName}".

Все категории:
${catList}

Запросы в категории "${categoryName}":
${queryTexts.join('\n')}

Задача: Найди запросы, которые ЛУЧШЕ подходят к ДРУГОЙ категории.
Перемещай только те запросы, которые ЯВНО неверно категоризированы.

Верни JSON:
{"moves": [{"query": "запрос", "to": "Другая категория"}, ...]}

Если все запросы на месте: {"moves": []}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`AI API error: ${response.status}`);

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return { moves: parsed.moves || [] };
}

/**
 * Merge similar category names using AI.
 */
export async function mergeCategories(
  categories: string[],
  config: SemanticAIConfig
): Promise<{ categories: string[] }> {
  const model = config.model || 'google/gemini-2.0-flash-001';
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';

  const prompt = `Проанализируй список SEO-категорий и объедини дублирующиеся или очень похожие.

Категории:
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Правила:
1. Объединяй только реально похожие (синонимы, дубли)
2. Сохраняй достаточную детализацию
3. Итоговый список — уникальные, чёткие категории

Верни JSON: {"categories": ["Название 1", ...]}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`AI API error: ${response.status}`);

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return { categories: parsed.categories || categories };
}
