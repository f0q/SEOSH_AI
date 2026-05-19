-- Waitlist (public sign-ups) + read-only demo user flag.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('NEW', 'CONTACTED', 'ONBOARDED', 'REJECTED');

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "message" TEXT,
    "source" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'NEW',
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_email_idx" ON "waitlist_entries"("email");
CREATE INDEX "waitlist_entries_status_idx" ON "waitlist_entries"("status");
