// WordPress REST API connector.
// Auth: Application Passwords (recommended) — Username + app-password via
// HTTP Basic. Docs: https://developer.wordpress.org/rest-api/

import type {
  PublisherProvider,
  PublisherConfig,
  PublishInput,
  PublishResult,
} from "../types";
import { PublisherError } from "../types";

interface WpPostResponse {
  id: number;
  link: string;
  status: "publish" | "draft" | "pending" | "future" | "private";
}

export class WordPressPublisher implements PublisherProvider {
  readonly type = "WORDPRESS";

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(cfg: PublisherConfig) {
    if (!cfg.baseUrl) {
      throw new PublisherError("WordPress baseUrl is required");
    }
    const username = cfg.credentials.username ?? "";
    const password = cfg.credentials.password ?? "";
    if (!username || !password) {
      throw new PublisherError("WordPress requires username + application password");
    }
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  async testConnection() {
    // /users/me returns the authenticated user if creds are valid.
    const res = await this.request("GET", "/wp-json/wp/v2/users/me?context=edit");
    return { ok: true as const, meta: { user: res } };
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const body = {
      title: input.title,
      content: input.htmlContent,
      status: input.status ?? "draft",
      excerpt: input.metaDescription ?? undefined,
      slug: input.slug ?? undefined,
      meta: input.metaTitle
        ? { yoast_wpseo_title: input.metaTitle, _yoast_wpseo_title: input.metaTitle }
        : undefined,
    };

    const path = input.externalPostId
      ? `/wp-json/wp/v2/posts/${input.externalPostId}`
      : `/wp-json/wp/v2/posts`;
    const res = (await this.request("POST", path, body)) as WpPostResponse;

    return {
      externalPostId: String(res.id),
      url: res.link,
      status: (res.status === "private" ? "draft" : res.status) as PublishResult["status"],
    };
  }

  async unpublish(externalPostId: string): Promise<void> {
    // Move to trash. WP supports ?force=true for permanent deletion but we
    // keep it recoverable.
    await this.request("DELETE", `/wp-json/wp/v2/posts/${externalPostId}`);
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new PublisherError(`Cannot reach ${url}: ${err instanceof Error ? err.message : err}`, err);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      throw new PublisherError(`WordPress ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    }
    return res.json();
  }
}
