"use client";

/**
 * @component StepAudience
 * @description Step 3: Target audience — segments and pain points.
 */

import type { OnboardingData } from "./OnboardingWizard";
import { Plus, X, Sparkles } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepAudience({ data, updateData }: Props) {
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
          <p className="text-sm font-medium text-surface-200">AI can help</p>
          <p className="text-xs text-surface-400">
            Based on your business description, AI can suggest audience segments and pain points.
          </p>
        </div>
        <button className="btn-secondary text-xs ml-auto flex-shrink-0">
          Suggest with AI
        </button>
      </div>

      {/* Audience Segments */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-3">
          Who are your customers?
        </label>
        <div className="space-y-2">
          {data.audienceSegments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={segment}
                onChange={(e) => updateSegment(index, e.target.value)}
                placeholder={`Audience segment ${index + 1} — e.g., "Small business owners aged 30-50"`}
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
          Add segment
        </button>
      </div>

      {/* Pain Points */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-3">
          What problems do your customers face?
        </label>
        <div className="space-y-2">
          {data.painPoints.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={point}
                onChange={(e) => updatePainPoint(index, e.target.value)}
                placeholder={`Pain point ${index + 1} — e.g., "Can't find affordable printing services"`}
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
          Add pain point
        </button>
      </div>
    </div>
  );
}
