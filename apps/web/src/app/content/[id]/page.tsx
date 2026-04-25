"use client";

import { use, useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import {
  ChevronLeft, Save, Loader2, Wand2, BarChart3, RefreshCw,
  CheckCircle2, AlertCircle, FileText, Eye, Pencil, Clock,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ContentEditorPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const utils = trpc.useUtils();

  const [markdown, setMarkdown] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const saveDraftMut = trpc.contentPlan.saveDraft.useMutation({
    onSuccess: () => {
      setSavedMessage("Draft saved successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
      setIsSaving(false);
    },
    onError: () => {
      setSavedMessage("Failed to save draft.");
      setIsSaving(false);
    }
  });

  const generateMut = trpc.contentPlan.generateContent.useMutation({
    onSuccess: (data) => {
      if (data.item?.markdownBody) {
        setMarkdown(data.item.markdownBody);
      }
    }
  });

  const analyzeMut = trpc.contentPlan.analyzeContent.useMutation();
  const regenerateMut = trpc.contentPlan.regenerateContent.useMutation({
    onSuccess: (data) => {
      if (data.item?.markdownBody) {
        setMarkdown(data.item.markdownBody);
      }
    }
  });

  // We need a single-item query. Let's build a simple one.
  // For now, use the contentItem directly
  const { data: contentItem, isLoading: isLoadingItem } = trpc.contentPlan.getContentItem.useQuery(
    { id },
    { enabled: !!id }
  );

  useEffect(() => {
    if (contentItem?.markdownBody) {
      setMarkdown(contentItem.markdownBody);
    }
  }, [contentItem?.markdownBody]);

  const handleSave = () => {
    setIsSaving(true);
    saveDraftMut.mutate({ contentItemId: id, markdownBody: markdown });
  };

  if (isLoadingItem) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!contentItem) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto text-center py-20 text-surface-400">
          Content item not found.
        </div>
      </DashboardLayout>
    );
  }

  const analysis = contentItem.seoAnalysis as any;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div>
          <Link href="/content" className="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Content
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
                <FileText className="w-6 h-6 text-brand-400" />
                {contentItem.h1 || contentItem.metaTitle || contentItem.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                {contentItem.section && <span className="px-2 py-0.5 rounded bg-surface-800/50 border border-surface-700/30">{contentItem.section}</span>}
                {contentItem.pageType && <span>{contentItem.pageType}</span>}
                {contentItem.url && <span className="text-brand-400/60">{contentItem.url}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Generate */}
              <button
                onClick={() => generateMut.mutate({ contentItemId: id })}
                disabled={generateMut.isPending}
                className="btn-secondary gap-2 text-sm"
              >
                {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate
              </button>
              {/* Analyze */}
              <button
                onClick={() => analyzeMut.mutate({ contentItemId: id })}
                disabled={analyzeMut.isPending || !markdown}
                className="btn-secondary gap-2 text-sm"
              >
                {analyzeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Analyze
              </button>
              {/* Regenerate */}
              {analysis && (
                <button
                  onClick={() => regenerateMut.mutate({ contentItemId: id })}
                  disabled={regenerateMut.isPending}
                  className="btn-secondary gap-2 text-sm"
                >
                  {regenerateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Optimize
                </button>
              )}
              {/* Save Draft */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary gap-2 text-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
            </div>
          </div>
        </div>

        {/* Saved message */}
        {savedMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">{savedMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-3 glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800/50 bg-surface-800/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!isEditing ? "bg-brand-500/15 text-brand-400" : "text-surface-500 hover:text-surface-300"}`}
                >
                  <Eye className="w-3 h-3 inline mr-1" /> Preview
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isEditing ? "bg-brand-500/15 text-brand-400" : "text-surface-500 hover:text-surface-300"}`}
                >
                  <Pencil className="w-3 h-3 inline mr-1" /> Edit
                </button>
              </div>
              {markdown && (
                <span className="text-[10px] text-surface-500">
                  {markdown.split(/\s+/).length} words
                </span>
              )}
            </div>

            <div className="p-5 min-h-[500px]">
              {!markdown ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <FileText className="w-12 h-12 text-surface-600 mb-3" />
                  <p className="text-surface-400 mb-4">No content generated yet</p>
                  <button
                    onClick={() => generateMut.mutate({ contentItemId: id })}
                    disabled={generateMut.isPending}
                    className="btn-primary gap-2"
                  >
                    {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate Content
                  </button>
                </div>
              ) : isEditing ? (
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="w-full h-[500px] bg-transparent text-surface-200 text-sm font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar"
                  placeholder="Write your content in markdown..."
                />
              ) : (
                <div
                  className="prose prose-invert prose-sm max-w-none text-surface-200"
                  dangerouslySetInnerHTML={{
                    __html: markdown
                      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-surface-50 mb-4">$1</h1>')
                      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-surface-100 mt-8 mb-3">$1</h2>')
                      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-surface-200 mt-6 mb-2">$1</h3>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/!\[([^\]]*)\]\(PROMPT: ([^)]*)\)/g, '<div class="my-4 p-4 border border-dashed border-purple-500/30 rounded-xl bg-purple-500/5 text-center"><p class="text-xs text-purple-400">🖼 Image: $2</p><p class="text-[10px] text-surface-500 mt-1">alt: $1</p></div>')
                      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2" class="text-brand-400 hover:underline">$1</a>')
                      .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
                      .replace(/^(?!<[hpa])/gm, '<p class="mb-3 leading-relaxed">')
                  }}
                />
              )}
            </div>
          </div>

          {/* Sidebar — SEO Analysis */}
          <div className="lg:col-span-1 space-y-4">
            {/* Item Info */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Content Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-500">Status</span>
                  <span className={`font-medium ${
                    contentItem.status === "PUBLISHED" ? "text-emerald-400" :
                    contentItem.status === "OPTIMIZED" ? "text-teal-400" :
                    contentItem.status === "GENERATED" ? "text-indigo-400" :
                    "text-surface-300"
                  }`}>{contentItem.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Updated</span>
                  <span className="text-surface-300">{new Date(contentItem.updatedAt).toLocaleDateString()}</span>
                </div>
                {contentItem.targetKeywords && contentItem.targetKeywords.length > 0 && (
                  <div>
                    <span className="text-surface-500 block mb-1">Keywords</span>
                    <div className="flex flex-wrap gap-1">
                      {contentItem.targetKeywords.map((kw: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-surface-800/50 border border-surface-700/30 text-[10px] text-surface-400">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEO Analysis Results */}
            {analysis && (
              <div className="glass-card p-4 space-y-3">
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">SEO Analysis</h3>
                <div className="space-y-2">
                  {[
                    { label: "Uniqueness", value: analysis.uniqueness, good: 80 },
                    { label: "Naturalness", value: analysis.naturalness, good: 80 },
                    { label: "E-E-A-T", value: analysis.eeat, good: 70 },
                    { label: "Readability", value: analysis.readability, good: 70 },
                    { label: "Spam Score", value: analysis.spamScore, good: 20, invert: true },
                    { label: "Water/Filler", value: analysis.waterScore, good: 30, invert: true },
                  ].map(metric => {
                    const isGood = metric.invert ? metric.value <= metric.good : metric.value >= metric.good;
                    return (
                      <div key={metric.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-surface-400">{metric.label}</span>
                          <span className={isGood ? "text-emerald-400" : "text-amber-400"}>{Math.round(metric.value)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-800/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isGood ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, metric.value)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recommendations */}
                {analysis.recommendations?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-surface-700/30">
                    <h4 className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Recommendations</h4>
                    <div className="space-y-1.5">
                      {analysis.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-surface-400">
                          <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-surface-600">
                  Provider: {analysis.provider || "unknown"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
