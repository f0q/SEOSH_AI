"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { Brain, Plus, Globe, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SemanticCoreDashboard() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: cores, isLoading } = trpc.semanticCore.getMany.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const linkMutation = trpc.semanticCore.linkToProject.useMutation();
  const deleteMutation = trpc.semanticCore.delete.useMutation();

  const handleLinkProject = async (coreId: string, projectId: string | null) => {
    try {
      await linkMutation.mutateAsync({ semanticCoreId: coreId, projectId });
      utils.semanticCore.getMany.invalidate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (coreId: string) => {
    if (!confirm("Delete this semantic core and all its keywords? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync({ semanticCoreId: coreId });
      utils.semanticCore.getMany.invalidate();
      utils.dashboard.getOverview.invalidate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-50">
              Semantic <span className="gradient-text-brand">Cores</span>
            </h1>
            <p className="text-surface-400 mt-1.5 text-base">
              Manage your keyword clusters, build site structures, and link to projects.
            </p>
          </div>
          <Link href="/semantic-core/new" className="btn-primary">
            <Plus className="w-4 h-4 fill-white" />
            New Semantic Core
          </Link>
        </div>

        {/* Dashboard Content */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                <p className="text-surface-400">Loading your semantic cores...</p>
              </div>
            </div>
          ) : !cores || cores.length === 0 ? (
            <div className="p-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-medium text-surface-100 mb-2">No Semantic Cores Yet</h3>
              <p className="text-surface-400 max-w-sm mb-6">
                Start by creating your first semantic core.
              </p>
              <Link href="/semantic-core/new" className="btn-primary">
                <Plus className="w-4 h-4 fill-white" />
                Create First Core
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-800/50">
                    <th className="p-4 pl-6 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Core Target
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      Keywords
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      Categories
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      Date
                    </th>
                    <th className="p-4 pr-6 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/30">
                  {cores.map((core: any) => (
                    <tr 
                      key={core.id} 
                      className="group hover:bg-surface-800/20 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <Link href={`/semantic-core/${core.id}`} className="block">
                          <div className="font-medium text-surface-200 group-hover:text-brand-400 transition-colors flex items-center gap-2">
                            <Globe className="w-4 h-4 text-surface-500 flex-shrink-0" />
                            {core.siteUrl === "merged-cores" ? "Master Core (Merged)" : core.siteUrl}
                          </div>
                          <div className="text-xs text-surface-500 mt-1">
                            ID: {core.id.split('-')[0]}...
                          </div>
                        </Link>
                      </td>
                      <td className="p-4">
                        <select
                          value={core.projectId || ""}
                          onChange={(e) => handleLinkProject(core.id, e.target.value || null)}
                          className="input-field !py-1 !px-2 !text-xs !w-auto min-w-[140px]"
                        >
                          <option value="">Unassigned</option>
                          {projects?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.companyProfile?.companyName || p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-surface-300 font-medium">{core._count.queries}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-surface-300">{core._count.categories}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-sm text-surface-400 truncate">
                          {new Date(core.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleDelete(core.id)}
                          className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete core"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
