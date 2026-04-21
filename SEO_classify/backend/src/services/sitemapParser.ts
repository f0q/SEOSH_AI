import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';

interface SitemapEntry {
  url: string;
  title: string | null;
  h1: string | null;
}

/**
 * Fetches and parses sitemap.xml from the given base URL.
 * Attempts multiple common sitemap locations.
 */
export async function parseSitemap(baseUrl: string): Promise<SitemapEntry[]> {
  const normalizedUrl = baseUrl.replace(/\/+$/, '');
  const sitemapUrls = [
    `${normalizedUrl}/sitemap.xml`,
    `${normalizedUrl}/sitemap_index.xml`,
    `${normalizedUrl}/sitemap/sitemap.xml`,
  ];

  let sitemapXml: string | null = null;

  for (const url of sitemapUrls) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'SEOClassifyBot/1.0' },
      });
      sitemapXml = response.data;
      console.log(`✅ Sitemap found at: ${url}`);
      break;
    } catch {
      continue;
    }
  }

  if (!sitemapXml) {
    throw new Error(`Не удалось найти sitemap.xml для ${normalizedUrl}`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === 'url' || name === 'sitemap',
  });

  const parsed = parser.parse(sitemapXml);

  // Handle sitemap index (contains links to other sitemaps)
  let urls: string[] = [];

  if (parsed.sitemapindex?.sitemap) {
    // Sort sitemaps to prioritize pages, posts, and products over tags, authors, etc.
    const childSitemaps = parsed.sitemapindex.sitemap.sort((a: any, b: any) => {
      const aUrl = (a.loc || a).toLowerCase();
      const bUrl = (b.loc || b).toLowerCase();
      const score = (url: string) => {
        if (url.includes('page')) return 4;
        if (url.includes('post')) return 3;
        if (url.includes('product') || url.includes('catalog')) return 3;
        if (url.includes('category') || url.includes('portfolio')) return 2;
        if (url.includes('tag') || url.includes('author') || url.includes('attachment')) return -1;
        return 0;
      };
      return score(bUrl) - score(aUrl);
    });

    for (const child of childSitemaps) {
      const childUrl = child.loc || child;
      try {
        const childResponse = await axios.get(childUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'SEOClassifyBot/1.0' },
        });
        const childParsed = parser.parse(childResponse.data);
        if (childParsed.urlset?.url) {
          urls.push(...childParsed.urlset.url.map((u: any) => u.loc).filter(Boolean));
        }
      } catch {
        console.warn(`⚠️ Failed to fetch child sitemap: ${childUrl}`);
      }
      
      // Stop fetching once we have a decent pool of urls to analyze (avoid parsing huge sitemaps forever)
      if (urls.length >= 150) {
        break;
      }
    }
  } else if (parsed.urlset?.url) {
    urls = parsed.urlset.url.map((u: any) => u.loc).filter(Boolean);
  }

  // Limit to 50 pages for performance
  const limitedUrls = urls.slice(0, 50);

  console.log(`📄 Found ${urls.length} URLs, processing first ${limitedUrls.length}...`);

  // Fetch title & h1 from each page concurrently (max 5 at a time)
  const entries: SitemapEntry[] = [];
  const batchSize = 5;

  for (let i = 0; i < limitedUrls.length; i += batchSize) {
    const batch = limitedUrls.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((url) => fetchPageMeta(url))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        entries.push(result.value);
      }
    }
  }

  return entries;
}

/**
 * Detects charset from Content-Type header or HTML meta tag.
 */
function detectCharset(contentType: string | undefined, htmlSnippet: string): string {
  // 1. From Content-Type header: charset=windows-1251
  if (contentType) {
    const match = contentType.match(/charset=([^\s;]+)/i);
    if (match) return match[1].toLowerCase();
  }

  // 2. From <meta charset="..."> or <meta http-equiv="Content-Type" content="...charset=...">
  const metaCharset = htmlSnippet.match(/<meta[^>]+charset=["']?([^"';\s>]+)/i);
  if (metaCharset) return metaCharset[1].toLowerCase();

  const metaHttp = htmlSnippet.match(/content-type[^>]+charset=([^\s;"'>]+)/i);
  if (metaHttp) return metaHttp[1].toLowerCase();

  return 'utf-8';
}

async function fetchPageMeta(url: string): Promise<SitemapEntry> {
  try {
    // Fetch as raw bytes (ArrayBuffer) to handle any encoding
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'SEOClassifyBot/1.0' },
      maxRedirects: 3,
      responseType: 'arraybuffer',
    });

    const buffer: ArrayBuffer = response.data;
    const contentType: string | undefined = response.headers['content-type'];

    // Peek at first 1024 bytes as latin-1 to read meta charset tag
    const snippet = new TextDecoder('latin1').decode(buffer.slice(0, 1024));
    const charset = detectCharset(contentType, snippet);

    // Decode the full buffer with detected charset
    let html: string;
    try {
      html = new TextDecoder(charset).decode(buffer);
    } catch {
      // Fallback to utf-8 if charset label is unrecognised
      html = new TextDecoder('utf-8').decode(buffer);
    }

    const $ = cheerio.load(html);
    const title = $('title').first().text().trim() || null;
    const h1 = $('h1').first().text().trim() || null;

    return { url, title, h1 };
  } catch {
    return { url, title: null, h1: null };
  }
}
