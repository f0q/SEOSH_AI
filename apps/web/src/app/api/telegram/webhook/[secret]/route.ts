// Receives Telegram callback_query updates for autopilot approval.
//
// URL: /api/telegram/webhook/{tgWebhookSecret}
// We additionally verify the `X-Telegram-Bot-Api-Secret-Token` header — Telegram
// echoes back whatever secret_token we passed to setWebhook. Anyone with the
// URL but not the header (e.g. a leaked log) cannot trigger actions.
//
// Currently handles two callback_data formats:
//   ap_approve_<itemId>
//   ap_reject_<itemId>

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { decrypt } from "@/server/lib/encryption";
import { answerCallback, editMessage } from "@/server/services/autopilot/telegram";
import { computeNextScheduledAt } from "@/server/services/autopilot/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TgCallbackUpdate {
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
    from?: { username?: string; first_name?: string };
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!headerSecret || headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });
  }

  const config = await prisma.autopilotConfig.findUnique({
    where: { tgWebhookSecret: secret },
    select: {
      projectId: true,
      tgBotToken: true,
      tgChatId: true,
      scheduleFreq: true,
    },
  });
  if (!config || !config.tgBotToken || !config.tgChatId) {
    return NextResponse.json({ ok: false, error: "unknown bot" }, { status: 404 });
  }

  let body: TgCallbackUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const cb = body.callback_query;
  if (!cb || !cb.data || !cb.message) {
    // We only subscribed to callback_query; ignore anything else gracefully.
    return NextResponse.json({ ok: true });
  }

  const token = decrypt(config.tgBotToken);
  const chatId = config.tgChatId;

  const match = cb.data.match(/^ap_(approve|reject)_([\w-]+)$/);
  if (!match) {
    await answerCallback(token, cb.id, "Unknown action");
    return NextResponse.json({ ok: true });
  }
  const action = match[1] as "approve" | "reject";
  const itemId = match[2];

  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      status: true,
      metaTitle: true,
      contentPlan: { select: { projectId: true } },
    },
  });
  if (!item || item.contentPlan.projectId !== config.projectId) {
    await answerCallback(token, cb.id, "Item not found");
    return NextResponse.json({ ok: true });
  }

  const actor = cb.from?.username
    ? `@${cb.from.username}`
    : cb.from?.first_name || "kept anonymous";

  if (action === "approve") {
    const scheduledAt = await computeNextScheduledAt(config.projectId, config.scheduleFreq);
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { status: "SCHEDULED", scheduledAt },
    });
    await editMessage(
      token,
      chatId,
      cb.message.message_id,
      `${cb.message.text ?? item.metaTitle ?? "Item"}\n\n✅ *Approved* by ${actor} — will publish at ${scheduledAt.toUTCString()}`,
    );
    await answerCallback(token, cb.id, "Approved");
  } else {
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { status: "FAILED" },
    });
    await editMessage(
      token,
      chatId,
      cb.message.message_id,
      `${cb.message.text ?? item.metaTitle ?? "Item"}\n\n❌ *Rejected* by ${actor}`,
    );
    await answerCallback(token, cb.id, "Rejected");
  }

  return NextResponse.json({ ok: true });
}
