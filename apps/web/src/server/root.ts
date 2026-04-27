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
import { settingsRouter } from "./routers/settings";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  projects: projectsRouter,
  ai: aiRouter,
  semanticCore: semanticCoreRouter,
  autopilot: autopilotRouter,
  content: contentRouter,
  contentPlan: contentPlanRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
