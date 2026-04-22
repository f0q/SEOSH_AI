"use client";

/**
 * @component SemanticCoreWizard
 * Steps: Sitemap → Keywords → Categories → Results
 * Navigation is free (any step accessible at any time).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, Globe, Upload, Tags, BarChart3,
  LayoutList, Loader2, CheckCircle2,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "../ui/AIModelSelector";
import { StepSitemap } from "./StepSitemap";
import { StepKeywords } from "./StepKeywords";

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Sitemap",    icon: Globe,     description: "Parse site or competitor" },
  { id: 2, title: "Keywords",   icon: Upload,    description: "Upload & cluster keywords" },
  { id: 3, title: "Categories", icon: Tags,      description: "AI generates, you approve" },
  { id: 4, title: "Results",    icon: BarChart3, description: "Keyword → Category → Page" },
];

// ─── Completion heuristics (for progress dots) ────────────────────────────────
function stepDone(step: number, semanticCoreId: string | null, groupsDone: boolean, catsDone: boolean) {
  if (step === 1) return !!semanticCoreId;
  if (step === 2) return groupsDone;
  if (step === 3) return catsDone;
  return false;
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function SemanticCoreWizard({ projectId: initialProjectId }: { projectId?: string }) {
  const [step, setStep] = useState(1);
  const [semanticCoreId, setSemanticCoreId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);

  // Sitemap state (lifted so StepSitemap is re-mountable without losing data)
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [competitors, setCompetitors] = useState<{ url: string; label: string }[]>([]);

  // Step completion flags
  const [groupsDone, setGroupsDone] = useState(false);
  const [catsDone, setCatsDone] = useState(false);

  const projectsQuery = trpc.projects.list.useQuery();
  const groupsQuery = trpc.semanticCore.getGroups.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  // Sync groupsDone from query data
  if ((groupsQuery.data?.totalGroups ?? 0) > 0 && !groupsDone) setGroupsDone(true);

  const projectId = selectedProjectId;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Semantic Core</h1>
            <p className="text-sm text-surface-400">Build your keyword structure with AI clustering</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-surface-400 font-medium">Link to Project:</label>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            className="input-field !py-1.5 !px-3 !text-sm !w-auto min-w-[180px]"
          >
            <option value="">No project (standalone)</option>
            {projectsQuery.data?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.companyProfile?.companyName || p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step indicators — all clickable */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = stepDone(s.id, semanticCoreId, groupsDone, catsDone);
          const current = step === s.id;
          const StepIcon = s.icon;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => setStep(s.id)}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-left ${
                  current
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                    : done
                    ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/12"
                    : "bg-surface-800/20 border-surface-700/20 text-surface-500 hover:bg-surface-800/30 hover:border-surface-600/30"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <StepIcon className="w-5 h-5" />
                  {done && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface-900" />
                  )}
                </div>
                <div className="hidden md:block min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs opacity-70 truncate">{s.description}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${done ? "bg-emerald-500/40" : "bg-surface-700/20"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar for current step */}
      <div className="h-0.5 bg-surface-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="glass-card p-8 min-h-[400px] flex flex-col" key={step}>
        {step === 1 && (
          <StepSitemap
            projectId={projectId}
            sitemapUrl={sitemapUrl}
            setSitemapUrl={setSitemapUrl}
            competitors={competitors}
            setCompetitors={setCompetitors}
            semanticCoreId={semanticCoreId}
            onComplete={(id) => {
              setSemanticCoreId(id);
              // No auto-advance — user reviews pages and clicks Continue
            }}
          />
        )}
        {step === 2 && (
          <StepKeywords semanticCoreId={semanticCoreId} />
        )}
        {step === 3 && (
          <StepCategories semanticCoreId={semanticCoreId} onDone={() => setCatsDone(true)} />
        )}
        {step === 4 && (
          <StepResults semanticCoreId={semanticCoreId} projectId={projectId} />
        )}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 && setStep((s) => s - 1)}
          disabled={step === 1}
          className={`btn-ghost gap-2 ${step === 1 ? "opacity-30 pointer-events-none" : ""}`}
        >
          ← Back
        </button>
        {step < 4 ? (
          <button onClick={() => setStep((s) => s + 1)} className="btn-primary gap-2">
            Continue →
          </button>
        ) : (
          <button onClick={() => (window.location.href = "/semantic-core")} className="btn-primary gap-2">
            Finish & View Dashboard →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Categories ───────────────────────────────────────────────────────

function StepCategories({ semanticCoreId, onDone }: { semanticCoreId: string | null; onDone: () => void }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const generateCats = trpc.semanticCore.generateCategories.useMutation();

  const handleGenerate = async () => {
    if (!semanticCoreId) return;
    setGenerating(true);
    try {
      const res = await generateCats.mutateAsync({ semanticCoreId, websiteUrl: "https://example.com" });
      setCategories(res.categories);
      onDone();
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">AI Categories</h2>
        <p className="text-sm text-surface-400">
          AI analyzes your keywords and suggests categories. Review and edit before approving.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 max-w-[280px]">
          <AIModelSelector
            onModelSelect={setSelectedModelId}
            selectedModelId={selectedModelId}
            estimatedPromptTokens={500}
            expectedOutputTokens={200}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !semanticCoreId}
          className="btn-primary gap-2 w-full sm:w-auto justify-center"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><Brain className="w-4 h-4" /> Generate with AI</>
          )}
        </button>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm text-surface-400">{categories.length} categories generated. Edit if needed:</p>
          {categories.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={cat}
                onChange={(e) => {
                  const next = [...categories];
                  next[i] = e.target.value;
                  setCategories(next);
                }}
                className="input-field flex-1"
              />
              <button
                onClick={() => setCategories(categories.filter((_, j) => j !== i))}
                className="btn-ghost p-2 text-surface-500 hover:text-red-400"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Results ──────────────────────────────────────────────────────────

function StepResults({ semanticCoreId, projectId }: { semanticCoreId: string | null; projectId: string | undefined }) {
  const router = useRouter();
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "done">("idle");
  const [genResult, setGenResult] = useState<{ created: number; categories: string[] } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const { data, isLoading } = trpc.semanticCore.getResults.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  const generatePlan = trpc.contentPlan.generateFromSemanticCore.useMutation({
    onSuccess: (result) => { setGenResult(result); setGenStatus("done"); },
    onError: (err) => { setGenError(err.message); setGenStatus("idle"); },
  });

  const totalResults = data?.results?.length ?? 0;
  const cats = data?.summary ? Object.keys(data.summary) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-1">Results</h2>
          <p className="text-sm text-surface-400">Keyword → Category → Page mapping</p>
        </div>
        <button className="btn-secondary">Export CSV</button>
      </div>

      {/* Generate content plan banner */}
      {projectId && totalResults > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          {genStatus === "done" && genResult ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">
                    Created {genResult.created} content plan rows from {genResult.categories.length} categories
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {genResult.categories.join(", ")}
                  </p>
                </div>
              </div>
              <button onClick={() => router.push("/autopilot/content-planner")} className="btn-primary gap-2 text-sm">
                <LayoutList className="w-4 h-4" /> Open Content Planner
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LayoutList className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-surface-200">Generate Content Plan</p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Create {cats.length} rows from keyword categories with auto-filled page type, schema, and word count.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setGenStatus("generating");
                  setGenError(null);
                  generatePlan.mutate({ semanticCoreId: semanticCoreId!, projectId });
                }}
                disabled={genStatus === "generating"}
                className="btn-primary gap-2 text-sm flex-shrink-0"
              >
                {genStatus === "generating" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><LayoutList className="w-4 h-4" /> Generate Plan</>
                )}
              </button>
            </div>
          )}
          {genError && (
            <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{genError}</p>
          )}
        </div>
      )}

      {!projectId && totalResults > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-300">⚠ Link this core to a project (top-right) to generate a content plan.</p>
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-surface-700/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700/30 bg-surface-800/20">
              <th className="text-left px-4 py-3 text-surface-400 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium">Category</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium">Page</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-surface-500">Loading...</td></tr>
            ) : data?.results && data.results.length > 0 ? (
              data.results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-surface-700/20 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3 text-surface-200">{r.query}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-brand">{r.category || "Uncategorized"}</span>
                  </td>
                  <td className="px-4 py-3 text-brand-400 font-mono text-xs">{r.page || "Needs Content"}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-surface-500">No results found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
