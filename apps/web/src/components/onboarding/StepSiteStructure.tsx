"use client";

import { useState } from "react";
import { OnboardingData } from "./OnboardingWizard";
import { AIModelSelector } from "../ui/AIModelSelector";
import { Layers, Wand2, Plus, Pencil, Trash2, X, Check, ExternalLink } from "lucide-react";
import { PAGE_TYPES } from "@seosh/shared/seo";

interface TreeNode {
  label: string;
  url?: string;
  pageType?: string;
  children?: TreeNode[];
}

interface StepSiteStructureProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safePathLabel(url: string, fullUrl: string): string {
  try {
    const parsed = new URL(fullUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.pop()?.replace(/-/g, " ") || parsed.hostname;
  } catch {
    return url;
  }
}

function buildTree(pages: string[], baseUrl: string): TreeNode[] {
  const groups: Record<string, string[]> = {};
  pages.forEach((p) => {
    try {
      const parsed = new URL(p);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const seg = parts[0] || "home";
      if (!groups[seg]) groups[seg] = [];
      groups[seg].push(p);
    } catch {
      if (!groups["other"]) groups["other"] = [];
      groups["other"].push(p);
    }
  });

  const pageTypeMap: Record<string, string> = {
    blog: "blog_listing", news: "blog_listing",
    services: "service_listing", service: "service_detail",
    product: "product_detail", products: "product_listing",
    catalog: "product_listing", shop: "product_listing",
    about: "info_page", contact: "info_page", contacts: "info_page",
    faq: "info_page", delivery: "info_page",
    promo: "promo_listing", promotions: "promo_listing", akcii: "promo_listing",
    home: "homepage", other: "info_page",
  };

  return Object.entries(groups).map(([seg, urls]) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    pageType: pageTypeMap[seg.toLowerCase()] || "info_page",
    children: urls.map((u) => ({ label: safePathLabel(u, u), url: u })),
  }));
}

function generateMockPages(baseUrl: string): string[] {
  const paths = [
    "/", "/about", "/contact", "/blog", "/blog/post-1", "/blog/post-2",
    "/services", "/services/seo", "/services/content", "/services/audit",
    "/catalog", "/catalog/product-1", "/catalog/product-2",
    "/faq", "/delivery",
  ];
  try {
    const origin = new URL(baseUrl).origin;
    return paths.map((p) => origin + p);
  } catch {
    return paths.map((p) => baseUrl.replace(/\/$/, "") + p);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepSiteStructure({ data, updateData }: StepSiteStructureProps) {
  const [modelId, setModelId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI parsing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const baseUrl = data.websiteUrl || (data.competitors[0]?.url) || "https://example.com";
    const pages = generateMockPages(baseUrl);
    const newTree = buildTree(pages, baseUrl);
    
    updateData({ siteStructure: newTree });
    setIsGenerating(false);
  };

  // Basic flat tree rendering for review
  const tree = data.siteStructure || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-6">
        
        {/* Model Selection and Generate Button */}
        <div className="glass-card p-6 border border-surface-700/50 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-brand-400" />
              AI Structure Generation
            </h3>
            <p className="text-xs text-surface-400 leading-relaxed max-w-lg">
              We'll parse your website ({data.websiteUrl || "not provided"}) and your competitors to propose the optimal URL structure and page types.
            </p>
          </div>
          
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 block">
                Analysis Model
              </label>
              <AIModelSelector
                selectedModelId={modelId}
                onModelSelect={setModelId}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !modelId}
              className="btn-primary"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Sites...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Generate Structure
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tree Display */}
        {tree.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-200">Proposed Structure</h3>
              <span className="text-xs text-surface-500">{tree.length} top-level sections</span>
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
                        {/* Vertical connecting line */}
                        <div className="absolute left-[1.35rem] top-0 bottom-4 w-px bg-surface-700/50" />
                        
                        {section.children.map((child: any, cidx: number) => (
                          <div key={cidx} className="flex items-start gap-3 relative">
                            {/* Horizontal connecting branch */}
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
