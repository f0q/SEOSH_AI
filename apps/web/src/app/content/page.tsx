import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText } from "lucide-react";

export const metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">Content Manager</h1>
          <p className="text-surface-400 mt-1">Create and manage SEO-optimized content</p>
        </div>
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-surface-200 mb-2">No content yet</h2>
          <p className="text-sm text-surface-500 max-w-md">
            Build your semantic core first, then start generating AI-optimized content for your website.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
