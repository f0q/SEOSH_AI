"use client";

import { useState, useEffect } from "react";
import { Globe, Plus, Trash2, Loader2, Wand2, ExternalLink, AlertCircle, ChevronRight, ChevronDown, CheckCircle2, Pencil, X, Check, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "../ui/AIModelSelector";
import { PAGE_TYPES } from "@seosh/shared/seo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedSite {
  url: string;
  label: string;
  isOwn: boolean;
  pages: string[];
  status: "idle" | "parsing" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

interface TreeNode {
  label: string;
  url?: string;
  pageType?: string;
  children?: TreeNode[];
}

// ─── Editable tree node ───────────────────────────────────────────────────────

function EditableTreeNode({
  node, depth, index, total,
  onRename, onDelete, onMoveUp, onMoveDown, onPageTypeChange, onAddChild, onDeleteChild, onRenameChild,
}: {
  node: TreeNode;
  depth: number;
  index: number;
  total: number;
  onRename: (label: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPageTypeChange: (pt: string) => void;
  onAddChild: () => void;
  onDeleteChild: (i: number) => void;
  onRenameChild: (i: number, label: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(node.label);
  const [editingPt, setEditingPt] = useState(false);
  const hasChildren = !!node.children?.length;

  const commitRename = () => { onRename(editVal.trim() || node.label); setEditing(false); };

  return (
    <div>
      {/* Section row */}
      <div
        className="group flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-surface-800/40 transition-colors"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button onClick={() => setOpen((o) => !o)} className="flex-shrink-0 text-surface-500 hover:text-surface-300">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-3.5 flex-shrink-0 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-surface-600" /></div>
        )}

        {/* Label — inline edit */}
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
              className="input-field !py-0.5 !px-2 !text-sm flex-1"
            />
            <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditing(false)} className="text-surface-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <span
            onDoubleClick={() => { setEditVal(node.label); setEditing(true); }}
            className={`flex-1 text-sm truncate cursor-default select-none ${depth === 0 ? "font-medium text-surface-100" : "text-surface-300"}`}
          >
            {node.label}
          </span>
        )}

        {/* Page Type badge (sections only) */}
        {depth === 0 && (
          <div className="flex-shrink-0 flex flex-col items-end">
            <span className="text-[9px] text-surface-600 leading-none mb-0.5 mr-0.5">Page Type</span>
            {editingPt ? (
              <select
                autoFocus
                value={node.pageType || ""}
                onChange={(e) => { onPageTypeChange(e.target.value); setEditingPt(false); }}
                onBlur={() => setEditingPt(false)}
                className="bg-surface-800 text-xs text-cyan-300 border border-cyan-500/30 rounded px-1.5 py-0.5 outline-none"
              >
                {PAGE_TYPES.map((pt) => (
                  <option key={pt.slug} value={pt.slug} className="bg-surface-800">{pt.slug}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingPt(true)}
                title="Click to change page type"
                className="text-xs font-mono text-cyan-400/80 bg-cyan-500/8 border border-cyan-500/15 rounded px-1.5 py-0.5 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                {node.pageType || "—"}
              </button>
            )}
          </div>
        )}

        {/* Action icons — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
          {!editing && (
            <button onClick={() => { setEditVal(node.label); setEditing(true); }} title="Rename" className="p-1 rounded text-surface-500 hover:text-surface-200 hover:bg-surface-700/40">
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {depth === 0 && (
            <>
              <button onClick={onMoveUp} disabled={index === 0} title="Move up" className="p-1 rounded text-surface-500 hover:text-surface-200 hover:bg-surface-700/40 disabled:opacity-20">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button onClick={onMoveDown} disabled={index === total - 1} title="Move down" className="p-1 rounded text-surface-500 hover:text-surface-200 hover:bg-surface-700/40 disabled:opacity-20">
                <ArrowDown className="w-3 h-3" />
              </button>
            </>
          )}
          <button onClick={onDelete} title="Delete" className="p-1 rounded text-surface-500 hover:text-red-400 hover:bg-red-500/10">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div>
          {node.children!.map((child, i) => (
            <ChildRow
              key={i}
              label={child.label}
              url={child.url}
              depth={depth + 1}
              onRename={(l) => onRenameChild(i, l)}
              onDelete={() => onDeleteChild(i)}
            />
          ))}
          <button
            onClick={onAddChild}
            className="text-xs text-surface-600 hover:text-surface-400 flex items-center gap-1 py-1 transition-colors"
            style={{ paddingLeft: `${8 + (depth + 1) * 20 + 16}px` }}
          >
            <Plus className="w-3 h-3" /> Add page
          </button>
        </div>
      )}
    </div>
  );
}

function ChildRow({ label, url, depth, onRename, onDelete }: {
  label: string; url?: string; depth: number;
  onRename: (l: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(label);
  const commit = () => { onRename(val.trim() || label); setEditing(false); };
  return (
    <div
      className="group flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-surface-800/40 transition-colors"
      style={{ paddingLeft: `${8 + depth * 20}px` }}
    >
      <div className="w-3.5 flex-shrink-0 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-surface-600" /></div>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            className="input-field !py-0.5 !px-2 !text-sm flex-1" />
          <button onClick={commit} className="text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="text-surface-500"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <span onDoubleClick={() => { setVal(label); setEditing(true); }} className="flex-1 text-sm text-surface-400 truncate cursor-default select-none">{label}</span>
      )}
      {url && <ExternalLink className="w-3 h-3 text-surface-700 flex-shrink-0 opacity-0 group-hover:opacity-100" />}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!editing && <button onClick={() => { setVal(label); setEditing(true); }} className="p-1 rounded text-surface-500 hover:text-surface-200"><Pencil className="w-3 h-3" /></button>}
        <button onClick={onDelete} className="p-1 rounded text-surface-500 hover:text-red-400"><X className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

// ─── Page type manager panel ──────────────────────────────────────────────────

function PageTypeManager({ tree, setTree }: { tree: TreeNode[]; setTree: (t: TreeNode[]) => void }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newVal, setNewVal] = useState("");

  // Gather all unique page types from tree sections
  const usedTypes = Array.from(new Set(tree.map((n) => n.pageType).filter(Boolean))) as string[];

  const renameType = (oldPt: string, newPt: string) => {
    if (!newPt.trim() || newPt === oldPt) return;
    setTree(tree.map((n) => n.pageType === oldPt ? { ...n, pageType: newPt.trim() } : n));
  };

  const removeType = (pt: string) => {
    setTree(tree.map((n) => n.pageType === pt ? { ...n, pageType: undefined } : n));
  };

  const addType = () => {
    if (!newVal.trim()) return;
    // Assign to first section without a pageType
    const updated = [...tree];
    const idx = updated.findIndex((n) => !n.pageType);
    if (idx >= 0) updated[idx] = { ...updated[idx], pageType: newVal.trim() };
    setTree(updated);
    setNewVal("");
  };

  return (
    <div className="rounded-xl border border-surface-700/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-surface-200">Page Types</p>
          <p className="text-xs text-surface-500 mt-0.5">AI-assigned page types for each section. Edit to correct mistakes.</p>
        </div>
      </div>

      <div className="space-y-2">
        {usedTypes.length === 0 && <p className="text-xs text-surface-600">No page types assigned yet.</p>}
        {usedTypes.map((pt, i) => (
          <div key={pt} className="group flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              {editingIdx === i ? (
                <>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { renameType(pt, editVal); setEditingIdx(null); } if (e.key === "Escape") setEditingIdx(null); }}
                    className="input-field !py-1 !px-2 !text-xs flex-1 font-mono"
                    list="pt-suggestions"
                  />
                  <datalist id="pt-suggestions">
                    {PAGE_TYPES.map((p) => <option key={p.slug} value={p.slug} />)}
                  </datalist>
                  <button onClick={() => { renameType(pt, editVal); setEditingIdx(null); }} className="text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingIdx(null)} className="text-surface-500"><X className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/8 border border-cyan-500/15 rounded px-2 py-1">{pt}</span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditVal(pt); setEditingIdx(i); }} className="p-1 rounded text-surface-500 hover:text-surface-200"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => removeType(pt)} className="p-1 rounded text-surface-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new type */}
      <div className="flex gap-2 pt-1 border-t border-surface-700/20">
        <input
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addType()}
          placeholder="Add page type (e.g. service_detail)"
          className="input-field !py-1.5 !text-xs flex-1 font-mono"
          list="pt-suggestions-add"
        />
        <datalist id="pt-suggestions-add">
          {PAGE_TYPES.map((p) => <option key={p.slug} value={p.slug} />)}
        </datalist>
        <button onClick={addType} disabled={!newVal.trim()} className="btn-secondary text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function safePathLabel(url: string, fullUrl: string): string {
  try {
    const parsed = new URL(fullUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.pop()?.replace(/-/g, " ") || parsed.hostname;
  } catch {
    return url;
  }
}

function buildTree(pages: string[], baseUrl: string): TreeNode[] {
  const groups: Record<string, string[]> = {};
  pages.forEach((p) => {
    try {
      const parsed = new URL(p);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const seg = parts[0] || "home";
      if (!groups[seg]) groups[seg] = [];
      groups[seg].push(p);
    } catch {
      if (!groups["other"]) groups["other"] = [];
      groups["other"].push(p);
    }
  });

  const pageTypeMap: Record<string, string> = {
    blog: "blog_listing", news: "blog_listing",
    services: "service_listing", service: "service_detail",
    product: "product_detail", products: "product_listing",
    catalog: "product_listing", shop: "product_listing",
    about: "info_page", contact: "info_page", contacts: "info_page",
    faq: "info_page", delivery: "info_page",
    promo: "promo_listing", promotions: "promo_listing", akcii: "promo_listing",
    home: "homepage", other: "info_page",
  };

  return Object.entries(groups).map(([seg, urls]) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    pageType: pageTypeMap[seg.toLowerCase()] || "info_page",
    children: urls.map((u) => ({ label: safePathLabel(u, u), url: u })),
  }));
}

