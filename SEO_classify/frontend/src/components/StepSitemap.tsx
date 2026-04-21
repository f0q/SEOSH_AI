import { useState } from 'react';
import { createSession, parseSitemap, generateStructure } from '../api/client';
import type { SitemapPage } from '../api/client';
import { Globe, Search, ArrowRight, Loader2, ExternalLink, Sparkles, Network } from 'lucide-react';
import SiteTree from './SiteTree';

interface Props {
  sessionId: string | null;
  siteUrl: string;
  sitemapPages: SitemapPage[];
  onSessionCreated: (id: string, url: string) => void;
  onSitemapParsed: (pages: SitemapPage[]) => void;
  onNext: () => void;
}

export default function StepSitemap({
  sessionId,
  siteUrl,
  sitemapPages,
  onSessionCreated,
  onSitemapParsed,
  onNext,
}: Props) {
  const [url, setUrl] = useState(siteUrl || '');
  const [loading, setLoading] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [structure, setStructure] = useState<any>(null);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setStructure(null);

    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      // Create session
      let sid = sessionId;
      if (!sid) {
        const session = await createSession(normalizedUrl);
        sid = session.id;
        onSessionCreated(sid, normalizedUrl);
      }

      // Parse sitemap
      const result = await parseSitemap(sid, normalizedUrl);
      onSitemapParsed(result.pages);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Ошибка парсинга');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStructure = async () => {
    if (!sessionId) return;
    setGeneratingStructure(true);
    setError('');
    try {
      const result = await generateStructure(sessionId);
      setStructure(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Ошибка генерации структуры');
    } finally {
      setGeneratingStructure(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input Card */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
            <Globe className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-100">Анализ сайта</h2>
            <p className="text-sm text-surface-400">Введите URL для парсинга sitemap.xml</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="site-url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
              placeholder="https://example.com"
              className="input-field pl-11"
              disabled={loading}
            />
          </div>
          <button
            id="parse-sitemap-btn"
            onClick={handleParse}
            disabled={loading || !url.trim()}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Парсинг...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Парсить Sitemap
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {sitemapPages.length > 0 && (
        <div className="glass-card p-8 animate-slide-up space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">
                Найдено уникальных страниц: <span className="gradient-text">{sitemapPages.length}</span>
              </h3>
              <p className="text-sm text-surface-400">Данные успешно получены из карты сайта</p>
            </div>
            
            <div className="flex gap-3">
              {!structure && (
                <button
                  onClick={handleGenerateStructure}
                  disabled={generatingStructure}
                  className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 px-4 py-2 rounded-xl transition-all border border-brand-500/20 flex items-center gap-2 text-sm font-medium"
                >
                  {generatingStructure ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Генерация структуры...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Визуальная структура (ИИ)
                    </>
                  )}
                </button>
              )}
              
              <button
                id="step1-next-btn"
                onClick={onNext}
                className="btn-primary flex items-center gap-2"
              >
                Далее
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Site Structure Visualization */}
          {structure && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-brand-400" />
                  <h3 className="text-surface-100 font-semibold">Иерархическое дерево сайта</h3>
                </div>
                <button 
                  onClick={handleGenerateStructure}
                  className="text-xs text-surface-400 hover:text-brand-400 flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Перегенерировать
                </button>
              </div>
              <SiteTree structure={structure} />
            </div>
          )}

          <div className="overflow-x-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-4 px-1">
              Список URL из Sitemap
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">#</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">URL</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">Title</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">H1</th>
                </tr>
              </thead>
              <tbody>
                {sitemapPages.map((page, idx) => (
                  <tr
                    key={page.id}
                    className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-surface-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:text-brand-300 flex items-center gap-1 max-w-xs truncate"
                      >
                        {new URL(page.url).pathname}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-surface-300 max-w-xs truncate">
                      {page.title || <span className="text-surface-600 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-surface-300 max-w-xs truncate">
                      {page.h1 || <span className="text-surface-600 italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
