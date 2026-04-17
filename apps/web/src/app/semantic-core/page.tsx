import DashboardLayout from "@/components/layout/DashboardLayout";
import { Brain } from "lucide-react";

export const metadata = { title: "Semantic Core" };

export default function SemanticCorePage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">Semantic Core</h1>
          <p className="text-surface-400 mt-1">Analyze and cluster your keywords with AI</p>
        </div>
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <Brain className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-surface-200 mb-2">No semantic core yet</h2>
          <p className="text-sm text-surface-500 max-w-md">
            Create a project first, then build your semantic core with AI-powered keyword clustering.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
