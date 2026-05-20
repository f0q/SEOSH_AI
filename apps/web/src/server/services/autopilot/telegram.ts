// Thin Telegram Bot API client + helpers for autopilot approval flow.
//
// We don't pull in a node-telegram-bot library: the API surface we need is
// tiny (sendMessage / editMessageReplyMarkup / answerCallbackQuery / setWebhook
// / deleteWebhook / getMe), all are plain HTTPS calls, and avoiding the
// dependency keeps the container slim.

const TG_API = "https://api.telegram.org";

export class TelegramError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "TelegramError";
  }
}

async function tgCall<T = unknown>(token: string, method: string, payload?: unknown): Promise<T> {
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  let body: { ok: boolean; result?: T; description?: string };
  try {
    body = await res.json();
  } catch {
    throw new TelegramError(`Telegram returned non-JSON (HTTP ${res.status})`, res.status);
  }
  if (!body.ok) {
    throw new TelegramError(body.description || `Telegram API error (HTTP ${res.status})`, res.status);
  }
  return body.result as T;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramBotIdentity {
  id: number;
  username: string;
  first_name: string;
}

/** Probe the bot token. Used to validate input before persisting. */
export async function getMe(token: string): Promise<TelegramBotIdentity> {
  return tgCall<TelegramBotIdentity>(token, "getMe");
}

/** Send a plain or markdown message; returns the created message id. */
export async function sendMessage(token: string, chatId: string, opts: {
  text: string;
  parseMode?: "Markdown" | "HTML";
  buttons?: InlineKeyboardButton[][];
  disablePreview?: boolean;
}): Promise<TelegramMessage> {
  return tgCall<TelegramMessage>(token, "sendMessage", {
    chat_id: chatId,
    text: opts.text,
    parse_mode: opts.parseMode,
    disable_web_page_preview: opts.disablePreview ?? true,
    reply_markup: opts.buttons ? { inline_keyboard: opts.buttons } : undefined,
  });
}

/** Replace the message text + remove the buttons after a callback is handled. */
export async function editMessage(token: string, chatId: string, messageId: number, text: string): Promise<void> {
  await tgCall(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [] },
  });
}

/** Acknowledge a callback_query so the button stops spinning in the user's UI. */
export async function answerCallback(token: string, callbackQueryId: string, text?: string): Promise<void> {
  await tgCall(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

/** Point Telegram at our webhook URL with a secret_token. */
export async function setWebhook(token: string, url: string, secretToken: string): Promise<void> {
  await tgCall(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["callback_query"],
    drop_pending_updates: true,
  });
}

/** Remove our webhook when the user disconnects Telegram. Best-effort. */
export async function deleteWebhook(token: string): Promise<void> {
  try {
    await tgCall(token, "deleteWebhook", { drop_pending_updates: true });
  } catch {
    // Token may already be invalid; nothing useful to do.
  }
}

/** Random hex used both as the URL path component and the secret_token. */
export function generateWebhookSecret(): string {
  // 32 hex chars = 128 bits — plenty against guessing, short enough for a URL.
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Build the public URL Telegram will POST callback updates to. */
export function buildWebhookUrl(secret: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/api/telegram/webhook/${secret}`;
}
