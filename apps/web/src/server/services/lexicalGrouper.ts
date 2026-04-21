export interface LexicalGroupResult {
  id: string;
  representative: string;
  queries: string[];
}

// ─── Stop words for RU/EN/ES ────────────────────────────────────────
const STOP_WORDS = new Set([
  // Russian
  'в', 'на', 'за', 'из', 'от', 'до', 'по', 'с', 'к', 'о', 'об', 'и', 'а',
  'но', 'да', 'как', 'со', 'при', 'у', 'что', 'чем', 'это', 'так', 'не',
  'ли', 'же', 'бы', 'ещё', 'еще', 'уже', 'вот', 'где', 'тут', 'там',
  'для', 'или', 'ни', 'чтобы', 'тоже', 'мне', 'мой', 'мою', 'моя',
  // English
  'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or',
  'by', 'with', 'from', 'this', 'that', 'is', 'are', 'was', 'were', 'be',
  'how', 'what', 'which', 'who', 'when', 'where', 'why',
  // Spanish
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'que',
  'es', 'por', 'con', 'para', 'como', 'se', 'al', 'lo', 'su', 'más',
]);

/**
 * Simple Russian/Spanish stemmer — strips common suffixes to normalize word forms.
 * e.g. "испанского" → "испанск", "курсы" → "курс"
 */
function simpleStem(word: string): string {
  // Russian suffixes (order matters — longest first)
  const ruSuffixes = [
    'ого', 'его', 'ому', 'ему', 'ами', 'ями', 'ной', 'ных', 'ним', 'ную',
    'ой', 'ей', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ие', 'ые',
    'ов', 'ев', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем', 'им',
    'ки', 'ка', 'ку', 'ке', 'ок',
    'ть', 'ся',
  ];
  // Spanish suffixes
  const esSuffixes = [
    'ción', 'iones', 'ando', 'endo', 'ados', 'idos', 'ando',
    'ar', 'er', 'ir', 'as', 'es', 'os',
  ];

  const suffixes = [...ruSuffixes, ...esSuffixes];
  for (const suf of suffixes) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) {
      return word.slice(0, -suf.length);
    }
  }
  return word;
}

/**
 * Normalizes a query: lowercase, remove special chars, split, remove stop words, stem.
 */
function normalizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-zа-яёА-ЯЁáéíóúñü0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(simpleStem);
}

function countIntersection(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const word of a) {
    if (b.has(word)) count++;
  }
  return count;
}

/**
 * Checks if query should join a cluster by comparing ONLY to the cluster's representative.
 * This prevents transitive chaining.
 */
function shouldJoinCluster(
  queryWords: string[],
  querySet: Set<string>,
  repWords: string[],
  repSet: Set<string>
): boolean {
  if (queryWords.length === 0 || repWords.length === 0) return false;

  const intersection = countIntersection(querySet, repSet);
  if (intersection === 0) return false;

  const lenQ = queryWords.length;
  const lenR = repWords.length;
  const minLen = Math.min(lenQ, lenR);
  const maxLen = Math.max(lenQ, lenR);

  // Jaccard similarity
  const union = lenQ + lenR - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  // 1. One is a near-complete subset of the other (at least 2 words matched)
  if (intersection >= 2 && intersection >= minLen * 0.8) return true;

  // 2. High Jaccard for short phrases
  if (minLen <= 3 && jaccard >= 0.5) return true;

  // 3. High Jaccard for longer phrases
  if (minLen > 3 && jaccard >= 0.4) return true;

  // 4. Strong absolute overlap for long phrases
  if (intersection >= 3 && intersection >= maxLen * 0.5) return true;

  return false;
}

interface NormalizedItem {
  original: string;
  words: string[];
  wordSet: Set<string>;
  originalIdx: number;
}

interface Cluster {
  representative: NormalizedItem;
  members: NormalizedItem[];
}

/**
 * Groups queries using CENTROID-BASED clustering (no transitive chaining).
 *
 * Key difference from Union-Find:
 *   Each query is compared only to the cluster's REPRESENTATIVE,
 *   not to every other member. This prevents the "chain effect" where
 *   unrelated queries get grouped through intermediary connections.
 *
 * Algorithm:
 *   1. Sort queries by word count (shorter = more likely to be a good representative).
 *   2. For each query, find the best matching existing cluster (by representative similarity).
 *   3. If no cluster matches, create a new one with this query as representative.
 */
export function groupQueriesLexically(queries: string[]): LexicalGroupResult[] {
  const n = queries.length;
  if (n === 0) return [];

  // Normalize all queries
  const items: NormalizedItem[] = queries.map((q, idx) => {
    const words = normalizeQuery(q);
    return {
      original: q,
      words,
      wordSet: new Set(words),
      originalIdx: idx,
    };
  });

  // Sort: shorter queries first (better representatives)
  const sorted = [...items].sort((a, b) => a.words.length - b.words.length);

  const clusters: Cluster[] = [];

  for (const item of sorted) {
    if (item.words.length === 0) {
      // Zero meaningful words → own cluster
      clusters.push({ representative: item, members: [item] });
      continue;
    }

    // Find best matching cluster by comparing to REPRESENTATIVE ONLY
    let bestClusterIdx = -1;
    let bestJaccard = 0;

    for (let c = 0; c < clusters.length; c++) {
      const rep = clusters[c].representative;

      if (shouldJoinCluster(item.words, item.wordSet, rep.words, rep.wordSet)) {
        const inter = countIntersection(item.wordSet, rep.wordSet);
        const j = inter / (item.words.length + rep.words.length - inter);
        if (j > bestJaccard) {
          bestJaccard = j;
          bestClusterIdx = c;
        }
      }
    }

    if (bestClusterIdx >= 0) {
      clusters[bestClusterIdx].members.push(item);
    } else {
      clusters.push({ representative: item, members: [item] });
    }
  }

  // Build results, sort by group size descending
  const results: LexicalGroupResult[] = clusters
    .map((cluster, idx) => ({
      id: `group_${idx}`,
      representative: cluster.representative.original,
      queries: cluster.members.map((m) => m.original),
    }))
    .sort((a, b) => b.queries.length - a.queries.length);

  // Re-index after sorting
  results.forEach((r, i) => (r.id = `group_${i}`));

  return results;
}

/**
 * Normalizes a single query string for storage.
 */
export function normalizeForStorage(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-zа-яёА-ЯЁáéíóúñü0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
