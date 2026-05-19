// ─── Pluggable billing provider interface ───────────────────────────────────
// Every concrete provider (YooKassa, Stripe, manual invoice, …) implements
// this contract. New providers are added by:
//   1. creating a class implementing BillingProvider
//   2. registering it in registry.ts
//   3. adding a row to payment_provider_configs in the DB

import type { Payment } from "@prisma/client";

export interface CreatePaymentInput {
  payment: Payment;
  userEmail: string;
  /** Where the user is sent after completing checkout. */
  returnUrl: string;
  /** Human-readable description shown on the provider's checkout page. */
  description: string;
}

export interface CreatePaymentResult {
  /** Provider-side id (stored on Payment.externalId). */
  externalId: string;
  /** Hosted checkout URL the user should be redirected to. */
  confirmationUrl: string;
  /** Anything provider-specific worth keeping for debugging. */
  rawPayload?: unknown;
}

export interface VerifyWebhookInput {
  /** Raw request body bytes (provider-specific signature schemes need it raw). */
  rawBody: string;
  headers: Record<string, string | undefined>;
}

export interface WebhookEvent {
  externalId: string;
  status: "SUCCEEDED" | "FAILED" | "CANCELED" | "PENDING";
  rawPayload: unknown;
}

export interface BillingProvider {
  /** Stable slug matching PaymentProviderConfig.slug. */
  readonly slug: string;
  /** Whether this provider can actually take money. */
  readonly canCharge: boolean;
  /** Create a hosted checkout for a Payment record. */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * Validate and parse a webhook callback. Throws if the signature or shape
   * is wrong. Returns the normalized event the caller will use to mark the
   * Payment as SUCCEEDED/FAILED.
   */
  parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent>;
}

export class BillingProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "BillingProviderError";
  }
}
