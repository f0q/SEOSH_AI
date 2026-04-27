/**
 * @module settings router
 * @description Manages user settings including API keys for external providers.
 */

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { prisma } from "../db";
import { encrypt, decrypt, maskApiKey } from "../lib/encryption";
import { getBalance, getHistory, PRICING_TABLE } from "../services/tokenService";

// Supported API key providers
const API_KEY_PROVIDERS = ["textru", "copyscape", "pixeltools"] as const;
type ApiKeyProvider = typeof API_KEY_PROVIDERS[number];

export const settingsRouter = router({
  /** Save (or update) an API key for a provider */
  saveApiKey: protectedProcedure
    .input(z.object({
      provider: z.enum(API_KEY_PROVIDERS),
      apiKey: z.string().min(1, "API key cannot be empty"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const encrypted = encrypt(input.apiKey);

      // Upsert UserAIPreferences
      const existing = await prisma.userAIPreferences.findUnique({ where: { userId } });

      if (existing) {
        const currentKeys = (existing.apiKeys as Record<string, string>) || {};
        currentKeys[input.provider] = encrypted;
        await prisma.userAIPreferences.update({
          where: { userId },
          data: { apiKeys: currentKeys },
        });
      } else {
        await prisma.userAIPreferences.create({
          data: {
            userId,
            apiKeys: { [input.provider]: encrypted },
          },
        });
      }

      return { success: true, provider: input.provider, masked: maskApiKey(input.apiKey) };
    }),

  /** Remove an API key for a provider */
  removeApiKey: protectedProcedure
    .input(z.object({
      provider: z.enum(API_KEY_PROVIDERS),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const existing = await prisma.userAIPreferences.findUnique({ where: { userId } });
      if (!existing) return { success: true };

      const currentKeys = (existing.apiKeys as Record<string, string>) || {};
      delete currentKeys[input.provider];

      await prisma.userAIPreferences.update({
        where: { userId },
        data: { apiKeys: Object.keys(currentKeys).length > 0 ? currentKeys : undefined },
      });

      return { success: true };
    }),

  /** Get status of all API keys (never returns full keys!) */
  getApiKeyStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const prefs = await prisma.userAIPreferences.findUnique({ where: { userId } });
      const keys = (prefs?.apiKeys as Record<string, string>) || {};

      const status: Record<string, { configured: boolean; masked: string | null }> = {};
      for (const provider of API_KEY_PROVIDERS) {
        if (keys[provider]) {
          try {
            const decrypted = decrypt(keys[provider]!);
            status[provider] = { configured: true, masked: maskApiKey(decrypted) };
          } catch {
            status[provider] = { configured: false, masked: null };
          }
        } else {
          status[provider] = { configured: false, masked: null };
        }
      }

      return status;
    }),

  /** Get current user's token balance */
  getTokenBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getBalance(ctx.user.id);
    return { tokens: balance };
  }),

  /** Get current user's transaction history */
  getTokenHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return getHistory(ctx.user.id, input?.limit ?? 30);
    }),

  /** Get pricing table for display */
  getPricing: protectedProcedure.query(async () => {
    return PRICING_TABLE;
  }),
});

