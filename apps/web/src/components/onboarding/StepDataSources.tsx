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

  const normalizeUrl = (raw: string) => {
    const stripped = raw.replace(/^https?:\/\//i, "").trim();
    return stripped ? `https://${stripped}` : "";
  };

  const handleUrlChange = (raw: string) => {
    // Strip any pasted protocol for clean display
    const stripped = raw.replace(/^https?:\/\//i, "");
    // Store as full URL internally so Zod is happy
    const full = stripped ? `https://${stripped}` : "";
    updateData({ websiteUrl: full });
  };

  // Display value strips protocol so users see only the domain
  const displayUrl = data.websiteUrl.replace(/^https?:\/\//i, "");

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
      {/* Domain Type Selection */}
      <div className="flex gap-4 mb-6">
        <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${!data.isCompetitorDomain ? 'bg-brand-500/10 border-brand-500/30' : 'bg-surface-800/30 border-surface-700/50 hover:border-surface-600'}`}>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!data.isCompetitorDomain ? 'border-brand-400' : 'border-surface-500'}`}>
            {!data.isCompetitorDomain && <div className="w-2.5 h-2.5 rounded-full bg-brand-400" />}
          </div>
          <div>
            <div className={`font-medium ${!data.isCompetitorDomain ? 'text-brand-300' : 'text-surface-300'}`}>My Own Domain</div>
            <div className="text-xs text-surface-500 mt-0.5">I have a website, analyze it.</div>
          </div>
          <input 
            type="radio" 
            className="hidden" 
            checked={!data.isCompetitorDomain} 
            onChange={() => updateData({ isCompetitorDomain: false })}
          />
        </label>

        <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${data.isCompetitorDomain ? 'bg-orange-500/10 border-orange-500/30' : 'bg-surface-800/30 border-surface-700/50 hover:border-surface-600'}`}>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${data.isCompetitorDomain ? 'border-orange-400' : 'border-surface-500'}`}>
            {data.isCompetitorDomain && <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />}
          </div>
          <div>
            <div className={`font-medium ${data.isCompetitorDomain ? 'text-orange-300' : 'text-surface-300'}`}>Competitor Domain</div>
            <div className="text-xs text-surface-500 mt-0.5">Analyze a competitor's site instead.</div>
          </div>
          <input 
            type="radio" 
            className="hidden" 
            checked={data.isCompetitorDomain} 
            onChange={() => updateData({ isCompetitorDomain: true })}
          />
        </label>
      </div>

      {/* Website URL — Primary */}
      <div>
        <label className="block text-sm font-medium text-surface-200 mb-2">
          {data.isCompetitorDomain ? "Competitor Website URL" : "Your Website URL"}
        </label>
        <p className="text-xs text-surface-500 mb-3">
          {data.isCompetitorDomain 
            ? "Enter a competitor URL. We'll extract its sitemap and keyword structure." 
            : "Enter your website URL. We'll analyze its structure, sitemap, and auto-fill your company details."}
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <div className="absolute left-9 top-1/2 -translate-y-1/2 text-surface-500 text-sm pointer-events-none select-none">
              https://
            </div>
            <input
              type="text"
              value={displayUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="your-website.com"
              className="input-field !pl-[88px]"
              autoComplete="url"
              spellCheck={false}
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
        <label className="block text-sm font-medium text-surface-200 mb-3 mt-8">
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
