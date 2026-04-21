/**
 * @module root router
 * @description Root tRPC router combining all domain routers.
 */

import { router } from "@/server/trpc";
import { projectsRouter } from "./routers/projects";
import { aiRouter } from "./routers/ai";
import { semanticCoreRouter } from "./routers/semanticCore";
import { autopilotRouter } from "./routers/autopilot";
import { contentRouter } from "./routers/content";
import { contentPlanRouter } from "./routers/contentPlan";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  projects: projectsRouter,
  ai: aiRouter,
  semanticCore: semanticCoreRouter,
  autopilot: autopilotRouter,
  content: contentRouter,
  contentPlan: contentPlanRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
