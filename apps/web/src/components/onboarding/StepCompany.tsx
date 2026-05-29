"use client";

import type { OnboardingData } from "./OnboardingWizard";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Sparkles, Wand2, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "@/components/ui/AIModelSelector";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const INDUSTRY_SUGGESTIONS = [
  "E-commerce", "SaaS", "Local Services", "Healthcare", "Education",
  "Real Estate", "Finance", "Food & Restaurant", "Manufacturing",
  "Travel & Tourism", "Legal Services", "Beauty & Wellness",
];

// The URL we feed to the auto-fill is the project's URL — but during a
// competitor-domain onboarding the user's own site may live in myProjectUrl.
function pickAutoFillUrl(data: OnboardingData): string {
  if (data.isCompetitorDomain && data.myProjectUrl && data.myProjectUrl !== "none") {
    return data.myProjectUrl;
  }
  return data.websiteUrl;
}

export default function StepCompany({ data, updateData }: Props) {
  const t = useTranslations("onboarding");
  const tStep = useTranslations("onboarding.company");
  const [modelId, setModelId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [deducted, setDeducted] = useState<number | null>(null);

  const autoFill = trpc.ai.autoFillCompany.useMutation({
    onSuccess: (res) => {
      setError(null);
      setDeducted(res.deducted);
      updateData({
        companyName: res.companyName || data.companyName,
        industry: res.industry || data.industry,
        description: res.description || data.description,
        geography: res.geography || data.geography,
      });
    },
    onError: (err) => {
      setError(err.message);
      setDeducted(null);
    },
  });

  const url = pickAutoFillUrl(data);
  const canAutofill = !!modelId && /^https?:\/\/.+/.test(url) && !autoFill.isPending;

  const handleFillWithAI = () => {
    if (!canAutofill) return;
    autoFill.mutate({ url, modelId });
  };

  return (
    <div className="space-y-6">
      <div className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20 space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-brand-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {tStep("aiAutoFillTitle")}
            </h3>
            <p className="text-xs text-surface-400 mt-1">{tStep("aiAutoFillBody")}</p>
          </div>
          <button
            type="button"
            onClick={handleFillWithAI}
            disabled={!canAutofill}
            title={!url ? tStep("aiAutoFillNeedsUrl") : tStep("aiAutoFillBtn")}
            className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {autoFill.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {tStep("aiAutoFillBtn")}
          </button>
        </div>
        <div className="max-w-sm">
          <AIModelSelector
            selectedModelId={modelId}
            onModelSelect={setModelId}
            estimatedPromptTokens={500}
            expectedOutputTokens={200}
          />
        </div>
        {!url && (
          <p className="text-[11px] text-amber-400/80 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {tStep("aiAutoFillNeedsUrl")}
          </p>
        )}
        {error && (
          <p className="text-[11px] text-red-300 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
        {deducted != null && !error && (
          <p className="text-[11px] text-emerald-400">{tStep("aiAutoFillDeducted", { tokens: deducted })}</p>
        )}
      </div>

      {data.isCompetitorDomain && (
        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 mb-6">
          <label className="block text-sm font-medium text-surface-200 mb-2 mt-1">
            {tStep("yourProjectUrl")} <span className="text-orange-400/80 text-xs ml-2">{tStep("yourProjectUrlNote")}</span>
          </label>
          <input
            type="url"
            value={data.myProjectUrl || ""}
            onChange={(e) => updateData({ myProjectUrl: e.target.value })}
            placeholder={tStep("yourProjectUrlPlaceholder")}
            className="input-field mb-3"
          />
          <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer">
            <input
              type="checkbox"
              checked={data.myProjectUrl === "none"}
              onChange={(e) => updateData({ myProjectUrl: e.target.checked ? "none" : "" })}
              className="rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/20"
            />
            {tStep("noProjectYet")}
          </label>
        </div>
      )}

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          {t("companyName")} <span className="text-brand-400">*</span>
        </label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => updateData({ companyName: e.target.value })}
          placeholder={tStep("namePlaceholder")}
          className="input-field"
          autoFocus
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          {t("industry")}
        </label>
        <input
          type="text"
          value={data.industry}
          onChange={(e) => updateData({ industry: e.target.value })}
          placeholder={tStep("industryPlaceholder")}
          className="input-field mb-3"
        />
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_SUGGESTIONS.map((ind) => (
            <button
              key={ind}
              onClick={() => updateData({ industry: ind })}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                data.industry === ind
                  ? "bg-brand-500/15 border-brand-500/30 text-brand-400"
                  : "bg-surface-800/30 border-surface-700/30 text-surface-400 hover:border-surface-600 hover:text-surface-300"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          {t("description")}
        </label>
        <textarea
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          placeholder={tStep("descriptionPlaceholder")}
          className="input-field min-h-[120px] resize-y"
          rows={4}
        />
        <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
          <Lightbulb className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-surface-400">
            <span className="text-brand-400 font-medium">{tStep("aiTipLabel")}</span> {tStep("aiTipBody")}
          </p>
        </div>
      </div>

      {/* Geography */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          {t("geography")}
        </label>
        <input
          type="text"
          value={data.geography}
          onChange={(e) => updateData({ geography: e.target.value })}
          placeholder={tStep("geographyPlaceholder")}
          className="input-field"
        />
      </div>
    </div>
  );
}
