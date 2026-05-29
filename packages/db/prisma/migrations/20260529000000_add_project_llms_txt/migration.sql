-- Add per-project llms.txt storage
ALTER TABLE "projects" ADD COLUMN "llmsTxt" TEXT;
ALTER TABLE "projects" ADD COLUMN "llmsTxtUpdatedAt" TIMESTAMP(3);
