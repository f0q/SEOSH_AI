-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ContentStatus" ADD VALUE 'REVIEW';

-- AlterTable
ALTER TABLE "content_items" ADD COLUMN     "h2Headings" TEXT[],
ADD COLUMN     "internalLinks" TEXT,
ADD COLUMN     "metaDescLength" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "schemaType" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetWordCount" INTEGER,
ADD COLUMN     "titleLength" INTEGER,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "title" SET DEFAULT 'Untitled',
ALTER COLUMN "priority" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "content_plans" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "content_plan_shares" (
    "id" TEXT NOT NULL,
    "contentPlanId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" "ShareStatus" NOT NULL DEFAULT 'PENDING',
    "accessToken" TEXT,
    "tempPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "content_plan_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_plan_shares_accessToken_key" ON "content_plan_shares"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "content_plan_shares_contentPlanId_email_key" ON "content_plan_shares"("contentPlanId", "email");

-- AddForeignKey
ALTER TABLE "content_plan_shares" ADD CONSTRAINT "content_plan_shares_contentPlanId_fkey" FOREIGN KEY ("contentPlanId") REFERENCES "content_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
