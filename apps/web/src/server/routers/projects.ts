/**
 * @router projects
 * @description tRPC router for project management.
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";

export const projectsRouter = router({
  /** List all projects for current user (owned + member of) */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Get projects the user is a member of (with their role)
    const memberships = await prisma.projectMember.findMany({
      where: { email: ctx.user.email, status: "ACTIVE" },
      select: { projectId: true, role: true },
    });
    const memberMap = new Map(memberships.map(m => [m.projectId, m.role]));

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: ctx.user.id },
          { id: { in: [...memberMap.keys()] } },
        ],
      },
      include: { companyProfile: true },
      orderBy: { createdAt: "desc" },
    });

    // Attach memberRole (null for owned projects, role string for member projects)
    return projects.map(p => ({
      ...p,
      memberRole: p.userId === ctx.user.id ? null : (memberMap.get(p.id) ?? null),
    }));
  }),

  /** Get a single project by ID (owned or member) */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      // Check ownership or membership
      const isMember = await prisma.projectMember.findFirst({
        where: { projectId: input.id, email: ctx.user.email, status: "ACTIVE" },
      });

      return await prisma.project.findFirst({
        where: {
          id: input.id,
          OR: [
            { userId: ctx.user.id },
            ...(isMember ? [{ id: input.id }] : []),
          ],
        },
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
        siteStructure: z.any().optional(),
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
              siteStructure: input.siteStructure,
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
    
  upsertOnboarding: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        companyName: z.string().min(1, "Company name is required"),
        industry: z.string(),
        description: z.string(),
        geography: z.string(),
        products: z.array(z.object({
          name: z.string(),
          description: z.string(),
          priceRange: z.string(),
        })),
        audienceSegments: z.array(z.string()).optional(),
        painPoints: z.array(z.string()).optional(),
        websiteUrl: z.string().optional(),
        competitors: z.array(z.object({
          url: z.string(),
          name: z.string(),
          notes: z.string(),
        })).optional(),
        siteStructure: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let project;
      
      if (input.projectId) {
        project = await prisma.project.findFirst({
          where: { id: input.projectId, userId: ctx.user.id }
        });
        if (!project) throw new Error("Project not found");
        
        project = await prisma.project.update({
          where: { id: input.projectId },
          data: {
            name: input.companyName,
            url: input.websiteUrl || null,
            companyProfile: {
              upsert: {
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
                  siteStructure: input.siteStructure,
                },
                update: {
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
                  siteStructure: input.siteStructure,
                }
              }
            }
          }
        });
      } else {
        project = await prisma.project.create({
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
                siteStructure: input.siteStructure,
              }
            }
          }
        });
      }

      // Ensure DataSource exists if there is a website URL
      if (input.websiteUrl) {
        const existingDs = await prisma.dataSource.findFirst({
          where: { projectId: project.id, url: input.websiteUrl, type: "WEBSITE" }
        });
        if (!existingDs) {
          await prisma.dataSource.create({
            data: {
              projectId: project.id,
              type: "WEBSITE",
              url: input.websiteUrl,
              status: "PENDING"
            }
          });
        }
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

  /** Update RSS feeds for a project's company profile */
  updateRssFeeds: protectedProcedure
    .input(z.object({ projectId: z.string(), rssFeeds: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
        include: { companyProfile: true },
      });
      if (!project) throw new Error("Project not found");
      if (!project.companyProfile) throw new Error("No company profile found");

      await prisma.companyProfile.update({
        where: { id: project.companyProfile.id },
        data: { rssFeeds: input.rssFeeds },
      });

      return { success: true };
    }),
});
