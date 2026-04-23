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
import Parser from "rss-parser";
import { callOpenRouter, getAIConfig, callOpenRouterChat } from "../services/ai";
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
  tags: z.array(z.string()).optional(),
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

  /** Get keyword usage statistics for a project's semantic core */
  getKeywordUsageStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const core = await prisma.semanticCore.findFirst({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
      if (!core) return { total: 0, used: 0, unused: 0, overUsed: 0 };

      const total = await prisma.query.count({
        where: { semanticCoreId: core.id },
      });
      const used = await prisma.query.count({
        where: { semanticCoreId: core.id, usageCount: { gt: 0 } },
      });
      const overUsed = await prisma.query.count({
        where: { semanticCoreId: core.id, usageCount: { gt: 1 } },
      });

      return {
        total,
        used,
        unused: total - used,
        overUsed,
      };
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
          tags: input.data.tags ?? [],
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
      // Decrement usageCount on all linked keywords before deletion
      const links = await prisma.contentItemQuery.findMany({
        where: { contentItemId: input.id },
        select: { queryId: true },
      });
      if (links.length > 0) {
        const queryIds = links.map((l) => l.queryId);
        await prisma.query.updateMany({
          where: { id: { in: queryIds } },
          data: { usageCount: { decrement: 1 } },
        });
        // Reset hasContent for queries that now have 0 usage
        await prisma.query.updateMany({
          where: { id: { in: queryIds }, usageCount: { lte: 0 } },
          data: { hasContent: false, usageCount: 0 },
        });
      }
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

      // 5. Extract site structure sections if available
      const siteStructure = Array.isArray(project.companyProfile?.siteStructure) ? project.companyProfile.siteStructure : [];
      const sections = siteStructure.map((s: any) => ({
        label: s.label,
        pageType: s.pageType,
        url: s.url,
      }));

      // Helper to map category to best matching section
      const mapCategoryToSection = (catName: string) => {
        if (!catName || catName === "Uncategorized") return null;
        // Simple case-insensitive match
        const exact = sections.find(s => s.label.toLowerCase() === catName.toLowerCase());
        if (exact) return exact;
        // Partial match
        return sections.find(s => catName.toLowerCase().includes(s.label.toLowerCase()) || s.label.toLowerCase().includes(catName.toLowerCase())) || null;
      };

      // 6. Create a ContentItem for each category group
      const created: Array<{ title: string; section: string; keywords: number }> = [];
      let sortOrder = existingCount;

      for (const [categoryName, categoryQueries] of byCategory) {
        // Deduplicate keywords
        const uniqueKeywords = Array.from(
          new Set(categoryQueries.map((q) => q.text))
        );

        // Map the category to a site section
        const matchedSection = mapCategoryToSection(categoryName);
        const section = matchedSection ? matchedSection.label : categoryName;
        
        // Guess page type from the section or use the one from site structure
        const pageType = matchedSection?.pageType || guessPageTypeFromSection(section);

        // Build a representative query for the title/h1
        const representative =
          categoryQueries.find((q) => q.group?.representativeQuery === q.text)?.text
          || uniqueKeywords[0]
          || categoryName;

        // Generate a draft meta title
        const companyName = project.companyProfile?.companyName || project.name;
        const metaTitle = `${representative.charAt(0).toUpperCase() + representative.slice(1)} — ${companyName}`;

        const contentItem = await prisma.contentItem.create({
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

        // Link keywords to this content item and increment usage counts
        const queryIds = categoryQueries.map((q) => q.id);
        if (queryIds.length > 0) {
          await prisma.contentItemQuery.createMany({
            data: queryIds.map((qId) => ({
              queryId: qId,
              contentItemId: contentItem.id,
            })),
            skipDuplicates: true,
          });
          await prisma.query.updateMany({
            where: { id: { in: queryIds } },
            data: {
              usageCount: { increment: 1 },
              hasContent: true,
            },
          });
        }

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

  // ─── Ideation & Planning ────────────────────────────────────────────────────

  getRandomTopic: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Find semantic cores belonging to this project (or all for user if no direct relation)
      const cores = await prisma.semanticCore.findMany({
        where: { userId: ctx.user.id },
        select: { id: true }
      });
      if (!cores.length) return { topic: "No semantic cores found." };
      
      const queries = await prisma.query.findMany({
        where: { semanticCoreId: { in: cores.map(c => c.id) } },
        take: 100,
      });

      if (!queries.length) return { topic: "No keywords found in your cores." };
      
      const randomQuery = queries[Math.floor(Math.random() * queries.length)];
      return { topic: randomQuery.text };
    }),

  getProjectTitles: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const plan = await prisma.contentPlan.findFirst({
        where: { projectId: input.projectId },
        include: { items: { select: { title: true } } }
      });
      if (!plan) return [];
      return plan.items.map(item => item.title.toLowerCase());
    }),

  proposeIdeas: protectedProcedure
    .input(z.object({ topic: z.string(), projectId: z.string(), modelId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);
      
      // Fetch project domain
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { url: true }
      });
      const domain = project?.url?.replace(/\/+$/, "") || "https://example.com";

      // Fetch existing sections (categories), tags, and page types from plan
      const plan = await prisma.contentPlan.findFirst({
        where: { projectId: input.projectId },
        include: { items: { select: { section: true, tags: true, pageType: true, schemaType: true } } }
      });
      
      const existingSections = new Set<string>();
      const existingTags = new Set<string>();
      const existingPageTypes = new Set<string>();
      const existingSchemas = new Set<string>();
      
      if (plan) {
        plan.items.forEach(item => {
          if (item.section) existingSections.add(item.section);
          if (item.tags) item.tags.forEach(t => existingTags.add(t));
          if (item.pageType) existingPageTypes.add(item.pageType);
          if (item.schemaType) existingSchemas.add(item.schemaType);
        });
      }

      // All available page type slugs from the system
      const allPageTypeSlugs = ["homepage", "service_listing", "service_detail", "product_listing", "product_detail", "landing_page", "blog_listing", "blog_post", "promo_listing", "promo_detail", "info_page"];
      const allSchemaTypes = ["LocalBusiness", "Service", "ItemList", "Product", "Offer", "OfferCatalog", "Blog", "Article", "WebPage"];

      const sectionContext = existingSections.size > 0 
        ? `\nExisting website categories/sections in this project:\n${Array.from(existingSections).join(", ")}\nYou MUST pick from these categories when relevant. Only invent a new section if none of the existing ones fit.` 
        : "";

      const tagsContext = existingTags.size > 0 
        ? `\nExisting tag cloud for this project:\n${Array.from(existingTags).join(", ")}\nPrioritize these existing tags. You may add new ones if absolutely necessary.` 
        : "";

      const prompt = `You are an expert SEO content strategist.
The user wants to build a topical silo/cluster around the topic: "${input.topic}".
The target domain is: ${domain}${sectionContext}${tagsContext}

Propose exactly 5 distinct, high-quality article ideas that comprehensively cover this topic.
For each article, you MUST define ALL of the following fields:
- "title": A catchy, SEO-optimized page title.
- "section": The website category this page belongs to.${existingSections.size > 0 ? " MUST be one of the existing sections listed above, unless none fit." : ""}
- "pageType": MUST be one of: ${JSON.stringify(allPageTypeSlugs)}.
- "schemaType": MUST be one of: ${JSON.stringify(allSchemaTypes)}.
- "intent": The search intent. MUST be one of: "Informational", "Commercial", "Navigational", "Transactional".
- "url": A full URL path starting from the domain root using the pattern: /{section-slug}/{seo-friendly-slug}. Do NOT include the domain itself. Example: /blog/best-running-shoes

Output strictly valid JSON matching this schema:
{
  "ideas": [
    { "title": string, "section": string, "pageType": string, "schemaType": string, "intent": string, "url": string }
  ]
}
Do not output any markdown formatting, only the JSON object.`;

      try {
        const aiResponse = await callOpenRouter(config, prompt, true);
        const parsed = JSON.parse(aiResponse);
        return { ideas: parsed.ideas || [], domain };
      } catch (err) {
        console.error("AI Generation Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate ideas from AI.",
        });
      }
    }),

  chat: protectedProcedure
    .input(z.object({ 
      messages: z.array(z.object({ role: z.string(), content: z.string() })),
      modelId: z.string().optional() 
    }))
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);
      // Inject a system prompt context at the start
      const msgs = [
        { role: "system", content: "You are an expert SEO content strategist and planner. Help the user brainstorm silos, structures, and content ideas for their website." },
        ...input.messages
      ];
      try {
        const response = await callOpenRouterChat(config, msgs);
        return { message: response };
      } catch (err) {
        console.error("AI Chat Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get AI response.",
        });
      }
    }),

  analyzeRss: protectedProcedure
    .input(z.object({ url: z.string().url(), modelId: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        const parser = new Parser();
        const feed = await parser.parseURL(input.url);
        
        // Extract top 10 titles and summaries
        const articles = feed.items.slice(0, 10).map(item => ({
          title: item.title,
          summary: item.contentSnippet || item.content || "No summary available."
        }));

        if (!articles.length) {
          throw new Error("No articles found in RSS feed.");
        }

        const config = getAIConfig(input.modelId);
        const prompt = `You are an expert SEO content strategist.
A competitor just published these recent articles via their RSS feed:
${JSON.stringify(articles, null, 2)}

Identify their content strategy and gaps. Propose exactly 5 distinct, high-quality "counter-articles" we should write to outrank or provide better value.
For each article, define:
- "title": A catchy, SEO-optimized H1 title.
- "type": The page format. MUST be one of: "blog_post", "listicle", "how_to", "comparison", "case_study", "review", "pillar_page".
- "intent": The search intent. MUST be one of: "Informational", "Commercial", "Navigational", "Transactional".

Output strictly valid JSON matching this schema:
{
  "ideas": [
    { "title": string, "type": string, "intent": string }
  ]
}
Do not output any markdown formatting, only the JSON object.`;

        const aiResponse = await callOpenRouter(config, prompt, true);
        const parsed = JSON.parse(aiResponse);
        return { ideas: parsed.ideas || [] };
      } catch (err) {
        console.error("RSS Analysis Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to analyze RSS feed and generate ideas.",
        });
      }
    }),

  fleshOutIdeas: protectedProcedure
    .input(z.object({ 
      ideas: z.array(z.object({
        title: z.string(),
        section: z.string().optional(),
        pageType: z.string().optional(),
        schemaType: z.string().optional(),
        intent: z.string().optional(),
        url: z.string().optional(),
      })),
      topic: z.string(),
      projectId: z.string(),
      modelId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const config = getAIConfig(input.modelId);

      // Fetch project domain
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { url: true }
      });
      const domain = project?.url?.replace(/\/+$/, "") || "https://example.com";

      // Fetch existing tags to provide context
      const plan = await prisma.contentPlan.findFirst({
        where: { projectId: input.projectId },
        include: { items: { select: { tags: true } } }
      });
      const existingTags = new Set<string>();
      if (plan) {
        plan.items.forEach(item => {
          if (item.tags) item.tags.forEach(t => existingTags.add(t));
        });
      }

      const tagsContext = existingTags.size > 0 
        ? `\nExisting tag cloud for this project (prioritize these):\n${Array.from(existingTags).join(", ")}` 
        : "";

      const prompt = `You are an expert SEO specialist.
I have a list of content ideas for the topic: "${input.topic}".
The target domain is: ${domain}${tagsContext}

Here are the ideas (each already has a title, section, pageType, schemaType, intent, and url):
${JSON.stringify(input.ideas, null, 2)}

For each idea, generate ONLY the missing SEO details:
- "metaDesc": A compelling meta description (max 155 chars).
- "h1": An optimized, catchy H1 heading.
- "h2Headings": An array of 3 to 6 logical H2 subheadings.
- "targetKeywords": An array of 3 to 5 LSI/target keywords.
- "tags": An array of 3 to 5 related website tags.${existingTags.size > 0 ? " Prioritize the existing tags listed above." : ""}

Output strictly valid JSON matching this schema:
{
  "enrichedIdeas": [
    {
      "metaDesc": string,
      "h1": string,
      "h2Headings": [string],
      "targetKeywords": [string],
      "tags": [string]
    }
  ]
}
The output array must be in the exact same order as the input ideas. Do not output any markdown formatting, only the JSON object.`;

      try {
        const aiResponse = await callOpenRouter(config, prompt, true);
        const parsed = JSON.parse(aiResponse);
        return { enrichedIdeas: parsed.enrichedIdeas || [] };
      } catch (err) {
        console.error("AI Flesh Out Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to flesh out ideas with AI.",
        });
      }
    }),

  // ─── CSV Import ──────────────────────────────────────────────────────────

  /** Import content items from CSV text */
  importCsv: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      csvText: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });

      const plan = await getOrCreatePlan(input.projectId);
      const existingCount = await prisma.contentItem.count({
        where: { contentPlanId: plan.id },
      });

      // ── Parse CSV ─────────────────────────────────────────────────────
      const lines = input.csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV must have a header row and at least one data row.",
        });

      // Parse a CSV line respecting quoted fields
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else if (ch === ";" && !inQuotes) {
            // Support semicolon delimiter too (common in EU Excel exports)
            result.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h) =>
        h.toLowerCase().replace(/[\ufeff]/g, "").trim()
      );

      // Flexible header mapping (English + Russian)
      const headerMap: Record<string, string> = {};
      const mappings: Record<string, string[]> = {
        url: ["url", "ссылка", "адрес", "link"],
        section: ["section", "раздел", "категория", "category"],
        pageType: ["page type", "pagetype", "тип страницы", "тип", "type"],
        priority: ["priority", "приоритет", "pri"],
        status: ["status", "статус"],
        metaTitle: ["title", "meta title", "metatitle", "заголовок", "заголовок страницы"],
        metaDesc: ["meta desc", "meta description", "metadesc", "описание", "meta описание"],
        h1: ["h1", "заголовок h1"],
        targetWordCount: ["words", "word count", "target words", "targetwordcount", "объём", "объем", "слова"],
        h2Headings: ["h2", "h2 headings", "h2headings", "подзаголовки"],
        targetKeywords: ["keywords", "keyword", "ключевые слова", "ключи", "ключевики"],
        tags: ["tags", "теги", "метки"],
        schemaType: ["schema", "schematype", "schema type", "schema.org"],
        internalLinks: ["internal links", "internallinks", "внутренние ссылки", "перелинковка"],
        notes: ["notes", "примечания", "заметки", "комментарии"],
      };

      for (const [field, aliases] of Object.entries(mappings)) {
        const idx = headers.findIndex((h) =>
          aliases.some((a) => h === a || h.includes(a))
        );
        if (idx !== -1) headerMap[field] = String(idx);
      }

      const get = (row: string[], field: string): string => {
        const idx = headerMap[field];
        if (idx === undefined) return "";
        return row[Number(idx)] ?? "";
      };

      // ── Create items ────────────────────────────────────────────────
      const dataRows = lines.slice(1).map(parseCsvLine);
      let created = 0;
      let skipped = 0;
      let sortOrder = existingCount;

      for (const row of dataRows) {
        const title = get(row, "metaTitle") || get(row, "h1") || get(row, "url") || `Row ${created + 1}`;
        if (!title.trim() && !get(row, "url").trim()) {
          skipped++;
          continue;
        }

        const priority = parseInt(get(row, "priority")) || 1;
        const wordCount = parseInt(get(row, "targetWordCount")) || undefined;

        const h2Raw = get(row, "h2Headings");
        const h2Headings = h2Raw
          ? h2Raw.split(/[|;]/).map((s) => s.trim()).filter(Boolean)
          : [];

        const kwRaw = get(row, "targetKeywords");
        const keywords = kwRaw
          ? kwRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        const tagsRaw = get(row, "tags");
        const tags = tagsRaw
          ? tagsRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        const metaTitle = get(row, "metaTitle") || title;

        await prisma.contentItem.create({
          data: {
            contentPlanId: plan.id,
            sortOrder: sortOrder++,
            title: metaTitle,
            url: get(row, "url") || undefined,
            section: get(row, "section") || undefined,
            pageType: get(row, "pageType") || "blog_post",
            priority: Math.min(5, Math.max(1, priority)),
            status: "DRAFT" as import("@prisma/client").ContentStatus,
            metaTitle,
            titleLength: metaTitle.length,
            metaDesc: get(row, "metaDesc") || undefined,
            metaDescLength: get(row, "metaDesc") ? get(row, "metaDesc").length : undefined,
            h1: get(row, "h1") || undefined,
            targetWordCount: wordCount,
            h2Headings,
            targetKeywords: keywords,
            tags,
            schemaType: get(row, "schemaType") || undefined,
            internalLinks: get(row, "internalLinks") || undefined,
            notes: get(row, "notes") || undefined,
          },
        });
        created++;
      }

      return {
        created,
        skipped,
        total: dataRows.length,
        mappedColumns: Object.keys(headerMap),
      };
    }),
});
