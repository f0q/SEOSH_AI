"use client";

/**
 * @component SemanticCoreWizard
 * Steps: Sitemap → Keywords → Categories → Results
 * Navigation is free (any step accessible at any time).
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, Globe, Upload, Tags, BarChart3,
  LayoutList, Loader2, CheckCircle2, X, Plus, Wand2, ChevronDown,
  Pencil, Trash2, Check,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "../ui/AIModelSelector";
import { StepKeywords } from "./StepKeywords";
import { getCatColor } from "@/lib/categoryColors";


// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Keywords",   icon: Upload,    description: "Upload & cluster keywords" },
  { id: 2, title: "Categories", icon: Tags,      description: "AI generates, you approve" },
  { id: 3, title: "Results",    icon: BarChart3, description: "Keyword → Category → Page" },
];

// ─── Completion heuristics (for progress dots) ────────────────────────────────
function stepDone(step: number, semanticCoreId: string | null, groupsDone: boolean, catsDone: boolean) {
  if (step === 1) return groupsDone;
  if (step === 2) return catsDone;
  return false;
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function SemanticCoreWizard({ projectId: initialProjectId, isNew }: { projectId?: string, isNew?: boolean }) {
  const [step, setStep] = useState(1);
  const [semanticCoreId, setSemanticCoreId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);

  // Step completion flags
  const [groupsDone, setGroupsDone] = useState(false);
  const [catsDone, setCatsDone] = useState(false);

  const projectsQuery = trpc.projects.list.useQuery();
  const groupsQuery = trpc.semanticCore.getGroups.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  // Auto-restore semanticCoreId from DB when wizard mounts
  const latestCore = trpc.semanticCore.getLatest.useQuery(
    { projectId: selectedProjectId },
    { enabled: !semanticCoreId && !isNew }  // only query if we don't already have one and we aren't explicitly creating a new one
  );
  if (latestCore.data && !semanticCoreId && !isNew) {
    setSemanticCoreId(latestCore.data.id);
  }

  const createSession = trpc.semanticCore.createSession.useMutation();

  // Sync groupsDone from query data
  if ((groupsQuery.data?.totalGroups ?? 0) > 0 && !groupsDone) setGroupsDone(true);

  // Auto-create session if needed when visiting StepKeywords
  const ensureSession = async () => {
    if (semanticCoreId) return semanticCoreId;
    const res = await createSession.mutateAsync({ projectId: selectedProjectId });
    setSemanticCoreId(res.id);
    return res.id;
  };

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
      <div className="glass-card p-8 min-h-[400px] flex flex-col">
        {step === 1 && (
          <StepKeywords 
            semanticCoreId={semanticCoreId} 
            onRequireSession={ensureSession}
          />
        )}
        {step === 2 && (
          <StepCategories semanticCoreId={semanticCoreId} onDone={() => setCatsDone(true)} />
        )}
        {step === 3 && (
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
        {step < 3 ? (
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
  const [compressModelId, setCompressModelId] = useState("");
  const [language, setLanguage] = useState("ru");
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [lastCompressed, setLastCompressed] = useState<{ before: number; after: number } | null>(null);

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
      setLastCompressed(null);
      setError(null);
      onDone();
    },
    onError: (e) => setError(e.message),
  });

  const compressCats = trpc.semanticCore.compressCategories.useMutation({
    onSuccess: (res) => {
      setLastCompressed({ before: categories.length, after: res.categories.length });
      setCategories(res.categories);
      setError(null);
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
    setLastCompressed(null);
    generateCats.mutate({ semanticCoreId, modelId: selectedModelId || undefined, language });
  };

  const handleCompress = () => {
    if (!semanticCoreId || categories.length < 2) return;
    setError(null);
    compressCats.mutate({ semanticCoreId, categories, modelId: compressModelId || undefined, language });
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
  const isCompressing = compressCats.isPending;
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
            {categories.map((cat, i) => {
              const clr = getCatColor(cat);
              return (
                <div key={i} className="flex items-center gap-2 group">
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: clr.badge.background, border: clr.badge.border }}
                  >
                    <span className="text-xs font-bold" style={{ color: clr.dot }}>{i + 1}</span>
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
                    style={{ 
                      color: clr.badge.color,
                      borderColor: 'transparent',
                      backgroundColor: clr.badge.background
                    }}
                    placeholder="Category name"
                  />
                  <button
                    onClick={() => setCategories(categories.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
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

          {/* Compress with AI */}
          <div className="rounded-xl border border-surface-700/25 bg-surface-800/15 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-surface-300">Compress with AI</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  AI will merge similar or overlapping categories into one.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-36">
                  <AIModelSelector
                    onModelSelect={setCompressModelId}
                    selectedModelId={compressModelId}
                    estimatedPromptTokens={150}
                    expectedOutputTokens={150}
                  />
                </div>
                <button
                  onClick={handleCompress}
                  disabled={isCompressing || categories.length < 2}
                  className="btn-secondary gap-2 text-sm flex-shrink-0"
                >
                  {isCompressing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Merging...</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Compress</>
                  )}
                </button>
              </div>
            </div>
            {lastCompressed && (
              <div className="flex items-center gap-2 text-xs animate-fade-in">
                <span className="text-surface-500 line-through">{lastCompressed.before} categories</span>
                <span className="text-surface-600">→</span>
                <span className="text-emerald-400 font-medium">{lastCompressed.after} categories</span>
                <span className="text-surface-600">· {lastCompressed.before - lastCompressed.after} merged</span>
              </div>
            )}
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


