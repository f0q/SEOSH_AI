// Provider registry — single place that knows about every concrete
// BillingProvider. Resolution is done by slug (matching the DB row).

import { prisma } from "../../db";
import { decrypt } from "../../lib/encryption";
import { YooKassaProvider } from "./providers/yookassa";
import { ManualInvoiceProvider } from "./providers/manualInvoice";
import type { BillingProvider } from "./types";
import { BillingProviderError } from "./types";

export type ProviderFactory = (config: ProviderConfig) => BillingProvider;

export interface ProviderConfig {
  slug: string;
  testMode: boolean;
  /** Decrypted credentials map. */
  credentials: Record<string, string>;
}

const FACTORIES: Record<string, ProviderFactory> = {
  yookassa: (cfg) => new YooKassaProvider(cfg),
  manual_invoice: (cfg) => new ManualInvoiceProvider(cfg),
};

/**
 * Resolve a provider by slug, loading + decrypting its DB config.
 * Throws if the provider is unknown or disabled.
 */
export async function getProvider(slug: string): Promise<BillingProvider> {
  const row = await prisma.paymentProviderConfig.findUnique({ where: { slug } });
  if (!row) {
    throw new BillingProviderError(`Unknown billing provider: ${slug}`);
  }
  if (!row.enabled) {
    throw new BillingProviderError(`Billing provider ${slug} is disabled`);
  }
  const factory = FACTORIES[slug];
  if (!factory) {
    throw new BillingProviderError(`No factory registered for provider ${slug}`);
  }
  return factory({
    slug,
    testMode: row.testMode,
    credentials: decryptCredentials(row.credentials),
  });
}

/** List enabled providers (for UI rendering). */
export async function listEnabledProviders() {
  return prisma.paymentProviderConfig.findMany({
    where: { enabled: true },
    select: { slug: true, displayName: true, testMode: true },
  });
}

function decryptCredentials(blob: unknown): Record<string, string> {
  if (!blob || typeof blob !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(blob as Record<string, unknown>)) {
    if (typeof v !== "string" || v.length === 0) continue;
    // Encrypted values are stored as iv:tag:cipher (hex). If decryption fails,
    // we treat the value as already plain — useful for migration / dev.
    try {
      out[k] = decrypt(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
