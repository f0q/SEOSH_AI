/**
 * @router ai
 * @description tRPC router for AI provider configuration.
 * List models is user-level; provider configuration is superadmin-level.
 */

import { router, protectedProcedure, superadminProcedure } from "@/server/trpc";
import { z } from "zod";

export const aiRouter = router({
  /** Get available models for the current user's selected provider */
  listModels: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Read from AIProviderConfig + UserAIPreferences
    return [
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "openrouter", costPer1k: 5 },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "openrouter", costPer1k: 50 },
      { id: "openai/gpt-4o", name: "GPT-4o", provider: "openrouter", costPer1k: 40 },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openrouter", costPer1k: 2 },
    ];
  }),

  /** Update user's AI model preferences */
  updatePreferences: protectedProcedure
    .input(z.object({
      modelCategorize: z.string().optional(),
      modelContent: z.string().optional(),
      modelAnalyze: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: prisma.userAIPreferences.upsert
      return { success: true };
    }),

  /** SUPERADMIN: Configure a new AI provider */
  configureProvider: superadminProcedure
    .input(z.object({
      provider: z.enum(["openrouter", "openai", "anthropic", "ollama"]),
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      isDefault: z.boolean().default(false),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      // TODO: prisma.aIProviderConfig.upsert
      return { success: true };
    }),

  /** SUPERADMIN: List all configured providers with status */
  listProviders: superadminProcedure.query(async () => {
    // TODO: prisma.aIProviderConfig.findMany
    return [];
  }),
});
