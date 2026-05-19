// Publish / unpublish a ContentItem to its configured CMS.

import { prisma } from "../../db";
import { getPublisherForConnector } from "./registry";
import { PublisherError } from "./types";

function markdownToHtml(md: string): string {
  // Minimal MD→HTML — enough for WordPress block editor to interpret it.
  // Real fidelity will come when the editor switches to react-markdown.
  return md
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .split(/\n{2,}/)
    .map((p) => (p.startsWith("<h") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
}

export async function publishContentItem(opts: {
  contentItemId: string;
  connectorId: string;
  status?: "publish" | "draft";
}) {
  const item = await prisma.contentItem.findUnique({ where: { id: opts.contentItemId } });
  if (!item) throw new PublisherError("Content item not found");
  if (!item.markdownBody && !item.htmlBody) {
    throw new PublisherError("Content body is empty — nothing to publish");
  }

  const { provider, connector } = await getPublisherForConnector(opts.connectorId);
  if (!connector) throw new PublisherError("Connector disappeared between fetches");

  const html = item.htmlBody?.trim()
    ? item.htmlBody
    : markdownToHtml(item.markdownBody ?? "");

  try {
    const result = await provider.publish({
      title: item.title || item.metaTitle || "Untitled",
      htmlContent: html,
      metaTitle: item.metaTitle,
      metaDescription: item.metaDesc,
      slug: item.slug,
      status: opts.status ?? "publish",
      externalPostId: item.externalPostId,
    });

    await prisma.$transaction([
      prisma.contentItem.update({
        where: { id: item.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedUrl: result.url,
          publisherConnectorId: connector.id,
          externalPostId: result.externalPostId,
        },
      }),
      prisma.publisherConnector.update({
        where: { id: connector.id },
        data: { lastSync: new Date(), lastError: null },
      }),
    ]);

    return { url: result.url, externalPostId: result.externalPostId, status: result.status };
  } catch (err) {
    await prisma.publisherConnector.update({
      where: { id: connector.id },
      data: { lastError: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

export async function unpublishContentItem(contentItemId: string) {
  const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
  if (!item) throw new PublisherError("Content item not found");
  if (!item.externalPostId || !item.publisherConnectorId) {
    return { alreadyUnpublished: true };
  }
  const { provider } = await getPublisherForConnector(item.publisherConnectorId);
  await provider.unpublish(item.externalPostId);
  await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      status: "DRAFT",
      publishedAt: null,
      publishedUrl: null,
      externalPostId: null,
    },
  });
  return { alreadyUnpublished: false };
}
