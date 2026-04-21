import { router, protectedProcedure } from "@/server/trpc";
import { prisma } from "../db";

export const dashboardRouter = router({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [projectsCount, semanticCoresCount, contentPiecesCount, publishedCount] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.semanticCore.count({ where: { userId } }),
      prisma.contentItem.count({
        where: {
          contentPlan: {
            project: { userId }
          }
        }
      }),
      prisma.contentItem.count({
        where: {
          status: "PUBLISHED",
          contentPlan: {
            project: { userId }
          }
        }
      })
    ]);

    // Determine the smart "Next Step"
    let nextStep = {
      title: "New Project",
      href: "/projects/new",
      icon: "Plus"
    };

    if (projectsCount === 0) {
      nextStep = { title: "Create Your First Project", href: "/projects/new", icon: "Plus" };
    } else if (semanticCoresCount === 0) {
      nextStep = { title: "Build Semantic Core", href: "/semantic-core", icon: "Brain" };
    } else if (contentPiecesCount === 0) {
      nextStep = { title: "Generate Content", href: "/content/new", icon: "FileText" };
    } else {
      nextStep = { title: "Configure Autopilot", href: "/autopilot", icon: "Zap" };
    }

    return {
      stats: {
        projects: projectsCount,
        semanticCores: semanticCoresCount,
        contentPieces: contentPiecesCount,
        published: publishedCount,
      },
      nextStep
    };
  })
});
