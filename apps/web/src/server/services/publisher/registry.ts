// Resolve a PublisherProvider from a stored PublisherConnector row.
// Decrypts secrets the same way the billing registry does.

import { prisma } from "../../db";
import { decrypt } from "../../lib/encryption";
import { WordPressPublisher } from "./providers/wordpress";
import type { PublisherProvider } from "./types";
import { PublisherError } from "./types";

type Factory = (baseUrl: string, creds: Record<string, string>) => PublisherProvider;

const FACTORIES: Record<string, Factory> = {
  WORDPRESS: (baseUrl, creds) => new WordPressPublisher({ baseUrl, credentials: creds }),
};

export async function getPublisherForConnector(connectorId: string): Promise<{
  provider: PublisherProvider;
  connector: Awaited<ReturnType<typeof prisma.publisherConnector.findUnique>>;
}> {
  const connector = await prisma.publisherConnector.findUnique({ where: { id: connectorId } });
  if (!connector) {
    throw new PublisherError(`Publisher connector ${connectorId} not found`);
  }
  if (!connector.isActive) {
    throw new PublisherError(`Publisher connector "${connector.name}" is disabled`);
  }
  const factory = FACTORIES[connector.type];
  if (!factory) {
    throw new PublisherError(`No publisher implementation for type ${connector.type}`);
  }
  const config = (connector.config ?? {}) as Record<string, string>;
  const creds: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    if (typeof v !== "string" || v.length === 0) continue;
    try {
      creds[k] = decrypt(v);
    } catch {
      creds[k] = v;
    }
  }
  return { provider: factory(connector.baseUrl, creds), connector };
}
