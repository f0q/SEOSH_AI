/**
 * @module root router
 * @description Root tRPC router combining all domain routers.
 */

import { router } from "@/server/trpc";
import { projectsRouter } from "./routers/projects";
import { aiRouter } from "./routers/ai";

export const appRouter = router({
  projects: projectsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
