import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "../db";
import { computeNextScheduledAt } from "../services/autopilot/schedule";

export const autopilotRouter = router({
  
  // 1. Get autopilot config for a project
  getConfig: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) throw new Error("Project not found");

      let config = await prisma.autopilotConfig.findUnique({
        where: { projectId: input.projectId },
      });

      // If no config exists, create a default one
      if (!config) {
        config = await prisma.autopilotConfig.create({
          data: { projectId: input.projectId },
        });
      }

      return config;
    }),

  // 2. Save/Update Autopilot Settings
  updateConfig: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      enabled: z.boolean().optional(),
      scheduleFreq: z.string().optional(),
      autoApprove: z.boolean().optional(),
      tgBotToken: z.string().optional(),
      tgChatId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) throw new Error("Project not found");

      // Verify if WordPress is connected before enabling
      if (input.enabled) {
        const wpConnector = await prisma.publisherConnector.findFirst({
          where: { projectId: input.projectId, type: "WORDPRESS" }
        });
        if (!wpConnector) {
          throw new Error("Cannot enable autopilot without a connected CMS.");
        }
      }

      const { projectId, ...updateData } = input;
      
      const config = await prisma.autopilotConfig.update({
        where: { projectId },
        data: updateData,
      });

      return config;
    }),

  // 3. Simple list of Content Items used as the Queue
  getQueue: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) throw new Error("Project not found");

      const items = await prisma.contentItem.findMany({
        where: {
          contentPlan: { projectId: input.projectId },
        },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
        take: 50,
      });

      return items;
    }),

  // 4. Aggregate stats for the dashboard chips
  getStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) throw new Error("Project not found");

      const where = { contentPlan: { projectId: input.projectId } };
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [inQueue, pending, published, publishedThisMonth] = await Promise.all([
        prisma.contentItem.count({
          where: { ...where, status: { in: ["DRAFT", "GENERATED", "OPTIMIZED", "REVIEW", "SCHEDULED"] } },
        }),
        prisma.contentItem.count({ where: { ...where, status: "REVIEW" } }),
        prisma.contentItem.count({ where: { ...where, status: "PUBLISHED" } }),
        prisma.contentItem.count({
          where: { ...where, status: "PUBLISHED", publishedAt: { gte: monthAgo } },
        }),
      ]);

      return { inQueue, pending, published, publishedThisMonth };
    }),

  // 5. Approve a queued item → SCHEDULED with a computed scheduledAt.
  //    The autopilot tick worker will publish it when scheduledAt is due.
  approveItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const item = await prisma.contentItem.findUnique({
        where: { id: input.itemId },
        include: {
          contentPlan: {
            select: {
              projectId: true,
              project: {
                select: {
                  userId: true,
                  autopilotConfig: { select: { scheduleFreq: true } },
                },
              },
            },
          },
        },
      });
      if (!item || item.contentPlan.project.userId !== ctx.user.id) {
        throw new Error("Content item not found or not yours");
      }
      const freq = item.contentPlan.project.autopilotConfig?.scheduleFreq ?? "1w";
      const scheduledAt = await computeNextScheduledAt(item.contentPlan.projectId, freq);
      return prisma.contentItem.update({
        where: { id: input.itemId },
        data: { status: "SCHEDULED", scheduledAt },
      });
    }),

  // 6. Reject a queued item → FAILED (out of the queue)
  rejectItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const item = await prisma.contentItem.findUnique({
        where: { id: input.itemId },
        include: { contentPlan: { select: { project: { select: { userId: true } } } } },
      });
      if (!item || item.contentPlan.project.userId !== ctx.user.id) {
        throw new Error("Content item not found or not yours");
      }
      return prisma.contentItem.update({
        where: { id: input.itemId },
        data: { status: "FAILED" },
      });
    }),
});
