import { useState } from 'react';
import Wizard from './components/Wizard';
import SessionHistory from './components/SessionHistory';
import UserMenu from './components/UserMenu';
import { AuthProvider } from './context/AuthContext';
import { Sparkles, Plus } from 'lucide-react';

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const handleNewSession = () => {
    setSessionId(null);
    setResetKey((k) => k + 1);
  };

  const handleResume = (id: string) => {
    // Resuming a past session just navigates directly to results
    setSessionId(id);
    setResetKey((k) => k + 1);
  };

  return (
    <AuthProvider>
    <div className="min-h-screen bg-surface-950 bg-grid relative">
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-surface-800/50 backdrop-blur-md bg-surface-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-100 tracking-tight">
                SEO <span className="gradient-text">Classify</span>
              </h1>
              <p className="text-xs text-surface-500 -mt-0.5">Кластеризация семантического ядра</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="badge-purple hidden sm:flex">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full mr-1.5 animate-pulse" />
              Hybrid AI Engine
            </span>
            <button
              id="new-session-btn"
              onClick={handleNewSession}
              className="btn-ghost flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              Новый анализ
            </button>
            <SessionHistory
              currentSessionId={sessionId}
              onResume={(id) => handleResume(id)}
            />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <Wizard
          key={resetKey}
          initialSessionId={sessionId}
          onSessionChange={setSessionId}
        />
      </main>
    </div>
    </AuthProvider>
  );
}

