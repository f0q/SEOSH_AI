import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, Plus, LayoutList, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Content Manager</h1>
            <p className="text-surface-400 mt-1">Create and manage SEO-optimized content</p>
          </div>
          <Link href="/content/new" className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> New Article
          </Link>
        </div>

        {/* Content Planner Button */}
        <Link
          href="/autopilot/content-planner"
          className="glass-card p-5 w-full text-left group hover:border-emerald-500/30 transition-all block mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <LayoutList className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-100 group-hover:text-white transition-colors">
                  Content Planner
                </p>
                <p className="text-xs text-surface-500 mt-0.5">Plan & track all pages</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-600 group-hover:text-emerald-400 transition-colors" />
          </div>
        </Link>
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-surface-200 mb-2">No content yet</h2>
          <p className="text-sm text-surface-500 mb-6 max-w-md">
            Create your first AI-powered article and publish it to your website.
          </p>
          <Link href="/content/new" className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Create First Article
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

