"use client";

/**
 * @component DashboardLayout
 * @description Wraps dashboard pages with sidebar and header.
 * Uses client-side state for sidebar collapse.
 */

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
