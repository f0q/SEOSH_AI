/**
 * @router projects
 * @description tRPC router for project management.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";

export const projectsRouter = router({
  /** List all projects for current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: prisma.project.findMany({ where: { userId: ctx.user.id } })
    return [];
  }),

  /** Get a single project by ID */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      // TODO: prisma.project.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      return null;
    }),

  /** Create a project from onboarding data */
  create: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        industry: z.string().optional(),
        description: z.string().optional(),
        geography: z.string().optional(),
        websiteUrl: z.string().url().optional().or(z.literal("")),
        products: z.array(z.object({
          name: z.string(),
          description: z.string(),
          priceRange: z.string(),
        })).optional(),
        audienceSegments: z.array(z.string()).optional(),
        painPoints: z.array(z.string()).optional(),
        competitors: z.array(z.object({
          url: z.string(),
          name: z.string(),
          notes: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Create project + companyProfile + dataSources in DB
      // For now return a mock ID
      return { projectId: "mock-" + Date.now() };
    }),

  /** Delete a project */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: prisma.project.delete
      return { success: true };
    }),
});
