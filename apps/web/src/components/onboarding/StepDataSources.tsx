"use client";

/**
 * @component StepDataSources
 * @description Step 4: Data sources — website URL and future social media connections.
 */

import type { OnboardingData } from "./OnboardingWizard";
import {
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Camera,
  Send,
} from "lucide-react";
import { useState } from "react";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepDataSources({ data, updateData }: Props) {
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [parseResult, setParseResult] = useState<{ pages: number } | null>(null);

  const handleParseWebsite = async () => {
    if (!data.websiteUrl.trim()) return;
    setParseStatus("parsing");
    // TODO: Call API to parse sitemap
    setTimeout(() => {
      setParseStatus("done");
      setParseResult({ pages: 42 });
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Website URL — Primary */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          Website URL
        </label>
        <p className="text-xs text-surface-500 mb-3">
          Enter your website URL. We&apos;ll analyze its structure, sitemap, and current content.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="url"
              value={data.websiteUrl}
              onChange={(e) => updateData({ websiteUrl: e.target.value })}
              placeholder="https://your-website.com"
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={handleParseWebsite}
            disabled={!data.websiteUrl.trim() || parseStatus === "parsing"}
            className={`btn-primary flex-shrink-0 ${
              !data.websiteUrl.trim() ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            {parseStatus === "parsing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : parseStatus === "done" ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Analyzed
              </>
            ) : (
              "Analyze Site"
            )}
          </button>
        </div>

        {/* Parse result */}
        {parseStatus === "done" && parseResult && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              Found <strong>{parseResult.pages} pages</strong> on your website
            </span>
          </div>
        )}

        {parseStatus === "error" && (
          <div className="mt-3 p-3 rounded-lg bg-error-500/8 border border-error-500/15 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error-500" />
            <span className="text-sm text-red-300">
              Could not analyze this website. Please check the URL and try again.
            </span>
          </div>
        )}
      </div>

      {/* Future: Social Media (disabled cards) */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-3">
          Social Media <span className="badge badge-brand text-xs ml-2">Coming Soon</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: "VKontakte", icon: MessageCircle, color: "text-blue-400" },
            { name: "Instagram", icon: Camera, color: "text-pink-400" },
            { name: "Telegram", icon: Send, color: "text-cyan-400" },
          ].map((social) => (
            <div
              key={social.name}
              className="p-4 rounded-xl bg-surface-800/20 border border-surface-700/20 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <social.icon className={`w-4.5 h-4.5 ${social.color}`} />
                <span className="text-sm font-medium text-surface-300">{social.name}</span>
              </div>
              <p className="text-xs text-surface-500">Connect to parse data from {social.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
