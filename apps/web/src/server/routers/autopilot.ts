import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "../db";
import { computeNextScheduledAt } from "../services/autopilot/schedule";
import {
  buildWebhookUrl,
  deleteWebhook,
  generateWebhookSecret,
  getMe,
  sendMessage,
  setWebhook,
} from "../services/autopilot/telegram";
import { encrypt, decrypt } from "../lib/encryption";

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

  // 7. Connect a Telegram bot for approval flow. Validates the token via
  //    getMe, sets the webhook, sends a hello message to the configured chat,
  //    and persists the encrypted token + chat id + secret. Returns the bot's
  //    handle so the UI can show "Connected as @MyBot".
  setTelegramConfig: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      botToken: z.string().min(20),
      chatId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!project) throw new Error("Project not found");

      // Probe the token. If this throws, the token is invalid and we don't
      // touch anything.
      const me = await getMe(input.botToken);

      const secret = generateWebhookSecret();
      const webhookUrl = buildWebhookUrl(secret);
      await setWebhook(input.botToken, webhookUrl, secret);

      // Send a hello so the user sees the bot works and knows they have the
      // right chat id. If this fails, we still saved the config — they can
      // fix the chat id and try again.
      try {
        await sendMessage(input.botToken, input.chatId, {
          text:
            "✅ SEOSH.AI автопилот подключён.\n\n" +
            "Я буду присылать сюда статьи, готовые к публикации, с кнопками *Одобрить* и *Отклонить*.",
          parseMode: "Markdown",
        });
      } catch (err) {
        // Persist anyway but surface a partial-success error to UI.
        await prisma.autopilotConfig.update({
          where: { projectId: input.projectId },
          data: {
            tgBotToken: encrypt(input.botToken),
            tgChatId: input.chatId,
            tgWebhookSecret: secret,
          },
        });
        const msg = err instanceof Error ? err.message : "Unknown error";
        throw new Error(`Бот подключён, но тестовое сообщение не доставлено: ${msg}. Проверьте chat id.`);
      }

      await prisma.autopilotConfig.update({
        where: { projectId: input.projectId },
        data: {
          tgBotToken: encrypt(input.botToken),
          tgChatId: input.chatId,
          tgWebhookSecret: secret,
        },
      });

      return { botUsername: me.username, botName: me.first_name };
    }),

  // 8. Disconnect Telegram — remove the webhook from Telegram's side, clear
  //    fields on our side. Idempotent.
  removeTelegramConfig: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const config = await prisma.autopilotConfig.findFirst({
        where: { projectId: input.projectId, project: { userId: ctx.user.id } },
        select: { tgBotToken: true },
      });
      if (!config) throw new Error("Autopilot config not found");
      if (config.tgBotToken) {
        try {
          await deleteWebhook(decrypt(config.tgBotToken));
        } catch {
          // Token may already be invalid — best-effort.
        }
      }
      await prisma.autopilotConfig.update({
        where: { projectId: input.projectId },
        data: { tgBotToken: null, tgChatId: null, tgWebhookSecret: null },
      });
      return { ok: true };
    }),

  // 9. Light status accessor for the UI — true/false and bot username if known.
  //    The actual token never leaves the server.
  getTelegramStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const config = await prisma.autopilotConfig.findFirst({
        where: { projectId: input.projectId, project: { userId: ctx.user.id } },
        select: { tgBotToken: true, tgChatId: true },
      });
      if (!config?.tgBotToken || !config.tgChatId) return { connected: false as const };
      // Probe getMe so the UI shows the current bot handle. Cheap — one HTTP
      // round-trip and Telegram caches our identity.
      try {
        const me = await getMe(decrypt(config.tgBotToken));
        return { connected: true as const, botUsername: me.username, chatId: config.tgChatId };
      } catch {
        // Token died (bot revoked etc.) — still tell the UI it's "connected"
        // so user can see and fix, but mark as broken.
        return { connected: true as const, botUsername: null, chatId: config.tgChatId, broken: true };
      }
    }),
});
