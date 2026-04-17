"use client";

/**
 * @component SemanticCoreWizard
 * @description 4-step semantic core builder.
 * Migrated from SEO_classify frontend Wizard.tsx.
 *
 * Steps:
 *   1. Sitemap — parse or paste URL
 *   2. Queries — upload CSV or paste keywords
 *   3. Categories — AI generates, user edits + approves
 *   4. Results — clustered table with page assignments + export
 */

import { useState } from "react";
import { Brain, Globe, Upload, Tags, BarChart3, ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: 1, title: "Sitemap", icon: Globe, description: "Parse your website structure" },
  { id: 2, title: "Keywords", icon: Upload, description: "Upload your keyword list" },
  { id: 3, title: "Categories", icon: Tags, description: "AI generates and you approve" },
  { id: 4, title: "Results", icon: BarChart3, description: "Keyword → Category → Page" },
];

export default function SemanticCoreWizard({ projectId }: { projectId?: string }) {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Semantic Core</h1>
          <p className="text-sm text-surface-400">Build your keyword structure with AI clustering</p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const current = step === s.id;
          const StepIcon = s.icon;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  current
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                    : done
                    ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-400"
                    : "bg-surface-800/20 border-surface-700/20 text-surface-500"
                }`}
              >
                <StepIcon className="w-5 h-5 flex-shrink-0" />
                <div className="hidden md:block min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs opacity-70 truncate">{s.description}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${done ? "bg-emerald-500/40" : "bg-surface-700/20"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8 min-h-[400px] flex flex-col" key={step}>
        {step === 1 && <StepSitemap />}
        {step === 2 && <StepKeywords />}
        {step === 3 && <StepCategories />}
        {step === 4 && <StepResults />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 && setStep(s => s - 1)}
          disabled={step === 1}
          className={`btn-ghost gap-2 ${step === 1 ? "opacity-30 pointer-events-none" : ""}`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {step < 4 && (
          <button onClick={() => setStep(s => s + 1)} className="btn-primary gap-2">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function StepSitemap() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "parsing" | "done">("idle");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">Parse Sitemap</h2>
        <p className="text-sm text-surface-400">
          Enter your website URL. We&apos;ll fetch sitemap.xml and extract all pages.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://your-website.com"
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => { setStatus("parsing"); setTimeout(() => setStatus("done"), 2000); }}
          disabled={!url || status === "parsing"}
          className="btn-primary flex-shrink-0"
        >
          {status === "parsing" ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Parsing...</>
          ) : status === "done" ? "✓ Parsed" : "Parse Sitemap"}
        </button>
      </div>

      {status === "done" && (
        <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/15 animate-fade-in">
          <p className="text-sm text-emerald-300 font-medium mb-2">✓ Sitemap parsed successfully</p>
          <p className="text-sm text-surface-400">Found <strong className="text-surface-200">42 pages</strong> on your website.</p>
        </div>
      )}
    </div>
  );
}

function StepKeywords() {
  const [text, setText] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">Upload Keywords</h2>
        <p className="text-sm text-surface-400">
          Paste your keywords — one per line, or separated by commas. We&apos;ll group similar ones automatically.
        </p>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"купить кроссовки\nкупить кроссовки nike\nкроссовки для бега\n..."}
        className="input-field min-h-[260px] font-mono text-sm resize-y"
        rows={12}
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-500">
          {text.split('\n').filter(l => l.trim()).length} keywords
        </span>
        <button className="btn-secondary">
          <Upload className="w-4 h-4" /> Upload CSV
        </button>
      </div>
    </div>
  );
}

function StepCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setCategories([
        "Кроссовки для бега",
        "Кроссовки Nike",
        "Детские кроссовки",
        "Кроссовки Adidas",
        "Кроссовки для зала",
        "Кроссовки для ходьбы",
      ]);
      setGenerating(false);
    }, 2500);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">AI Categories</h2>
        <p className="text-sm text-surface-400">
          AI analyzes your keywords and suggests categories. Review and edit before approving.
        </p>
      </div>

      <button onClick={handleGenerate} disabled={generating} className="btn-primary gap-2">
        {generating ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
        ) : <><Brain className="w-4 h-4" /> Generate with AI</>}
      </button>

      {categories.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm text-surface-400">{categories.length} categories generated. Edit if needed:</p>
          {categories.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={cat}
                onChange={e => {
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

function StepResults() {
  const mockResults = [
    { query: "купить кроссовки", category: "Кроссовки для бега", page: "/catalog/running/" },
    { query: "кроссовки nike", category: "Кроссовки Nike", page: "/brands/nike/" },
    { query: "кроссовки для бега", category: "Кроссовки для бега", page: "/catalog/running/" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-1">Results</h2>
          <p className="text-sm text-surface-400">Keyword → Category → Page mapping</p>
        </div>
        <button className="btn-secondary">Export CSV</button>
      </div>

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
            {mockResults.map((r, i) => (
              <tr key={i} className="border-b border-surface-700/20 hover:bg-surface-800/20 transition-colors">
                <td className="px-4 py-3 text-surface-200">{r.query}</td>
                <td className="px-4 py-3">
                  <span className="badge badge-brand">{r.category}</span>
                </td>
                <td className="px-4 py-3 text-brand-400 font-mono text-xs">{r.page}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
