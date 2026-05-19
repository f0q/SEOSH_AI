-- Pluggable billing: payments, packages, company details, provider configs.
-- Extends TransactionReason with ADMIN_GRANT / ADMIN_REVOKE.

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'WAITING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "TransactionReason" ADD VALUE 'ADMIN_GRANT';
ALTER TYPE "TransactionReason" ADD VALUE 'ADMIN_REVOKE';

-- CreateTable
CREATE TABLE "token_packages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokens" INTEGER NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_packages_slug_key" ON "token_packages"("slug");

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "providerSlug" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountRub" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "tokens" INTEGER NOT NULL,
    "confirmationUrl" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_externalId_idx" ON "payments"("externalId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "token_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "company_details" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL DEFAULT '',
    "shortName" TEXT NOT NULL DEFAULT '',
    "inn" TEXT NOT NULL DEFAULT '',
    "kpp" TEXT NOT NULL DEFAULT '',
    "ogrn" TEXT NOT NULL DEFAULT '',
    "legalAddress" TEXT NOT NULL DEFAULT '',
    "postalAddress" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "bik" TEXT NOT NULL DEFAULT '',
    "correspondentAccount" TEXT NOT NULL DEFAULT '',
    "directorName" TEXT NOT NULL DEFAULT '',
    "directorTitle" TEXT NOT NULL DEFAULT 'Генеральный директор',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_configs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_configs_slug_key" ON "payment_provider_configs"("slug");

-- Seed defaults
INSERT INTO "company_details" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO NOTHING;

INSERT INTO "token_packages" ("id", "slug", "name", "description", "tokens", "priceRub", "sortOrder", "highlighted", "updatedAt") VALUES
  (gen_random_uuid()::text, 'starter',  'Starter',  'Для пробы и небольших проектов',     5000,   49000, 1, false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'pro',      'Pro',      'Оптимальный баланс цены и объёма',  20000,  149000, 2, true,  CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'business', 'Business', 'Для интенсивной работы команды',    80000,  449000, 3, false, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "payment_provider_configs" ("id", "slug", "displayName", "enabled", "testMode", "credentials", "updatedAt") VALUES
  (gen_random_uuid()::text, 'yookassa',       'ЮKassa',         false, true, '{}'::jsonb, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'manual_invoice', 'Счёт на оплату', true,  false, '{}'::jsonb, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO NOTHING;
