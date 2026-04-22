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
  LayoutList, Loader2, CheckCircle2, X, Plus,
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

// \u2500\u2500\u2500 Step 3: Categories \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function StepCategories({
  semanticCoreId,
  onDone,
}: {
  semanticCoreId: string | null;
  onDone: () => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [language, setLanguage] = useState("ru");
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [newCat, setNewCat] = useState("");

  // Load existing categories from DB on mount
  const existingCats = trpc.semanticCore.getCategories.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  // Check if keyword groups actually exist (Step 2 output)
  const groupsData = trpc.semanticCore.getGroups.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  // Sync DB categories into local state (only on first load)
  if (existingCats.data && existingCats.data.length > 0 && categories.length === 0) {
    setCategories(existingCats.data.map((c: any) => c.name));
    if (existingCats.data.some((c: any) => c.approved)) setApproved(true);
  }

  const generateCats = trpc.semanticCore.generateCategories.useMutation({
    onSuccess: (res) => {
      setCategories(res.categories);
      setError(null);
      onDone();
    },
    onError: (e) => setError(e.message),
  });

  const approveCats = trpc.semanticCore.approveCategories.useMutation({
    onSuccess: () => { setApproved(true); onDone(); },
    onError: (e) => setError(e.message),
  });

  const handleGenerate = () => {
    if (!semanticCoreId) return;
    setError(null);
    generateCats.mutate({ semanticCoreId, modelId: selectedModelId || undefined, language });
  };

  const handleApprove = () => {
    if (!semanticCoreId || categories.length === 0) return;
    approveCats.mutate({ semanticCoreId, categories });
  };

  const addCategory = () => {
    if (!newCat.trim()) return;
    setCategories([...categories, newCat.trim()]);
    setNewCat("");
  };

  // hasGroups now checks the actual lexical groups from Step 2, not the categories
  const hasKeywordGroups = (groupsData.data?.totalGroups ?? 0) > 0;
  const isGenerating = generateCats.isPending;
  const isApproving = approveCats.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">AI Categories</h2>
        <p className="text-sm text-surface-400">
          AI analyzes your keyword groups and suggests content categories. Review, edit, then approve.
        </p>
      </div>

      {/* Keyword groups status / no-groups warning */}
      {!semanticCoreId && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-300">⚠ Complete Step 1 (Sitemap) first to create a session.</p>
        </div>
      )}

      {semanticCoreId && !groupsData.isLoading && !hasKeywordGroups && !isGenerating && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-300">
            ⚠ No keyword groups found. Go to <strong>Step 2</strong> and upload your keywords first.
          </p>
        </div>
      )}

      {/* Info: no-AI grouping explanation */}
      {semanticCoreId && hasKeywordGroups && (
        <div className="flex gap-3 p-3 rounded-xl border border-surface-700/25 bg-surface-800/20">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">⚡</span>
          </div>
          <div>
            <p className="text-xs font-medium text-surface-200">
              {groupsData.data?.totalGroups} groups · {groupsData.data?.totalQueries} keywords ready
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              Groups were built using a pure N-gram script — no AI used. This compresses your keyword list
              by ~{groupsData.data?.compressionPct}% before sending it to the AI, saving tokens and reducing cost significantly.
            </p>
          </div>
        </div>
      )}

      {/* Generate row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 max-w-[280px]">
          <AIModelSelector
            onModelSelect={setSelectedModelId}
            selectedModelId={selectedModelId}
            estimatedPromptTokens={600}
            expectedOutputTokens={300}
          />
        </div>
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="input-field !py-1.5 !px-3 !text-sm !w-auto"
          title="Output language for category names"
        >
          <option value="ru">🇷🇺 Русский</option>
          <option value="en">🇬🇧 English</option>
          <option value="de">🇩🇪 Deutsch</option>
          <option value="es">🇪🇸 Español</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="pt">🇵🇹 Português</option>
          <option value="it">🇮🇹 Italiano</option>
          <option value="pl">🇵🇱 Polski</option>
          <option value="tr">🇹🇷 Türkçe</option>
          <option value="uk">🇺🇦 Українська</option>
          <option value="kk">🇰🇿 Қазақша</option>
          <option value="zh">🇨🇳 中文</option>
          <option value="ar">🇸🇦 العربية</option>
        </select>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !semanticCoreId}
          className="btn-primary gap-2 w-full sm:w-auto justify-center"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : categories.length > 0 ? (
            <><Brain className="w-4 h-4" /> Regenerate</>
          ) : (
            <><Brain className="w-4 h-4" /> Generate with AI</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/8 text-sm text-red-300">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Categories list */}
      {categories.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-400">
              {categories.length} categories · edit names or delete unwanted ones
            </p>
            {approved && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                ✓ Approved
              </span>
            )}
          </div>

          <div className="space-y-2">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-cyan-400 font-bold">{i + 1}</span>
                </div>
                <input
                  type="text"
                  value={cat}
                  onChange={(e) => {
                    const next = [...categories];
                    next[i] = e.target.value;
                    setCategories(next);
                  }}
                  className="input-field flex-1"
                  placeholder="Category name"
                />
                <button
                  onClick={() => setCategories(categories.filter((_, j) => j !== i))}
                  className="p-2 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add category manually */}
          <div className="flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="Add category manually..."
              className="input-field flex-1 !text-sm"
            />
            <button onClick={addCategory} disabled={!newCat.trim()} className="btn-ghost gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Approve */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-700/20">
            <p className="text-xs text-surface-500">
              Approving locks the categories and enables categorization in Step 4.
            </p>
            <button
              onClick={handleApprove}
              disabled={isApproving || categories.length === 0}
              className="btn-primary gap-2"
            >
              {isApproving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
              ) : approved ? (
                "✓ Re-approve"
              ) : (
                "Approve Categories →"
              )}
            </button>
          </div>
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
