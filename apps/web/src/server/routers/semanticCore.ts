/**
 * @router semanticCore
 * @description tRPC router for semantic core operations.
 * Migrated and adapted from SEO_classify Express routes.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";
import { groupQueriesLexically, normalizeForStorage } from "../services/lexicalGrouper";

// ─── Real OpenRouter call ───────────────────────────────────────────────────
async function callOpenRouter(
  config: { apiKey: string; model: string; baseUrl: string },
  prompt: string
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://seosh.ai",
      "X-Title": "SEOSH.AI Semantic Core",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Helper to get AI config from env ───────────────────────────────────────
function getAIConfig(modelOverride?: string) {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: modelOverride || process.env.OPENROUTER_MODEL_CLASSIFY || "google/gemini-2.0-flash-001",
    baseUrl: "https://openrouter.ai/api/v1",
  };
}

export const semanticCoreRouter = router({
  /** Get all Semantic Cores for the current user */
  getMany: protectedProcedure.query(async ({ ctx }) => {
    return await prisma.semanticCore.findMany({
      where: { userId: ctx.user.id },
      include: {
        project: { 
          select: { 
            name: true,
            companyProfile: { select: { companyName: true } }
          } 
        },
        _count: {
          select: { queries: true, categories: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }),
  /** Initiate a Semantic Core session *after* sitemap is fetched */
  createSession: protectedProcedure
    .input(z.object({ projectId: z.string().optional(), siteUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.projectId) {
        // Basic ownership check
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, userId: ctx.user.id }
        });
        if (!project) throw new Error("Project not found");
      }

      return await prisma.semanticCore.create({
        data: { 
          projectId: input.projectId || null, 
          siteUrl: input.siteUrl,
          userId: ctx.user.id
        }
      });
    }),

  /** Group raw queries lexically and save to DB */
  groupQueries: protectedProcedure
    .input(
      z.object({
        semanticCoreId: z.string(),
        queries: z.array(z.string()).min(1).max(50000),
      })
    )
    .mutation(async ({ input }) => {
      const groups = groupQueriesLexically(input.queries);
      
      // Save everything to DB inside a transaction for safety.
      // ⚠️  Delete existing data first to prevent doubling on re-submit.
      await prisma.$transaction(async (tx: any) => {
        // Clear old lexical groups (queries cascade via FK)
        await tx.lexicalGroup.deleteMany({ where: { semanticCoreId: input.semanticCoreId } });
        // Clear orphaned queries (in case any exist without a group)
        await tx.query.deleteMany({ where: { semanticCoreId: input.semanticCoreId } });

        for (const g of groups) {
          const dbGroup = await tx.lexicalGroup.create({
            data: {
              representativeQuery: g.representative,
              semanticCoreId: input.semanticCoreId,
            }
          });
          
          await tx.query.createMany({
            data: g.queries.map((q: string) => ({
              text: q,
              normalizedText: normalizeForStorage(q),
              semanticCoreId: input.semanticCoreId,
              groupId: dbGroup.id,
            }))
          });
        }
      });
      
      return {
        totalQueries: input.queries.length,
        totalGroups: groups.length,
        groups: groups.slice(0, 100), // Return first 100 for preview
      };
    }),

  /** Get lexical groups for an existing semantic core (for Step 2 display) */
  getGroups: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .query(async ({ input }) => {
      const groups = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        include: {
          queries: { select: { id: true, text: true } },
        },
        orderBy: { queries: { _count: "desc" } },
      });

      const totalQueries = groups.reduce((sum: number, g: any) => sum + g.queries.length, 0);

      return {
        groups: groups.map((g: any) => ({
          id: g.id,
          representative: g.representativeQuery,
          count: g.queries.length,
          queries: g.queries.map((q: any) => q.text),
        })),
        totalGroups: groups.length,
        totalQueries,
        compressionPct: totalQueries > 0 ? Math.round((1 - groups.length / totalQueries) * 100) : 0,
      };
    }),

  /** Generate AI categories from representative queries */
  generateCategories: protectedProcedure
    .input(
      z.object({
        semanticCoreId: z.string(),
        websiteUrl: z.string().optional(),
        modelId: z.string().optional(),
        language: z.string().optional(), // e.g. "ru", "en", "de"
      })
    )
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);
      if (!config.apiKey) throw new Error("OpenRouter API key not configured");

      // Get site URL from DB if not passed
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId },
        select: { siteUrl: true },
      });
      const siteUrl = input.websiteUrl || core?.siteUrl || "(unknown)";

      // Fetch representatives
      const reps = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        take: 100,
        orderBy: { queries: { _count: "desc" } },
        select: { representativeQuery: true },
      });
      const repStrings = reps.map((r: any) => r.representativeQuery);

      if (repStrings.length === 0)
        throw new Error("No keyword groups found. Complete Step 2 (upload keywords) first.");

      const langNames: Record<string, string> = {
        ru: "Russian", en: "English", de: "German", es: "Spanish",
        fr: "French", pt: "Portuguese", it: "Italian", pl: "Polish",
        tr: "Turkish", uk: "Ukrainian", kk: "Kazakh", zh: "Chinese", ar: "Arabic",
      };
      const outputLanguage = langNames[input.language || "ru"] || "Russian";

      const prompt = `You are a senior SEO strategist. Below are the most representative keyword queries from a website: ${siteUrl}

Keyword representatives:
${repStrings.slice(0, 80).map((q, i) => `${i + 1}. ${q}`).join("\n")}

Task: Suggest 5-12 broad content categories to organize these keywords into a semantic content plan. Categories should reflect the website's main topics and match its structure.

Rules:
- Write ALL category names in ${outputLanguage} language ONLY
- Each category name should be 2-5 words, clear and descriptive
- Think like an SEO strategist planning a site's content sections
- Avoid generic names like "Other" or "Miscellaneous"
- Return ONLY a valid JSON array of strings, nothing else
- Example output (in ${outputLanguage}): ["Category One", "Category Two", "Category Three"]`;

      const aiResponse = await callOpenRouter(config, prompt);

      // Parse JSON array from AI response
      let categories: string[] = [];
      try {
        const match = aiResponse.match(/\[[\s\S]*?\]/);
        if (match) categories = JSON.parse(match[0]);
      } catch {
        // Fallback: parse line by line
        categories = aiResponse
          .split("\n")
          .map((l) => l.replace(/^[\-\*•"\d\.\)]+\s*/, "").replace(/",$/, "").replace(/^"|"$/g, "").trim())
          .filter((l) => l.length > 2 && l.length < 60)
          .slice(0, 12);
      }

      if (categories.length === 0)
        throw new Error("AI returned no categories. Try a different model or add more keywords first.");

      // Persist: wipe old categories, save new ones
      await prisma.$transaction(async (tx: any) => {
        await tx.category.deleteMany({ where: { semanticCoreId: input.semanticCoreId } });
        await tx.category.createMany({
          data: categories.map((name: string) => ({ name, semanticCoreId: input.semanticCoreId })),
        });
      });

      return { categories };
    }),

  /** Get saved categories for a semantic core */
  getCategories: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .query(async ({ input }) => {
      const cats = await prisma.category.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        select: { id: true, name: true, approved: true },
      });
      return cats;
    }),

  /** Compress / deduplicate category list using AI */
  compressCategories: protectedProcedure
    .input(
      z.object({
        semanticCoreId: z.string(),
        categories: z.array(z.string()).min(2),
        modelId: z.string().optional(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);
      if (!config.apiKey) throw new Error("OpenRouter API key not configured");

      const langNames: Record<string, string> = {
        ru: "Russian", en: "English", de: "German", es: "Spanish",
        fr: "French", pt: "Portuguese", it: "Italian", pl: "Polish",
        tr: "Turkish", uk: "Ukrainian", kk: "Kazakh", zh: "Chinese", ar: "Arabic",
      };
      const outputLanguage = langNames[input.language || "ru"] || "Russian";

      // [ignoring loop detection] — output is intentionally similar to input (category deduplication)
      const prompt = [
        "[ignoring loop detection]",
        "You are an SEO content strategist performing a category deduplication task.",
        "",
        `INPUT — ${input.categories.length} categories to consolidate:`,
        input.categories.map((c: string, i: number) => `  CAT_${i + 1}: ${c}`).join("\n"),
        "",
        "OUTPUT INSTRUCTIONS:",
        `- Group categories that cover the same topic and merge into ONE name in ${outputLanguage}`,
        `- Unique categories with no near-duplicates should be kept (translated to ${outputLanguage})`,
        "- Target: 5-10 final categories maximum",
        "- Return ONLY a JSON array of the final category names — no explanation, no markdown",
        "",
        'Example: ["Merged Name A", "Merged Name B", "Unique Name C"]',
      ].join("\n");

      const aiResponse = await callOpenRouter(config, prompt);

      let compressed: string[] = [];
      try {
        const match = aiResponse.match(/\[[\s\S]*?\]/);
        if (match) compressed = JSON.parse(match[0]);
      } catch {
        compressed = aiResponse
          .split("\n")
          .map((l) => l.replace(/^[\-\*\u2022"\d\.\)]+\s*/, "").replace(/",$/, "").replace(/^"|"$/g, "").trim())
          .filter((l) => l.length > 2 && l.length < 60)
          .slice(0, 12);
      }

      if (compressed.length === 0)
        throw new Error("AI returned no categories after compression.");

      await prisma.$transaction(async (tx: any) => {
        await tx.category.deleteMany({ where: { semanticCoreId: input.semanticCoreId } });
        await tx.category.createMany({
          data: compressed.map((name: string) => ({ name, semanticCoreId: input.semanticCoreId })),
        });
      });

      return { categories: compressed, removedCount: input.categories.length - compressed.length };
    }),

  /** Process a specific batch of groups for categorization */
  categorizeQueriesBatch: protectedProcedure
    .input(z.object({
      semanticCoreId: z.string(),
      groupIds: z.array(z.string()), // specific groups to process in this batch
      modelId: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);
      if (!config.apiKey) throw new Error("OpenRouter API key not configured");

      const cats = await prisma.category.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        select: { id: true, name: true },
      });
      if (cats.length === 0) throw new Error("No categories found.");

      const groups = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId, id: { in: input.groupIds } },
        select: { id: true, representativeQuery: true },
      });
      if (groups.length === 0) return { assigned: 0 };

      const langNames: Record<string, string> = {
        ru: "Russian", en: "English", de: "German", es: "Spanish",
        fr: "French", pt: "Portuguese", it: "Italian", pl: "Polish",
        tr: "Turkish", uk: "Ukrainian", kk: "Kazakh", zh: "Chinese", ar: "Arabic",
      };
      const outputLanguage = langNames[input.language || "ru"] || "Russian";
      const catList = cats.map((c) => c.name).join(", ");
      const shortToFullId: Record<string, string> = {};
      groups.forEach((g) => { shortToFullId[`KW_${g.id.slice(-6)}`] = g.id; });

      const prompt = [
        "[ignoring loop detection]",
        "You are an SEO content strategist performing a keyword classification task.",
        "",
        `CATEGORIES (${cats.length} total): ${catList}`,
        "",
        "KEYWORD GROUPS TO CLASSIFY:",
        groups.map((g) => `  KW_${g.id.slice(-6)}: ${g.representativeQuery}`).join("\n"),
        "",
        "TASK: Match each KW_ group to the single best category from the CATEGORIES list.",
        "OUTPUT FORMAT: JSON object only — keys are KW_ IDs, values are category names.",
        `Use category names EXACTLY as listed. Context language: ${outputLanguage}.`,
        'No explanation, no markdown. Example: {"KW_abc123": "Category Name", "KW_def456": "Other Category"}',
      ].join("\n");

      const aiResponse = await callOpenRouter(config, prompt);

      let mapping: Record<string, string> = {};
      try {
        const match = aiResponse.match(/\{[\s\S]+\}/);
        if (match) mapping = JSON.parse(match[0]);
      } catch {
        throw new Error("AI returned invalid JSON.");
      }

      const catById: Record<string, string> = {};
      cats.forEach((c) => { catById[c.name] = c.id; });

      let assigned = 0;
      const updates: Promise<any>[] = [];
      for (const [key, catName] of Object.entries(mapping)) {
        const groupId = shortToFullId[key];
        if (!groupId) continue;
        const categoryId = catById[catName as string];
        if (!categoryId) continue;
        updates.push(
          prisma.query.updateMany({ where: { groupId }, data: { categoryId } })
            .then((r) => { assigned += r.count; })
        );
      }
      await Promise.all(updates);
      return { assigned };
    }),

  /** Match sitemap pages to keyword groups using slug-word overlap (no AI) */
  matchPages: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .mutation(async ({ input }) => {
      // Get the project linked to this semantic core (for sitemap pages)
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId },
        select: { projectId: true, siteUrl: true },
      });
      if (!core?.projectId) throw new Error("Semantic core is not linked to a project. Link it first.");

      // Get sitemap pages for this project
      const pages = await prisma.sitemapPage.findMany({
        where: { projectId: core.projectId },
        select: { url: true, title: true, h1: true },
      });
      if (pages.length === 0) throw new Error("No sitemap pages found for this project. Parse the sitemap first.");

      // Get all groups that have a category assigned (only match those)
      const groups = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        select: { id: true, representativeQuery: true },
      });

      // Tokenize helper
      const tokenize = (s: string) =>
        s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, " ").split(/\s+/).filter((w) => w.length > 2);

      // Score a page against a query: count shared word tokens
      const scoreMatch = (query: string, page: { url: string; title?: string | null; h1?: string | null }) => {
        const qTokens = new Set(tokenize(query));
        const pText = `${page.url} ${page.title || ""} ${page.h1 || ""}`;
        const pTokens = tokenize(pText);
        let score = 0;
        for (const t of pTokens) if (qTokens.has(t)) score++;
        return score;
      };

      let matched = 0;
      const updates: Promise<any>[] = [];

      for (const group of groups) {
        let bestPage: string | null = null;
        let bestScore = 0;
        for (const page of pages) {
          const score = scoreMatch(group.representativeQuery, page);
          if (score > bestScore) { bestScore = score; bestPage = page.url; }
        }
        if (bestPage && bestScore > 0) {
          matched++;
          updates.push(
            prisma.query.updateMany({ where: { groupId: group.id }, data: { pageUrl: bestPage } })
          );
        }
      }

      await Promise.all(updates);
      return { matched, total: groups.length };
    }),

  /** Approve categories and start batch classification */
  approveCategories: protectedProcedure
    .input(
      z.object({
        semanticCoreId: z.string(),
        categories: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input }) => {
      // Update approved status
      await prisma.category.updateMany({
        where: { semanticCoreId: input.semanticCoreId, name: { in: input.categories } },
        data: { approved: true }
      });
      
      await prisma.semanticCore.update({
        where: { id: input.semanticCoreId },
        data: { status: "analyzing" }
      });
      
      // In a real app we'd dispatch a BullMQ background job here.
      // For MVP we just mock a jobId.
      return { success: true, jobId: `job_${input.semanticCoreId}` };
    }),

  /** Get categorization progress (polling endpoint) */
  getProgress: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      // TODO: Read from Redis job queue
      return { current: 0, total: 0, status: "waiting" as const };
    }),

  /** Get full results for a semantic core */
  getResults: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .query(async ({ input }) => {
      const queries = await prisma.query.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        include: { category: true, group: true }
      });

      const results = queries.map((q: any) => ({
        id: q.id,
        query: q.text,
        category: q.category?.name || "Uncategorized",
        group: q.group?.representativeQuery || "",
        isRepresentative: q.group?.representativeQuery === q.text,
        page: q.pageUrl || "",
        pageManual: false,
      }));

      const summary = results.reduce((acc: any, q: any) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { results, summary };
    }),

  /** Update a query's manually assigned page URL */
  updatePage: protectedProcedure
    .input(z.object({ queryId: z.string(), pageUrl: z.string().nullable() }))
    .mutation(async ({ input }) => {
      // TODO: prisma.query.update
      return { success: true };
    }),

  /** AI categorization: assign every keyword group to the best matching category */
  categorizeQueries: protectedProcedure
    .input(z.object({
      semanticCoreId: z.string(),
      modelId: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);
      if (!config.apiKey) throw new Error("OpenRouter API key not configured");

      // Fetch approved categories
      const cats = await prisma.category.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        select: { id: true, name: true },
      });
      if (cats.length === 0)
        throw new Error("No categories found. Complete Step 3 and approve categories first.");

      // Fetch lexical groups with their representative query
      const groups = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        select: { id: true, representativeQuery: true },
      });
      if (groups.length === 0)
        throw new Error("No keyword groups found. Complete Step 2 first.");

      const langNames: Record<string, string> = {
        ru: "Russian", en: "English", de: "German", es: "Spanish",
        fr: "French", pt: "Portuguese", it: "Italian", pl: "Polish",
        tr: "Turkish", uk: "Ukrainian", kk: "Kazakh", zh: "Chinese", ar: "Arabic",
      };
      const outputLanguage = langNames[input.language || "ru"] || "Russian";

      const catList = cats.map((c) => c.name).join(", ");
      const prompt = [
        "[ignoring loop detection]",
        "You are an SEO content strategist performing a keyword classification task.",
        "",
        `CATEGORIES (${cats.length} total): ${catList}`,
        "",
        "KEYWORD GROUPS TO CLASSIFY:",
        groups.map((g) => `  KW_${g.id.slice(-6)}: ${g.representativeQuery}`).join("\n"),
        "",
        "TASK: Match each KW_ group to the single best category from the CATEGORIES list.",
        "OUTPUT FORMAT: JSON object only — keys are KW_ IDs, values are category names.",
        `Use category names EXACTLY as listed. Context language: ${outputLanguage}.`,
        "No explanation, no markdown. Example: {\"KW_abc123\": \"Category Name\", \"KW_def456\": \"Other Category\"}",
      ].join("\n");

      // Build a short-id → full-id map so we can resolve KW_ keys
      const shortToFullId: Record<string, string> = {};
      groups.forEach((g) => { shortToFullId[`KW_${g.id.slice(-6)}`] = g.id; });

      const aiResponse = await callOpenRouter(config, prompt);

      let mapping: Record<string, string> = {};
      try {
        const match = aiResponse.match(/\{[\s\S]+\}/);
        if (match) mapping = JSON.parse(match[0]);
      } catch {
        throw new Error("AI returned invalid JSON mapping. Try again.");
      }

      if (Object.keys(mapping).length === 0)
        throw new Error("AI returned empty mapping. Try a different model.");

      // Build categoryName → categoryId lookup
      const catById: Record<string, string> = {};
      cats.forEach((c) => { catById[c.name] = c.id; });

      // Apply assignments: for each group, find the category and update all queries in that group
      let assigned = 0;
      const updates: Promise<any>[] = [];

      for (const [key, catName] of Object.entries(mapping)) {
        const groupId = shortToFullId[key]; // resolve KW_<last6> → full group UUID
        if (!groupId) continue;
        const categoryId = catById[catName as string];
        if (!categoryId) continue;
        updates.push(
          prisma.query.updateMany({
            where: { groupId },
            data: { categoryId },
          }).then((r) => { assigned += r.count; })
        );
      }

      await Promise.all(updates);

      return { assigned, totalGroups: groups.length, mappedGroups: Object.keys(mapping).length };
    }),

  /** Move a query (or all queries in a group) to a different category */
  updateQueryCategory: protectedProcedure
    .input(z.object({
      queryId: z.string(),
      categoryName: z.string().nullable(), // null = remove from category
      semanticCoreId: z.string(),
      applyToGroup: z.boolean().default(false), // update all queries in same group
    }))
    .mutation(async ({ input }) => {
      // Resolve category id
      let categoryId: string | null = null;
      if (input.categoryName) {
        const cat = await prisma.category.findFirst({
          where: { semanticCoreId: input.semanticCoreId, name: input.categoryName },
          select: { id: true },
        });
        if (!cat) throw new Error(`Category "${input.categoryName}" not found`);
        categoryId = cat.id;
      }

      if (input.applyToGroup) {
        // Find the group of this query then update all queries in the group
        const q = await prisma.query.findUnique({ where: { id: input.queryId }, select: { groupId: true } });
        if (q?.groupId) {
          await prisma.query.updateMany({
            where: { groupId: q.groupId },
            data: { categoryId },
          });
        } else {
          await prisma.query.update({ where: { id: input.queryId }, data: { categoryId } });
        }
      } else {
        await prisma.query.update({ where: { id: input.queryId }, data: { categoryId } });
      }

      return { success: true };
    }),

  /** Rename a category */
  renameCategory: protectedProcedure
    .input(z.object({ semanticCoreId: z.string(), oldName: z.string(), newName: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: prisma.category.update
      return { success: true };
    }),

  /** Refine a category: AI re-evaluates all its queries */
  refineCategory: protectedProcedure
    .input(z.object({ semanticCoreId: z.string(), categoryName: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Get queries from DB → call refineCategory AI → apply moves
      return { moved: 0, total: 0, moves: [] };
    }),

  /** Export results as CSV */
  exportCsv: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Query DB → generateCsv → return base64 CSV
      return { csv: "" };
    }),

  /** Link/unlink a semantic core to a project */
  linkToProject: protectedProcedure
    .input(z.object({ 
      semanticCoreId: z.string(), 
      projectId: z.string().nullable() 
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId, userId: ctx.user.id }
      });
      if (!core) throw new Error("Semantic core not found");

      if (input.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, userId: ctx.user.id }
        });
        if (!project) throw new Error("Project not found");
      }

      return await prisma.semanticCore.update({
        where: { id: input.semanticCoreId },
        data: { projectId: input.projectId }
      });
    }),

  /** Delete a semantic core and all its data */
  delete: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId, userId: ctx.user.id }
      });
      if (!core) throw new Error("Semantic core not found");

      // Cascade delete is handled by Prisma schema
      await prisma.semanticCore.delete({
        where: { id: input.semanticCoreId }
      });
      return { success: true };
    }),

  /** Merge multiple semantic cores together */
  mergeCores: protectedProcedure
    .input(z.object({
      coreIds: z.array(z.string()).min(2),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Fetch all selected cores & their queries
      const cores = await prisma.semanticCore.findMany({
        where: { id: { in: input.coreIds }, userId: ctx.user.id },
        include: { queries: true }
      });
      if (cores.length !== input.coreIds.length) throw new Error("Some cores not found or unauthorized");

      // 2. Extract and deduplicate raw queries
      const allRawQueries = new Set<string>();
      cores.forEach(c => {
        c.queries.forEach(q => allRawQueries.add(q.query));
      });
      const uniqueQueries = Array.from(allRawQueries);

      if (uniqueQueries.length === 0) throw new Error("No queries found to merge.");

      // 3. Create a master core
      const masterCore = await prisma.semanticCore.create({
        data: {
          siteUrl: "merged-cores",
          userId: ctx.user.id,
        }
      });

      // 4. Run N-gram lexical grouper on the deduped list
      const groups = groupQueriesLexically(uniqueQueries);

      const lexicalGroupInserts = groups.map((g) => ({
        id: crypto.randomUUID(),
        semanticCoreId: masterCore.id,
        centroid: g.centroid,
      }));

      await prisma.lexicalGroup.createMany({ data: lexicalGroupInserts });

      const queryInserts: Array<{
        id: string;
        query: string;
        normalized: string;
        semanticCoreId: string;
        lexicalGroupId: string;
      }> = [];

      groups.forEach((g, idx) => {
        const groupId = lexicalGroupInserts[idx].id;
        g.items.forEach((queryStr) => {
          queryInserts.push({
            id: crypto.randomUUID(),
            query: queryStr,
            normalized: normalizeForStorage(queryStr),
            semanticCoreId: masterCore.id,
            lexicalGroupId: groupId,
          });
        });
      });

      await prisma.query.createMany({ data: queryInserts });

      // Note: We don't automatically generate categories here. The user will be redirected to the Master Core to generate categories with AI, saving tokens.
      
      return {
        success: true,
        masterCoreId: masterCore.id,
        totalMerged: uniqueQueries.length,
        fromCores: cores.length
      };
    })
});
