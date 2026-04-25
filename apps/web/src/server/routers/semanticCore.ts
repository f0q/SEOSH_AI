/**
 * @router semanticCore
 * @description tRPC router for semantic core operations.
 * Migrated and adapted from SEO_classify Express routes.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";
import { groupQueriesLexically, normalizeForStorage } from "../services/lexicalGrouper";

import { callOpenRouter, getAIConfig } from "../services/ai";

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

  /** Get the latest semantic core for the current user (auto-restore on wizard mount) */
  getLatest: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await prisma.semanticCore.findFirst({
        where: {
          userId: ctx.user.id,
          ...(input?.projectId ? { projectId: input.projectId } : {}),
        },
        select: { id: true, siteUrl: true, projectId: true },
        orderBy: { createdAt: 'desc' },
      });
    }),

  /** Initiate a Semantic Core session *after* sitemap is fetched */
  createSession: protectedProcedure
    .input(z.object({ projectId: z.string().optional(), siteUrl: z.string().optional() }))
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
          siteUrl: input.siteUrl || "unknown",
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

  /** Save the AI-generated site structure to the database */
  updateSiteStructure: protectedProcedure
    .input(z.object({
      semanticCoreId: z.string(),
      siteStructure: z.any(),
      competitors: z.array(z.object({
        url: z.string(),
        label: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId, userId: ctx.user.id },
      });
      if (!core) throw new TRPCError({ code: "NOT_FOUND", message: "Semantic core not found" });

      await prisma.semanticCore.update({
        where: { id: input.semanticCoreId },
        data: { siteStructure: input.siteStructure },
      });

      if (input.competitors && core.projectId) {
        // Upsert CompanyProfile with competitors
        await prisma.companyProfile.upsert({
          where: { projectId: core.projectId },
          create: {
            projectId: core.projectId,
            companyName: "My Company", // Default name
            competitors: input.competitors,
          },
          update: {
            competitors: input.competitors,
          },
        });
      }

      return { success: true };
    }),

  /** Get lexical groups for an existing semantic core (for Step 2 display) */
  getGroups: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .query(async ({ input }) => {
      const groups = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        include: {
          queries: { select: { id: true, text: true, usageCount: true } },
        },
        orderBy: { queries: { _count: "desc" } },
      });

      const totalQueries = groups.reduce((sum: number, g: any) => sum + g.queries.length, 0);

      return {
        groups: groups.map((g: any) => ({
          id: g.id,
          representative: g.representativeQuery,
          count: g.queries.length,
          usedCount: g.queries.filter((q: any) => q.usageCount > 0).length,
          queries: g.queries.map((q: any) => ({ text: q.text, usageCount: q.usageCount })),
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
        throw new Error("No keyword groups found. Complete Step 1 (Keywords) first.");

      const langNames: Record<string, string> = {
        ru: "Russian", en: "English", de: "German", es: "Spanish",
        fr: "French", pt: "Portuguese", it: "Italian", pl: "Polish",
        tr: "Turkish", uk: "Ukrainian", kk: "Kazakh", zh: "Chinese", ar: "Arabic",
      };
      const outputLanguage = langNames[input.language || "ru"] || "Russian";

      // Scale target category count to keyword volume
      const repCount = repStrings.length;
      const minCats = repCount <= 2 ? 1 : repCount <= 5 ? 2 : repCount <= 10 ? 3 : 5;
      const maxCats = repCount <= 2 ? Math.max(repCount, 1) : repCount <= 5 ? 5 : repCount <= 10 ? 8 : 12;

      const prompt = `You are a senior SEO strategist. Below are the most representative keyword queries from a website: ${siteUrl}

Keyword representatives (${repCount} total):
${repStrings.slice(0, 80).map((q, i) => `${i + 1}. ${q}`).join("\n")}

Task: Suggest ${minCats}-${maxCats} broad content categories to organize these keywords into a semantic content plan. Categories should reflect the website's main topics and match its structure.

Rules:
- Write ALL category names in ${outputLanguage} language ONLY
- Each category name should be 2-5 words, clear and descriptive
- The number of categories MUST be between ${minCats} and ${maxCats} — no more, no less
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

  /** Rename a category (syncs everywhere — Results + Categories tabs) */
  renameCategory: protectedProcedure
    .input(z.object({ categoryId: z.string(), newName: z.string().min(1).max(100) }))
    .mutation(async ({ input }) => {
      return await prisma.category.update({
        where: { id: input.categoryId },
        data: { name: input.newName.trim() },
      });
    }),

  /** Delete a category — unlinks all queries (sets categoryId = null) */
  deleteCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.$transaction(async (tx: any) => {
        await tx.query.updateMany({
          where: { categoryId: input.categoryId },
          data: { categoryId: null },
        });
        await tx.category.delete({ where: { id: input.categoryId } });
      });
      return { deleted: true };
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
        include: { category: true, group: true },
        orderBy: { text: 'asc' },
      });

      const results = queries.map((q: any) => ({
        id: q.id,
        query: q.text,
        category: q.category?.name || "Uncategorized",
        group: q.group?.representativeQuery || "",
        isRepresentative: q.group?.representativeQuery === q.text,
        page: q.pageUrl || "",
        pageManual: false,
        usageCount: q.usageCount ?? 0,
      }));

      const summary = results.reduce((acc: any, q: any) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { results, summary };
    }),

  updatePage: protectedProcedure
    .input(z.object({ queryId: z.string(), pageUrl: z.string().nullable() }))
    .mutation(async ({ input }) => {
      await prisma.query.update({
        where: { id: input.queryId },
        data: { pageUrl: input.pageUrl },
      });
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
        throw new Error("No keyword groups found. Complete Step 1 (Keywords) first.");

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

  /** Refine a category: AI re-evaluates all its queries and removes outliers */
  refineCategory: protectedProcedure
    .input(z.object({
      semanticCoreId: z.string(),
      categoryName: z.string(),
      modelId: z.string().optional(),
      language: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const category = await prisma.category.findFirst({
        where: { semanticCoreId: input.semanticCoreId, name: input.categoryName }
      });
      if (!category) throw new Error("Category not found");

      // Find all queries in this category
      const queries = await prisma.query.findMany({
        where: { categoryId: category.id },
        include: { group: true }
      });

      if (queries.length === 0) return { moved: 0, total: 0, moves: [] };

      // Deduplicate by group representative query
      const groupsMap = new Map<string, any>();
      for (const q of queries) {
        if (q.group?.representativeQuery) {
          groupsMap.set(q.group.id, q.group);
        }
      }
      
      const uniqueGroups = Array.from(groupsMap.values());
      const keywordsList = uniqueGroups.map(g => g.representativeQuery);

      const prompt = `You are an expert SEO architect.
We have a semantic core category named: "${input.categoryName}"

Here are the representative keywords currently assigned to this category:
${keywordsList.map(k => `- ${k}`).join('\n')}

Your task is to identify which keywords DO NOT belong in this category because their search intent or subject matter is distinctly different from the core theme of the category.
Be strict but reasonable. If a keyword is borderline, keep it.

Return ONLY valid JSON in this exact format:
[
  { "keyword": "the exact keyword from the list above", "reason": "brief explanation why it doesn't fit" }
]

If all keywords fit perfectly, return an empty array [].
Respond ONLY with the JSON array, no markdown formatting, no backticks.`;

      const config = getAIConfig(input.modelId);
      const aiResponse = await callOpenRouter(config, prompt);

      let outliers: { keyword: string; reason: string }[] = [];
      try {
        const text = aiResponse.trim().replace(/^```json\n?/, '').replace(/```$/, '').trim();
        outliers = JSON.parse(text);
      } catch (e) {
        throw new Error("AI returned invalid JSON: " + aiResponse);
      }

      if (!Array.isArray(outliers) || outliers.length === 0) {
        return { moved: 0, total: uniqueGroups.length, moves: [] };
      }

      const movedGroupIds: string[] = [];
      const moves: { keyword: string; reason: string }[] = [];

      for (const out of outliers) {
        const group = uniqueGroups.find(g => g.representativeQuery === out.keyword);
        if (group) {
          movedGroupIds.push(group.id);
          moves.push({ keyword: out.keyword, reason: out.reason });
        }
      }

      if (movedGroupIds.length > 0) {
        await prisma.query.updateMany({
          where: { groupId: { in: movedGroupIds } },
          data: { categoryId: null } // Move to Uncategorized
        });
      }

      return {
        moved: movedGroupIds.length,
        total: uniqueGroups.length,
        moves
      };
    }),

  /** Export results as CSV */
  exportCsv: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .mutation(async ({ input }) => {
      const queries = await prisma.query.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        include: { category: true, group: true },
        orderBy: { text: 'asc' },
      });

      const escCsv = (s: string) => {
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const header = 'Keyword,Category,Group,Page';
      const rows = queries.map((q: any) => [
        escCsv(q.text),
        escCsv(q.category?.name || 'Uncategorized'),
        escCsv(q.group?.representativeQuery || ''),
        escCsv(q.pageUrl || ''),
      ].join(','));

      const csv = [header, ...rows].join('\n');
      const base64 = Buffer.from(csv, 'utf-8').toString('base64');
      return { csv: base64, filename: `semantic-core-${input.semanticCoreId.slice(0, 8)}.csv` };
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
        include: { queries: { select: { text: true } } }
      });
      if (cores.length !== input.coreIds.length) throw new Error("Some cores not found or unauthorized");

      // 2. Extract and deduplicate raw queries
      const allRawQueries = new Set<string>();
      cores.forEach((c: any) => {
        c.queries.forEach((q: any) => allRawQueries.add(q.text));
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

      // 5. Insert groups + queries in a transaction
      await prisma.$transaction(async (tx: any) => {
        for (const g of groups) {
          const dbGroup = await tx.lexicalGroup.create({
            data: {
              representativeQuery: g.representative,
              semanticCoreId: masterCore.id,
            }
          });

          await tx.query.createMany({
            data: g.queries.map((q: string) => ({
              text: q,
              normalizedText: normalizeForStorage(q),
              semanticCoreId: masterCore.id,
              groupId: dbGroup.id,
            }))
          });
        }
      });

      return {
        success: true,
        masterCoreId: masterCore.id,
        totalMerged: uniqueQueries.length,
        fromCores: cores.length
      };
    }),

  /** Sync keyword usage: cross-reference semantic core keywords against content plan items */
  syncKeywordUsage: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId, userId: ctx.user.id },
        select: { id: true, projectId: true },
      });
      if (!core) throw new Error("Semantic core not found");
      if (!core.projectId) throw new Error("Core must be linked to a project to sync usage");

      // 1. Load all queries from this core
      const queries = await prisma.query.findMany({
        where: { semanticCoreId: core.id },
        select: { id: true, text: true, normalizedText: true },
      });
      if (queries.length === 0) return { synced: 0, matched: 0 };

      // 2. Load all content items from the project's content plan
      const plan = await prisma.contentPlan.findFirst({
        where: { projectId: core.projectId },
      });
      if (!plan) return { synced: queries.length, matched: 0 };

      const contentItems = await prisma.contentItem.findMany({
        where: { contentPlanId: plan.id },
        select: { id: true, targetKeywords: true, title: true, h1: true },
      });

      // 3. Build a lookup: normalized keyword text → content item IDs
      const keywordToItems = new Map<string, string[]>();
      for (const item of contentItems) {
        for (const kw of item.targetKeywords) {
          const normalized = kw.toLowerCase().trim();
          if (!keywordToItems.has(normalized)) keywordToItems.set(normalized, []);
          keywordToItems.get(normalized)!.push(item.id);
        }
      }

      // 4. For each query, check if it appears in any content item's targetKeywords
      let matchedCount = 0;
      for (const query of queries) {
        const normalized = query.text.toLowerCase().trim();
        const matchedItemIds = keywordToItems.get(normalized) || [];
        const usageCount = matchedItemIds.length;

        // Update the query's usageCount and hasContent
        await prisma.query.update({
          where: { id: query.id },
          data: {
            usageCount,
            hasContent: usageCount > 0,
          },
        });

        // Sync ContentItemQuery links
        if (matchedItemIds.length > 0) {
          matchedCount++;
          // Remove existing links for this query and recreate
          await prisma.contentItemQuery.deleteMany({
            where: { queryId: query.id },
          });
          await prisma.contentItemQuery.createMany({
            data: matchedItemIds.map((itemId) => ({
              queryId: query.id,
              contentItemId: itemId,
            })),
            skipDuplicates: true,
          });
        } else {
          // Clean up any stale links
          await prisma.contentItemQuery.deleteMany({
            where: { queryId: query.id },
          });
        }
      }

      return { synced: queries.length, matched: matchedCount };
    }),

  /** Get detailed stats for a semantic core (keywords, categories, content coverage) */
  getCoreStats: protectedProcedure
    .input(z.object({ semanticCoreId: z.string() }))
    .query(async ({ input }) => {
      const totalKeywords = await prisma.query.count({
        where: { semanticCoreId: input.semanticCoreId },
      });
      const totalCategories = await prisma.category.count({
        where: { semanticCoreId: input.semanticCoreId },
      });
      const totalGroups = await prisma.lexicalGroup.count({
        where: { semanticCoreId: input.semanticCoreId },
      });
      const usedKeywords = await prisma.query.count({
        where: { semanticCoreId: input.semanticCoreId, usageCount: { gt: 0 } },
      });
      const overUsedKeywords = await prisma.query.count({
        where: { semanticCoreId: input.semanticCoreId, usageCount: { gt: 1 } },
      });

      // Get content plan stats if core is linked to a project
      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId },
        select: { projectId: true },
      });
      let contentItemCount = 0;
      let publishedCount = 0;
      if (core?.projectId) {
        const plan = await prisma.contentPlan.findFirst({
          where: { projectId: core.projectId },
        });
        if (plan) {
          contentItemCount = await prisma.contentItem.count({
            where: { contentPlanId: plan.id },
          });
          publishedCount = await prisma.contentItem.count({
            where: { contentPlanId: plan.id, status: "PUBLISHED" },
          });
        }
      }

      return {
        totalKeywords,
        totalCategories,
        totalGroups,
        usedKeywords,
        unusedKeywords: totalKeywords - usedKeywords,
        overUsedKeywords,
        coveragePct: totalKeywords > 0 ? Math.round((usedKeywords / totalKeywords) * 100) : 0,
        contentItemCount,
        publishedCount,
        hasProject: !!core?.projectId,
      };
    }),
});
