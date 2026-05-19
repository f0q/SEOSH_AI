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
    const username = (cfg.credentials.username ?? "").trim();
    // WordPress displays Application Passwords as "abcd efgh ijkl mnop" — the
    // spaces are purely cosmetic. Strip them so users can paste verbatim.
    const password = (cfg.credentials.password ?? "").replace(/\s+/g, "");
    if (!username || !password) {
      throw new PublisherError("WordPress requires username + application password");
    }
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  async testConnection() {
    // 1) Sanity-check that wp-json is reachable at all.
    try {
      await this.request("GET", "/wp-json/", undefined, { allowAnon: true });
    } catch (err) {
      throw new PublisherError(
        `Не удаётся достучаться до WordPress REST API по адресу ${this.baseUrl}/wp-json/. ` +
        `Проверьте Base URL и что REST не отключён плагином. (${err instanceof Error ? err.message : err})`
      );
    }
    // 2) Verify credentials reach the user check.
    const res = await this.request("GET", "/wp-json/wp/v2/users/me");
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

  private async request(
    method: string,
    path: string,
    body?: unknown,
    opts: { allowAnon?: boolean } = {}
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (!opts.allowAnon) headers.Authorization = this.authHeader;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new PublisherError(`Cannot reach ${url}: ${err instanceof Error ? err.message : err}`, err);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      // Two common WP failure modes deserve a hand-holding message:
      //  - 401 "rest_not_logged_in" → Authorization header didn't reach WP
      //    (hosting stripped it) OR Application Password is wrong/revoked.
      //  - 403 "rest_forbidden"     → auth reached WP but the user lacks
      //    the capability for this endpoint.
      if (!opts.allowAnon && res.status === 401) {
        throw new PublisherError(
          `WordPress (${url}) отверг авторизацию.\n\n` +
          "Роль «Автор» — НЕ препятствие, Application Passwords работают для всех ролей с WP 5.6+.\n\n" +
          "Самый быстрый способ локализовать проблему — выполнить эту команду в терминале (с вашими данными):\n" +
          `  curl -i -u 'LOGIN:APP_PASSWORD' ${this.baseUrl}/wp-json/wp/v2/users/me\n\n` +
          "Если curl тоже вернёт 401 — проблема в WordPress/хостинге, не у нас. По убыванию вероятности:\n\n" +
          "  1) Application Password неверен или отозван.\n" +
          "     Создайте новый: WP → Пользователи → Профиль → Application Passwords → New.\n" +
          "     Скопируйте сразу, второй раз он не покажется. Пробелы можно оставить — мы их убираем.\n\n" +
          "  2) Указан не логин, а отображаемое имя.\n" +
          "     Нужно поле «Имя пользователя» (login_name), которое в WP → Пользователи → Все.\n" +
          "     Email тоже должен работать, но логин надёжнее.\n\n" +
          "  3) Сайт работает по HTTP, а не HTTPS.\n" +
          "     WP отключает Application Passwords на не-HTTPS сайтах. Проверьте Base URL начинается с https://.\n\n" +
          "  4) Хостинг режет заголовок Authorization (частая беда у Beget, Reg.ru, Sprinthost, GoDaddy).\n" +
          "     Apache (.htaccess в корне WP, до строки # END WordPress):\n" +
          "       RewriteCond %{HTTP:Authorization} ^(.+)$\n" +
          "       RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\n" +
          "     Nginx + PHP-FPM (в location ~ \\.php$ блоке):\n" +
          "       fastcgi_param HTTP_AUTHORIZATION $http_authorization;\n\n" +
          "  5) Security-плагин блокирует Application Passwords.\n" +
          "     Wordfence, iThemes Security, All In One WP Security, Solid Security часто отключают их.\n" +
          "     Найдите настройку «Disable Application Passwords» или «Disable REST API» и выключите.\n\n" +
          `Ответ WP: ${text.slice(0, 300)}`
        );
      }
      throw new PublisherError(`WordPress ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    }
    return res.json();
  }
}
