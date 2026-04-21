import { useState, useEffect, useRef, useMemo } from 'react';
import { getSitemapPages, updateQueryPage, generateStructure } from '../api/client';
import type { SitemapPage } from '../api/client';
import { Search, X, ExternalLink, Globe, ChevronRight, Loader2, Network, List } from 'lucide-react';
import SiteTree from './SiteTree';

interface Props {
  sessionId: string;
  queryId: string;
  currentPage: string;
  onPageChanged: (queryId: string, newPage: string) => void;
  onClose: () => void;
}

export default function PagePicker({ sessionId, queryId, currentPage, onPageChanged, onClose }: Props) {
  const [pages, setPages] = useState<SitemapPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [structure, setStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load sitemap pages
  useEffect(() => {
    getSitemapPages(sessionId)
      .then(setPages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Load structure when switching to tree mode
  useEffect(() => {
    if (viewMode === 'tree' && !structure && !loadingStructure) {
      setLoadingStructure(true);
      generateStructure(sessionId)
        .then(setStructure)
        .catch((err) => console.error('Failed to load structure:', err))
        .finally(() => setLoadingStructure(false));
    }
  }, [viewMode, sessionId, structure, loadingStructure]);

  // Focus search input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Build tree structure from URLs (for list view grouping)
  const { tree, flatFiltered } = useMemo(() => {
    const lower = search.toLowerCase();
    const filtered = pages.filter((p) => {
      if (!search) return true;
      return (
        p.url.toLowerCase().includes(lower) ||
        (p.title || '').toLowerCase().includes(lower)
      );
    });

    // Group by path segments for tree view
    const segments = new Map<string, SitemapPage[]>();
    for (const page of filtered) {
      try {
        const url = new URL(page.url);
        const parts = url.pathname.split('/').filter(Boolean);
        const section = parts.length > 1 ? '/' + parts[0] : '/';
        if (!segments.has(section)) segments.set(section, []);
        segments.get(section)!.push(page);
      } catch {
        if (!segments.has('/')) segments.set('/', []);
        segments.get('/')!.push(page);
      }
    }

    return { tree: segments, flatFiltered: filtered };
  }, [pages, search]);

  const selectPage = async (pageUrl: string) => {
    setSaving(true);
    try {
      await updateQueryPage(queryId, pageUrl);
      onPageChanged(queryId, pageUrl);
      onClose();
    } catch (err) {
      console.error('Failed to save page:', err);
    } finally {
      setSaving(false);
    }
  };

  const clearPage = async () => {
    setSaving(true);
    try {
      await updateQueryPage(queryId, null);
      onPageChanged(queryId, '');
      onClose();
    } catch (err) {
      console.error('Failed to clear page:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-[420px] max-h-[500px] bg-surface-900 border border-surface-700 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-fade-in overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-800 flex items-center gap-2">
        <Globe className="w-4 h-4 text-brand-400" />
        <span className="text-sm font-medium text-surface-200">Выбор страницы</span>
        <div className="flex-1" />
        <div className="flex bg-surface-800 rounded-lg p-0.5 mr-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded-md transition-all ${viewMode === 'list' ? 'bg-surface-700 text-brand-400 shadow-sm' : 'text-surface-500 hover:text-surface-300'}`}
            title="Список"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`p-1 rounded-md transition-all ${viewMode === 'tree' ? 'bg-surface-700 text-brand-400 shadow-sm' : 'text-surface-500 hover:text-surface-300'}`}
            title="Дерево (AI)"
          >
            <Network className="w-3.5 h-3.5" />
          </button>
        </div>
        {currentPage && (
          <button
            onClick={clearPage}
            disabled={saving}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mr-2"
          >
            <X className="w-3 h-3" />
            Сбросить
          </button>
        )}
        <button onClick={onClose} className="text-surface-500 hover:text-surface-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search (only for list mode) */}
      {viewMode === 'list' && (
        <div className="px-4 py-2 border-b border-surface-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по URL или Title..."
              className="w-full bg-surface-800 border border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {viewMode === 'tree' ? (
          <div className="p-2">
            {loadingStructure ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                <p className="text-xs text-surface-500">Генерация структуры...</p>
              </div>
            ) : structure ? (
              <SiteTree 
                structure={structure} 
                onSelect={selectPage} 
                selectedUrl={currentPage}
                className="!bg-transparent !border-none !p-0 !max-h-none"
              />
            ) : (
              <div className="text-center py-20 text-surface-500 text-xs">
                Не удалось загрузить структуру
              </div>
            )}
          </div>
        ) : (
          loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            </div>
          ) : flatFiltered.length === 0 ? (
            <div className="text-center py-8 text-surface-500 text-xs">
              {pages.length === 0 ? 'Нет страниц из Sitemap' : 'Ничего не найдено'}
            </div>
          ) : (
            <div className="py-1">
              {Array.from(tree.entries()).map(([section, sectionPages]) => (
                <div key={section}>
                  {tree.size > 1 && (
                    <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-surface-600 font-semibold flex items-center gap-1">
                      <ChevronRight className="w-2.5 h-2.5" />
                      {section}
                    </div>
                  )}
                  {sectionPages.map((page) => {
                    const isSelected = page.url === currentPage;
                    let pathname = '/';
                    try {
                      pathname = new URL(page.url).pathname || '/';
                    } catch {}

                    return (
                      <button
                        key={page.id}
                        onClick={() => selectPage(page.url)}
                        disabled={saving}
                        className={`w-full text-left px-4 py-2 hover:bg-surface-800 transition-colors flex items-start gap-2 group ${
                          isSelected ? 'bg-brand-500/10 border-l-2 border-brand-500' : ''
                        }`}
                      >
                        <ExternalLink className="w-3 h-3 text-surface-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs truncate ${isSelected ? 'text-brand-300 font-medium' : 'text-surface-300'}`}>
                            {pathname}
                          </p>
                          {page.title && (
                            <p className="text-[10px] text-surface-600 truncate mt-0.5">
                              {page.title}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-[9px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                            текущая
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-surface-800 text-[10px] text-surface-600">
        {flatFiltered.length} из {pages.length} страниц
      </div>
    </div>
  );
}
