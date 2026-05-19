"use client";

import { useState } from "react";
import { OnboardingData } from "./OnboardingWizard";
import { useTranslations } from "next-intl";
import { AIModelSelector } from "../ui/AIModelSelector";
import { Layers, Wand2, AlertCircle } from "lucide-react";
import { trpc } from "@/trpc/client";

interface StepSiteStructureProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepSiteStructure({ data, updateData }: StepSiteStructureProps) {
  const t = useTranslations("onboarding.structure");
  const [modelId, setModelId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const generateStructureMut = trpc.semanticCore.generateSiteStructure.useMutation();

  const handleGenerate = async () => {
    setErrorMsg("");
    const baseUrl = data.websiteUrl || (data.competitors && data.competitors[0]?.url);
    if (!baseUrl) {
      setErrorMsg(t("needUrl"));
      return;
    }

    try {
      const res = await generateStructureMut.mutateAsync({ websiteUrl: baseUrl, modelId });
      if (res.structure) {
        updateData({ siteStructure: res.structure });
      }
    } catch (err: any) {
      setErrorMsg(err.message || t("genericError"));
    }
  };

  const tree = data.siteStructure || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-6">
        {/* Model Selection and Generate Button */}
        <div className="glass-card p-6 border border-surface-700/50 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-brand-400" />
              {t("aiTitle")}
            </h3>
            <p className="text-xs text-surface-400 leading-relaxed max-w-lg">
              {t("aiBody", { url: data.websiteUrl || t("urlPlaceholder") })}
            </p>
          </div>

          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 block">
                {t("analysisModelLabel")}
              </label>
              <AIModelSelector
                selectedModelId={modelId}
                onModelSelect={setModelId}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generateStructureMut.isPending || !modelId}
              className="btn-primary"
            >
              {generateStructureMut.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("analyzing")}
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  {t("generate")}
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Tree Display */}
        {tree.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-200">{t("proposedTitle")}</h3>
              <span className="text-xs text-surface-500">{t("sectionsCount", { n: tree.length })}</span>
            </div>
            <div className="glass-card overflow-hidden">
              <div className="p-4 space-y-4">
                {tree.map((section: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-surface-700/50 bg-surface-800/20 overflow-hidden">
                    <div className="px-4 py-3 bg-surface-800/40 border-b border-surface-700/50 flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-surface-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-surface-300">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-surface-100 truncate">{section.label}</h3>
                      </div>
                      {section.pageType && (
                        <div className="px-2 py-1 rounded-md bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] uppercase font-bold tracking-wider">
                          {section.pageType}
                        </div>
                      )}
                    </div>

                    {section.children && section.children.length > 0 && (
                      <div className="px-4 py-3 pl-12 space-y-2 relative">
                        <div className="absolute left-[1.35rem] top-0 bottom-4 w-px bg-surface-700/50" />

                        {section.children.map((child: any, cidx: number) => (
                          <div key={cidx} className="flex items-start gap-3 relative">
                            <div className="absolute -left-[2.1rem] top-2.5 w-6 h-px bg-surface-700/50" />
                            <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-surface-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-surface-300">{child.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
