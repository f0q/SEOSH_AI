// Schedule arithmetic for autopilot. Keeps the conversion from human-readable
// frequency strings to interval ms in one place, and computes when the next
// item should be published for a given project (based on items already
// scheduled or published).

import { prisma } from "../../db";

/** Maps a `scheduleFreq` string from AutopilotConfig to an interval between
 *  publications, in milliseconds. Unknown values fall back to 1 article / week. */
export function intervalMsForFreq(freq: string): number {
  const hour = 60 * 60 * 1000;
  switch (freq) {
    case "1d": return 24 * hour;          // 1 article / day
    case "3w": return Math.round((7 / 3) * 24 * hour); // 3 / week → ~56h
    case "1w": return 7 * 24 * hour;      // 1 / week
    case "2w": return 14 * 24 * hour;     // 1 / 2 weeks
    default:   return 7 * 24 * hour;
  }
}

/** Find the latest scheduledAt or publishedAt across the project's content
 *  items. Used to chain new schedules behind whatever's already in flight. */
export async function latestAnchorForProject(projectId: string): Promise<Date | null> {
  const latest = await prisma.contentItem.findFirst({
    where: {
      contentPlan: { projectId },
      OR: [
        { scheduledAt: { not: null } },
        { publishedAt: { not: null } },
      ],
    },
    orderBy: [
      { scheduledAt: "desc" },
      { publishedAt: "desc" },
    ],
    select: { scheduledAt: true, publishedAt: true },
  });
  if (!latest) return null;
  const sched = latest.scheduledAt?.getTime() ?? 0;
  const pub = latest.publishedAt?.getTime() ?? 0;
  const max = Math.max(sched, pub);
  return max > 0 ? new Date(max) : null;
}

/** Compute when a freshly-scheduled item should be published. Anchors after
 *  the latest existing schedule plus `intervalMs`, but never before `now`. */
export async function computeNextScheduledAt(projectId: string, freq: string): Promise<Date> {
  const interval = intervalMsForFreq(freq);
  const anchor = await latestAnchorForProject(projectId);
  const now = Date.now();
  if (!anchor) {
    // Nothing scheduled yet — publish in 5 minutes so user has a chance to
    // back out before the first auto-publish goes through.
    return new Date(now + 5 * 60 * 1000);
  }
  const candidate = anchor.getTime() + interval;
  return new Date(Math.max(candidate, now + 60 * 1000));
}
