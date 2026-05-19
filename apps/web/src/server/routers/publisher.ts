// Publisher router — manage CMS connectors per project and publish/unpublish
// content items. Auth: project owner only.

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db";
import { encrypt } from "../lib/encryption";
import { getPublisherForConnector } from "../services/publisher/registry";
import { publishContentItem, unpublishContentItem } from "../services/publisher/publishService";

async function assertProjectOwner(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not yours" });
  return project;
}

async function assertConnectorOwner(userId: string, connectorId: string) {
  const connector = await prisma.publisherConnector.findUnique({
    where: { id: connectorId },
    include: { project: true },
  });
  if (!connector || connector.project.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Connector not found or not yours" });
  }
  return connector;
}

export const publisherRouter = router({
  listForProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectOwner(ctx.user.id, input.projectId);
      const rows = await prisma.publisherConnector.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      // Strip credentials from the response — only show "configured" flag.
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        baseUrl: row.baseUrl,
        isActive: row.isActive,
        isDefault: row.isDefault,
        lastSync: row.lastSync,
        lastError: row.lastError,
        configured: row.config && typeof row.config === "object"
          ? Object.keys(row.config as Record<string, unknown>).length > 0
          : false,
      }));
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        projectId: z.string(),
        type: z.enum(["WORDPRESS", "TILDA", "BITRIX", "OWN_CMS", "CUSTOM_API"]),
        name: z.string().min(1),
        baseUrl: z.string().url(),
        isDefault: z.boolean().default(false),
        /** Plain credentials — will be encrypted. Empty value = unchanged. */
        credentials: z.record(z.string(), z.string()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(ctx.user.id, input.projectId);

      const existing = input.id
        ? await prisma.publisherConnector.findUnique({ where: { id: input.id } })
        : null;
      const currentConfig =
        existing?.config && typeof existing.config === "object"
          ? (existing.config as Record<string, string>)
          : {};
      const newConfig: Record<string, string> = { ...currentConfig };
      for (const [k, v] of Object.entries(input.credentials)) {
        if (v && v.length > 0) newConfig[k] = encrypt(v);
      }

      // If user marks this connector as default, clear default on siblings.
      if (input.isDefault) {
        await prisma.publisherConnector.updateMany({
          where: { projectId: input.projectId, NOT: { id: input.id ?? "_none" } },
          data: { isDefault: false },
        });
      }

      if (existing) {
        return prisma.publisherConnector.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            baseUrl: input.baseUrl,
            isDefault: input.isDefault,
            config: newConfig,
          },
        });
      }
      return prisma.publisherConnector.create({
        data: {
          projectId: input.projectId,
          type: input.type,
          name: input.name,
          baseUrl: input.baseUrl,
          isDefault: input.isDefault,
          config: newConfig,
        },
      });
    }),

  test: protectedProcedure
    .input(z.object({ connectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertConnectorOwner(ctx.user.id, input.connectorId);
      try {
        const { provider } = await getPublisherForConnector(input.connectorId);
        const result = await provider.testConnection();
        await prisma.publisherConnector.update({
          where: { id: input.connectorId },
          data: { lastSync: new Date(), lastError: null },
        });
        return { ok: true as const, meta: result.meta };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await prisma.publisherConnector.update({
          where: { id: input.connectorId },
          data: { lastError: message },
        });
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ connectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertConnectorOwner(ctx.user.id, input.connectorId);
      await prisma.publisherConnector.delete({ where: { id: input.connectorId } });
      return { success: true };
    }),

  publishItem: protectedProcedure
    .input(
      z.object({
        contentItemId: z.string(),
        connectorId: z.string().optional(),
        status: z.enum(["publish", "draft"]).default("publish"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the item & verify ownership through ContentPlan→Project
      const item = await prisma.contentItem.findUnique({
        where: { id: input.contentItemId },
        include: { contentPlan: { select: { project: { select: { id: true, userId: true } } } } },
      });
      if (!item || item.contentPlan.project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Content item not found or not yours" });
      }

      // Pick connector: explicit > previously-used > project default
      let connectorId: string | null = input.connectorId ?? item.publisherConnectorId ?? null;
      if (!connectorId) {
        const def = await prisma.publisherConnector.findFirst({
          where: { projectId: item.contentPlan.project.id, isDefault: true, isActive: true },
        });
        connectorId = def?.id ?? null;
      }
      if (!connectorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No publisher connector selected and no default is set for this project.",
        });
      }
      await assertConnectorOwner(ctx.user.id, connectorId);

      try {
        return await publishContentItem({
          contentItemId: input.contentItemId,
          connectorId,
          status: input.status,
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Publish failed",
        });
      }
    }),

  unpublishItem: protectedProcedure
    .input(z.object({ contentItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.contentItem.findUnique({
        where: { id: input.contentItemId },
        include: { contentPlan: { select: { project: { select: { userId: true } } } } },
      });
      if (!item || item.contentPlan.project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Content item not found or not yours" });
      }
      try {
        return await unpublishContentItem(input.contentItemId);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Unpublish failed",
        });
      }
    }),
});
