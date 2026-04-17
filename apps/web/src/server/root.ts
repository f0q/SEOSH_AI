/**
 * @module root router
 * @description Root tRPC router combining all domain routers.
 */

import { router } from "@/server/trpc";
import { projectsRouter } from "./routers/projects";
import { aiRouter } from "./routers/ai";
import { semanticCoreRouter } from "./routers/semanticCore";

export const appRouter = router({
  projects: projectsRouter,
  ai: aiRouter,
  semanticCore: semanticCoreRouter,
});

export type AppRouter = typeof appRouter;

