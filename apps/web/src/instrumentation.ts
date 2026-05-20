// Server-side instrumentation hook. Runs once on Next.js server boot.
// We kick off the autopilot worker tick on a 60s interval here.

export async function register() {
  // Only run in the Node.js runtime (skip Edge / build-time inspection).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Skip during `next build` — there's no point starting the loop in the
  // build container, and starting Prisma here breaks build output collection.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { autopilotTick } = await import("./server/services/autopilot/tick");

  // Globals on `globalThis` so dev mode hot reload doesn't stack multiple
  // intervals on top of each other.
  const g = globalThis as unknown as { __autopilotIntervalId?: NodeJS.Timeout };
  if (g.__autopilotIntervalId) clearInterval(g.__autopilotIntervalId);

  // First tick deferred 30s after boot so initial requests aren't slowed by it.
  const tickEvery = 60 * 1000;
  const start = setTimeout(() => {
    autopilotTick().catch((err) => console.error("[autopilot] initial tick error:", err));
    g.__autopilotIntervalId = setInterval(() => {
      autopilotTick().catch((err) => console.error("[autopilot] tick error:", err));
    }, tickEvery);
  }, 30 * 1000);

  // Tag the timeout so dev reloads can find it.
  (g as { __autopilotBootTimeoutId?: NodeJS.Timeout }).__autopilotBootTimeoutId = start;

  console.log("[autopilot] worker scheduled (tick every 60s, first tick in 30s)");
}
