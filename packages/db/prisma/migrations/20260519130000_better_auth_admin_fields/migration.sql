-- Admin plugin (better-auth) requires these columns on users and sessions.
-- Without them prisma.user.create rejects the payload as
-- "Unknown argument banned" and signups fail.

ALTER TABLE "users" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "banReason" TEXT;
ALTER TABLE "users" ADD COLUMN "banExpires" TIMESTAMP(3);

ALTER TABLE "sessions" ADD COLUMN "impersonatedBy" TEXT;
