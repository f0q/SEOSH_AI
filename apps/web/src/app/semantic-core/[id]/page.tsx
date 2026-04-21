"use client";

import { use } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { ChevronLeft, Download, Brain, Globe, Search, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SemanticCoreDetail({ params }: PageProps) {
  // Use React.use() to unwrap the Promise
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data, isLoading } = trpc.semanticCore.getResults.useQuery({ semanticCoreId: id });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div>
          <Link href="/semantic-core" className="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Semantic Cores
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
                <Brain className="w-6 h-6 text-brand-400" />
                Semantic Core Details
              </h1>
              <p className="text-surface-400 mt-1">
                Viewing generated AI categories and keyword clusters.
              </p>
            </div>
            <button className="btn-secondary" onClick={() => alert("CSV Export coming soon")}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="glass-card p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 flex-shrink-0 animate-spin" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="glass-card p-12 text-center text-surface-400">
            No keywords found. (This core might be empty or still generating).
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Summary */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-surface-100 mb-4 uppercase tracking-wider">
                  AI Categories
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(data.summary).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between p-2 rounded-lg bg-surface-800/30 border border-surface-700/30">
                      <span className="text-sm text-surface-200 truncate pr-2">{category}</span>
                      <span className="badge badge-brand text-xs">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyword Table */}
            <div className="lg:col-span-3 glass-card overflow-hidden">
              <div className="p-4 border-b border-surface-800/50 flex items-center justify-between">
                <h3 className="font-semibold text-surface-100">All Keywords ({data.results.length})</h3>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input type="text" placeholder="Search keywords..." className="input-field !pl-9 !py-1.5 !text-sm" />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-900 shadow-md z-10">
                    <tr className="border-b border-surface-800/50">
                      <th className="p-3 font-medium text-surface-400">Keyword</th>
                      <th className="p-3 font-medium text-surface-400">AI Category</th>
                      <th className="p-3 font-medium text-surface-400">Target Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/30">
                    {data.results.map((row: any) => (
                      <tr key={row.id} className="hover:bg-surface-800/20">
                        <td className="p-3">
                          <div className="font-medium text-surface-200">{row.query}</div>
                          {row.isRepresentative && (
                            <span className="text-[10px] uppercase tracking-wider text-brand-400 mt-1 block">
                              Cluster Leader
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-surface-800 text-surface-300 text-xs">
                            {row.category}
                          </span>
                        </td>
                        <td className="p-3">
                          {row.page ? (
                            <a href={row.page} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-400 hover:underline">
                              <Globe className="w-3 h-3" />
                              {new URL(row.page).pathname}
                            </a>
                          ) : (
                            <span className="text-xs text-surface-500 italic">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
