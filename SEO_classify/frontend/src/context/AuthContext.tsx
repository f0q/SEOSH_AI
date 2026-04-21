import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSession, AuthUser } from '../lib/auth';
import api from '../api/client';

interface TokenInfo {
  balance: number;
  plan: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  tokenInfo: TokenInfo | null;
  refreshTokens: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  tokenInfo: null,
  refreshTokens: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const fetchTokens = async (userId: string) => {
    try {
      const res = await api.get('/user/me');
      if (res.data?.user) {
        setTokenInfo({ balance: res.data.balance ?? 0, plan: res.data.user.plan ?? 'FREE' });
      }
    } catch {
      setTokenInfo(null);
    }
  };

  useEffect(() => {
    // Check session on mount
    getSession()
      .then((u) => {
        setUser(u);
        if (u) fetchTokens(u.id);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const refreshTokens = () => {
    if (user) fetchTokens(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, tokenInfo, refreshTokens, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
