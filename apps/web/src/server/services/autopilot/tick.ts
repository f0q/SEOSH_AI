// Autopilot worker tick. Invoked from a setInterval in instrumentation.ts.
// Two passes per tick:
//   1. Auto-approve: for projects with autoApprove enabled, promote ready
//      content items (OPTIMIZED) to SCHEDULED with a computed scheduledAt.
//   2. Publish: pick SCHEDULED items whose scheduledAt is due and ship them
//      through publishContentItem to the project's default connector.
//
// Concurrency: guarded by a Postgres session advisory lock so that even if
// the Next.js app ever scales out, only one process at a time runs the tick.

import { prisma } from "../../db";
import { publishContentItem } from "../publisher/publishService";
import { computeNextScheduledAt } from "./schedule";

const ADVISORY_LOCK_KEY = 8273645231;

let ticking = false;

export async function autopilotTick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    // Try to acquire advisory lock. If another process holds it, skip this tick.
    const rows = await prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS ok
    `;
    if (!rows[0]?.ok) return;
    try {
      await autoApprovePass();
      await publishDuePass();
    } finally {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
    }
  } catch (err) {
    console.error("[autopilot] tick failed:", err);
  } finally {
    ticking = false;
  }
}

// ── Pass 1: auto-approve ready items in projects with autoApprove === true ──

async function autoApprovePass() {
  const configs = await prisma.autopilotConfig.findMany({
    where: { enabled: true, autoApprove: true },
    select: { projectId: true, scheduleFreq: true },
  });
  for (const cfg of configs) {
    // Highest-priority OPTIMIZED item with body — one per tick to spread load.
    const item = await prisma.contentItem.findFirst({
      where: {
        contentPlan: { projectId: cfg.projectId },
        status: "OPTIMIZED",
        NOT: { markdownBody: null },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (!item) continue;
    const scheduledAt = await computeNextScheduledAt(cfg.projectId, cfg.scheduleFreq);
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { status: "SCHEDULED", scheduledAt },
    });
    console.log(`[autopilot] auto-approved item ${item.id} for ${cfg.projectId} @ ${scheduledAt.toISOString()}`);
  }
}

// ── Pass 2: publish items whose scheduledAt is due ──

async function publishDuePass() {
  const due = await prisma.contentItem.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
      contentPlan: { project: { autopilotConfig: { enabled: true } } },
    },
    select: {
      id: true,
      contentPlan: { select: { projectId: true } },
    },
    take: 5,
  });

  for (const item of due) {
    // Find a default + configured connector for the project.
    const connector = await prisma.publisherConnector.findFirst({
      where: {
        projectId: item.contentPlan.projectId,
        isActive: true,
        isDefault: true,
      },
      select: { id: true, config: true },
    });
    const usableConnector = connector ?? (await prisma.publisherConnector.findFirst({
      where: { projectId: item.contentPlan.projectId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, config: true },
    }));

    if (!usableConnector) {
      // No connector — push schedule out 1h so we don't busy-loop.
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { scheduledAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      continue;
    }

    try {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { status: "PUBLISHING" },
      });
      await publishContentItem({
        contentItemId: item.id,
        connectorId: usableConnector.id,
        status: "publish",
      });
      console.log(`[autopilot] published item ${item.id}`);
    } catch (err) {
      // Roll back to SCHEDULED with retry-after; publishContentItem already
      // wrote lastError on the connector.
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          status: "SCHEDULED",
          scheduledAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      console.error(`[autopilot] publish failed for item ${item.id}:`, err);
    }
  }
}
