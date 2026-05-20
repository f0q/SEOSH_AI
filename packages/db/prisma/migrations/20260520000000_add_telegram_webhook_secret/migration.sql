-- Add a webhook secret used both as the URL path component and as the
-- X-Telegram-Bot-Api-Secret-Token header value Telegram sends with every
-- webhook call. Generated server-side when the user saves a bot token.
ALTER TABLE "autopilot_configs" ADD COLUMN "tgWebhookSecret" TEXT;
CREATE UNIQUE INDEX "autopilot_configs_tgWebhookSecret_key" ON "autopilot_configs"("tgWebhookSecret");
