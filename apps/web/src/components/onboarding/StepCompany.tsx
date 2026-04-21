"use client";

/**
 * @component StepCompany
 * @description Step 1: Company information — name, industry, description, geography.
 */

import type { OnboardingData } from "./OnboardingWizard";
import { Lightbulb, Sparkles, Wand2 } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const INDUSTRY_SUGGESTIONS = [
  "E-commerce", "SaaS", "Local Services", "Healthcare", "Education",
  "Real Estate", "Finance", "Food & Restaurant", "Manufacturing",
  "Travel & Tourism", "Legal Services", "Beauty & Wellness",
];

export default function StepCompany({ data, updateData }: Props) {
  const handleFillWithAI = () => {
    // In a real implementation this would trigger an AI generation contextually.
    // For now we will update with placeholder text
    updateData({
      companyName: "Generated Company Name",
      industry: "E-commerce",
      description: "This is an AI-generated description based on the domain.",
      geography: "Global"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-brand-500/10 p-4 rounded-xl border border-brand-500/20">
        <div>
          <h3 className="text-sm font-medium text-brand-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Auto-Fill
          </h3>
          <p className="text-xs text-surface-400 mt-1">Let AI fill this out using your domain.</p>
        </div>
        <button 
          onClick={handleFillWithAI}
          title="Fill with AI"
          className="btn-primary py-1.5 px-3 text-xs"
        >
          <Wand2 className="w-3.5 h-3.5" /> Fill with AI
        </button>
      </div>

      {/* Conditionally show "My Project URL" if parsing a competitor domain */}
      {data.isCompetitorDomain && (
        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 mb-6">
          <label className="block text-sm font-medium text-surface-200 mb-2 mt-1">
            Your Project URL <span className="text-orange-400/80 text-xs ml-2">(Since you analyzed a competitor)</span>
          </label>
          <input
            type="url"
            value={data.myProjectUrl || ""}
            onChange={(e) => updateData({ myProjectUrl: e.target.value })}
            placeholder="https://your-own-website.com"
            className="input-field mb-3"
          />
          <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={data.myProjectUrl === "none"} 
              onChange={(e) => updateData({ myProjectUrl: e.target.checked ? "none" : "" })}
              className="rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/20"
            />
            I don't have my own project yet (I want to create my own website)
          </label>
        </div>
      )}

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          Company Name <span className="text-brand-400">*</span>
        </label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => updateData({ companyName: e.target.value })}
          placeholder="e.g., Acme Corp"
          className="input-field"
          autoFocus
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          Industry
        </label>
        <input
          type="text"
          value={data.industry}
          onChange={(e) => updateData({ industry: e.target.value })}
          placeholder="e.g., E-commerce, SaaS, Local Services"
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
          Business Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          placeholder="Tell us about your business — what you do, what makes you unique, your key offerings..."
          className="input-field min-h-[120px] resize-y"
          rows={4}
        />
        <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
          <Lightbulb className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-surface-400">
            <span className="text-brand-400 font-medium">AI Tip:</span> The more detail you provide, the better our AI can generate relevant keywords and content for your business.
          </p>
        </div>
      </div>

      {/* Geography */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          Target Geography
        </label>
        <input
          type="text"
          value={data.geography}
          onChange={(e) => updateData({ geography: e.target.value })}
          placeholder="e.g., United States, New York, Global"
          className="input-field"
        />
      </div>
    </div>
  );
}
