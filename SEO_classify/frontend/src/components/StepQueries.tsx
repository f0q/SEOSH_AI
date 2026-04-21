import { useState } from 'react';
import { uploadQueries } from '../api/client';
import type { QueryGroup } from '../api/client';
import { FileText, Upload, ArrowRight, ArrowLeft, Loader2, Users, Star } from 'lucide-react';

interface Props {
  sessionId: string;
  queryGroups: QueryGroup[];
  totalQueries: number;
  onQueriesGrouped: (groups: QueryGroup[], total: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepQueries({
  sessionId,
  queryGroups,
  totalQueries,
  onQueriesGrouped,
  onNext,
  onBack,
}: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const handleUpload = async () => {
    const queries = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (queries.length === 0) {
      setError('Введите хотя бы один запрос');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await uploadQueries(sessionId, queries);
      onQueriesGrouped(result.groups, result.totalQueries);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      // Handle CSV (take first column) or plain text
      const lines = content.split('\n').map((line) => {
        // If comma-separated, take first column
        const parts = line.split(',');
        return parts[0].replace(/^["']|["']$/g, '').trim();
      });
      setText(lines.filter((l) => l.length > 0).join('\n'));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-100">Загрузка запросов</h2>
            <p className="text-sm text-surface-400">Вставьте ключевые запросы (по одному на строку) или загрузите CSV</p>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            id="queries-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="купить ноутбук&#10;ноутбук для работы&#10;лучший ноутбук 2024&#10;ноутбук для игр&#10;..."
            className="input-field resize-y font-mono text-sm"
            disabled={loading}
          />

          <div className="flex items-center gap-4">
            <label className="btn-secondary cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Загрузить CSV
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <span className="text-sm text-surface-500">
              {text.split('\n').filter((l) => l.trim()).length} запросов
            </span>

            <div className="flex-1" />

            <button onClick={onBack} className="btn-ghost flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>

            <button
              id="group-queries-btn"
              onClick={handleUpload}
              disabled={loading || !text.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Группировка...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Группировать
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Grouping Results */}
      {queryGroups.length > 0 && (
        <div className="glass-card p-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-100">
                Лексическая группировка
              </h3>
              <p className="text-sm text-surface-400">
                <span className="text-brand-400 font-medium">{totalQueries}</span> запросов →{' '}
                <span className="text-emerald-400 font-medium">{queryGroups.length}</span> групп →{' '}
                <span className="text-amber-400 font-medium">{queryGroups.length}</span> репрезентативных
              </p>
            </div>
            <button
              id="step2-next-btn"
              onClick={onNext}
              className="btn-primary flex items-center gap-2"
            >
              Далее — Генерация категорий
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-brand-400">{totalQueries}</p>
              <p className="text-xs text-surface-500 mt-1">Всего запросов</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{queryGroups.length}</p>
              <p className="text-xs text-surface-500 mt-1">Лексических групп</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {Math.round((1 - queryGroups.length / totalQueries) * 100)}%
              </p>
              <p className="text-xs text-surface-500 mt-1">Сжатие для ИИ</p>
            </div>
          </div>

          {/* Groups list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {queryGroups.map((group) => (
              <div
                key={group.id}
                className="bg-surface-800/40 rounded-xl border border-surface-700/50 overflow-hidden transition-all hover:border-surface-600/50"
              >
                <button
                  onClick={() =>
                    setExpandedGroup(expandedGroup === group.id ? null : group.id)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-surface-200">
                      {group.representative}
                    </span>
                  </div>
                  <span className="badge-purple">{group.queryCount} запр.</span>
                </button>

                {expandedGroup === group.id && (
                  <div className="px-4 pb-3 border-t border-surface-700/30">
                    <div className="pt-2 space-y-1">
                      {group.queries.map((q) => (
                        <p
                          key={q.id}
                          className={`text-xs px-3 py-1.5 rounded-lg ${
                            q.text === group.representative
                              ? 'bg-brand-500/10 text-brand-300'
                              : 'text-surface-400'
                          }`}
                        >
                          {q.text}
                          {q.text === group.representative && (
                            <span className="ml-2 text-[10px] text-brand-400">← репрезент.</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
