"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";
import { Sparkles, Coins, ChevronDown } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  costPer1k: number;
}

interface AIModelSelectorProps {
  onModelSelect: (modelId: string) => void;
  selectedModelId?: string;
  estimatedPromptTokens?: number; // Pre-calculated input length (rough estimate)
  expectedOutputTokens?: number;  // Default e.g. 500
}

export function AIModelSelector({
  onModelSelect,
  selectedModelId,
  estimatedPromptTokens = 0,
  expectedOutputTokens = 500,
}: AIModelSelectorProps) {
  const { data: models, isLoading } = trpc.ai.listModels.useQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Model | null>(null);

  useEffect(() => {
    if (models && models.length > 0) {
      if (selectedModelId) {
        const found = models.find(m => m.id === selectedModelId);
        if (found) {
          setSelected(found);
          return;
        }
      }
      setSelected(models[0]);
      onModelSelect(models[0].id);
    }
  }, [models, selectedModelId, onModelSelect]);

  const handleSelect = (model: Model) => {
    setSelected(model);
    onModelSelect(model.id);
    setIsOpen(false);
  };

  const calculateEstimate = (costPer1k: number) => {
    const totalTokens = estimatedPromptTokens + expectedOutputTokens;
    return Math.ceil((totalTokens / 1000) * costPer1k);
  };

  if (isLoading || !selected) return <div className="animate-pulse h-9 bg-surface-800/50 rounded-xl w-64" />;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 text-brand-300 rounded-xl transition-colors text-sm font-medium"
      >
        <Sparkles className="w-4 h-4 text-brand-400" />
        <span className="truncate max-w-[120px]">{selected.name}</span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-900/50 border border-surface-700/50 text-xs">
          <Coins className="w-3 h-3 text-emerald-400" />
          <span className="text-surface-300">~{calculateEstimate(selected.costPer1k)}</span>
        </div>
        <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-[280px] right-0 sm:left-0 sm:right-auto z-50 bg-surface-800 shadow-xl shadow-black/50 border border-surface-700 rounded-xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 bg-surface-900/50 border-b border-surface-700/50">
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Select AI Model</p>
          </div>
          <div className="p-1">
            {models?.map((model) => {
              const estimate = calculateEstimate(model.costPer1k);
              const isSelected = selected.id === model.id;
              
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected ? "bg-brand-500/10 text-brand-300" : "hover:bg-surface-700 text-surface-300"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{model.name}</p>
                    <p className="text-xs text-surface-500">{model.costPer1k} tokens / 1k</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-surface-500">Estimate</span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-emerald-400" />
                      <span className={`text-sm font-medium ${isSelected ? "text-emerald-400" : "text-surface-100"}`}>
                        {estimate}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
