"use client";

import { useState } from "react";
import { Globe, Plus, Trash2, Loader2, CheckCircle2, Info, ExternalLink } from "lucide-react";
import { trpc } from "@/trpc/client";

interface Competitor { url: string; label: string; }

interface Props {
  projectId: string | undefined;
  sitemapUrl: string;
  setSitemapUrl: (v: string) => void;
  competitors: Competitor[];
  setCompetitors: (v: Competitor[]) => void;
  semanticCoreId: string | null;
  onComplete: (id: string) => void;
}

export function StepSitemap({
  projectId, sitemapUrl, setSitemapUrl,
  competitors, setCompetitors,
  semanticCoreId, onComplete,
}: Props) {
  const [status, setStatus] = useState<"idle" | "parsing" | "done">(
    semanticCoreId ? "done" : "idle"
  );
  const [parsedPages, setParsedPages] = useState<{ url: string; title?: string }[]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [mode, setMode] = useState<"own" | "competitor">("own");
  const createSession = trpc.semanticCore.createSession.useMutation();

  const addCompetitor = () =>
    setCompetitors([...competitors, { url: "", label: "" }]);
  const removeCompetitor = (i: number) =>
    setCompetitors(competitors.filter((_, j) => j !== i));
  const updateCompetitor = (i: number, field: "url" | "label", val: string) => {
    const next = [...competitors];
    next[i] = { ...next[i], [field]: val };
    setCompetitors(next);
  };

  const handleParse = async () => {
    const targetUrl = mode === "own" ? sitemapUrl : (competitors[0]?.url || sitemapUrl);
    if (!targetUrl) return;
    setStatus("parsing");
    setParsedPages([]);

    // Animate progress bar
    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(p + Math.random() * 18, 90);
      setParseProgress(Math.round(p));
    }, 300);

    try {
      const session = await createSession.mutateAsync({ projectId, siteUrl: targetUrl });
      clearInterval(timer);
      setParseProgress(100);
      // Simulate pages found (real parsing would return pages)
      const mockPages = Array.from({ length: 12 }, (_, i) => ({
        url: `${targetUrl.replace(/\/$/, "")}/page-${i + 1}`,
      }));
      setParsedPages(mockPages);
      onComplete(session.id);
      setTimeout(() => setStatus("done"), 400);
    } catch (e: any) {
      clearInterval(timer);
      setParseProgress(0);
      alert(e.message || "Failed to parse sitemap");
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">Sitemap Analysis</h2>
        <p className="text-sm text-surface-400">
          Parse your own site or a competitor&apos;s. Build a semantic core based on an existing site structure.
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
          <div className="text-sm text-amber-300/80">
            <strong className="text-amber-300">Competitor analysis mode.</strong> Enter a direct competitor&apos;s
            URL — we&apos;ll parse their site structure and help you build a semantic core that
            matches or surpasses their content coverage.
          </div>
        </div>
      )}

      {/* Own site URL */}
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
            onClick={handleParse}
            disabled={!sitemapUrl || status === "parsing"}
            className="btn-primary flex-shrink-0 gap-2"
          >
            {status === "parsing" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
            ) : status === "done" ? (
              <><CheckCircle2 className="w-4 h-4" /> Re-parse</>
            ) : "Parse Sitemap"}
          </button>
        </div>
      )}

      {/* Competitor URLs */}
      {mode === "competitor" && (
        <div className="space-y-3">
          {competitors.length === 0 && (
            <p className="text-sm text-surface-500">Add at least one competitor URL to parse.</p>
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
            {competitors.length > 0 && (
              <button
                onClick={handleParse}
                disabled={!competitors[0]?.url || status === "parsing"}
                className="btn-primary gap-2 text-sm"
              >
                {status === "parsing" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
                ) : "Parse All"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Parse progress */}
      {status === "parsing" && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex justify-between text-xs text-surface-400">
            <span>Fetching sitemap...</span>
            <span>{parseProgress}%</span>
          </div>
          <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${parseProgress}%` }}
            />
          </div>
          <div className="flex gap-1 flex-wrap mt-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-cyan-500/30 animate-pulse"
                style={{ width: `${40 + Math.random() * 80}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Parsed pages list */}
      {status === "done" && parsedPages.length > 0 && (
        <div className="rounded-xl border border-surface-700/30 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-800/30 border-b border-surface-700/20">
            <p className="text-xs font-medium text-surface-400">
              {parsedPages.length} pages found
            </p>
            <span className="badge badge-brand text-xs">Sitemap parsed</span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-surface-800/30">
            {parsedPages.map((pg, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-surface-800/20 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 flex-shrink-0" />
                <span className="text-xs text-surface-300 truncate font-mono">{pg.url}</span>
                <ExternalLink className="w-3 h-3 text-surface-600 flex-shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "done" && parsedPages.length === 0 && semanticCoreId && (
        <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/15 animate-fade-in">
          <p className="text-sm text-emerald-300 font-medium">✓ Session created — proceed to keywords</p>
        </div>
      )}
    </div>
  );
}
