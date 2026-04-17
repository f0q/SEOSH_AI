/**
 * @module @seosh/publisher
 * @description Content publishing service with CMS connectors.
 * Supported CMS: WordPress (first), Tilda/Bitrix (planned).
 */

export interface PublisherConfig {
  type: "wordpress" | "tilda" | "bitrix" | "custom";
  url: string;      // Website URL or API endpoint
  auth: string;     // API Key, Bearer Token, or App Password
}

export interface PublishResult {
  success: boolean;
  url?: string;
  postId?: string | number;
  error?: string;
}

/**
 * Publish content to a specified CMS.
 */
export async function publishContent(
  title: string,
  htmlContent: string,
  config: PublisherConfig,
  options?: { status?: "publish" | "draft" | "future"; date?: string }
): Promise<PublishResult> {
  if (config.type === "wordpress") {
    return publishToWordPress(title, htmlContent, config, options);
  }

  throw new Error(`CMS type "${config.type}" is not supported yet.`);
}

/**
 * WordPress REST API Connector
 */
async function publishToWordPress(
  title: string,
  content: string,
  config: PublisherConfig,
  options?: { status?: "publish" | "draft" | "future"; date?: string }
): Promise<PublishResult> {
  try {
    // Note: WordPress REST API usually available at /wp-json/wp/v2/posts
    // url should be the base site URL like https://example.com
    const baseUrl = config.url.replace(/\/$/, "");
    const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;

    // Auth can be "username:application_password" encoded in base64
    const credentials = Buffer.from(config.auth).toString("base64");

    const payload = {
      title,
      content,
      status: options?.status || "publish",
      ...(options?.date && { date: options.date }),
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WP API Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      url: data.link,
      postId: data.id,
    };
  } catch (error: any) {
    console.error("WordPress publish error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
