"use client";

import { useState, useRef } from "react";
import { Star, ChevronDown, ChevronRight, Loader2, Pencil, Check, X, Upload, Plus } from "lucide-react";
import { trpc } from "@/trpc/client";

interface Props {
  semanticCoreId: string | null;
  onRequireSession: () => Promise<string>;
  pendingKeywords: string;
  setPendingKeywords: (val: string) => void;
}

export function StepKeywords({ semanticCoreId, onRequireSession, pendingKeywords, setPendingKeywords }: Props) {
  const [status, setStatus] = useState<"idle" | "grouping" | "done">("idle");
  const [showInput, setShowInput] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<{ id: string; value: string } | null>(null);
  const [starredGroups, setStarredGroups] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const groupQueries = trpc.semanticCore.groupQueries.useMutation();
  const { data: groupsData, refetch: refetchGroups } = trpc.semanticCore.getGroups.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  const hasGroups = (groupsData?.totalGroups ?? 0) > 0;

  const handleGroup = async () => {
    const queries = pendingKeywords.split("\n").filter((l) => l.trim().length > 0);
    if (queries.length === 0) return;
    setStatus("grouping");
    try {
      const coreId = await onRequireSession();
      const res = await groupQueries.mutateAsync({ semanticCoreId: coreId, queries });
      await refetchGroups();
      setStatus("done");
      setShowInput(false);
      setPendingKeywords(""); // Clear text for next append
      if (res.addedQueries !== undefined) {
        setSuccessMessage(`Successfully added ${res.addedQueries} new keywords (${queries.length - res.addedQueries} duplicates skipped).`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingKeywords(ev.target?.result as string);
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
  const kwCount = pendingKeywords.split("\n").filter((l) => l.trim()).length;

  const updateQueryMut = trpc.semanticCore.updateQuery.useMutation({
    onSuccess: () => refetchGroups(),
  });
  const deleteQueryMut = trpc.semanticCore.deleteQuery.useMutation({
    onSuccess: () => refetchGroups(),
  });
  const [editingQuery, setEditingQuery] = useState<{ id: string; text: string } | null>(null);

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

      {/* Success Banner Overlay */}
      <div className="relative">
        {successMessage && (
          <div className="absolute -top-14 left-0 right-0 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl animate-fade-in flex items-center justify-between shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {successMessage}
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400/70 hover:text-emerald-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Input area — show if no groups yet, or user clicked Re-upload */}
      {(!hasGroups || showInput) && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={pendingKeywords}
              onChange={(e) => setPendingKeywords(e.target.value)}
              placeholder={hasGroups ? "Paste new keywords here to append to your existing semantic core..." : "buy sneakers\nbuy nike sneakers\nrunning shoes\nbest running shoes 2024\n..."}
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
              disabled={!pendingKeywords.trim() || status === "grouping"}
              className="btn-primary gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950 border-none disabled:opacity-50"
            >
              {status === "grouping" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Grouping...</>
              ) : hasGroups ? "Append Keywords" : "Group Keywords"}
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
              onClick={() => setShowInput(!showInput)}
              className="btn-secondary text-xs gap-1.5"
            >
              {showInput ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showInput ? "Cancel" : "Append Keywords"}
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
                      {g.usedCount > 0 && (
                        <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                          g.usedCount === g.count
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                        }`}>
                          {g.usedCount}/{g.count} used
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-surface-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-surface-400" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-700/20 px-4 py-3 space-y-1.5">
                      {g.queries.map((q: any, i: number) => {
                        const qText = typeof q === 'string' ? q : q.text;
                        const qId = typeof q === 'string' ? null : q.id;
                        const qUsage = typeof q === 'string' ? 0 : (q.usageCount || 0);
                        const isQueryEditing = editingQuery?.id === qId;

                        return (
                          <div key={i} className="flex items-center gap-2 text-sm group/query">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-4 ${
                              qUsage === 0 ? 'bg-surface-600' : qUsage === 1 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                            
                            {isQueryEditing ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={editingQuery!.text}
                                  onChange={(e) => setEditingQuery({ id: qId, text: e.target.value })}
                                  className="input-field !py-0.5 !text-sm flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && editingQuery!.text.trim()) {
                                      updateQueryMut.mutate({ queryId: qId, text: editingQuery!.text.trim() });
                                      setEditingQuery(null);
                                    }
                                    if (e.key === "Escape") setEditingQuery(null);
                                  }}
                                />
                                <button 
                                  onClick={() => {
                                    if (editingQuery!.text.trim()) {
                                      updateQueryMut.mutate({ queryId: qId, text: editingQuery!.text.trim() });
                                      setEditingQuery(null);
                                    }
                                  }} 
                                  className="text-emerald-400 hover:text-emerald-300"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingQuery(null)} className="text-surface-500 hover:text-surface-300">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span 
                                  className={`flex-1 ${qUsage > 0 ? 'text-surface-500' : 'text-surface-300'}`}
                                  onDoubleClick={() => qId && setEditingQuery({ id: qId, text: qText })}
                                >
                                  {qText}
                                </span>
                                
                                {qUsage > 0 && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    qUsage === 1 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                                  }`}>×{qUsage}</span>
                                )}

                                {qId && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover/query:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditingQuery({ id: qId, text: qText })}
                                      className="p-1 rounded text-surface-600 hover:text-surface-300 hover:bg-surface-800"
                                      title="Edit keyword"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete "${qText}"?`)) {
                                          deleteQueryMut.mutate({ queryId: qId });
                                        }
                                      }}
                                      className="p-1 rounded text-surface-600 hover:text-red-400 hover:bg-red-500/10"
                                      title="Delete keyword"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
