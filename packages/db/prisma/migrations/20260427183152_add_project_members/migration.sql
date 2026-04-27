/*
  Warnings:

  - You are about to drop the column `siteStructure` on the `semantic_cores` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "rssFeeds" TEXT[],
ADD COLUMN     "siteStructure" JSONB;

-- AlterTable
ALTER TABLE "content_items" ADD COLUMN     "blogCategory" TEXT,
ADD COLUMN     "recommendedImages" JSONB,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "queries" ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "semantic_cores" DROP COLUMN "siteStructure";

-- AlterTable
ALTER TABLE "user_ai_preferences" ADD COLUMN     "apiKeys" JSONB;

-- CreateTable
CREATE TABLE "content_item_queries" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,

    CONSTRAINT "content_item_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'VIEWER',
    "invitedBy" TEXT NOT NULL,
    "status" "ShareStatus" NOT NULL DEFAULT 'PENDING',
    "accessToken" TEXT,
    "tempPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_item_queries_queryId_contentItemId_key" ON "content_item_queries"("queryId", "contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_accessToken_key" ON "project_members"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_email_key" ON "project_members"("projectId", "email");

-- AddForeignKey
ALTER TABLE "content_item_queries" ADD CONSTRAINT "content_item_queries_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_item_queries" ADD CONSTRAINT "content_item_queries_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