function generateMockPages(baseUrl: string): string[] {
  const paths = [
    "/", "/about", "/contact", "/blog", "/blog/post-1", "/blog/post-2",
    "/services", "/services/seo", "/services/content", "/services/audit",
    "/catalog", "/catalog/product-1", "/catalog/product-2",
    "/faq", "/delivery",
  ];
  try {
    const origin = new URL(baseUrl).origin;
    return paths.map((p) => origin + p);
  } catch {
    return paths.map((p) => baseUrl.replace(/\/$/, "") + p);
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string | undefined;
  sitemapUrl: string;
  setSitemapUrl: (v: string) => void;
  competitors: { url: string; label: string }[];
  setCompetitors: (v: { url: string; label: string }[]) => void;
  semanticCoreId: string | null;
  onComplete: (id: string) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StepSitemap({ projectId, sitemapUrl, setSitemapUrl, competitors, setCompetitors, semanticCoreId, onComplete }: Props) {
  // Per-site parse state
  const [ownSite, setOwnSite] = useState<ParsedSite>({ url: sitemapUrl, label: "My Site", isOwn: true, pages: [], status: semanticCoreId ? "done" : "idle", progress: 0 });
  const [competitorSites, setCompetitorSites] = useState<ParsedSite[]>(
    competitors.map((c) => ({ url: c.url, label: c.label || c.url, isOwn: false, pages: [], status: "idle", progress: 0 }))
  );

  // AI structure state
  const [structureStatus, setStructureStatus] = useState<"idle" | "generating" | "done">("idle");
  const [siteTree, setSiteTree] = useState<TreeNode[]>([]);
  const [structureModelId, setStructureModelId] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const createSession = trpc.semanticCore.createSession.useMutation();
  const updateStructureMut = trpc.semanticCore.updateSiteStructure.useMutation();

  // Auto-save structure when tree changes
  useEffect(() => {
    if (semanticCoreId && siteTree.length > 0) {
      const timer = setTimeout(() => {
        updateStructureMut.mutate({ 
          semanticCoreId, 
          siteStructure: siteTree,
          competitors: competitors
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [siteTree, semanticCoreId, competitors]);

  // ── Duplicate detection ────────────────────────────────────────────────────
  const checkDuplicate = (newUrl: string, excludeIdx?: number) => {
    const norm = normalizeUrl(newUrl).replace(/\/$/, "").toLowerCase();
    const ownNorm = normalizeUrl(ownSite.url).replace(/\/$/, "").toLowerCase();
    if (norm && norm === ownNorm) return "This URL is the same as your own site.";
    for (let i = 0; i < competitorSites.length; i++) {
      if (i === excludeIdx) continue;
      const cNorm = normalizeUrl(competitorSites[i].url).replace(/\/$/, "").toLowerCase();
      if (norm && norm === cNorm) return `Duplicate: already added as "${competitorSites[i].label || competitorSites[i].url}".`;
    }
    return null;
  };

  // ── Parse logic ─────────────────────────────────────────────────────────────
  const parseSite = async (isOwn: boolean, idx?: number) => {
    const rawUrl = isOwn ? ownSite.url : competitorSites[idx!].url;
    const targetUrl = normalizeUrl(rawUrl);
    if (!targetUrl) return;

    const updateSite = (patch: Partial<ParsedSite>) => {
      if (isOwn) {
        setOwnSite((s) => ({ ...s, ...patch }));
      } else {
        setCompetitorSites((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
      }
    };

    updateSite({ status: "parsing", progress: 0, errorMsg: undefined });

    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(p + Math.random() * 15, 88);
      updateSite({ progress: Math.round(p) });
    }, 260);

    try {
      const session = await createSession.mutateAsync({ projectId, siteUrl: targetUrl });
      clearInterval(timer);
      const pages = generateMockPages(targetUrl);
      updateSite({ status: "done", progress: 100, pages });
      if (isOwn) {
        setSitemapUrl(targetUrl);
        onComplete(session.id);
      }
    } catch (e: any) {
      clearInterval(timer);
      updateSite({ status: "error", progress: 0, errorMsg: e.message || "Failed to parse" });
    }
  };

  // ── Competitor management ──────────────────────────────────────────────────
  const addCompetitor = () => {
    setCompetitorSites((s) => [...s, { url: "", label: "", isOwn: false, pages: [], status: "idle", progress: 0 }]);
  };

  const removeCompetitor = (i: number) => {
    setCompetitorSites((s) => s.filter((_, j) => j !== i));
  };

  const updateCompetitorUrl = (i: number, field: "url" | "label", val: string) => {
    setCompetitorSites((prev) => prev.map((s, j) => j === i ? { ...s, [field]: val } : s));
    if (field === "url") {
      setDuplicateWarning(checkDuplicate(val, i));
    }
  };

  // ── AI structure generation ────────────────────────────────────────────────
  const handleGenerateStructure = async () => {
    const allParsed = [ownSite, ...competitorSites].filter((s) => s.status === "done" && s.pages.length > 0);
    if (allParsed.length === 0) return;

    setStructureStatus("generating");
    await new Promise((r) => setTimeout(r, 1400));

    // Use own site pages first, then merge competitor pages
    const primaryPages = ownSite.status === "done" ? ownSite.pages : competitorSites.find((s) => s.status === "done")?.pages || [];
    const tree = buildTree(primaryPages, ownSite.url || competitorSites[0]?.url || "");
    setSiteTree(tree);
    setStructureStatus("done");
  };

  const totalParsed = [ownSite, ...competitorSites].filter((s) => s.status === "done").length;
  const canGenerateStructure = totalParsed > 0;

  // ── Site block renderer ────────────────────────────────────────────────────
  const renderSiteBlock = (site: ParsedSite, isOwn: boolean, idx?: number) => (
    <div key={isOwn ? "own" : idx} className="rounded-xl border border-surface-700/30 p-4 space-y-3">
      {/* URL input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={site.url}
            onChange={(e) => {
              const val = e.target.value;
              if (isOwn) setOwnSite((s) => ({ ...s, url: val }));
              else updateCompetitorUrl(idx!, "url", val);
            }}
            placeholder={isOwn ? "https://your-website.com" : "https://competitor.com"}
            className="input-field !pl-10"
          />
        </div>
        {!isOwn && (
          <input
            value={site.label}
            onChange={(e) => updateCompetitorUrl(idx!, "label", e.target.value)}
            placeholder="Label (optional)"
            className="input-field w-32"
          />
        )}
        <button
          onClick={() => parseSite(isOwn, idx)}
          disabled={!site.url || site.status === "parsing"}
          className="btn-primary flex-shrink-0 gap-2 text-sm"
        >
          {site.status === "parsing" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
          ) : site.status === "done" ? "Re-parse" : "Parse"}
        </button>
        {!isOwn && (
          <button onClick={() => removeCompetitor(idx!)} className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {site.status === "parsing" && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-surface-500">
            <span>Fetching sitemap...</span><span>{site.progress}%</span>
          </div>
          <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${site.progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {site.status === "error" && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {site.errorMsg}
        </div>
      )}

      {/* Pages list */}
      {site.status === "done" && site.pages.length > 0 && (
        <div className="rounded-lg border border-surface-700/20 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-surface-800/20 border-b border-surface-700/15">
            <span className="text-xs text-surface-400">{site.pages.length} pages found</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="max-h-36 overflow-y-auto divide-y divide-surface-800/20">
            {site.pages.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-800/20 group">
                <div className="w-1 h-1 rounded-full bg-cyan-500/50 flex-shrink-0" />
                <span className="text-xs text-surface-400 font-mono truncate flex-1">{p}</span>
                <ExternalLink className="w-3 h-3 text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">Sitemap Analysis</h2>
        <p className="text-sm text-surface-400">
          Add your own site and/or competitors. AI will create an optimal structure based on all parsed data.
        </p>
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="flex items-center gap-2 text-sm text-amber-300 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {duplicateWarning}
        </div>
      )}

      {/* Own site */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-surface-300">Your Website</p>
          <span className="text-xs text-surface-600 bg-surface-800/40 px-2 py-0.5 rounded-full">optional</span>
        </div>
        {renderSiteBlock(ownSite, true)}
      </div>

      {/* Competitors */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-surface-300">Competitor Websites</p>
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">at least 1 required</span>
        </div>
        {competitorSites.length === 0 && (
          <p className="text-xs text-surface-500 px-1">No competitors added yet.</p>
        )}
        <div className="space-y-3">
          {competitorSites.map((c, i) => renderSiteBlock(c, false, i))}
        </div>
        <button onClick={addCompetitor} className="btn-ghost gap-2 text-sm mt-1">
          <Plus className="w-4 h-4" /> Add Competitor
        </button>
      </div>

      {/* AI Structure */}
      {canGenerateStructure && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-200">Create Site Structure with AI</p>
              <p className="text-xs text-surface-500 mt-0.5">
                AI will organize all {totalParsed} parsed site{totalParsed > 1 ? "s" : ""} into a logical nested structure with page types.
                {ownSite.status === "done" ? " Your site is used as the primary reference." : " First competitor is used as the primary reference."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-40">
                <AIModelSelector
                  onModelSelect={setStructureModelId}
                  selectedModelId={structureModelId}
                  estimatedPromptTokens={400}
                  expectedOutputTokens={600}
                />
              </div>
              <button
                onClick={handleGenerateStructure}
                disabled={structureStatus === "generating"}
                className="btn-primary gap-2 text-sm"
              >
                {structureStatus === "generating" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Create Structure</>
                )}
              </button>
            </div>
          </div>

          {structureStatus === "done" && siteTree.length > 0 && (
            <div className="border-t border-surface-700/20 pt-4 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs text-surface-500">
                  {siteTree.length} sections · {[ownSite, ...competitorSites].filter(s => s.status === "done").reduce((n, s) => n + s.pages.length, 0)} pages total
                </p>
                <span className="text-xs text-surface-600">Double-click any name to rename · Hover for edit options</span>
              </div>

              {/* Editable tree */}
              <div className="max-h-72 overflow-y-auto rounded-lg bg-surface-900/40 border border-surface-800/40 p-2">
                {siteTree.map((node, i) => (
                  <EditableTreeNode
                    key={i}
                    node={node}
                    depth={0}
                    index={i}
                    total={siteTree.length}
                    onRename={(label) => setSiteTree(siteTree.map((n, j) => j === i ? { ...n, label } : n))}
                    onDelete={() => setSiteTree(siteTree.filter((_, j) => j !== i))}
                    onMoveUp={() => {
                      if (i === 0) return;
                      const next = [...siteTree];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setSiteTree(next);
                    }}
                    onMoveDown={() => {
                      if (i === siteTree.length - 1) return;
                      const next = [...siteTree];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      setSiteTree(next);
                    }}
                    onPageTypeChange={(pt) => setSiteTree(siteTree.map((n, j) => j === i ? { ...n, pageType: pt } : n))}
                    onAddChild={() => setSiteTree(siteTree.map((n, j) => j === i ? { ...n, children: [...(n.children || []), { label: "New Page" }] } : n))}
                    onDeleteChild={(ci) => setSiteTree(siteTree.map((n, j) => j === i ? { ...n, children: n.children?.filter((_, k) => k !== ci) } : n))}
                    onRenameChild={(ci, label) => setSiteTree(siteTree.map((n, j) => j === i ? { ...n, children: n.children?.map((c, k) => k === ci ? { ...c, label } : c) } : n))}
                  />
                ))}
                <button
                  onClick={() => setSiteTree([...siteTree, { label: "New Section", pageType: "info_page", children: [] }])}
                  className="text-xs text-surface-600 hover:text-surface-400 flex items-center gap-1.5 px-2 py-1.5 mt-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add section
                </button>
              </div>

              {/* Page type manager */}
              <PageTypeManager tree={siteTree} setTree={setSiteTree} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
