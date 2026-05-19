// YooKassa (kassa.yookassa.ru) — REST API v3.
// Auth: HTTP Basic with shopId:secretKey.
// Docs: https://yookassa.ru/developers/using-api/interaction-format
//
// Webhook IPs are documented; we additionally re-fetch the payment from the
// API as the canonical source of truth before granting tokens.

import crypto from "crypto";
import type {
  BillingProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  VerifyWebhookInput,
  WebhookEvent,
} from "../types";
import { BillingProviderError } from "../types";
import type { ProviderConfig } from "../registry";

interface YooKassaPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
}

interface WebhookBody {
  type: "notification";
  event: "payment.succeeded" | "payment.canceled" | "payment.waiting_for_capture" | string;
  object: YooKassaPayment;
}

export class YooKassaProvider implements BillingProvider {
  readonly slug = "yookassa";
  readonly canCharge = true;

  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.yookassa.ru/v3";

  constructor(cfg: ProviderConfig) {
    this.shopId = cfg.credentials.shopId ?? "";
    this.secretKey = cfg.credentials.secretKey ?? "";
    if (!this.shopId || !this.secretKey) {
      throw new BillingProviderError(
        "YooKassa is enabled but shopId/secretKey are not configured (set them in /admin)"
      );
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const body = {
      amount: {
        value: kopecksToValue(input.payment.amountRub),
        currency: input.payment.currency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      description: input.description,
      metadata: {
        paymentId: input.payment.id,
        userId: input.payment.userId,
        tokens: String(input.payment.tokens),
      },
      receipt: {
        customer: { email: input.userEmail },
        items: [
          {
            description: input.description.slice(0, 128),
            quantity: "1.00",
            amount: {
              value: kopecksToValue(input.payment.amountRub),
              currency: input.payment.currency,
            },
            vat_code: 1, // НДС не облагается
            payment_subject: "service",
            payment_mode: "full_payment",
          },
        ],
      },
    };

    const res = await this.request("POST", "/payments", body, {
      "Idempotence-Key": crypto.randomUUID(),
    });

    const data = res as YooKassaPayment;
    const confirmationUrl = data.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      throw new BillingProviderError("YooKassa did not return a confirmation_url");
    }
    return {
      externalId: data.id,
      confirmationUrl,
      rawPayload: data,
    };
  }

  async parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    let parsed: WebhookBody;
    try {
      parsed = JSON.parse(input.rawBody);
    } catch (err) {
      throw new BillingProviderError("Invalid JSON in YooKassa webhook", err);
    }
    if (parsed?.type !== "notification" || !parsed.object?.id) {
      throw new BillingProviderError("Unexpected YooKassa webhook shape");
    }

    // Re-fetch from the API for canonical state (defends against spoofed webhooks).
    const canonical = await this.fetchPayment(parsed.object.id);
    return {
      externalId: canonical.id,
      status: mapStatus(canonical),
      rawPayload: canonical,
    };
  }

  private async fetchPayment(id: string): Promise<YooKassaPayment> {
    const res = await this.request("GET", `/payments/${id}`);
    return res as YooKassaPayment;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<unknown> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64");
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      throw new BillingProviderError(`YooKassa ${method} ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }
}

function kopecksToValue(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}

function mapStatus(p: YooKassaPayment): WebhookEvent["status"] {
  if (p.status === "succeeded" && p.paid) return "SUCCEEDED";
  if (p.status === "canceled") return "CANCELED";
  if (p.status === "waiting_for_capture" || p.status === "pending") return "PENDING";
  return "FAILED";
}
