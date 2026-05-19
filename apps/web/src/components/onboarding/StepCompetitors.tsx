"use client";

import type { OnboardingData } from "./OnboardingWizard";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ExternalLink } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepCompetitors({ data, updateData }: Props) {
  const t = useTranslations("onboarding.competitors");

  const addCompetitor = () => {
    updateData({
      competitors: [...data.competitors, { url: "", name: "", notes: "" }],
    });
  };

  const removeCompetitor = (index: number) => {
    if (data.competitors.length <= 1) return;
    updateData({
      competitors: data.competitors.filter((_, i) => i !== index),
    });
  };

  const updateCompetitor = (index: number, field: string, value: string) => {
    const updated = data.competitors.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    updateData({ competitors: updated });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-400 mb-2">
        {t("intro")}
      </p>

      {data.competitors.map((competitor, index) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/20 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500">
              {t("header", { n: index + 1 })}
            </span>
            <div className="flex items-center gap-1">
              {competitor.url && (
                <a
                  href={competitor.url.startsWith("http") ? competitor.url : `https://${competitor.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost p-1 text-surface-500 hover:text-brand-400"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {data.competitors.length > 1 && (
                <button
                  onClick={() => removeCompetitor(index)}
                  className="btn-ghost p-1 text-surface-500 hover:text-error-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="url"
              value={competitor.url}
              onChange={(e) => updateCompetitor(index, "url", e.target.value)}
              placeholder={t("urlPlaceholder")}
              className="input-field"
            />
            <input
              type="text"
              value={competitor.name}
              onChange={(e) => updateCompetitor(index, "name", e.target.value)}
              placeholder={t("namePlaceholder")}
              className="input-field"
            />
          </div>

          <textarea
            value={competitor.notes}
            onChange={(e) => updateCompetitor(index, "notes", e.target.value)}
            placeholder={t("notesPlaceholder")}
            className="input-field min-h-[60px] resize-y"
            rows={2}
          />
        </div>
      ))}

      <button onClick={addCompetitor} className="btn-secondary w-full justify-center">
        <Plus className="w-4 h-4" />
        {t("add")}
      </button>
    </div>
  );
}
