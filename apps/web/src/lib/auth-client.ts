/**
 * @module auth-client
 * @description Better Auth client for use in React components.
 * Import this in client components to access auth state.
 */

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  plugins: [
    adminClient()
  ]
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;
