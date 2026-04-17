"use client";

/**
 * @component StepCompany
 * @description Step 1: Company information — name, industry, description, geography.
 */

import type { OnboardingData } from "./OnboardingWizard";
import { Lightbulb } from "lucide-react";

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
  return (
    <div className="space-y-6">
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
