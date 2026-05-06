"use client";

/**
 * @component DashboardLayout
 * @description Wraps dashboard pages with sidebar and header.
 * Uses client-side state for sidebar collapse.
 * Enforces route restrictions for team members.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useProject } from "@/lib/project-context";

/** Routes that team members (non-owners) are allowed to access */
const MEMBER_ALLOWED_ROUTES = ["/autopilot/content-planner", "/billing"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTeamMember, isLoading } = useProject();

  // Redirect team members away from restricted pages
  useEffect(() => {
    if (isLoading) return;
    if (isTeamMember) {
      const isAllowed = MEMBER_ALLOWED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
      if (!isAllowed) {
        router.replace("/autopilot/content-planner");
      }
    }
  }, [isTeamMember, isLoading, pathname, router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[260px] min-w-0 flex flex-col transition-all duration-300">
        <Header />
        <main className="p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
