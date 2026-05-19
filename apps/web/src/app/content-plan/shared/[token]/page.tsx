"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { LayoutList, Loader2, ShieldOff, Eye, KeyRound } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:           { label: "Not Started",  color: "text-surface-400" },
  IN_PROGRESS:     { label: "In Progress",  color: "text-amber-400" },
  REVIEW:          { label: "Review",       color: "text-blue-400" },
  GENERATED:       { label: "Generated",    color: "text-indigo-400" },
  OPTIMIZED:       { label: "Optimized",    color: "text-teal-400" },
  PUBLISHED:       { label: "Published",    color: "text-emerald-400" },
};

export default function SharedContentPlanPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const [password, setPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = trpc.contentPlan.getSharedPlan.useQuery(
    { token },
    { retry: false }
  );

  const acceptShare = trpc.contentPlan.acceptShare.useMutation({
    onSuccess: () => {
      setPwdError(null);
      refetch();
    },
    onError: (err) => {
      setPwdError(err.message);
    },
  });

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    acceptShare.mutate({ token, password });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading shared plan...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="glass-card p-8 max-w-md w-full mx-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto">
            <ShieldOff className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-surface-100">Access Denied</h1>
          <p className="text-surface-500 text-sm">
            {error?.message ?? "This link is invalid or has been revoked."}
          </p>
          <p className="text-surface-600 text-xs">
            Contact the project admin to get a new invite link.
          </p>
        </div>
      </div>
    );
  }

  if (data.isPending) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="glass-card p-8 max-w-md w-full mx-4 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-surface-100">Enter access password</h1>
            <p className="text-surface-500 text-sm">
              You were invited as <span className="text-surface-300">{data.shareEmail}</span>.
              Enter the temporary password from your invite email.
            </p>
          </div>
          <form onSubmit={submitPassword} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPwdError(null);
              }}
              className="w-full bg-surface-800 border border-surface-700/50 px-3 py-2 rounded-lg text-sm font-mono text-surface-100 tracking-widest"
              placeholder="Temporary password"
            />
            {pwdError && (
              <p className="text-xs text-red-400">{pwdError}</p>
            )}
            <button
              type="submit"
              disabled={acceptShare.isPending || !password.trim()}
              className="btn-primary w-full"
            >
              {acceptShare.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Unlock plan"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { plan, items, project, shareEmail } = data;
  if (!plan || !items || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-200">
      {/* Header */}
      <div className="border-b border-surface-800/50 bg-surface-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <LayoutList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-surface-50">
                {plan.name} — {project.name}
              </h1>
              <p className="text-xs text-surface-500">
                Shared with {shareEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Eye className="w-3.5 h-3.5" />
            Read-only view
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
        {/* Table */}
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: "1200px" }}>
            <thead>
              <tr className="border-b border-surface-700/30">
                {["#", "URL", "Section", "Page Type", "Priority", "Status", "Title", "Meta Desc", "H1", "Target Words", "Keywords", "Schema", "Notes"].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-xs font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/20">
              {items.map((item, idx) => {
                const statusCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.DRAFT;
                return (
                  <tr key={item.id} className="hover:bg-surface-800/20 transition-colors">
                    <td className="px-3 py-2 text-xs text-surface-600">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs text-brand-400 max-w-[200px] truncate">
                      {item.url
                        ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.url}</a>
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-300">{item.section || "—"}</td>
                    <td className="px-3 py-2 text-xs text-surface-400">{item.pageType || "—"}</td>
                    <td className="px-3 py-2 text-xs font-bold" style={{
                      color: item.priority === 1 ? "#f87171" : item.priority === 2 ? "#fb923c" : item.priority === 3 ? "#facc15" : item.priority === 4 ? "#4ade80" : "#60a5fa",
                    }}>{item.priority}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-200 max-w-[220px] truncate" title={item.metaTitle ?? ""}>{item.metaTitle || "—"}</td>
                    <td className="px-3 py-2 text-xs text-surface-400 max-w-[220px] truncate" title={item.metaDesc ?? ""}>{item.metaDesc || "—"}</td>
                    <td className="px-3 py-2 text-xs text-surface-300 max-w-[200px] truncate" title={item.h1 ?? ""}>{item.h1 || "—"}</td>
                    <td className="px-3 py-2 text-xs text-surface-400">{item.targetWordCount ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-surface-400 max-w-[180px] truncate" title={(item.targetKeywords ?? []).join(", ")}>
                      {item.targetKeywords?.length ? item.targetKeywords.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-400">{item.schemaType || "—"}</td>
                    <td className="px-3 py-2 text-xs text-surface-500 max-w-[160px] truncate" title={item.notes ?? ""}>{item.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="text-center py-10 text-surface-500 text-sm">
              No pages in this plan yet.
            </div>
          )}
        </div>

        <p className="text-xs text-surface-600 text-center">
          {items.length} page{items.length !== 1 ? "s" : ""} · Shared by {project.name}
        </p>
      </div>
    </div>
  );
}
