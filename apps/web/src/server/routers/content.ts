import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";

export const contentRouter = router({
  /** Save a content item to the database */
  saveContent: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string(),
        keywords: z.string(),
        pageType: z.string(),
        content: z.string(),
        wordCount: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Create a default plan if none exists for the project
      let plan = await prisma.contentPlan.findFirst({
        where: { projectId: input.projectId }
      });
      
      if (!plan) {
        plan = await prisma.contentPlan.create({
          data: { projectId: input.projectId, name: "Default Plan" }
        });
      }

      return await prisma.contentItem.create({
        data: {
          contentPlanId: plan.id,
          title: input.title || "Untitled",
          targetKeywords: input.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          pageType: input.pageType,
          markdownBody: input.content,
          status: "GENERATED",
        }
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const plan = await prisma.contentPlan.findFirst({
        where: { projectId: input.projectId }
      });
      if (!plan) return [];
      
      return await prisma.contentItem.findMany({
        where: { contentPlanId: plan.id },
        orderBy: { createdAt: "desc" }
      });
    }),
});
