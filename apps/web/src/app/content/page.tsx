"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { useProject } from "@/lib/project-context";
import {
  FileText, Plus, LayoutList, ChevronRight, Loader2,
  Eye, Pencil, Search, Filter, Clock, CheckCircle2,
  Wand2, BarChart3, Globe, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const STATUS_FILTERS = [
  { value: "", label: "All", color: "text-surface-300" },
  { value: "DRAFT", label: "Draft", color: "text-surface-400" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-amber-400" },
  { value: "GENERATED", label: "Generated", color: "text-indigo-400" },
  { value: "RECOMMENDATIONS", label: "Reviewed", color: "text-blue-400" },
  { value: "OPTIMIZED", label: "Optimized", color: "text-teal-400" },
  { value: "REVIEW", label: "Review", color: "text-purple-400" },
  { value: "PUBLISHED", label: "Published", color: "text-emerald-400" },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_FILTERS.find(s => s.value === status) || STATUS_FILTERS[0];
  const bgMap: Record<string, string> = {
    DRAFT: "bg-surface-700/40 border-surface-600/30",
    IN_PROGRESS: "bg-amber-500/10 border-amber-500/20",
    GENERATED: "bg-indigo-500/10 border-indigo-500/20",
    GENERATING: "bg-indigo-500/10 border-indigo-500/20",
    ANALYZING: "bg-blue-500/10 border-blue-500/20",
    RECOMMENDATIONS: "bg-blue-500/10 border-blue-500/20",
    OPTIMIZING: "bg-teal-500/10 border-teal-500/20",
    OPTIMIZED: "bg-teal-500/10 border-teal-500/20",
    REVIEW: "bg-purple-500/10 border-purple-500/20",
    PUBLISHED: "bg-emerald-500/10 border-emerald-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${bgMap[status] || bgMap.DRAFT} ${cfg.color}`}>
      {cfg.label || status}
    </span>
  );
}

export default function ContentPage() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? "";
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: items = [], isLoading } = trpc.contentPlan.getContentItems.useQuery(
    { projectId, statusFilter: statusFilter || undefined },
    { enabled: !!projectId }
  );

  const filteredItems = searchQuery
    ? items.filter((item: any) =>
        (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.h1 || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.section || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  // Stats
  const totalItems = items.length;
  const withContent = items.filter((i: any) => i.markdownBody).length;
  const published = items.filter((i: any) => i.status === "PUBLISHED").length;
  const avgScore = items.filter((i: any) => i.seoScore != null).reduce((acc: number, i: any) => acc + (i.seoScore || 0), 0) / (items.filter((i: any) => i.seoScore != null).length || 1);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Content Manager</h1>
            <p className="text-surface-400 mt-1">View and manage all content for your project</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/autopilot/content-planner" className="btn-secondary gap-2 text-sm">
              <LayoutList className="w-4 h-4" /> Content Planner
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Items", value: totalItems, icon: FileText, color: "text-brand-400", bg: "bg-brand-500/10" },
            { label: "With Content", value: withContent, icon: Wand2, color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { label: "Published", value: published, icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Avg. SEO Score", value: avgScore > 0 ? Math.round(avgScore) : "—", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          ].map(stat => (
            <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="input-field !pl-9 !py-2 !text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-surface-500" />
            {STATUS_FILTERS.map(sf => (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  statusFilter === sf.value
                    ? "bg-brand-500/15 border-brand-500/30 text-brand-400"
                    : "bg-surface-800/30 border-surface-700/30 text-surface-500 hover:text-surface-300"
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="glass-card p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-surface-500" />
            </div>
            <h2 className="text-lg font-semibold text-surface-200 mb-2">
              {statusFilter ? "No content matches this filter" : "No content items yet"}
            </h2>
            <p className="text-sm text-surface-500 mb-6 max-w-md">
              {statusFilter
                ? "Try a different filter or clear the search."
                : "Go to the Content Planner to create ideas and generate content."
              }
            </p>
            <Link href="/autopilot/content-planner" className="btn-primary gap-2">
              <LayoutList className="w-4 h-4" /> Open Content Planner
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item: any) => (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="glass-card p-4 block group hover:border-brand-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
                    item.status === "PUBLISHED" ? "bg-emerald-500" :
                    item.status === "OPTIMIZED" ? "bg-teal-500" :
                    item.status === "GENERATED" ? "bg-indigo-500" :
                    item.status === "RECOMMENDATIONS" ? "bg-blue-500" :
                    item.status === "IN_PROGRESS" ? "bg-amber-500" :
                    "bg-surface-600"
                  }`} />

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-surface-100 truncate group-hover:text-white transition-colors">
                        {item.h1 || item.metaTitle || item.title}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-surface-500">
                      {item.section && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {item.section}</span>}
                      {item.pageType && <span>{item.pageType}</span>}
                      {item.url && <span className="text-brand-400/60">{item.url}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right side info */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.seoScore != null && (
                      <div className={`text-center ${
                        item.seoScore >= 80 ? "text-emerald-400" :
                        item.seoScore >= 50 ? "text-amber-400" :
                        "text-red-400"
                      }`}>
                        <p className="text-lg font-bold">{item.seoScore}</p>
                        <p className="text-[9px] uppercase tracking-wider">SEO</p>
                      </div>
                    )}
                    {item.markdownBody ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-800/50 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-surface-500" />
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-surface-600 group-hover:text-brand-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
