/**
 * @module contentPlanRouter
 * @description tRPC procedures for the Content Planner feature:
 *   - CRUD on ContentItem rows (one-to-one with Excel sheet columns)
 *   - Team sharing (invite by email, revoke access)
 *   - Public shared plan access via token
 */

import { router, protectedProcedure, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "../db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import {
  getDefaultSchema,
  getDefaultWordCount,
  getDefaultPriority,
  guessPageTypeFromSection,
} from "@seosh/shared/seo";

// ─── Shared Zod schemas ───────────────────────────────────────────────────────

const contentItemInput = z.object({
  url: z.string().optional(),
  section: z.string().optional(),
  pageType: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  // Use z.string() — Prisma accepts enum values as plain strings at runtime
  status: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  h1: z.string().optional(),
  targetWordCount: z.number().optional(),
  h2Headings: z.array(z.string()).optional(),
  targetKeywords: z.array(z.string()).optional(),
  schemaType: z.string().optional(),
  internalLinks: z.string().optional(),
  notes: z.string().optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  sortOrder: z.number().optional(),
});

// ─── Helper: get or create the single content plan for a project ─────────────

async function getOrCreatePlan(projectId: string) {
  let plan = await prisma.contentPlan.findFirst({ where: { projectId } });
  if (!plan) {
    plan = await prisma.contentPlan.create({
      data: { projectId, name: "Content Plan" },
    });
  }
  return plan;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const contentPlanRouter = router({
  /** Get the content plan for a project, including all rows */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const plan = await getOrCreatePlan(input.projectId);
      const items = await prisma.contentItem.findMany({
        where: { contentPlanId: plan.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return { plan, items };
    }),

  /** Fetch all unique keywords from the project's most recent semantic core */
  getKeywordsByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const core = await prisma.semanticCore.findFirst({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        include: {
          queries: { select: { text: true }, orderBy: { text: "asc" } },
          _count: { select: { queries: true } },
        },
      });
      if (!core) return { keywords: [], total: 0 };
      const uniqueKeywords = Array.from(new Set(core.queries.map((q) => q.text)));
      return { keywords: uniqueKeywords, total: uniqueKeywords.length };
    }),

  /** Add a new row */
  createItem: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        data: contentItemInput,
      })
    )
    .mutation(async ({ input }) => {
      const plan = await getOrCreatePlan(input.projectId);
      const count = await prisma.contentItem.count({
        where: { contentPlanId: plan.id },
      });
      return prisma.contentItem.create({
        data: {
          contentPlanId: plan.id,
          sortOrder: count,
          title: input.data.title ?? input.data.url ?? "Untitled",
          url: input.data.url,
          section: input.data.section,
          pageType: input.data.pageType,
          priority: input.data.priority ?? 1,
          status: (input.data.status ?? "DRAFT") as import("@prisma/client").ContentStatus,
          metaTitle: input.data.metaTitle,
          titleLength: input.data.metaTitle ? input.data.metaTitle.length : undefined,
          metaDesc: input.data.metaDesc,
          metaDescLength: input.data.metaDesc ? input.data.metaDesc.length : undefined,
          h1: input.data.h1,
          targetWordCount: input.data.targetWordCount,
          h2Headings: input.data.h2Headings ?? [],
          targetKeywords: input.data.targetKeywords ?? [],
          schemaType: input.data.schemaType,
          internalLinks: input.data.internalLinks,
          notes: input.data.notes,
        },
      });
    }),

  /** Update any fields of a row */
  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: contentItemInput.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = { ...input.data };

      // Auto-compute character lengths
      if (input.data.metaTitle !== undefined) {
        updateData.titleLength = input.data.metaTitle?.length ?? null;
        if (input.data.metaTitle) updateData.title = input.data.metaTitle;
      }
      if (input.data.metaDesc !== undefined) {
        updateData.metaDescLength = input.data.metaDesc?.length ?? null;
      }

      return prisma.contentItem.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  /** Delete a row */
  deleteItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.contentItem.delete({ where: { id: input.id } });
    }),

  /** Reorder rows */
  reorderItems: protectedProcedure
    .input(
      z.object({
        items: z.array(z.object({ id: z.string(), sortOrder: z.number() })),
      })
    )
    .mutation(async ({ input }) => {
      await Promise.all(
        input.items.map((item) =>
          prisma.contentItem.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );
      return { success: true };
    }),

  // ─── Bridge: Semantic Core → Content Plan ──────────────────────────────────

  /** Generate content plan rows from a semantic core's categorized keywords */
  generateFromSemanticCore: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        semanticCoreId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify ownership
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
        include: { companyProfile: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const core = await prisma.semanticCore.findFirst({
        where: { id: input.semanticCoreId, userId: ctx.user.id },
      });
      if (!core) throw new TRPCError({ code: "NOT_FOUND", message: "Semantic core not found" });

      // 2. Load all queries with their categories and groups
      const queries = await prisma.query.findMany({
        where: { semanticCoreId: input.semanticCoreId },
        include: {
          category: true,
          group: true,
        },
      });

      if (queries.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No keywords found in this semantic core. Run the keyword grouping step first.",
        });
      }

      // 3. Group queries by category (or "Uncategorized" if none)
      const byCategory = new Map<string, typeof queries>();
      for (const q of queries) {
        const catName = q.category?.name || "Uncategorized";
        if (!byCategory.has(catName)) byCategory.set(catName, []);
        byCategory.get(catName)!.push(q);
      }

      // 4. Get or create the content plan
      const plan = await getOrCreatePlan(input.projectId);
      const existingCount = await prisma.contentItem.count({
        where: { contentPlanId: plan.id },
      });

      // 5. Create a ContentItem for each category group
      const created: Array<{ title: string; section: string; keywords: number }> = [];
      let sortOrder = existingCount;

      for (const [categoryName, categoryQueries] of byCategory) {
        // Deduplicate keywords
        const uniqueKeywords = Array.from(
          new Set(categoryQueries.map((q) => q.text))
        );

        // Pick the section name from the category
        const section = categoryName;

        // Guess page type from the section name
        const pageType = guessPageTypeFromSection(section);

        // Build a representative query for the title/h1
        const representative =
          categoryQueries.find((q) => q.group?.representativeQuery === q.text)?.text
          || uniqueKeywords[0]
          || categoryName;

        // Generate a draft meta title
        const companyName = project.companyProfile?.companyName || project.name;
        const metaTitle = `${representative.charAt(0).toUpperCase() + representative.slice(1)} — ${companyName}`;

        await prisma.contentItem.create({
          data: {
            contentPlanId: plan.id,
            sortOrder: sortOrder++,
            title: representative,
            url: "",
            section,
            pageType,
            priority: getDefaultPriority(pageType),
            status: "DRAFT",
            metaTitle,
            titleLength: metaTitle.length,
            h1: representative.charAt(0).toUpperCase() + representative.slice(1),
            targetWordCount: getDefaultWordCount(pageType),
            targetKeywords: uniqueKeywords.slice(0, 20), // Cap at 20 per page
            schemaType: getDefaultSchema(pageType),
            h2Headings: [],
            notes: `Auto-generated from semantic core. Category: ${categoryName}. Total keywords: ${uniqueKeywords.length}.`,
          },
        });

        created.push({
          title: representative,
          section,
          keywords: uniqueKeywords.length,
        });
      }

      return {
        created: created.length,
        totalKeywords: queries.length,
        categories: Array.from(byCategory.keys()),
        items: created,
      };
    }),

  // ─── Sharing ─────────────────────────────────────────────────────────────

  /** List all team shares for the project's content plan */
  listShares: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const plan = await getOrCreatePlan(input.projectId);
      return prisma.contentPlanShare.findMany({
        where: { contentPlanId: plan.id },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Invite a team member by email */
  inviteTeamMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const plan = await getOrCreatePlan(input.projectId);

      // Prevent duplicate active invites
      const existing = await prisma.contentPlanShare.findFirst({
        where: {
          contentPlanId: plan.id,
          email: input.email,
          status: { in: ["PENDING", "ACTIVE"] },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email already has access to this content plan.",
        });
      }

      // Generate a secure access token + temp password
      const accessToken = crypto.randomBytes(32).toString("hex");
      const tempPassword = crypto.randomBytes(6).toString("hex"); // 12-char hex

      const share = await prisma.contentPlanShare.create({
        data: {
          contentPlanId: plan.id,
          email: input.email,
          invitedBy: ctx.user.id,
          accessToken,
          tempPassword, // Stored plain for now; in prod: bcrypt hash
          status: "PENDING",
        },
      });

      // ── Send email (dev: log to console; prod: use nodemailer) ──
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content-plan/shared/${accessToken}`;
      console.log(`
╔══════════════════════════════════════════════════════════
║  CONTENT PLAN INVITE (dev mode — email not sent)
╠══════════════════════════════════════════════════════════
║  To:       ${input.email}
║  URL:      ${inviteUrl}
║  Password: ${tempPassword}
╚══════════════════════════════════════════════════════════
      `);

      // TODO: Replace with actual email send via nodemailer:
      // await sendInviteEmail({ to: input.email, inviteUrl, tempPassword });

      return { success: true, shareId: share.id, inviteUrl };
    }),

  /** Revoke a team member's access */
  revokeShare: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.contentPlanShare.update({
        where: { id: input.shareId },
        data: { status: "REVOKED" },
      });
    }),

  // ─── Public shared access ─────────────────────────────────────────────────

  /** Validate access token and return the content plan (read-only) */
  getSharedPlan: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const share = await prisma.contentPlanShare.findUnique({
        where: { accessToken: input.token },
        include: {
          contentPlan: {
            include: {
              items: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
              project: { select: { name: true, url: true } },
            },
          },
        },
      });

      if (!share || share.status === "REVOKED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This share link is invalid or has been revoked.",
        });
      }

      return {
        plan: share.contentPlan,
        items: share.contentPlan.items,
        project: share.contentPlan.project,
        shareEmail: share.email,
        isPending: share.status === "PENDING",
        tempPassword: share.status === "PENDING" ? share.tempPassword : null,
      };
    }),

  /** Mark share as accepted (called after invitee first views the plan) */
  acceptShare: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const share = await prisma.contentPlanShare.findUnique({
        where: { accessToken: input.token },
      });
      if (!share || share.status === "REVOKED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid token." });
      }
      return prisma.contentPlanShare.update({
        where: { id: share.id },
        data: {
          status: "ACTIVE",
          tempPassword: null, // Clear after accepted
          acceptedAt: new Date(),
        },
      });
    }),
});
