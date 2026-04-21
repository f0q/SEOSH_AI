import { useState } from 'react';
import { createPortal } from 'react-dom';
import { signIn, signUp } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

interface Props {
  onClose?: () => void;
}

type Mode = 'signin' | 'signup';

export default function AuthModal({ onClose }: Props) {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'signin') {
        const user = await signIn(email, password);
        setUser(user);
      } else {
        const user = await signUp(name, email, password);
        setUser(user);
      }
      onClose?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Rendered via portal directly into document.body to escape any header stacking context
  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop — covers full viewport */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md glass-card p-8 animate-slide-up shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-surface-100">
            {mode === 'signin' ? 'Войти в аккаунт' : 'Создать аккаунт'}
          </h2>
          <p className="text-sm text-surface-400 mt-1">
            {mode === 'signin' ? 'Добро пожаловать обратно!' : 'Получите 200 бесплатных токенов'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                required
                className="input-field pl-11"
                disabled={loading}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="input-field pl-11"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              id="auth-password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (мин. 8 символов)"
              required
              minLength={8}
              className="input-field pl-11 pr-11"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</>
            ) : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-surface-500 text-sm">
            {mode === 'signin' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          </span>
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
          >
            {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>

        {mode === 'signup' && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <p className="text-xs text-emerald-400">
              🎁 При регистрации вы получаете <strong>200 бесплатных токенов</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