// ─── Step 4: Results ────────────────────────────────────────────────────────

const BATCH_SIZE = 10; // groups per AI request

function StepResults({ semanticCoreId, projectId }: { semanticCoreId: string | null; projectId: string | undefined }) {
  const router = useRouter();
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "done">("idle");
  const [genResult, setGenResult] = useState<{ created: number; categories: string[] } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Categorization progress state
  const [catModelId, setCatModelId] = useState("");
  const [catLanguage, setCatLanguage] = useState("ru");
  const [catError, setCatError] = useState<string | null>(null);
  const [catProgress, setCatProgress] = useState<{ done: number; total: number } | null>(null);
  const [catRunning, setCatRunning] = useState(false);
  const cancelRef = useRef(false);
  const autoTriggered = useRef(false);

  const { data, isLoading, refetch } = trpc.semanticCore.getResults.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  const catData = trpc.semanticCore.getCategories.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  const groupsData = trpc.semanticCore.getGroups.useQuery(
    { semanticCoreId: semanticCoreId || "" },
    { enabled: !!semanticCoreId }
  );

  const batchMut = trpc.semanticCore.categorizeQueriesBatch.useMutation();
  const matchPagesMut = trpc.semanticCore.matchPages.useMutation({
    onSuccess: (res) => { refetch(); },
    onError: (e) => setCatError(e.message),
  });

  const updateCatMut = trpc.semanticCore.updateQueryCategory.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setCatError(e.message),
  });

  const renameCatMut = trpc.semanticCore.renameCategory.useMutation({
    onSuccess: () => { catData.refetch(); refetch(); },
    onError: (e) => setCatError(e.message),
  });
  const deleteCatMut = trpc.semanticCore.deleteCategory.useMutation({
    onSuccess: () => { catData.refetch(); refetch(); },
    onError: (e) => setCatError(e.message),
  });
  const refineCatMut = trpc.semanticCore.refineCategory.useMutation({
    onSuccess: (res) => {
      if (res.moved > 0) {
        catData.refetch();
        refetch();
        alert(`Refined: moved ${res.moved} outliers to Uncategorized.`);
      } else {
        alert("Category looks good! No outliers found.");
      }
    },
    onError: (e) => setCatError(e.message),
  });
  const exportCsvMut = trpc.semanticCore.exportCsv.useMutation();

  // Category editing state (for distribution bar)
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);

  const generatePlan = trpc.contentPlan.generateFromSemanticCore.useMutation({
    onSuccess: (result) => { setGenResult(result); setGenStatus("done"); },
    onError: (err) => { setGenError(err.message); setGenStatus("idle"); },
  });

  const totalResults = data?.results?.length ?? 0;
  const cats = (catData.data ?? []) as { id: string; name: string; approved: boolean }[];
  const catNames = cats.map((c) => c.name);
  const summary: Record<string, number> = (data?.summary as any) ?? {};

  // Auto-categorize: if categories exist and ALL queries are uncategorized, auto-start
  const uncategorizedCount = summary["Uncategorized"] ?? 0;
  const hasCategories = catNames.length > 0;
  const allUncategorized = totalResults > 0 && uncategorizedCount === totalResults;

  // Batched AI categorization with progress
  const handleCategorizeAll = async () => {
    if (!semanticCoreId) return;
    const allGroups = groupsData.data?.groups ?? [];
    if (allGroups.length === 0) { setCatError("No keyword groups found."); return; }

    setCatError(null);
    setCatRunning(true);
    cancelRef.current = false;

    const groupIds = allGroups.map((g: any) => g.id);
    const chunks: string[][] = [];
    for (let i = 0; i < groupIds.length; i += BATCH_SIZE) {
      chunks.push(groupIds.slice(i, i + BATCH_SIZE));
    }

    setCatProgress({ done: 0, total: groupIds.length });

    let processedGroups = 0;
    for (const chunk of chunks) {
      if (cancelRef.current) break;
      try {
        const res = await batchMut.mutateAsync({
          semanticCoreId,
          groupIds: chunk,
          modelId: catModelId || undefined,
          language: catLanguage,
        });
        processedGroups += chunk.length;
        setCatProgress({ done: processedGroups, total: groupIds.length });
      } catch (e: any) {
        setCatError(e.message);
        break;
      }
    }

    setCatRunning(false);
    refetch();
  };

  const handleCancel = () => { cancelRef.current = true; };

  // Auto-trigger categorization once when all queries are uncategorized
  useEffect(() => {
    if (hasCategories && allUncategorized && !catRunning && !autoTriggered.current && !isLoading) {
      autoTriggered.current = true;
      handleCategorizeAll();
    }
  }, [hasCategories, allUncategorized, catRunning, isLoading]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-1">Results</h2>
          <p className="text-sm text-surface-400">Keyword → Category → Page mapping</p>
        </div>
        <button
          className="btn-secondary text-sm"
          disabled={!semanticCoreId || totalResults === 0}
          onClick={async () => {
            if (!semanticCoreId) return;
            try {
              const res = await exportCsvMut.mutateAsync({ semanticCoreId });
              const decoded = atob(res.csv);
              // Add BOM for Excel UTF-8 compatibility
              const bom = '\uFEFF';
              const blob = new Blob([bom + decoded], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = res.filename;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e: any) {
              setCatError(e.message);
            }
          }}
        >
          {exportCsvMut.isPending ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Category distribution bar — editable */}
      {catNames.length > 0 && (
        <div className="rounded-xl border border-surface-700/25 bg-surface-800/15 p-4">
          <p className="text-xs text-surface-500 uppercase tracking-wide mb-3">Categories</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((cat) => {
              const count = summary[cat.name] ?? 0;
              const pct = totalResults > 0 ? Math.round((count / totalResults) * 100) : 0;
              const clr = getCatColor(cat.name);
              const isEditing = editingCat?.id === cat.id;

              if (isEditing) {
                return (
                  <div key={cat.id} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={clr.badge}>
                    <input
                      autoFocus
                      value={editingCat.name}
                      onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingCat.name.trim()) {
                          renameCatMut.mutate({ categoryId: cat.id, newName: editingCat.name.trim() });
                          setEditingCat(null);
                        }
                        if (e.key === "Escape") setEditingCat(null);
                      }}
                      className="bg-transparent border-none outline-none text-xs font-medium w-32"
                      style={{ color: clr.badge.color }}
                    />
                    <button
                      onClick={() => { if (editingCat.name.trim()) { renameCatMut.mutate({ categoryId: cat.id, newName: editingCat.name.trim() }); setEditingCat(null); } }}
                      className="opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingCat(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={cat.id} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={clr.badge}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: clr.dot }} />
                  <span className="text-xs font-medium">{cat.name}</span>
                  <span className="text-xs opacity-60">{count}</span>
                  {pct > 0 && <span className="text-[10px] opacity-40">{pct}%</span>}
                  <button
                    onClick={() => setEditingCat({ id: cat.id, name: cat.name })}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-0.5"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${cat.name}"? ${count} keywords will become uncategorized.`)) deleteCatMut.mutate({ categoryId: cat.id }); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-red-400"
                    title="Delete category"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Ask AI to refine "${cat.name}"? This will move outliers to Uncategorized.`)) {
                        refineCatMut.mutate({ semanticCoreId: semanticCoreId || "", categoryName: cat.name, modelId: catModelId || undefined, language: catLanguage });
                      }
                    }}
                    disabled={refineCatMut.isPending}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-indigo-400 disabled:opacity-30 disabled:animate-pulse ml-0.5"
                    title="Refine with AI (removes outliers)"
                  >
                    <Wand2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {summary["Uncategorized"] > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-700/30 bg-surface-800/30">
                <span className="text-xs text-surface-500">Uncategorized</span>
                <span className="text-xs text-surface-600">{summary["Uncategorized"]}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI categorize panel */}
      {semanticCoreId && (
        <div className="rounded-xl border border-surface-700/25 bg-surface-800/15 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-200">Assign Keywords to Categories with AI</p>
              <p className="text-xs text-surface-500 mt-0.5">
                Processes in batches of {BATCH_SIZE} groups. Progress tracked in real time. You can stop at any time.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={catLanguage} onChange={(e) => setCatLanguage(e.target.value)} className="input-field !py-1.5 !px-3 !text-sm !w-auto" disabled={catRunning}>
                <option value="ru">RU</option>
                <option value="en">EN</option>
                <option value="de">DE</option>
                <option value="es">ES</option>
                <option value="fr">FR</option>
                <option value="uk">UK</option>
              </select>
              <div className="w-40">
                <AIModelSelector onModelSelect={setCatModelId} selectedModelId={catModelId} estimatedPromptTokens={400} expectedOutputTokens={200} />
              </div>
              {catRunning ? (
                <button onClick={handleCancel} className="btn-ghost gap-2 text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <X className="w-4 h-4" /> Stop
                </button>
              ) : (
                <button onClick={handleCategorizeAll} disabled={!semanticCoreId} className="btn-primary gap-2 text-sm">
                  <Brain className="w-4 h-4" /> Categorize All
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {catProgress && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-400">
                  {catRunning ? "Processing..." : "Done"} — {catProgress.done} / {catProgress.total} groups
                </span>
                <span className="text-surface-500">{Math.round((catProgress.done / catProgress.total) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-brand-500 transition-all duration-500"
                  style={{ width: `${(catProgress.done / catProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {catError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{catError}</p>
          )}

          {/* Match pages button — appears after categorization */}
          {catProgress && catProgress.done > 0 && !catRunning && (
            <div className="flex items-center justify-between pt-2 border-t border-surface-700/20">
              <div>
                <p className="text-xs font-medium text-surface-300">Match Sitemap Pages</p>
                <p className="text-xs text-surface-500">
                  Script matches each keyword group to the best-fitting page using URL/title overlap. No AI needed.
                </p>
              </div>
              <button
                onClick={() => matchPagesMut.mutate({ semanticCoreId: semanticCoreId! })}
                disabled={matchPagesMut.isPending}
                className="btn-secondary gap-2 text-sm flex-shrink-0"
              >
                {matchPagesMut.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Matching...</>
                  : <><Globe className="w-4 h-4" /> Match Pages</>}
              </button>
            </div>
          )}
          {matchPagesMut.data && (
            <p className="text-xs text-emerald-400 animate-fade-in">
              ✓ {matchPagesMut.data.matched} of {matchPagesMut.data.total} groups matched to sitemap pages
            </p>
          )}
        </div>
      )}

      {/* Generate content plan */}
      {projectId && totalResults > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          {genStatus === "done" && genResult ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Created {genResult.created} content plan rows</p>
                  <p className="text-xs text-surface-500 mt-0.5">{genResult.categories.join(", ")}</p>
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
                  <p className="text-xs text-surface-500 mt-0.5">Create rows from categories with page type, schema, and word count.</p>
                </div>
              </div>
              <button
                onClick={() => { setGenStatus("generating"); setGenError(null); generatePlan.mutate({ semanticCoreId: semanticCoreId!, projectId }); }}
                disabled={genStatus === "generating"}
                className="btn-primary gap-2 text-sm flex-shrink-0"
              >
                {genStatus === "generating" ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><LayoutList className="w-4 h-4" /> Generate Plan</>}
              </button>
            </div>
          )}
          {genError && <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{genError}</p>}
        </div>
      )}

      {!projectId && totalResults > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-300">⚠ Link this core to a project to enable page matching and content plan generation.</p>
        </div>
      )}

      {/* Results table */}
      <div className="overflow-x-auto overflow-y-visible rounded-xl border border-surface-700/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700/30 bg-surface-800/20">
              <th className="text-left px-4 py-3 text-surface-400 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium w-44">Category</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium w-40">Group</th>
              <th className="text-left px-4 py-3 text-surface-400 font-medium">Page</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500">Loading...</td></tr>
            ) : data?.results && data.results.length > 0 ? (
              data.results.map((r: any, i: number) => (
                <ResultRow
                  key={r.id || i}
                  index={i + 1}
                  row={r}
                  catNames={catNames}
                  onCategoryChange={(queryId, catName, applyToGroup) =>
                    updateCatMut.mutate({ queryId, categoryName: catName, semanticCoreId: semanticCoreId || "", applyToGroup })
                  }
                />
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500">No results yet — complete Steps 1 & 2 first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Per-row component with inline category picker ──────────────────────────────────────────────

function ResultRow({ index, row, catNames, onCategoryChange }: {
  index: number;
  row: any;
  catNames: string[];
  onCategoryChange: (queryId: string, catName: string | null, applyToGroup: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const isUncategorized = !row.category || row.category === "Uncategorized";
  const clr = isUncategorized ? null : getCatColor(row.category);

  return (
    <tr className="border-b border-surface-700/20 hover:bg-surface-800/20 transition-colors">
      <td className="px-4 py-2.5 text-surface-600 text-xs">{index}</td>
      <td className="px-4 py-2.5 max-w-xs">
        <div className="flex items-center gap-2">
          <span className={`truncate ${row.usageCount > 0 ? 'text-surface-400' : 'text-surface-200'}`}>{row.query}</span>
          {row.usageCount > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
              row.usageCount === 1 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
            }`}>×{row.usageCount}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors max-w-[160px]"
          style={clr?.badge ?? {
            color: "hsl(0 0% 50%)",
            background: "hsl(0 0% 15% / 0.4)",
            border: "1px solid hsl(0 0% 30% / 0.3)",
          }}
          title={row.category || "Uncategorized"}
        >
          {!isUncategorized && (
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: clr!.dot }} />
          )}
          <span className="truncate">{row.category || "Uncategorized"}</span>
          <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-surface-900 border border-surface-700/50 rounded-xl shadow-2xl min-w-52 max-h-60 overflow-y-auto py-1 animate-fade-in">
            <p className="text-[10px] text-surface-600 px-3 py-1 uppercase tracking-wide">Assign to category</p>
            {catNames.map((name) => {
              const itemClr = getCatColor(name);
              const isActive = name === row.category;
              return (
                <div key={name} className="group flex items-center">
                  <button
                    onClick={() => { onCategoryChange(row.id, name, false); setOpen(false); }}
                    className="flex-1 flex items-center gap-2 text-left text-xs px-3 py-1.5 hover:bg-surface-800 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: itemClr.dot, opacity: isActive ? 1 : 0.5 }}
                    />
                    <span style={{ color: isActive ? itemClr.check : undefined }}
                      className={isActive ? "font-medium" : "text-surface-300"}>
                      {name}
                    </span>
                    {isActive && <span style={{ color: itemClr.check }} className="ml-auto text-xs">✓</span>}
                  </button>
                  <button
                    onClick={() => { onCategoryChange(row.id, name, true); setOpen(false); }}
                    title="Apply to entire group"
                    className="text-[10px] text-surface-600 hover:text-surface-400 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  >
                    all group
                  </button>
                </div>
              );
            })}
            {!isUncategorized && (
              <>
                <div className="border-t border-surface-700/30 my-1" />
                <button
                  onClick={() => { onCategoryChange(row.id, null, false); setOpen(false); }}
                  className="w-full text-left text-xs px-3 py-1.5 text-surface-500 hover:text-red-400 hover:bg-surface-800 transition-colors"
                >
                  Remove category
                </button>
              </>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 text-surface-500 text-xs truncate max-w-[160px]">{row.group || "—"}</td>
      <td className="px-4 py-2.5 text-brand-400 font-mono text-xs truncate max-w-[180px]">
        {row.page ? (
          <a href={row.page} target="_blank" rel="noreferrer" className="hover:text-brand-300 transition-colors">{row.page}</a>
        ) : (
          <span className="text-surface-600">No page matched</span>
        )}
      </td>
    </tr>
  );
}
