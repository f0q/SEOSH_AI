import { useState } from 'react';
import { signOut } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { Coins, LogOut, ChevronDown, User, TrendingUp } from 'lucide-react';

export default function UserMenu() {
  const { user, tokenInfo, isLoading, setUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setShowMenu(false);
  };

  if (isLoading) {
    return <div className="w-20 h-9 bg-surface-800 rounded-xl animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          id="login-btn"
          onClick={() => setShowModal(true)}
          className="btn-primary text-sm px-4 py-2"
        >
          Войти
        </button>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const balance = tokenInfo?.balance ?? 0;
  const balanceColor = balance > 100 ? 'text-emerald-400' : balance > 20 ? 'text-amber-400' : 'text-red-400';
  const balanceBg = balance > 100
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : balance > 20
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-red-500/10 border-red-500/20';

  return (
    <div className="relative flex items-center gap-3">
      {/* Token badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${balanceBg}`}>
        <Coins className={`w-3.5 h-3.5 ${balanceColor}`} />
        <span className={balanceColor}>{balance.toLocaleString('ru')}</span>
        <span className="text-surface-500 hidden sm:inline">токенов</span>
      </div>

      {/* User avatar dropdown */}
      <button
        id="user-menu-btn"
        onClick={() => setShowMenu((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-800/60 border border-surface-700/50 rounded-xl hover:border-surface-600 transition-all"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-surface-200 max-w-[100px] truncate hidden sm:block">{user.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="fixed right-6 top-16 z-[200] w-60 glass-card border border-surface-700/60 shadow-2xl shadow-black/40 animate-slide-up p-2">
            <div className="px-3 py-2 border-b border-surface-700/50 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-surface-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{user.name}</p>
                  <p className="text-xs text-surface-500 truncate">{user.email}</p>
                </div>
              </div>
              <span className="mt-2 badge-purple text-xs inline-flex">{tokenInfo?.plan || 'FREE'}</span>
            </div>

            <div className={`mx-1 mb-2 p-3 rounded-lg border ${balanceBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`w-3.5 h-3.5 ${balanceColor}`} />
                  <span className="text-xs text-surface-400">Баланс</span>
                </div>
                <span className={`text-sm font-bold ${balanceColor}`}>{balance.toLocaleString('ru')}</span>
              </div>
              {balance < 50 && <p className="text-xs text-red-400 mt-1">⚠️ Токены заканчиваются</p>}
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
}
