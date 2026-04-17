/**
 * @router semanticCore
 * @description tRPC router for semantic core operations.
 * Migrated and adapted from SEO_classify Express routes.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import {
  groupQueriesLexically,
  generateCategories,
  categorizeQueries,
  findBestPage,
} from "@seosh/semantic-core";

// ─── Helper to get AI config from env ───────────────────────────────────────
function getAIConfig() {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: process.env.OPENROUTER_MODEL_CLASSIFY || "google/gemini-2.0-flash-001",
    baseUrl: "https://openrouter.ai/api/v1",
  };
}

export const semanticCoreRouter = router({
  /** Group raw queries lexically (pure algorithm, no AI) */
  groupQueries: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        queries: z.array(z.string()).min(1).max(50000),
      })
    )
    .mutation(async ({ input }) => {
      const groups = groupQueriesLexically(input.queries);
      // TODO: Save to SemanticCore + LexicalGroup in DB
      return {
        totalQueries: input.queries.length,
        totalGroups: groups.length,
        groups: groups.slice(0, 100), // Return first 100 for preview
      };
    }),

  /** Generate AI categories from representative queries */
  generateCategories: protectedProcedure
    .input(
      z.object({
        semanticCoreId: z.string(),
        websiteUrl: z.string().url(),
        pages: z.array(z.object({ url: z.string(), title: z.string().nullable() })),
        representatives: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const config = getAIConfig();
      if (!config.apiKey) throw new Error("OpenRouter API key not configured");

      const result = await generateCategories(
        input.representatives,
        { url: input.websiteUrl, pages: input.pages },
        config
      );

      // TODO: Save categories to DB
      return { categories: result.categories };
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
      // TODO: Save approved categories to DB, start background job
      return { success: true, jobId: `job_${Date.now()}` };
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
      // TODO: Query DB with category + page mapping
      return {
        results: [] as Array<{
          id: string;
          query: string;
          category: string;
          group: string;
          isRepresentative: boolean;
          page: string;
          pageManual: boolean;
        }>,
        summary: {} as Record<string, number>,
      };
    }),

  /** Update a query's manually assigned page URL */
  updatePage: protectedProcedure
    .input(z.object({ queryId: z.string(), pageUrl: z.string().nullable() }))
    .mutation(async ({ input }) => {
      // TODO: prisma.query.update
      return { success: true };
    }),

  /** Move a query to a different category */
  updateQueryCategory: protectedProcedure
    .input(z.object({ queryId: z.string(), categoryName: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: prisma.query.update
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
});
