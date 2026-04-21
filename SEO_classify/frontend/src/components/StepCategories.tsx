import { useState, useEffect, useRef } from 'react';
import {
  generateCategories as apiGenerateCategories,
  approveCategories,
  runCategorization,
  getResults,
  mergeCategoriesAI,
} from '../api/client';
import type { CategoryItem, ResultRow } from '../api/client';
import {
  Brain, Loader2, ArrowRight, ArrowLeft, Sparkles, X, Plus,
  Check, Pencil, Play, Merge
} from 'lucide-react';

interface Props {
  sessionId: string;
  categories: CategoryItem[];
  onCategoriesGenerated: (cats: CategoryItem[]) => void;
  onCategorized: (results: ResultRow[], summary: Record<string, number>) => void;
  onNext: () => void;
  onBack: () => void;
}

type Phase = 'idle' | 'generating' | 'editing' | 'approved' | 'classifying' | 'done';

export default function StepCategories({
  sessionId,
  categories,
  onCategoriesGenerated,
  onCategorized,
  onNext,
  onBack,
}: Props) {
  const [phase, setPhase] = useState<Phase>(categories.length > 0 ? 'editing' : 'idle');
  const [editableCategories, setEditableCategories] = useState<string[]>(
    categories.map((c) => c.name)
  );
  const [newCat, setNewCat] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  const eventSourceRef = useRef<EventSource | null>(null);

  const handleGenerate = async () => {
    setPhase('generating');
    setError('');

    try {
      const result = await apiGenerateCategories(sessionId);
      const cats = result.categories;
      onCategoriesGenerated(cats);
      setEditableCategories(cats.map((c) => c.name));
      setPhase('editing');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Ошибка');
      setPhase('idle');
    }
  };

  const handleMergeAI = async () => {
    if (editableCategories.length < 2) return;
    setMerging(true);
    setError('');
    try {
      const result = await mergeCategoriesAI(editableCategories);
      setEditableCategories(result.categories);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Ошибка слияния');
    } finally {
      setMerging(false);
    }
  };

  const handleRemoveCategory = (idx: number) => {
    setEditableCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCategory = () => {
    if (newCat.trim()) {
      setEditableCategories((prev) => [...prev, newCat.trim()]);
      setNewCat('');
    }
  };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditValue(editableCategories[idx]);
  };

  const saveEdit = () => {
    if (editIdx !== null && editValue.trim()) {
      setEditableCategories((prev) =>
        prev.map((c, i) => (i === editIdx ? editValue.trim() : c))
      );
    }
    setEditIdx(null);
    setEditValue('');
  };

  const handleApproveAndRun = async () => {
    if (editableCategories.length === 0) {
      setError('Добавьте хотя бы одну категорию');
      return;
    }

    setError('');
    setPhase('classifying');

    try {
      // Approve categories
      await approveCategories(sessionId, editableCategories);

      // Start SSE for progress
      const es = new EventSource(`/api/categorize/progress/${sessionId}`);
      eventSourceRef.current = es;

      es.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        setProgress(data);

        if (data.status === 'done') {
          es.close();
          // Fetch results only when actually done
          const resultData = await getResults(sessionId);
          onCategorized(resultData.results, resultData.summary);
          setPhase('done');
        } else if (data.status === 'error') {
          es.close();
          setError('Ошибка при классификации');
          setPhase('editing');
        }
      };

      es.onerror = () => {
        es.close();
      };

      // Run categorization (returns immediately now)
      await runCategorization(sessionId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Ошибка');
      setPhase('editing');
    }
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Progress percentage
  const progressPct =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-100">Генерация категорий</h2>
            <p className="text-sm text-surface-400">
              {phase === 'idle' && 'ИИ проанализирует репрезентативные запросы и предложит категории'}
              {phase === 'generating' && 'ИИ формирует структуру категорий...'}
              {phase === 'editing' && 'Отредактируйте категории и запустите классификацию'}
              {phase === 'classifying' && 'ИИ распределяет запросы по категориям...'}
              {phase === 'done' && 'Классификация завершена!'}
            </p>
          </div>
        </div>

        {/* Phase: Idle */}
        {phase === 'idle' && (
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="btn-ghost flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
            <button
              id="generate-categories-btn"
              onClick={handleGenerate}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Сгенерировать категории
            </button>
          </div>
        )}

        {/* Phase: Generating */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center animate-pulse-glow">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
            <p className="text-surface-300 font-medium">ИИ генерирует категории...</p>
            <p className="text-sm text-surface-500">Это может занять 10-30 секунд</p>
          </div>
        )}

        {/* Phase: Editing */}
        {phase === 'editing' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {editableCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="group relative bg-surface-800/50 border border-surface-700/50 rounded-xl p-3 flex items-center gap-2 transition-all hover:border-brand-500/30"
                >
                  {editIdx === idx ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        className="flex-1 bg-surface-900 border border-brand-500/50 rounded-lg px-2 py-1 text-sm text-surface-200 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-surface-200">{cat}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => startEdit(idx)}
                          className="p-1 text-surface-400 hover:text-brand-400"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveCategory(idx)}
                          className="p-1 text-surface-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add new category */}
              <div className="bg-surface-800/30 border border-dashed border-surface-700/50 rounded-xl p-3 flex items-center gap-2">
                <input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Новая категория..."
                  className="flex-1 bg-transparent text-sm text-surface-300 placeholder-surface-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddCategory();
                  }}
                  disabled={!newCat.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 disabled:opacity-30 disabled:cursor-default transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Добавить
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button onClick={onBack} className="btn-ghost flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Назад
              </button>

              <button
                onClick={handleGenerate}
                className="btn-secondary flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Перегенерировать
              </button>

              <button
                onClick={handleMergeAI}
                disabled={merging || editableCategories.length < 2}
                className="btn-secondary flex items-center gap-2"
              >
                {merging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Merge className="w-4 h-4" />
                )}
                Объединить похожие (ИИ)
              </button>

              <div className="flex-1" />

              <button
                id="run-categorization-btn"
                onClick={handleApproveAndRun}
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Утвердить и классифицировать
              </button>
            </div>
          </div>
        )}

        {/* Phase: Classifying */}
        {phase === 'classifying' && (
          <div className="space-y-6 py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center animate-pulse-glow">
                <Brain className="w-8 h-8 text-brand-400 animate-spin" />
              </div>
              <p className="text-surface-300 font-medium">Классификация запросов...</p>
            </div>

            {/* Progress bar */}
            <div className="max-w-md mx-auto w-full">
              <div className="flex justify-between text-xs text-surface-500 mb-2">
                <span>Прогресс</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-3 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500 relative"
                  style={{ width: `${progressPct}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" />
                </div>
              </div>
              <p className="text-xs text-surface-600 mt-2 text-center">
                {progress.status === 'processing' && `Обработка запросов: ${progress.current}/${progress.total}`}
                {progress.status === 'applying' && 'Применение категорий к группам...'}
              </p>
            </div>
          </div>
        )}

        {/* Phase: Done */}
        {phase === 'done' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold text-surface-100">Классификация завершена!</p>
            <button
              id="step3-next-btn"
              onClick={onNext}
              className="btn-primary flex items-center gap-2"
            >
              Смотреть результаты
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
