import DashboardLayout from "@/components/layout/DashboardLayout";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Projects</h1>
            <p className="text-surface-400 mt-1">Manage your SEO projects</p>
          </div>
          <Link href="/projects/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
            <FolderKanban className="w-7 h-7 text-surface-500" />
          </div>
          <h2 className="text-lg font-semibold text-surface-200 mb-2">No projects yet</h2>
          <p className="text-sm text-surface-500 mb-6 max-w-md">
            Create your first project to start optimizing your website for search engines.
          </p>
          <Link href="/projects/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create First Project
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
