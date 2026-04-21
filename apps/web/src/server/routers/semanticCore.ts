/**
 * @router semanticCore
 * @description tRPC router for semantic core operations.
 * Migrated and adapted from SEO_classify Express routes.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";
import { groupQueriesLexically, normalizeForStorage } from "../services/lexicalGrouper";

// Mock functions until remaining @seosh/semantic-core AI categorization is migrated
const generateCategories = async (reps: string[], site: any, config: any) => {
  return { categories: ["Mock Category 1", "Mock Category 2"] };
};
const categorizeQueries = async (queries: string[], categories: string[], config: any) => {
  return [];
};
const findBestPage = (query: string, category: string, sitemap: any[]) => {
  return null;
};

// ─── Helper to get AI config from env ───────────────────────────────────────
function getAIConfig() {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: process.env.OPENROUTER_MODEL_CLASSIFY || "google/gemini-2.0-flash-001",
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
      
      // Save everything to DB inside a transaction for safety
      await prisma.$transaction(async (tx: any) => {
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

  /** Generate AI categories from representative queries */
  generateCategories: protectedProcedure
    .input(
      z.object({
        semanticCoreId: z.string(),
        websiteUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const config = getAIConfig();
      if (!config.apiKey) throw new Error("OpenRouter API key not configured");

      // Fetch representatives from DB (just take top 100 max to save tokens)
      const reps = await prisma.lexicalGroup.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        take: 100,
        select: { representativeQuery: true }
      });
      const repStrings = reps.map((r: any) => r.representativeQuery);

      const result = await generateCategories(
        repStrings,
        { url: input.websiteUrl, pages: [] }, // pages empty for now
        config
      );

      // Save categories to DB
      await prisma.$transaction(
        result.categories.map((cat: string) => 
          prisma.category.create({
            data: { name: cat, semanticCoreId: input.semanticCoreId }
          })
        )
      );

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
