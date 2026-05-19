// Pluggable CMS publisher contract — same shape as billing providers.
// One implementation per ConnectorType (WORDPRESS, TILDA, …).

export interface PublisherConfig {
  /** e.g. https://example.com */
  baseUrl: string;
  /** Decrypted provider-specific creds. */
  credentials: Record<string, string>;
}

export interface PublishInput {
  title: string;
  /** HTML body (already rendered from markdown). */
  htmlContent: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  /** "publish" | "draft" — what state the post should be created in. */
  status?: "publish" | "draft";
  /** Existing remote id when updating. */
  externalPostId?: string | null;
}

export interface PublishResult {
  externalPostId: string;
  url: string;
  status: "publish" | "draft" | "pending" | "future";
}

export interface PublisherProvider {
  readonly type: string;
  testConnection(): Promise<{ ok: true; meta?: Record<string, unknown> }>;
  publish(input: PublishInput): Promise<PublishResult>;
  unpublish(externalPostId: string): Promise<void>;
}

export class PublisherError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PublisherError";
  }
}
