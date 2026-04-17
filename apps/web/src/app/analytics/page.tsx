import DashboardLayout from "@/components/layout/DashboardLayout";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">Analytics</h1>
          <p className="text-surface-400 mt-1">Track your SEO performance and search positions</p>
        </div>
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-surface-200 mb-2">Analytics coming soon</h2>
          <p className="text-sm text-surface-500 max-w-md">
            Connect Yandex.Metrika, Google Search Console, and other services to track your SEO growth.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
