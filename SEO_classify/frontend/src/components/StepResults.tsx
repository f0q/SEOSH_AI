import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getExportUrl, renameCategory, refineCategoryAI, getResults, updateQueryCategory, deleteQuery, updateQueryText, addCategoryWithScan, generateLlmsTxt, generateRecommendations } from '../api/client';
import type { ResultRow } from '../api/client';
import PagePicker from './PagePicker';
import {
  BarChart3, Download, ArrowLeft, Search, Filter, ChevronDown, ChevronUp,
  Star, Pencil, Check, X, ExternalLink, RefreshCw, Loader2, Trash2, Undo2, Plus,
  FileCode, ClipboardCopy, FileText, Lightbulb
} from 'lucide-react';

interface Props {
  sessionId: string;
  results: ResultRow[];
  summary: Record<string, number>;
  onBack: () => void;
  onResultsUpdated?: (results: ResultRow[], summary: Record<string, number>) => void;
}

export default function StepResults({ sessionId, results, summary, onBack, onResultsUpdated }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortField, setSortField] = useState<'query' | 'category' | 'group' | 'page'>('category');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Category rename state
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Page picker state
  const [activePickerQueryId, setActivePickerQueryId] = useState<string | null>(null);

  // Category picker state
  const [activeCatPickerQueryId, setActiveCatPickerQueryId] = useState<string | null>(null);

  // Refine state
  const [refining, setRefining] = useState(false);
  const [refineMessage, setRefineMessage] = useState('');

  // Local mutable results and summary for rename
  const [localResults, setLocalResults] = useState(results);
  const [localSummary, setLocalSummary] = useState(summary);

  // Edit query text state
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [editQueryValue, setEditQueryValue] = useState('');

  // Add new category state
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatScan, setNewCatScan] = useState(true);
  const [addingCat, setAddingCat] = useState(false);
  const [addCatMessage, setAddCatMessage] = useState('');

  // LLMs.txt / Recommendations modal
  const [aiModalType, setAiModalType] = useState<'llms' | 'recommendations' | null>(null);
  const [aiModalContent, setAiModalContent] = useState('');
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  // Pending deletions: queryId -> { timer, secondsLeft }
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, number>>(new Map());
  const deleteTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      deleteTimers.current.forEach((timer) => clearInterval(timer));
    };
  }, []);

  const startDelete = useCallback((queryId: string) => {
    // Add to pending with 5-second countdown
    setPendingDeletes((prev) => new Map(prev).set(queryId, 5));

    const timer = setInterval(() => {
      setPendingDeletes((prev) => {
        const next = new Map(prev);
        const remaining = (next.get(queryId) ?? 0) - 1;
        if (remaining <= 0) {
          // Time's up — actually delete
          next.delete(queryId);
          clearInterval(deleteTimers.current.get(queryId)!);
          deleteTimers.current.delete(queryId);
          // Perform the actual deletion
          deleteQuery(queryId).catch((e) => console.error('Delete failed:', e));
          // Remove from local results
          setLocalResults((lr) => {
            const updated = lr.filter((r) => r.id !== queryId);
            const updatedSummary: Record<string, number> = {};
            for (const r of updated) {
              updatedSummary[r.category] = (updatedSummary[r.category] || 0) + 1;
            }
            setLocalSummary(updatedSummary);
            onResultsUpdated?.(updated, updatedSummary);
            return updated;
          });
          return next;
        }
        next.set(queryId, remaining);
        return next;
      });
    }, 1000);

    deleteTimers.current.set(queryId, timer);
  }, [onResultsUpdated]);

  const cancelDelete = useCallback((queryId: string) => {
    const timer = deleteTimers.current.get(queryId);
    if (timer) {
      clearInterval(timer);
      deleteTimers.current.delete(queryId);
    }
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.delete(queryId);
      return next;
    });
  }, []);

  const categoryNames = useMemo(() => Object.keys(localSummary).sort(), [localSummary]);

  const filteredResults = useMemo(() => {
    let filtered = localResults;

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.query.toLowerCase().includes(lower) ||
          r.category.toLowerCase().includes(lower) ||
          r.group.toLowerCase().includes(lower) ||
          r.page.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      const cmp = valA.localeCompare(valB, 'ru');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [localResults, search, selectedCategory, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  // Handle renaming a category
  const startRenaming = (catName: string) => {
    setRenamingCat(catName);
    setRenameValue(catName);
  };

  const cancelRename = () => {
    setRenamingCat(null);
    setRenameValue('');
  };

  const confirmRename = async () => {
    if (!renamingCat || !renameValue.trim() || renameValue.trim() === renamingCat) {
      cancelRename();
      return;
    }

    setRenameLoading(true);
    try {
      await renameCategory(sessionId, renamingCat, renameValue.trim());

      // Update local state
      const newName = renameValue.trim();
      const oldName = renamingCat;

      const updatedResults = localResults.map((r) =>
        r.category === oldName ? { ...r, category: newName } : r
      );

      const updatedSummary: Record<string, number> = {};
      for (const r of updatedResults) {
        updatedSummary[r.category] = (updatedSummary[r.category] || 0) + 1;
      }

      setLocalResults(updatedResults);
      setLocalSummary(updatedSummary);
      onResultsUpdated?.(updatedResults, updatedSummary);

      if (selectedCategory === oldName) {
        setSelectedCategory(newName);
      }
    } catch (err) {
      console.error('Rename error:', err);
    } finally {
      setRenameLoading(false);
      cancelRename();
    }
  };

  const handlePageChanged = (queryId: string, newPage: string) => {
    setLocalResults((prev) =>
      prev.map((r) => (r.id === queryId ? { ...r, page: newPage, pageManual: !!newPage } : r))
    );
  };

  const handleCategoryChanged = async (queryId: string, newCatName: string) => {
    try {
      await updateQueryCategory(queryId, sessionId, newCatName);
      const updatedResults = localResults.map((r) =>
        r.id === queryId ? { ...r, category: newCatName } : r
      );
      const updatedSummary: Record<string, number> = {};
      for (const r of updatedResults) {
        updatedSummary[r.category] = (updatedSummary[r.category] || 0) + 1;
      }
      setLocalResults(updatedResults);
      setLocalSummary(updatedSummary);
      onResultsUpdated?.(updatedResults, updatedSummary);
    } catch (err) {
      console.error('Category change error:', err);
    }
    setActiveCatPickerQueryId(null);
  };

  // Edit query text handlers
  const startEditQuery = (queryId: string, currentText: string) => {
    setEditingQueryId(queryId);
    setEditQueryValue(currentText);
  };

  const cancelEditQuery = () => {
    setEditingQueryId(null);
    setEditQueryValue('');
  };

  const confirmEditQuery = async () => {
    if (!editingQueryId || !editQueryValue.trim()) {
      cancelEditQuery();
      return;
    }
    try {
      await updateQueryText(editingQueryId, editQueryValue.trim());
      setLocalResults((prev) =>
        prev.map((r) => (r.id === editingQueryId ? { ...r, query: editQueryValue.trim() } : r))
      );
    } catch (err) {
      console.error('Edit query error:', err);
    }
    cancelEditQuery();
  };

  // Add new category handler
  const handleAddCategory = async () => {
    if (!newCatName.trim() || addingCat) return;
    setAddingCat(true);
    setAddCatMessage('');
    try {
      const result = await addCategoryWithScan(sessionId, newCatName.trim(), newCatScan);

      if (result.moved > 0) {
        // Re-fetch results
        const fresh = await getResults(sessionId);
        setLocalResults(fresh.results);
        setLocalSummary(fresh.summary);
        onResultsUpdated?.(fresh.results, fresh.summary);
        setAddCatMessage(`✅ Категория «${newCatName.trim()}» создана. Перемещено ${result.moved} запросов.`);
      } else {
        // Just add the category to summary with 0 count and re-fetch
        const fresh = await getResults(sessionId);
        setLocalResults(fresh.results);
        setLocalSummary(fresh.summary);
        onResultsUpdated?.(fresh.results, fresh.summary);
        setAddCatMessage(`✅ Категория «${newCatName.trim()}» создана. Подходящих запросов для перемещения не найдено.`);
      }
      setNewCatName('');
      setShowAddCat(false);
    } catch (err: any) {
      setAddCatMessage(`❌ Ошибка: ${err.response?.data?.error || err.message}`);
    } finally {
      setAddingCat(false);
    }
  };

  const handleRefineCategory = async () => {
    if (!selectedCategory || refining) return;
    setRefining(true);
    setRefineMessage('');
    try {
      const result = await refineCategoryAI(sessionId, selectedCategory);

      if (result.moved === 0) {
        setRefineMessage(`✅ Все ${result.total} запросов в категории «${selectedCategory}» на своём месте!`);
      } else {
        // Re-fetch results from server to get fresh data
        const fresh = await getResults(sessionId);
        setLocalResults(fresh.results);
        setLocalSummary(fresh.summary);
        onResultsUpdated?.(fresh.results, fresh.summary);

        const movedTo = result.moves.map((m) => m.to);
        const uniqueDest = [...new Set(movedTo)];
        setRefineMessage(
          `🔄 Перемещено ${result.moved} из ${result.total} запросов → ${uniqueDest.join(', ')}`
        );
      }
    } catch (err: any) {
      setRefineMessage(`❌ Ошибка: ${err.response?.data?.error || err.message}`);
    } finally {
      setRefining(false);
    }
  };

  // Category color palette
  const catColors = useMemo(() => {
    const palette = [
      'bg-brand-500/15 text-brand-300 border-brand-500/20',
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
      'bg-amber-500/15 text-amber-300 border-amber-500/20',
      'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
      'bg-rose-500/15 text-rose-300 border-rose-500/20',
      'bg-violet-500/15 text-violet-300 border-violet-500/20',
      'bg-lime-500/15 text-lime-300 border-lime-500/20',
      'bg-orange-500/15 text-orange-300 border-orange-500/20',
      'bg-teal-500/15 text-teal-300 border-teal-500/20',
      'bg-pink-500/15 text-pink-300 border-pink-500/20',
      'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
      'bg-sky-500/15 text-sky-300 border-sky-500/20',
    ];
    const map: Record<string, string> = {};
    categoryNames.forEach((name, i) => {
      map[name] = palette[i % palette.length];
    });
    return map;
  }, [categoryNames]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold gradient-text">{localResults.length}</p>
          <p className="text-xs text-surface-500 mt-1">Всего запросов</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-emerald-400">{categoryNames.length}</p>
          <p className="text-xs text-surface-500 mt-1">Категорий</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-amber-400">
            {localResults.filter((r) => r.isRepresentative).length}
          </p>
          <p className="text-xs text-surface-500 mt-1">Групп</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-cyan-400">
            {localResults.filter((r) => r.page).length}
          </p>
          <p className="text-xs text-surface-500 mt-1">С подобранной страницей</p>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-surface-400 mb-4">
          Распределение по категориям
          <span className="text-surface-600 ml-2 text-xs">(нажмите ✏ для переименования)</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {categoryNames.map((name) => (
            <div key={name} className="group relative flex items-center">
              {renamingCat === name ? (
                <div className="flex items-center gap-1 bg-surface-800 border border-brand-500/50 rounded-lg px-2 py-1">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename();
                      if (e.key === 'Escape') cancelRename();
                    }}
                    className="bg-transparent text-sm text-surface-200 focus:outline-none w-36"
                    autoFocus
                    disabled={renameLoading}
                  />
                  <button onClick={confirmRename} disabled={renameLoading} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={cancelRename} className="text-surface-500 hover:text-red-400 p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    setSelectedCategory(selectedCategory === name ? '' : name)
                  }
                  className={`badge border transition-all ${catColors[name]} ${
                    selectedCategory === name ? 'ring-1 ring-offset-1 ring-offset-surface-900' : ''
                  } hover:scale-105 cursor-pointer flex items-center gap-1`}
                >
                  {name}
                  <span className="opacity-60">{localSummary[name]}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenaming(name);
                    }}
                    className="opacity-0 group-hover:opacity-70 hover:!opacity-100 ml-0.5 cursor-pointer"
                    title="Переименовать"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Refine + Add Category controls */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {selectedCategory && (
            <button
              onClick={handleRefineCategory}
              disabled={refining}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {refining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Уточнить «{selectedCategory}» (ИИ)
            </button>
          )}
          {refining && (
            <span className="text-xs text-surface-500">ИИ проверяет каждый запрос...</span>
          )}

          {!showAddCat ? (
            <button
              onClick={() => setShowAddCat(true)}
              className="btn-ghost flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить категорию
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAddCategory(); }
                  if (e.key === 'Escape') setShowAddCat(false);
                }}
                placeholder="Название..."
                className="bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500 w-40"
                autoFocus
                disabled={addingCat}
              />
              <label className="flex items-center gap-1.5 text-[10px] text-surface-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newCatScan}
                  onChange={(e) => setNewCatScan(e.target.checked)}
                  className="rounded border-surface-600"
                  disabled={addingCat}
                />
                Скан ИИ
              </label>
              <button
                onClick={handleAddCategory}
                disabled={!newCatName.trim() || addingCat}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 disabled:opacity-30 transition-colors"
              >
                {addingCat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Добавить
              </button>
              <button onClick={() => setShowAddCat(false)} className="text-surface-500 hover:text-surface-300 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        {(refineMessage || addCatMessage) && (
          <div className="mt-3 p-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-sm text-surface-300">
            {refineMessage || addCatMessage}
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-semibold text-surface-100">Результаты</h3>
            <span className="text-sm text-surface-500">
              ({filteredResults.length} из {localResults.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                id="results-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="bg-surface-800 border border-surface-700 rounded-lg pl-9 pr-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500 w-56"
              />
            </div>

            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory('')}
                className="btn-ghost text-xs flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                Сбросить фильтр
              </button>
            )}

            <a
              id="export-csv-btn"
              href={getExportUrl(sessionId)}
              download
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Экспорт CSV
            </a>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-900 z-10">
              <tr className="border-b border-surface-700">
                <th className="text-left py-3 px-4 text-surface-400 font-medium w-8">#</th>
                <th
                  onClick={() => toggleSort('query')}
                  className="text-left py-3 px-4 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none"
                >
                  <span className="flex items-center gap-1">
                    Запрос <SortIcon field="query" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('category')}
                  className="text-left py-3 px-4 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none"
                >
                  <span className="flex items-center gap-1">
                    Категория <SortIcon field="category" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('group')}
                  className="text-left py-3 px-4 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none"
                >
                  <span className="flex items-center gap-1">
                    Группа <SortIcon field="group" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('page')}
                  className="text-left py-3 px-4 text-surface-400 font-medium cursor-pointer hover:text-surface-200 select-none"
                >
                  <span className="flex items-center gap-1">
                    Страница <SortIcon field="page" />
                  </span>
                </th>
                <th className="text-left py-3 px-4 text-surface-400 font-medium w-8">
                  <Star className="w-3 h-3" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                >
                  <td className="py-2.5 px-4 text-surface-600 text-xs">{idx + 1}</td>
                  <td className="py-2.5 px-4">
                    {pendingDeletes.has(row.id) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-surface-200 line-through opacity-50">{row.query}</span>
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {pendingDeletes.get(row.id)}с
                        </span>
                        <button
                          onClick={() => cancelDelete(row.id)}
                          className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded-full"
                        >
                          <Undo2 className="w-2.5 h-2.5" />
                          Отмена
                        </button>
                      </div>
                    ) : editingQueryId === row.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={editQueryValue}
                          onChange={(e) => setEditQueryValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditQuery();
                            if (e.key === 'Escape') cancelEditQuery();
                          }}
                          className="flex-1 bg-surface-800 border border-brand-500/50 rounded px-2 py-0.5 text-sm text-surface-200 focus:outline-none"
                          autoFocus
                        />
                        <button onClick={confirmEditQuery} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={cancelEditQuery} className="text-surface-500 hover:text-red-400 p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="group/query flex items-center gap-1">
                        <span className="text-surface-200">{row.query}</span>
                        <button
                          onClick={() => startEditQuery(row.id, row.query)}
                          className="opacity-0 group-hover/query:opacity-50 hover:!opacity-100 p-0.5 text-surface-400 hover:text-brand-400 flex-shrink-0 transition-all"
                          title="Редактировать запрос"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => startDelete(row.id)}
                          className="opacity-0 group-hover/query:opacity-50 hover:!opacity-100 p-0.5 text-surface-500 hover:text-red-400 flex-shrink-0 transition-all"
                          title="Удалить запрос"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 relative">
                    <div className="group/cat flex items-center gap-1">
                      <span className={`badge border ${catColors[row.category] || 'bg-surface-800 text-surface-400 border-surface-700'}`}>
                        {row.category}
                      </span>
                      <button
                        onClick={() => setActiveCatPickerQueryId(
                          activeCatPickerQueryId === row.id ? null : row.id
                        )}
                        className="opacity-0 group-hover/cat:opacity-70 hover:!opacity-100 p-0.5 text-surface-400 hover:text-brand-400 flex-shrink-0"
                        title="Сменить категорию"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {activeCatPickerQueryId === row.id && (
                      <CategoryDropdown
                        categories={categoryNames}
                        currentCategory={row.category}
                        catColors={catColors}
                        onSelect={(cat) => handleCategoryChanged(row.id, cat)}
                        onClose={() => setActiveCatPickerQueryId(null)}
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-surface-400 text-xs max-w-[200px] truncate">
                    {row.group}
                  </td>
                  <td className="py-2.5 px-4 text-xs max-w-[250px] relative">
                    <div className="group/page flex items-center gap-1">
                      {row.page ? (
                        <a
                          href={row.page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`hover:text-brand-300 flex items-center gap-1 truncate ${
                            row.pageManual ? 'text-emerald-400' : 'text-brand-400'
                          }`}
                          title={row.page}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {(() => { try { return new URL(row.page).pathname || '/'; } catch { return row.page; } })()}
                          </span>
                        </a>
                      ) : (
                        <span className="text-surface-600">—</span>
                      )}
                      <button
                        onClick={() => setActivePickerQueryId(
                          activePickerQueryId === row.id ? null : row.id
                        )}
                        className="opacity-0 group-hover/page:opacity-70 hover:!opacity-100 p-0.5 text-surface-400 hover:text-brand-400 flex-shrink-0"
                        title="Выбрать страницу"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {activePickerQueryId === row.id && (
                      <PagePicker
                        sessionId={sessionId}
                        queryId={row.id}
                        currentPage={row.page}
                        onPageChanged={handlePageChanged}
                        onClose={() => setActivePickerQueryId(null)}
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    {row.isRepresentative && (
                      <Star className="w-3 h-3 text-amber-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-surface-800/50">
          <button onClick={onBack} className="btn-ghost flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
          <div className="flex-1" />
          <button
            onClick={async () => {
              setAiModalType('llms');
              setAiModalContent('');
              setAiModalLoading(true);
              setAiCopied(false);
              try {
                const { content } = await generateLlmsTxt(sessionId);
                setAiModalContent(content);
              } catch (err: any) {
                setAiModalContent(`Ошибка: ${err.response?.data?.error || err.message}`);
              } finally {
                setAiModalLoading(false);
              }
            }}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <FileCode className="w-4 h-4" />
            llms.txt
          </button>
          <button
            onClick={async () => {
              setAiModalType('recommendations');
              setAiModalContent('');
              setAiModalLoading(true);
              setAiCopied(false);
              try {
                const { content } = await generateRecommendations(sessionId);
                setAiModalContent(content);
              } catch (err: any) {
                setAiModalContent(`Ошибка: ${err.response?.data?.error || err.message}`);
              } finally {
                setAiModalLoading(false);
              }
            }}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Lightbulb className="w-4 h-4" />
            SEO-рекомендации
          </button>
        </div>
      </div>

      {/* AI Content Modal */}
      {aiModalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiModalType(null)} />
          <div className="relative z-10 w-full max-w-3xl max-h-[80vh] mx-4 glass-card border border-surface-700/60 shadow-2xl shadow-black/50 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
              <div className="flex items-center gap-3">
                {aiModalType === 'llms' ? (
                  <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                    <FileCode className="w-4 h-4 text-brand-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-surface-100">
                  {aiModalType === 'llms' ? 'llms.txt' : 'SEO-рекомендации'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {aiModalContent && !aiModalLoading && (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiModalContent);
                        setAiCopied(true);
                        setTimeout(() => setAiCopied(false), 2000);
                      }}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      {aiCopied ? 'Скопировано!' : 'Копировать'}
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([aiModalContent], { type: 'text/markdown;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = aiModalType === 'llms' ? 'llms.txt' : 'seo_recommendations.md';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать
                    </button>
                  </>
                )}
                <button onClick={() => setAiModalType(null)} className="text-surface-500 hover:text-surface-200 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {aiModalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                  <p className="text-surface-400 text-sm">
                    {aiModalType === 'llms' ? 'Генерация llms.txt...' : 'Анализ сайта...'}
                  </p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-surface-200 font-mono leading-relaxed">
                  {aiModalContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Category Dropdown ─────────────────────────────────────────────────

interface CategoryDropdownProps {
  categories: string[];
  currentCategory: string;
  catColors: Record<string, string>;
  onSelect: (category: string) => void;
  onClose: () => void;
}

function CategoryDropdown({ categories, currentCategory, catColors, onSelect, onClose }: CategoryDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = filter
    ? categories.filter((c) => c.toLowerCase().includes(filter.toLowerCase()))
    : categories;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 w-64 max-h-[280px] bg-surface-900 border border-surface-700 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-fade-in overflow-hidden"
    >
      {/* Search */}
      {categories.length > 5 && (
        <div className="px-3 py-2 border-b border-surface-800">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Найти категорию..."
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500"
            autoFocus
          />
        </div>
      )}
      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.map((cat) => {
          const isActive = cat === currentCategory;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`w-full text-left px-3 py-1.5 hover:bg-surface-800 transition-colors flex items-center gap-2 ${
                isActive ? 'bg-brand-500/10' : ''
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                  catColors[cat]?.split(' ')[0] || 'bg-surface-600'
                }`}
              />
              <span className={`text-xs truncate ${isActive ? 'text-brand-300 font-medium' : 'text-surface-300'}`}>
                {cat}
              </span>
              {isActive && (
                <span className="text-[9px] text-brand-400 ml-auto flex-shrink-0">✓</span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-3 text-xs text-surface-500 text-center">Не найдено</div>
        )}
      </div>
    </div>
  );
}
