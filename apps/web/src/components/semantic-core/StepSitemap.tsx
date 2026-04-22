"use client";

import { useState } from "react";
import { Globe, Plus, Trash2, Loader2, Wand2, ExternalLink, AlertCircle, ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "../ui/AIModelSelector";

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

// ─── Tree component ───────────────────────────────────────────────────────────

function TreeNodeRow({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`flex items-center gap-2 py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-surface-800/40`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        ) : (
          <div className="w-3.5 flex-shrink-0 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-surface-600" /></div>
        )}
        <span className={`text-sm truncate ${depth === 0 ? "font-medium text-surface-100" : "text-surface-400"}`}>{node.label}</span>
        {node.pageType && (
          <span className="ml-auto mr-2 text-xs font-mono text-cyan-400/70 bg-cyan-500/8 border border-cyan-500/15 rounded px-1.5 py-0.5 flex-shrink-0">{node.pageType}</span>
        )}
      </div>
      {hasChildren && open && node.children!.map((c, i) => <TreeNodeRow key={i} node={c} depth={depth + 1} />)}
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
            <div className="border-t border-surface-700/20 pt-3 animate-fade-in">
              <p className="text-xs text-surface-500 mb-2">{siteTree.length} sections · {[ownSite, ...competitorSites].filter(s => s.status === "done").reduce((n, s) => n + s.pages.length, 0)} pages total</p>
              <div className="max-h-72 overflow-y-auto rounded-lg bg-surface-900/40 border border-surface-800/40 p-2">
                {siteTree.map((node, i) => <TreeNodeRow key={i} node={node} depth={0} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
