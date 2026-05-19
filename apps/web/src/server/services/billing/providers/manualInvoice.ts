// Manual invoice — generates an invoice page the customer pays by bank
// transfer. Tokens are credited by an admin via /admin after they see the
// money on their bank account. There is no real webhook here.

import type {
  BillingProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyWebhookInput,
  WebhookEvent,
} from "../types";
import { BillingProviderError } from "../types";
import type { ProviderConfig } from "../registry";

export class ManualInvoiceProvider implements BillingProvider {
  readonly slug = "manual_invoice";
  readonly canCharge = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_cfg: ProviderConfig) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return {
      externalId: `manual-${input.payment.id}`,
      confirmationUrl: `${appUrl}/billing/invoice/${input.payment.id}`,
    };
  }

  async parseWebhook(_input: VerifyWebhookInput): Promise<WebhookEvent> {
    throw new BillingProviderError("manual_invoice has no webhook — admin credits tokens manually");
  }
}
