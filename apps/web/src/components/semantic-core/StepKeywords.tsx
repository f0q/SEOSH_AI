"use client";

import { useState, useRef } from "react";
import { Star, ChevronDown, ChevronRight, Loader2, Pencil, Check, X, Upload } from "lucide-react";
import { trpc } from "@/trpc/client";

interface Props {
  semanticCoreId: string | null;
}

export function StepKeywords({ semanticCoreId }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "grouping" | "done">("idle");
  const [showInput, setShowInput] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<{ id: string; value: string } | null>(null);
  const [starredGroups, setStarredGroups] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const groupQueries = trpc.semanticCore.groupQueries.useMutation();
  const { data: groupsData, refetch: refetchGroups } = trpc.semanticCore.getGroups.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  const hasGroups = (groupsData?.totalGroups ?? 0) > 0;

  const handleGroup = async () => {
    if (!semanticCoreId) return;
    const queries = text.split("\n").filter((l) => l.trim().length > 0);
    if (queries.length === 0) return;
    setStatus("grouping");
    try {
      await groupQueries.mutateAsync({ semanticCoreId, queries });
      await refetchGroups();
      setStatus("done");
      setShowInput(false);
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string);
    reader.readAsText(file, "utf-8");
  };

  const toggleExpand = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleStar = (id: string) => {
    setStarredGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const groups = groupsData?.groups ?? [];
  const kwCount = text.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">Keyword Grouping</h2>
        <p className="text-sm text-surface-400">
          Paste your keywords (one per line) and we&apos;ll cluster them with N-gram lexical analysis.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <span>⚡</span> Script only — zero AI tokens
          </span>
          <span className="text-xs text-surface-500">
            Groups are built locally, so only representative queries (1 per group) are sent to the AI — cutting cost by up to 90%.
          </span>
        </div>
      </div>

      {/* Input area — show if no groups yet, or user clicked Re-upload */}
      {(!hasGroups || showInput) && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"buy sneakers\nbuy nike sneakers\nrunning shoes\nbest running shoes 2024\n..."}
              className="input-field min-h-[220px] font-mono text-sm resize-y"
              rows={10}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-ghost gap-2 text-sm"
              >
                <Upload className="w-4 h-4" /> Import CSV/TXT
              </button>
              <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
              <span className="text-xs text-surface-500">{kwCount} keywords</span>
            </div>
            <button
              onClick={handleGroup}
              disabled={!text.trim() || !semanticCoreId || status === "grouping"}
              className="btn-primary gap-2"
            >
              {status === "grouping" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Grouping...</>
              ) : "Group Keywords"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {hasGroups && groupsData && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-surface-100">Lexical Grouping</h3>
              <p className="text-xs text-cyan-400 mt-0.5">
                {groupsData.totalQueries} queries → {groupsData.totalGroups} groups → {groupsData.totalGroups} representative
              </p>
            </div>
            <button
              onClick={() => { setShowInput(true); }}
              className="btn-secondary text-xs gap-1.5"
            >
              <Pencil className="w-3 h-3" /> Re-upload
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total queries", value: groupsData.totalQueries, color: "text-brand-400", hint: "Keywords you uploaded" },
              { label: "Lexical groups", value: groupsData.totalGroups, color: "text-emerald-400", hint: "Clusters built by script" },
              { label: "AI compression", value: `${groupsData.compressionPct}%`, color: "text-amber-400", hint: "Tokens saved vs sending all keywords" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-800/30 border border-surface-700/20 p-4" title={s.hint}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-surface-500 mt-1">{s.label}</p>
                <p className="text-[10px] text-surface-700 mt-0.5 leading-tight">{s.hint}</p>
              </div>
            ))}
          </div>

          {/* Group list */}
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {groups.map((g) => {
              const isExpanded = expandedGroups.has(g.id);
              const isStarred = starredGroups.has(g.id);
              const isEditing = editingGroup?.id === g.id;

              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-surface-700/25 bg-surface-800/20 hover:bg-surface-800/35 transition-colors"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleStar(g.id)}
                      className={`flex-shrink-0 transition-colors ${isStarred ? "text-amber-400" : "text-surface-600 hover:text-surface-400"}`}
                    >
                      <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
                    </button>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          autoFocus
                          value={editingGroup!.value}
                          onChange={(e) => setEditingGroup({ id: g.id, value: e.target.value })}
                          className="input-field !py-1 !text-sm flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingGroup(null);
                            if (e.key === "Escape") setEditingGroup(null);
                          }}
                        />
                        <button onClick={() => setEditingGroup(null)} className="text-emerald-400">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingGroup(null)} className="text-surface-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="flex-1 text-sm text-surface-200 cursor-pointer"
                          onDoubleClick={() => setEditingGroup({ id: g.id, value: g.representative })}
                        >
                          {g.representative}
                        </span>
                        <button
                          onClick={() => setEditingGroup({ id: g.id, value: g.representative })}
                          className="text-surface-600 hover:text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => toggleExpand(g.id)}
                      className="flex items-center gap-1.5 flex-shrink-0 ml-auto"
                    >
                      <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
                        {g.count} req.
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-surface-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-surface-400" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-700/20 px-4 py-3 space-y-1.5">
                      {g.queries.map((q: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1 h-1 rounded-full bg-surface-600 flex-shrink-0 ml-4" />
                          <span className="text-surface-400">{q}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasGroups && !semanticCoreId && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-300">
            ⚠ Complete the Sitemap step first, or skip to paste keywords freely.
          </p>
        </div>
      )}
    </div>
  );
}
