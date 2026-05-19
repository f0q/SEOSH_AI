"use client";

import type { OnboardingData } from "./OnboardingWizard";
import { Plus, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AIModelSelector } from "../ui/AIModelSelector";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepAudience({ data, updateData }: Props) {
  const t = useTranslations("onboarding.audience");
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const addSegment = () => {
    updateData({ audienceSegments: [...data.audienceSegments, ""] });
  };

  const removeSegment = (index: number) => {
    if (data.audienceSegments.length <= 1) return;
    updateData({
      audienceSegments: data.audienceSegments.filter((_, i) => i !== index),
    });
  };

  const updateSegment = (index: number, value: string) => {
    const updated = data.audienceSegments.map((s, i) => (i === index ? value : s));
    updateData({ audienceSegments: updated });
  };

  const addPainPoint = () => {
    updateData({ painPoints: [...data.painPoints, ""] });
  };

  const removePainPoint = (index: number) => {
    if (data.painPoints.length <= 1) return;
    updateData({
      painPoints: data.painPoints.filter((_, i) => i !== index),
    });
  };

  const updatePainPoint = (index: number, value: string) => {
    const updated = data.painPoints.map((p, i) => (i === index ? value : p));
    updateData({ painPoints: updated });
  };

  return (
    <div className="space-y-8">
      {/* AI suggestion banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-brand-500/8 to-accent-500/8 border border-brand-500/15">
        <div className="w-9 h-9 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-brand-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-surface-200">{t("aiBannerTitle")}</p>
          <p className="text-xs text-surface-400">
            {t("aiBannerBody")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block">
            <AIModelSelector
              onModelSelect={setSelectedModelId}
              selectedModelId={selectedModelId}
              estimatedPromptTokens={150}
              expectedOutputTokens={200}
            />
          </div>
          <button className="btn-secondary text-xs">
            {t("aiBannerBtn")}
          </button>
        </div>
      </div>

      {/* Audience Segments */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-3">
          {t("segmentsLabel")}
        </label>
        <div className="space-y-2">
          {data.audienceSegments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={segment}
                onChange={(e) => updateSegment(index, e.target.value)}
                placeholder={t("segmentPlaceholder", { n: index + 1 })}
                className="input-field flex-1"
              />
              {data.audienceSegments.length > 1 && (
                <button
                  onClick={() => removeSegment(index)}
                  className="btn-ghost p-2 text-surface-500 hover:text-error-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addSegment} className="btn-ghost mt-2 text-sm">
          <Plus className="w-3.5 h-3.5" />
          {t("addSegment")}
        </button>
      </div>

      {/* Pain Points */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-3">
          {t("painPointsLabel")}
        </label>
        <div className="space-y-2">
          {data.painPoints.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={point}
                onChange={(e) => updatePainPoint(index, e.target.value)}
                placeholder={t("painPointPlaceholder", { n: index + 1 })}
                className="input-field flex-1"
              />
              {data.painPoints.length > 1 && (
                <button
                  onClick={() => removePainPoint(index)}
                  className="btn-ghost p-2 text-surface-500 hover:text-error-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addPainPoint} className="btn-ghost mt-2 text-sm">
          <Plus className="w-3.5 h-3.5" />
          {t("addPainPoint")}
        </button>
      </div>
    </div>
  );
}
