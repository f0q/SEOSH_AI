import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { PrismaClient } from "@prisma/client";

// Simplified instance since it's injected normally
const prisma = new PrismaClient();

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

      // We join contentPlans to get all content items for this project
      const items = await prisma.contentItem.findMany({
        where: {
          contentPlan: { projectId: input.projectId },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      });

      return items;
    }),
});
