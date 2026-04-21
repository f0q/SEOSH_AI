import { useState, useEffect } from 'react';
import { listSessions, deleteSession } from '../api/client';
import type { SessionSummary } from '../api/client';
import { History, Trash2, ExternalLink, FileText, Tag, Globe, ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  currentSessionId: string | null;
  onResume: (sessionId: string, url: string) => void;
}

export default function SessionHistory({ currentSessionId, onResume }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listSessions();
      setSessions(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  return (
    <div className="relative">
      <button
        id="history-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 text-sm font-medium ${
          open
            ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
            : 'bg-surface-800/60 border-surface-700/50 text-surface-400 hover:text-surface-200 hover:border-surface-600'
        }`}
      >
        <History className="w-4 h-4" />
        История
        {sessions.length > 0 && !loading && (
          <span className="ml-1 text-xs bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">
            {sessions.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown panel — fixed so it escapes header stacking context */}
          <div className="fixed right-6 top-16 z-[200] w-[420px] glass-card border border-surface-700/60 shadow-2xl shadow-black/40 animate-slide-up">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-400" />
                <span className="font-semibold text-surface-200 text-sm">История сессий</span>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Обновить'}
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-10 text-center text-surface-500 text-sm">
                  Нет сохранённых сессий
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sessions.map((session) => {
                    const isCurrent = session.id === currentSessionId;
                    const isComplete = session.queryCount > 0 && session.categoryCount > 0;

                    return (
                      <button
                        key={session.id}
                        id={`history-session-${session.id}`}
                        onClick={() => {
                          onResume(session.id, session.url);
                          setOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                          isCurrent
                            ? 'bg-brand-500/10 border border-brand-500/20'
                            : 'hover:bg-surface-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Globe className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-surface-200 truncate">
                                {getDomain(session.url)}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  текущая
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-surface-500">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {session.queryCount} запр.
                              </span>
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {session.categoryCount} кат.
                              </span>
                              <span className="text-surface-600">·</span>
                              <span>{formatDate(session.createdAt)}</span>
                            </div>

                            {isComplete && (
                              <div className="mt-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                <span className="text-[10px] text-emerald-400">Классификация завершена</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-brand-400" />
                            <button
                              onClick={(e) => handleDelete(session.id, e)}
                              disabled={deletingId === session.id}
                              className="p-1 text-surface-600 hover:text-red-400 transition-colors"
                            >
                              {deletingId === session.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
