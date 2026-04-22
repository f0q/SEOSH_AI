"use client";

import { use, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { ChevronLeft, Download, Brain, Globe, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { getCatColor } from "@/lib/categoryColors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SemanticCoreDetail({ params }: PageProps) {
  // Use React.use() to unwrap the Promise
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data, isLoading } = trpc.semanticCore.getResults.useQuery({ semanticCoreId: id });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredResults = data?.results.filter((row: any) => {
    if (selectedCategory && row.category !== selectedCategory) return false;
    return true;
  }) || [];

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
                Viewing generated categories and keyword clusters.
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
                <h3 className="text-sm font-semibold text-surface-100 mb-4 uppercase tracking-wider flex items-center justify-between">
                  <span>Categories</span>
                  {selectedCategory && (
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs text-brand-400 hover:text-brand-300 normal-case font-normal"
                    >
                      Clear Filter
                    </button>
                  )}
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(data.summary).map(([category, count]) => {
                    const clr = getCatColor(category);
                    const isSelected = selectedCategory === category;
                    return (
                      <div 
                        key={category} 
                        onClick={() => setSelectedCategory(isSelected ? null : category)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? "border-brand-500/50 bg-brand-500/10 shadow-[0_0_10px_rgba(var(--brand-500),0.1)]" 
                            : "bg-surface-800/30 border-surface-700/30 hover:bg-surface-800/50 hover:border-surface-600/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: clr.dot }} />
                          <span className="text-sm text-surface-200 truncate">{category}</span>
                        </div>
                        <span className="badge badge-brand text-xs flex-shrink-0">{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Keyword Table */}
            <div className="lg:col-span-3 glass-card overflow-hidden">
              <div className="p-4 border-b border-surface-800/50 flex items-center justify-between">
                <h3 className="font-semibold text-surface-100">All Keywords ({filteredResults.length})</h3>
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
                      <th className="p-3 font-medium text-surface-400">Category</th>
                      <th className="p-3 font-medium text-surface-400">Target Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/30">
                    {filteredResults.map((row: any) => {
                      const clr = getCatColor(row.category);
                      return (
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
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border"
                            style={clr.badge}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: clr.dot }} />
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
                      );
                    })}
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
