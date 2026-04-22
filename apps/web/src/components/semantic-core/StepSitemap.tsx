"use client";

import { useState } from "react";
import { Globe, Plus, Trash2, Loader2, Wand2, ExternalLink, Info, ChevronRight, ChevronDown } from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "../ui/AIModelSelector";

interface Competitor { url: string; label: string; }

// ─── Site tree node (AI-generated structure) ──────────────────────────────────
interface TreeNode {
  label: string;
  url?: string;
  pageType?: string;
  children?: TreeNode[];
}

// ─── Tree renderer ────────────────────────────────────────────────────────────
function TreeNodeRow({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-surface-800/40 ${depth === 0 ? "font-medium text-surface-100" : "text-surface-300"}`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        ) : (
          <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          </div>
        )}
        <span className="text-sm truncate">{node.label}</span>
        {node.pageType && (
          <span className="ml-auto text-xs font-mono text-cyan-400/70 bg-cyan-500/8 border border-cyan-500/15 rounded px-1.5 py-0.5 flex-shrink-0">
            {node.pageType}
          </span>
        )}
        {node.url && (
          <ExternalLink className="w-3 h-3 text-surface-600 flex-shrink-0" />
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNodeRow key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  projectId: string | undefined;
  sitemapUrl: string;
  setSitemapUrl: (v: string) => void;
  competitors: Competitor[];
  setCompetitors: (v: Competitor[]) => void;
  semanticCoreId: string | null;
  onComplete: (id: string) => void;
}

// ─── Stub: AI structure generation ───────────────────────────────────────────
// TODO: replace with real tRPC call that parses pages → sends to AI → returns tree
function buildMockTree(pages: { url: string }[]): TreeNode[] {
  // Group pages by first path segment
  const groups: Record<string, { url: string }[]> = {};
  pages.forEach((p) => {
    try {
      const path = new URL(p.url).pathname;
      const seg = path.split("/").filter(Boolean)[0] || "home";
      if (!groups[seg]) groups[seg] = [];
      groups[seg].push(p);
    } catch {
      const seg = "home";
      if (!groups[seg]) groups[seg] = [];
      groups[seg].push(p);
    }
  });

  const pageTypeMap: Record<string, string> = {
    blog: "blog_listing",
    services: "service_listing",
    service: "service_detail",
    product: "product_detail",
    catalog: "product_listing",
    about: "info_page",
    contact: "info_page",
    home: "homepage",
  };

  return Object.entries(groups).map(([seg, pages]) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    pageType: pageTypeMap[seg.toLowerCase()] || "info_page",
    children: pages.map((p) => ({
      label: new URL(p.url).pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || p.url,
      url: p.url,
    })),
  }));
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StepSitemap({
  projectId, sitemapUrl, setSitemapUrl,
  competitors, setCompetitors,
  semanticCoreId, onComplete,
}: Props) {
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "done">(
    semanticCoreId ? "done" : "idle"
  );
  const [parsedPages, setParsedPages] = useState<{ url: string }[]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [mode, setMode] = useState<"own" | "competitor">("own");

  // AI structure state
  const [structureStatus, setStructureStatus] = useState<"idle" | "generating" | "done">("idle");
  const [siteTree, setSiteTree] = useState<TreeNode[]>([]);
  const [structureModelId, setStructureModelId] = useState("");

  const createSession = trpc.semanticCore.createSession.useMutation();

  const addCompetitor = () => setCompetitors([...competitors, { url: "", label: "" }]);
  const removeCompetitor = (i: number) => setCompetitors(competitors.filter((_, j) => j !== i));
  const updateCompetitor = (i: number, field: "url" | "label", val: string) => {
    const next = [...competitors];
    next[i] = { ...next[i], [field]: val };
    setCompetitors(next);
  };

  // Shared parse logic — works for own site or a specific competitor URL
  const parseUrl = async (targetUrl: string) => {
    if (!targetUrl) return;
    setParseStatus("parsing");
    setParsedPages([]);
    setSiteTree([]);
    setStructureStatus("idle");

    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(p + Math.random() * 16, 90);
      setParseProgress(Math.round(p));
    }, 280);

    try {
      const session = await createSession.mutateAsync({ projectId, siteUrl: targetUrl });
      clearInterval(timer);
      setParseProgress(100);

      // Simulate pages discovered (real implementation would return pages from sitemap)
      const mockPages = [
        "/", "/about", "/contact", "/blog", "/blog/post-1", "/blog/post-2",
        "/services", "/services/seo", "/services/content", "/catalog",
        "/catalog/product-1", "/catalog/product-2",
      ].map((path) => ({ url: targetUrl.replace(/\/$/, "") + path }));

      setParsedPages(mockPages);
      onComplete(session.id);
      setParseStatus("done");
    } catch (e: any) {
      clearInterval(timer);
      setParseProgress(0);
      setParseStatus("idle");
      alert(e.message || "Failed to parse sitemap. Make sure the URL is valid.");
    }
  };

  const handleParseOwn = () => parseUrl(sitemapUrl);

  // Parse all competitor URLs sequentially — uses the first valid one for session
  const handleParseAll = async () => {
    const validUrls = competitors.filter((c) => c.url.trim());
    if (validUrls.length === 0) return;
    // For the session, use the first competitor URL
    await parseUrl(validUrls[0].url);
  };

  const handleGenerateStructure = async () => {
    if (parsedPages.length === 0) return;
    setStructureStatus("generating");
    // Small delay to feel async
    await new Promise((r) => setTimeout(r, 1200));
    const tree = buildMockTree(parsedPages);
    setSiteTree(tree);
    setStructureStatus("done");
  };

  const activeUrl = mode === "own" ? sitemapUrl : competitors[0]?.url || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">Sitemap Analysis</h2>
        <p className="text-sm text-surface-400">
          Parse your own site or a competitor&apos;s to build a semantic core from their structure.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["own", "competitor"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              mode === m
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                : "bg-surface-800/30 border-surface-700/30 text-surface-400 hover:border-surface-600/50"
            }`}
          >
            {m === "own" ? "My Site" : "Competitor Site"}
          </button>
        ))}
      </div>

      {/* Competitor info banner */}
      {mode === "competitor" && (
        <div className="flex gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300/90">
            <strong className="text-amber-300">Competitor mode.</strong> Enter a competitor&apos;s URL to
            parse their sitemap. You can then build your own semantic core based on their page structure —
            ideal when starting a new site from scratch.
          </p>
        </div>
      )}

      {/* Own site input */}
      {mode === "own" && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="url"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://your-website.com"
              className="input-field !pl-10"
            />
          </div>
          <button
            onClick={handleParseOwn}
            disabled={!sitemapUrl || parseStatus === "parsing"}
            className="btn-primary flex-shrink-0 gap-2"
          >
            {parseStatus === "parsing" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
            ) : parseStatus === "done" ? "Re-parse" : "Parse Sitemap"}
          </button>
        </div>
      )}

      {/* Competitor inputs */}
      {mode === "competitor" && (
        <div className="space-y-3">
          {competitors.length === 0 && (
            <p className="text-sm text-surface-500">Add at least one competitor URL.</p>
          )}
          {competitors.map((c, i) => (
            <div key={i} className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="url"
                  value={c.url}
                  onChange={(e) => updateCompetitor(i, "url", e.target.value)}
                  placeholder="https://competitor.com"
                  className="input-field !pl-10"
                />
              </div>
              <input
                value={c.label}
                onChange={(e) => updateCompetitor(i, "label", e.target.value)}
                placeholder="Label (optional)"
                className="input-field w-36"
              />
              <button
                onClick={() => removeCompetitor(i)}
                className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={addCompetitor} className="btn-ghost gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Competitor
            </button>
            {competitors.some((c) => c.url.trim()) && (
              <button
                onClick={handleParseAll}
                disabled={parseStatus === "parsing"}
                className="btn-primary gap-2 text-sm"
              >
                {parseStatus === "parsing" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
                ) : "Parse All"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Parse progress animation */}
      {parseStatus === "parsing" && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex justify-between text-xs text-surface-400">
            <span>Fetching sitemap.xml...</span>
            <span>{parseProgress}%</span>
          </div>
          <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${parseProgress}%` }}
            />
          </div>
          {/* Skeleton page URLs loading in */}
          <div className="space-y-1.5 mt-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-5 bg-surface-800/60 rounded animate-pulse"
                style={{ width: `${45 + i * 10}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Parsed pages list */}
      {parseStatus === "done" && parsedPages.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Pages found */}
          <div className="rounded-xl border border-surface-700/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-800/30 border-b border-surface-700/20">
              <p className="text-xs font-medium text-surface-300">
                {parsedPages.length} pages found
              </p>
              <span className="text-xs text-emerald-400 font-medium">✓ Parsed</span>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-surface-800/30">
              {parsedPages.map((pg, i) => (
                <div key={i} className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-800/20 transition-colors group">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 flex-shrink-0" />
                  <span className="text-xs text-surface-300 truncate font-mono flex-1">{pg.url}</span>
                  <ExternalLink className="w-3 h-3 text-surface-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* AI structure generation */}
          <div className="rounded-xl border border-surface-700/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-surface-200">Create Site Structure with AI</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  AI will organize pages into a logical nested structure with page types and sections.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-44">
                  <AIModelSelector
                    onModelSelect={setStructureModelId}
                    selectedModelId={structureModelId}
                    estimatedPromptTokens={300}
                    expectedOutputTokens={500}
                  />
                </div>
                <button
                  onClick={handleGenerateStructure}
                  disabled={structureStatus === "generating"}
                  className="btn-primary gap-2 text-sm flex-shrink-0"
                >
                  {structureStatus === "generating" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Create Structure</>
                  )}
                </button>
              </div>
            </div>

            {/* Tree output */}
            {structureStatus === "done" && siteTree.length > 0 && (
              <div className="border-t border-surface-700/20 pt-3 animate-fade-in">
                <p className="text-xs text-surface-500 mb-2">
                  {siteTree.length} sections · {parsedPages.length} pages — click to expand
                </p>
                <div className="max-h-72 overflow-y-auto rounded-lg bg-surface-900/40 border border-surface-800/40 p-2">
                  {siteTree.map((node, i) => (
                    <TreeNodeRow key={i} node={node} depth={0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
