/**
 * @router projects
 * @description tRPC router for project management.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";

export const projectsRouter = router({
  /** List all projects for current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await prisma.project.findMany({
      where: { userId: ctx.user.id },
      include: { companyProfile: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** Get a single project by ID with its company profile */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return await prisma.project.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { companyProfile: true },
      });
    }),

  /** Create a project from onboarding data */
  create: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        industry: z.string().optional(),
        description: z.string().optional(),
        geography: z.string().optional(),
        websiteUrl: z.string()
          .refine(v => v === "" || /^https?:\/\/.+/.test(v), {
            message: "Please enter a valid domain (e.g. your-website.com)"
          })
          .optional()
          .or(z.literal("")),
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
      const project = await prisma.project.create({
        data: {
          name: input.companyName,
          url: input.websiteUrl || null,
          userId: ctx.user.id,
          companyProfile: {
            create: {
              companyName: input.companyName,
              industry: input.industry,
              description: input.description,
              geography: input.geography,
              productsServices: input.products,
              targetAudience: {
                segments: input.audienceSegments || [],
                painPoints: input.painPoints || [],
              },
              competitors: input.competitors,
            }
          }
        }
      });
      
      // If a website URL was provided, we'll create a DataSource for it automatically
      if (input.websiteUrl) {
        await prisma.dataSource.create({
          data: {
            projectId: project.id,
            type: "WEBSITE",
            url: input.websiteUrl,
            status: "PENDING"
          }
        });
      }

      return { projectId: project.id };
    }),
  /** Update a project */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      url: z.string().optional().or(z.literal("")),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!project) throw new Error("Project not found");

      await prisma.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          url: input.url || null,
        }
      });
      
      return { success: true };
    }),

  /** Delete a project */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Must verify ownership first
      const project = await prisma.project.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!project) throw new Error("Project not found");

      await prisma.project.delete({
        where: { id: input.id },
      });
      
      return { success: true };
    }),
});
