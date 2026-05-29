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
import { prisma } from "../db";
import { encrypt, maskApiKey } from "../lib/encryption";
import { callOpenRouterWithCost, getAIConfig } from "../services/ai";
import { deductByCost } from "../services/tokenService";

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

  /** Read current user's AI preferences. */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return prisma.userAIPreferences.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id },
      update: {},
      select: {
        modelCategorize: true,
        modelContent: true,
        modelAnalyze: true,
      },
    });
  }),

  /** Update user's AI model preferences. */
  updatePreferences: protectedProcedure
    .input(z.object({
      modelCategorize: z.string().optional().nullable(),
      modelContent: z.string().optional().nullable(),
      modelAnalyze: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await prisma.userAIPreferences.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          modelCategorize: input.modelCategorize ?? undefined,
          modelContent: input.modelContent ?? undefined,
          modelAnalyze: input.modelAnalyze ?? undefined,
        },
        update: {
          modelCategorize: input.modelCategorize ?? undefined,
          modelContent: input.modelContent ?? undefined,
          modelAnalyze: input.modelAnalyze ?? undefined,
        },
      });
      return { success: true };
    }),

  /**
   * SUPERADMIN: Configure (create or update) a provider. API key is encrypted
   * before storage; passing an empty string keeps the existing one untouched.
   */
  configureProvider: superadminProcedure
    .input(z.object({
      provider: z.enum(["openrouter", "openai", "anthropic", "ollama"]),
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      isDefault: z.boolean().default(false),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const existing = await prisma.aIProviderConfig.findFirst({
        where: { provider: input.provider },
      });

      if (input.isDefault) {
        // Only one default at a time.
        await prisma.aIProviderConfig.updateMany({
          where: { NOT: { id: existing?.id ?? "_none" } },
          data: { isDefault: false },
        });
      }

      const data = {
        provider: input.provider,
        baseUrl: input.baseUrl,
        isDefault: input.isDefault,
        enabled: input.enabled,
        ...(input.apiKey && input.apiKey.length > 0 ? { apiKey: encrypt(input.apiKey) } : {}),
      };

      if (existing) {
        return prisma.aIProviderConfig.update({
          where: { id: existing.id },
          data,
        });
      }
      return prisma.aIProviderConfig.create({
        data: { ...data, models: [] },
      });
    }),

  /**
   * Fetch the given URL, scrape title + meta description + og tags + first H1,
   * then ask the picked model to produce companyName / industry / description /
   * geography as JSON. Charges tokens. Used by the onboarding "AI Auto-Fill"
   * button on Step 1 (Company).
   */
  autoFillCompany: protectedProcedure
    .input(z.object({
      url: z.string().refine(v => /^https?:\/\/.+/.test(v), {
        message: "URL must start with http:// or https://",
      }),
      modelId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const scraped = await scrapeSiteForCompanyHints(input.url);
      const prompt = buildAutoFillPrompt(input.url, scraped);

      const config = getAIConfig(input.modelId);
      if (!config.apiKey) throw new Error("OpenRouter API key is not configured");

      const { text, costUsd } = await callOpenRouterWithCost(config, prompt, true);

      let parsed: { companyName?: string; industry?: string; description?: string; geography?: string };
      try {
        parsed = JSON.parse(text);
      } catch {
        // Some models still wrap JSON despite response_format. Try to extract.
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("Model did not return valid JSON");
        parsed = JSON.parse(m[0]);
      }

      const { deducted, newBalance } = await deductByCost(
        ctx.user.id,
        costUsd,
        "AI_CLASSIFY",
        `onboarding auto-fill url=${input.url} model=${input.modelId}`,
      );

      return {
        companyName: parsed.companyName?.trim() || "",
        industry: parsed.industry?.trim() || "",
        description: parsed.description?.trim() || "",
        geography: parsed.geography?.trim() || "",
        deducted,
        newBalance,
      };
    }),

  /** SUPERADMIN: List all configured providers (API keys masked). */
  listProviders: superadminProcedure.query(async () => {
    const rows = await prisma.aIProviderConfig.findMany({ orderBy: { provider: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      enabled: row.enabled,
      isDefault: row.isDefault,
      baseUrl: row.baseUrl,
      apiKeyMasked: row.apiKey ? maskApiKey(row.apiKey.slice(0, 8)) : null,
      hasApiKey: !!row.apiKey,
      updatedAt: row.updatedAt,
    }));
  }),
});

// ─── autoFillCompany helpers ─────────────────────────────────────────────────

interface ScrapedHints {
  title: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogLocale: string | null;
  firstH1: string | null;
  hostHint: string | null;
  htmlLang: string | null;
}

async function scrapeSiteForCompanyHints(url: string): Promise<ScrapedHints> {
  const empty: ScrapedHints = {
    title: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    ogLocale: null,
    firstH1: null,
    hostHint: null,
    htmlLang: null,
  };

  let host: string | null = null;
  try { host = new URL(url).host; } catch { /* keep null */ }
  empty.hostHint = host;

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SEOSH.AI bot (https://seosh.aijam.pro)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return empty;
    // Cap the body so we don't OOM on huge pages.
    const buf = await res.arrayBuffer();
    html = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 200_000));
  } catch {
    return empty;
  }

  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? decodeEntities(m[1].trim()) : null;
  };

  return {
    title:           pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    metaDescription: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
    ogTitle:         pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i),
    ogDescription:   pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
    ogLocale:        pick(/<meta[^>]+property=["']og:locale["'][^>]+content=["']([^"']+)["']/i),
    firstH1:         pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, "").trim() ?? null,
    hostHint:        host,
    htmlLang:        pick(/<html[^>]+lang=["']([^"']+)["']/i),
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function buildAutoFillPrompt(url: string, hints: ScrapedHints): string {
  const lines = [
    `URL: ${url}`,
    hints.hostHint ? `Host: ${hints.hostHint}` : null,
    hints.title ? `<title>: ${hints.title}` : null,
    hints.metaDescription ? `<meta description>: ${hints.metaDescription}` : null,
    hints.ogTitle ? `og:title: ${hints.ogTitle}` : null,
    hints.ogDescription ? `og:description: ${hints.ogDescription}` : null,
    hints.firstH1 ? `<h1>: ${hints.firstH1}` : null,
    hints.htmlLang || hints.ogLocale ? `Locale: ${hints.htmlLang ?? hints.ogLocale}` : null,
  ].filter(Boolean).join("\n");

  return `Based on the website signals below, extract company info to pre-fill an onboarding form. Return STRICT JSON with exactly these keys: companyName, industry, description, geography.

Rules:
- companyName: brand/company name as it would appear in marketing (NOT the domain).
- industry: one short category (e.g. "E-commerce", "SaaS", "Local Services", "Healthcare").
- description: 1-2 sentences about what they do and for whom. Match the source language (Russian if the site is in Russian).
- geography: target market (country/region/city), or "Global" if unclear.
- If a field is genuinely unknowable from the signals, use an empty string. Do NOT invent specifics.

Signals:
${lines || "(no signals could be scraped — infer cautiously from the URL alone)"}

JSON only:`;
}
