// Lightweight auth client — uses our own /api/auth endpoints
// No dependency on better-auth client SDK (avoids subpath resolution issues)

import api from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const res = await api.post('/auth/sign-in/email', { email, password });
  return res.data.user;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await api.post('/auth/sign-up/email', { name, email, password });
  return res.data.user;
}

export async function signOut(): Promise<void> {
  await api.post('/auth/sign-out');
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const res = await api.get('/auth/get-session');
    return res.data?.user ?? null;
  } catch {
    return null;
  }
}
