/**
 * @module auth-client
 * @description Better Auth client for use in React components.
 * Import this in client components to access auth state.
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;
