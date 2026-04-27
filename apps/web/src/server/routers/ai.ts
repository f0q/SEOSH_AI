/**
 * @router ai
 * @description tRPC router for AI provider configuration.
 * List models is user-level; provider configuration is superadmin-level.
 * 
 * costPer1k = blended SEOSH tokens per 1,000 API tokens (avg of input+output).
 * Formula: ((promptPricePerM + completionPricePerM) / 2) / 1,000,000 * 1,000 * USD_TO_TOKENS
 *        = (promptPricePerM + completionPricePerM) / 1000 * USD_TO_TOKENS
 * Where USD_TO_TOKENS = 2000 ($1 = 2000 SEOSH tokens)
 */

import { router, protectedProcedure, superadminProcedure } from "@/server/trpc";
import { z } from "zod";

// ─── Model Catalog ─────────────────────────────────────────────────────────
// Pricing sourced from OpenRouter API. Sorted by cost within each group.
// costPer1k = blended SEOSH tokens per 1,000 API tokens

const MODEL_CATALOG = [
  // ─── Google ────────────────────────────────────────────────────────────────
  { id: "google/gemini-2.5-flash-lite",     name: "Gemini 2.5 Flash Lite",     provider: "Google",     promptPerM: 0.10,  completionPerM: 0.40  },
  { id: "google/gemini-2.0-flash-001",      name: "Gemini 2.0 Flash",          provider: "Google",     promptPerM: 0.10,  completionPerM: 0.40  },
  { id: "google/gemini-2.5-flash",          name: "Gemini 2.5 Flash",          provider: "Google",     promptPerM: 0.30,  completionPerM: 2.50  },
  { id: "google/gemini-2.5-pro",            name: "Gemini 2.5 Pro",            provider: "Google",     promptPerM: 1.25,  completionPerM: 10.00 },

  // ─── OpenAI ────────────────────────────────────────────────────────────────
  { id: "openai/gpt-4.1-nano",              name: "GPT-4.1 Nano",              provider: "OpenAI",     promptPerM: 0.10,  completionPerM: 0.40  },
  { id: "openai/gpt-4o-mini",               name: "GPT-4o Mini",               provider: "OpenAI",     promptPerM: 0.15,  completionPerM: 0.60  },
  { id: "openai/gpt-4.1-mini",              name: "GPT-4.1 Mini",              provider: "OpenAI",     promptPerM: 0.40,  completionPerM: 1.60  },
  { id: "openai/o4-mini",                   name: "o4 Mini",                   provider: "OpenAI",     promptPerM: 1.10,  completionPerM: 4.40  },
  { id: "openai/gpt-5-nano",                name: "GPT-5 Nano",                provider: "OpenAI",     promptPerM: 0.05,  completionPerM: 0.40  },
  { id: "openai/gpt-5-mini",                name: "GPT-5 Mini",                provider: "OpenAI",     promptPerM: 0.25,  completionPerM: 2.00  },
  { id: "openai/gpt-5",                     name: "GPT-5",                     provider: "OpenAI",     promptPerM: 1.25,  completionPerM: 10.00 },
  { id: "openai/gpt-5.5",                   name: "GPT-5.5",                   provider: "OpenAI",     promptPerM: 5.00,  completionPerM: 30.00 },
  { id: "openai/gpt-4.1",                   name: "GPT-4.1",                   provider: "OpenAI",     promptPerM: 2.00,  completionPerM: 8.00  },
  { id: "openai/gpt-4o",                    name: "GPT-4o",                    provider: "OpenAI",     promptPerM: 2.50,  completionPerM: 10.00 },
  { id: "openai/o3",                         name: "o3",                        provider: "OpenAI",     promptPerM: 2.00,  completionPerM: 8.00  },

  // ─── Anthropic ─────────────────────────────────────────────────────────────
  { id: "anthropic/claude-3.5-haiku",        name: "Claude 3.5 Haiku",          provider: "Anthropic",  promptPerM: 0.80,  completionPerM: 4.00  },
  { id: "anthropic/claude-sonnet-4",         name: "Claude Sonnet 4",           provider: "Anthropic",  promptPerM: 3.00,  completionPerM: 15.00 },
  { id: "anthropic/claude-sonnet-4.6",       name: "Claude Sonnet 4.6",         provider: "Anthropic",  promptPerM: 3.00,  completionPerM: 15.00 },
  { id: "anthropic/claude-opus-4",           name: "Claude Opus 4",             provider: "Anthropic",  promptPerM: 15.00, completionPerM: 75.00 },
  { id: "anthropic/claude-opus-4.6",         name: "Claude Opus 4.6",           provider: "Anthropic",  promptPerM: 5.00,  completionPerM: 25.00 },

  // ─── DeepSeek ──────────────────────────────────────────────────────────────
  { id: "deepseek/deepseek-chat-v3-0324",    name: "DeepSeek V3",               provider: "DeepSeek",   promptPerM: 0.20,  completionPerM: 0.77  },
  { id: "deepseek/deepseek-r1",              name: "DeepSeek R1",               provider: "DeepSeek",   promptPerM: 0.70,  completionPerM: 2.50  },

  // ─── xAI ──────────────────────────────────────────────────────────────────
  { id: "x-ai/grok-3-mini",                  name: "Grok 3 Mini",               provider: "xAI",        promptPerM: 0.30,  completionPerM: 0.50  },
  { id: "x-ai/grok-3",                       name: "Grok 3",                    provider: "xAI",        promptPerM: 3.00,  completionPerM: 15.00 },
] as const;

/**
 * Convert model catalog entry to the public format with costPer1k.
 * costPer1k = blended cost in SEOSH tokens per 1,000 API tokens.
 */
function catalogToModel(entry: typeof MODEL_CATALOG[number]) {
  const USD_TO_TOKENS = 2000;
  // Blended rate: average of prompt and completion per 1M tokens → per 1K
  const blendedPerM = (entry.promptPerM + entry.completionPerM) / 2;
  const costPer1k = Math.round((blendedPerM / 1_000_000) * 1_000 * USD_TO_TOKENS * 100) / 100;
  // Round up to make small values visible
  const finalCost = Math.max(0.01, costPer1k);
  
  return {
    id: entry.id,
    name: entry.name,
    provider: entry.provider,
    costPer1k: finalCost,
    promptPerM: entry.promptPerM,
    completionPerM: entry.completionPerM,
  };
}

export const aiRouter = router({
  /** Get available models for the current user's selected provider */
  listModels: protectedProcedure.query(async ({ ctx }) => {
    return MODEL_CATALOG.map(catalogToModel);
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
