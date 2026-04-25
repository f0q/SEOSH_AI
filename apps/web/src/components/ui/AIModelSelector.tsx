"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  expectedOutputTokens?: number; // Pre-calculated expected output length
  icon?: React.ElementType;
  iconColor?: string;
  buttonClassName?: string;
}

export function AIModelSelector({
  onModelSelect,
  selectedModelId,
  estimatedPromptTokens = 0,
  expectedOutputTokens = 500,
  icon: Icon = Sparkles,
  iconColor = "text-emerald-400",
  buttonClassName,
}: AIModelSelectorProps) {
  const { data: models, isLoading } = trpc.ai.listModels.useQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Model | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  const renderDropdown = () => {
    if (!isOpen || !buttonRef.current) return null;
    
    const rect = buttonRef.current.getBoundingClientRect();
    
    // Check if there is enough space below, if not, open upwards
    const spaceBelow = window.innerHeight - rect.bottom;
    const isUpwards = spaceBelow < 300 && rect.top > 300;

    const top = isUpwards ? undefined : rect.bottom + 8;
    const bottom = isUpwards ? window.innerHeight - rect.top + 8 : undefined;
    const left = rect.left;

    const dropdown = (
      <div 
        ref={dropdownRef}
        className="fixed w-[280px] z-[99999] bg-surface-800 shadow-2xl shadow-black/80 border border-surface-600 rounded-xl overflow-hidden animate-fade-in"
        style={{ top, bottom, left }}
      >
        <div className="px-3 py-2 bg-surface-900/50 border-b border-surface-700/50">
          <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">Select AI Model</p>
        </div>
        <div className="p-1 max-h-[300px] overflow-y-auto">
          {models?.map((model) => {
            const estimate = calculateEstimate(model.costPer1k);
            const isSelected = selected.id === model.id;
            
            return (
              <button
                key={model.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(model);
                }}
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
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium border border-indigo-500/20 bg-surface-800/40 hover:bg-surface-800/80 hover:border-indigo-500/40 text-surface-50 shadow-sm ${buttonClassName || "w-full"}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
          <span className="truncate">{selected.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-900/50 border border-surface-700/50 text-xs">
            <Coins className="w-3 h-3 text-emerald-400" />
            <span className="text-surface-300">~{calculateEstimate(selected.costPer1k)}</span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </div>
      </button>

      {renderDropdown()}
    </div>
  );
}
