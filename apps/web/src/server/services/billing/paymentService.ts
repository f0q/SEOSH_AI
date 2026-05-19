// High-level orchestration around Payment lifecycle.
//   1. createPayment(userId, packageSlug, providerSlug)
//        → creates Payment row in PENDING
//        → asks provider for confirmation URL
//        → stores externalId + confirmationUrl, flips to WAITING
//   2. markSucceeded(externalId)
//        → atomically grants tokens via tokenService.topUp
//        → flips Payment to SUCCEEDED
//   Webhook handlers and the success-page polling endpoint both fan into (2).

import { prisma } from "../../db";
import { topUp } from "../tokenService";
import { getProvider } from "./registry";
import { BillingProviderError } from "./types";
import type { PaymentStatus } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";

function toJson(value: unknown): InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as InputJsonValue;
}

export async function createPayment(opts: {
  userId: string;
  userEmail: string;
  packageSlug: string;
  providerSlug: string;
  appUrl: string;
}) {
  const pkg = await prisma.tokenPackage.findUnique({ where: { slug: opts.packageSlug } });
  if (!pkg || !pkg.active) {
    throw new Error(`Token package "${opts.packageSlug}" not found or inactive`);
  }

  const provider = await getProvider(opts.providerSlug);

  const payment = await prisma.payment.create({
    data: {
      userId: opts.userId,
      packageId: pkg.id,
      providerSlug: opts.providerSlug,
      amountRub: pkg.priceRub,
      tokens: pkg.tokens,
      status: "PENDING",
    },
  });

  try {
    const result = await provider.createPayment({
      payment,
      userEmail: opts.userEmail,
      returnUrl: `${opts.appUrl}/billing/success?paymentId=${payment.id}`,
      description: `Покупка пакета "${pkg.name}" — ${pkg.tokens} токенов`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: result.externalId,
        confirmationUrl: result.confirmationUrl,
        status: provider.canCharge ? "WAITING" : "PENDING",
        rawPayload: toJson(result.rawPayload),
      },
    });

    return {
      paymentId: payment.id,
      confirmationUrl: result.confirmationUrl,
      requiresManualConfirmation: !provider.canCharge,
    };
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

/**
 * Move a payment to a terminal state. Idempotent — calling twice with the
 * same SUCCEEDED externalId will NOT grant tokens twice.
 */
export async function applyProviderUpdate(opts: {
  externalId: string;
  status: PaymentStatus;
  rawPayload?: unknown;
}) {
  const payment = await prisma.payment.findFirst({ where: { externalId: opts.externalId } });
  if (!payment) {
    throw new BillingProviderError(`No payment with externalId=${opts.externalId}`);
  }

  // Idempotency: ignore transitions that don't change anything meaningful.
  if (payment.status === "SUCCEEDED" && opts.status === "SUCCEEDED") {
    return { payment, granted: false };
  }
  if (payment.status === "CANCELED" || payment.status === "FAILED" || payment.status === "REFUNDED") {
    return { payment, granted: false };
  }

  if (opts.status === "SUCCEEDED") {
    return prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!fresh || fresh.status === "SUCCEEDED") {
        return { payment: fresh ?? payment, granted: false };
      }
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          rawPayload: toJson(opts.rawPayload),
        },
      });
      return { payment: updated, granted: true };
    }).then(async (out) => {
      if (out.granted) {
        await topUp(
          payment.userId,
          payment.tokens,
          "PURCHASE",
          `Payment ${payment.id} via ${payment.providerSlug}`
        );
      }
      return out;
    });
  }

  // Non-success terminal states
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: opts.status,
      completedAt: opts.status === "PENDING" || opts.status === "WAITING" ? null : new Date(),
      rawPayload: opts.rawPayload as object | undefined,
    },
  });
  return { payment: updated, granted: false };
}
