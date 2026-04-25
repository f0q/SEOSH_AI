"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/trpc/client";
import {
  X, Save, Loader2, Wand2, BarChart3, RefreshCw,
  CheckCircle2, AlertCircle, Eye, Pencil, FileText, BrainCircuit
} from "lucide-react";
import { AIModelSelector } from "../ui/AIModelSelector";
import { PAGE_TYPES } from "@seosh/shared/seo";

interface ContentEditorModalProps {
  itemId: string;
  onClose: () => void;
}

export function ContentEditorModal({ itemId, onClose }: ContentEditorModalProps) {
  const utils = trpc.useUtils();

  // Content state
  const [markdown, setMarkdown] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [url, setUrl] = useState("");
  const [section, setSection] = useState("");
  const [blogCategory, setBlogCategory] = useState("");
  const [pageType, setPageType] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [h1, setH1] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [h2Headings, setH2Headings] = useState("");

  const [savedMessage, setSavedMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  // Fetch item
  const { data: contentItem, isLoading } = trpc.contentPlan.getContentItem.useQuery(
    { id: itemId },
    { enabled: !!itemId }
  );

  const { data: projectData } = trpc.projects.get.useQuery(
    { id: (contentItem as any)?.contentPlan?.projectId ?? "" },
    { enabled: !!(contentItem as any)?.contentPlan?.projectId }
  );

  const siteStructure = Array.isArray((projectData?.companyProfile as any)?.siteStructure)
    ? (projectData!.companyProfile as any).siteStructure
    : [];
  const siteStructureSections = siteStructure.map((s: any) => s.label);

  const { data: latestCore } = trpc.semanticCore.getLatest.useQuery(
    { projectId: (contentItem as any)?.contentPlan?.projectId ?? "" },
    { enabled: !!(contentItem as any)?.contentPlan?.projectId }
  );
  const semanticCategories = latestCore?.categories?.map((c: any) => c.name) || [];

  // Populate state
  useEffect(() => {
    if (contentItem) {
      setMarkdown(contentItem.markdownBody || "");
      setUrl(contentItem.url || "");
      setSection(contentItem.section || "");
      setBlogCategory((contentItem as any).blogCategory || "");
      setPageType(contentItem.pageType || "");
      setMetaTitle(contentItem.metaTitle || contentItem.title || "");
      setMetaDesc(contentItem.metaDesc || "");
      setH1(contentItem.h1 || "");
      setTargetKeywords(contentItem.targetKeywords ? contentItem.targetKeywords.join(", ") : "");
      setH2Headings(contentItem.h2Headings ? contentItem.h2Headings.join("\n") : "");
    }
  }, [contentItem]);

  const isDirty = useMemo(() => {
    if (!contentItem) return false;
    return (
      markdown !== (contentItem.markdownBody || "") ||
      url !== (contentItem.url || "") ||
      section !== (contentItem.section || "") ||
      blogCategory !== ((contentItem as any).blogCategory || "") ||
      pageType !== (contentItem.pageType || "") ||
      metaTitle !== (contentItem.metaTitle || contentItem.title || "") ||
      metaDesc !== (contentItem.metaDesc || "") ||
      h1 !== (contentItem.h1 || "") ||
      targetKeywords !== (contentItem.targetKeywords ? contentItem.targetKeywords.join(", ") : "") ||
      h2Headings !== (contentItem.h2Headings ? contentItem.h2Headings.join("\n") : "")
    );
  }, [markdown, url, section, blogCategory, pageType, metaTitle, metaDesc, h1, targetKeywords, h2Headings, contentItem]);

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close without saving?")) {
        return;
      }
    }
    onClose();
  };
  // Mutations
  const updateItemMut = trpc.contentPlan.updateItem.useMutation();
  const saveDraftMut = trpc.contentPlan.saveDraft.useMutation();

  const [isAnalysisOutdated, setIsAnalysisOutdated] = useState(false);

  const generateMut = trpc.contentPlan.generateContent.useMutation({
    onSuccess: (data) => {
      if (data.item?.markdownBody) {
        setMarkdown(data.item.markdownBody);
        setIsAnalysisOutdated(true);
      }
    }
  });

  const analyzeMut = trpc.contentPlan.analyzeContent.useMutation({
    onSuccess: (data) => {
      setIsAnalysisOutdated(false);
      utils.contentPlan.getContentItem.setData({ id: itemId }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          seoAnalysis: data.analysis as any,
          seoScore: data.item.seoScore,
          uniqueness: data.item.uniqueness,
          status: data.item.status,
        };
      });
      utils.contentPlan.getByProject.invalidate();
    }
  });
  const regenerateMut = trpc.contentPlan.regenerateContent.useMutation({
    onSuccess: (data) => {
      if (data.item?.markdownBody) {
        setMarkdown(data.item.markdownBody);
      }
    }
  });

  const generateSeoMut = trpc.contentPlan.generateSeoDataBulk.useMutation({
    onSuccess: () => {
      utils.contentPlan.getByProject.invalidate();
      utils.contentPlan.getContentItem.invalidate({ id: itemId });
    }
  });

  const handleSave = async () => {
    try {
      // 1. Update metadata
      await updateItemMut.mutateAsync({
        id: itemId,
        data: {
          url,
          section,
          blogCategory,
          pageType,
          metaTitle,
          metaDesc,
          h1,
          targetKeywords: targetKeywords.split(",").map(k => k.trim()).filter(Boolean),
          h2Headings: h2Headings.split("\n").map(h => h.trim()).filter(Boolean),
        }
      });

      // 2. Save markdown
      await saveDraftMut.mutateAsync({
        contentItemId: itemId,
        markdownBody: markdown
      });

      utils.contentPlan.getByProject.invalidate();
      utils.contentPlan.getContentItem.invalidate({ id: itemId });

      setSavedMessage("All changes saved successfully!");
      setTimeout(() => setSavedMessage(""), 6000);
    } catch (err) {
      setSavedMessage("Failed to save changes.");
      setTimeout(() => setSavedMessage(""), 6000);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!contentItem) return null;

  const analysis = contentItem.seoAnalysis as any;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      {/* Modal Container */}
      <div className="w-full max-w-5xl h-full bg-surface-900 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800 bg-surface-800/30 shrink-0 relative">
          <div className="flex flex-col min-w-0">
            <h2 className="text-lg font-bold text-surface-50 flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-brand-400 shrink-0" />
              <span className="truncate">Edit Content: {contentItem.title}</span>
            </h2>
            <div className="h-0 relative">
              <div className={`absolute top-1 left-7 flex items-center gap-1.5 text-emerald-400 text-xs transition-opacity duration-300 ${savedMessage ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {savedMessage}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-surface-400 hover:text-surface-200 transition-colors shrink-0 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 custom-scrollbar">

          {/* Main Editor Area */}
          <div className="flex-1 space-y-4 min-w-0">

            {/* Toolbar */}
            <div className="p-4 rounded-xl border border-surface-700/50 bg-surface-800/30 flex flex-col gap-3">
              <div>
                <AIModelSelector
                  onModelSelect={setSelectedModelId}
                  selectedModelId={selectedModelId}
                  estimatedPromptTokens={1000}
                  buttonClassName="!border-emerald-500/30 !bg-emerald-500/5 hover:!border-emerald-500/50 max-w-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => generateMut.mutate({ contentItemId: itemId, modelId: selectedModelId || undefined })}
                  disabled={generateMut.isPending}
                  className="flex items-center justify-center w-[150px] whitespace-nowrap gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/50 hover:border-emerald-400"
                >
                  {generateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Generate Content
                </button>

                <button
                  onClick={async () => {
                    if (isDirty) {
                      await saveDraftMut.mutateAsync({ contentItemId: itemId, markdownBody: markdown });
                    }
                    analyzeMut.mutate({ contentItemId: itemId, modelId: selectedModelId || undefined });
                  }}
                  disabled={analyzeMut.isPending || saveDraftMut.isPending || !markdown}
                  className="flex items-center justify-center w-[150px] whitespace-nowrap gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/50 hover:border-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500/10 disabled:hover:border-blue-500/50"
                >
                  {(analyzeMut.isPending || saveDraftMut.isPending) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  Analyze
                </button>

                {analysis && (
                  <button
                    onClick={() => regenerateMut.mutate({ contentItemId: itemId, modelId: selectedModelId || undefined })}
                    disabled={regenerateMut.isPending}
                    className="flex items-center justify-center w-[150px] whitespace-nowrap gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/50 hover:border-amber-400"
                  >
                    {regenerateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      </>
                    )}
                    Optimize
                  </button>
                )}
              </div>
            </div>

            {/* Markdown Container */}
            <div className="glass-card overflow-hidden">
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
                      onClick={() => generateMut.mutate({ contentItemId: itemId, modelId: selectedModelId || undefined })}
                      disabled={generateMut.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/50"
                    >
                      {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Generate Content
                    </button>
                  </div>
                ) : isEditing ? (
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className="w-full h-[600px] bg-transparent text-surface-200 text-sm font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar"
                    placeholder="Write your content in markdown..."
                  />
                ) : (
                  <div
                    className="prose prose-invert prose-sm max-w-none text-surface-200 h-[600px] overflow-y-auto custom-scrollbar pr-2"
                    dangerouslySetInnerHTML={{
                      __html: markdown
                        .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-surface-50 mb-3">$1</h1>')
                        .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-surface-100 mt-6 mb-2">$1</h2>')
                        .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium text-surface-200 mt-4 mb-2">$1</h3>')
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
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[350px] space-y-4 flex-shrink-0">

            {/* Actions Block */}
            <div className="glass-card p-4 flex flex-col gap-3">
              <button
                onClick={handleSave}
                disabled={updateItemMut.isPending || saveDraftMut.isPending}
                className="btn-primary w-full justify-center gap-2 py-2"
              >
                {(updateItemMut.isPending || saveDraftMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save All Changes
              </button>
            </div>

            {/* SEO Analysis Results */}
            {analysis && (
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">SEO Analysis</h3>
                  {isAnalysisOutdated && (
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Outdated
                    </span>
                  )}
                </div>
                {isAnalysisOutdated && (
                  <p className="text-[10px] text-amber-400/80 leading-tight">
                    The data is outdated due to changes in existing content.
                  </p>
                )}
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
              </div>
            )}

            {/* Metadata Editor */}
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  SEO Metadata<br />
                  <span className="text-[10px] text-surface-500 lowercase font-normal">(Editable)</span>
                </h3>
                <button
                  onClick={() => generateSeoMut.mutate({ contentItemIds: [itemId], modelId: selectedModelId || undefined })}
                  disabled={generateSeoMut.isPending}
                  className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/50 hover:border-emerald-400 disabled:opacity-50"
                  title="Generate missing SEO data (Slug, Category, Meta Description, H1, H2s, Keywords)"
                >
                  {generateSeoMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  Generate SEO Data
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">H1 Heading</label>
                  <input type="text" value={h1} onChange={e => setH1(e.target.value)} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">URL Slug</label>
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">Meta Title</label>
                  <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">Meta Description</label>
                  <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors resize-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">Target Keywords (comma separated)</label>
                  <input type="text" value={targetKeywords} onChange={e => setTargetKeywords(e.target.value)} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">H2 Headings (one per line)</label>
                  <textarea value={h2Headings} onChange={e => setH2Headings(e.target.value)} rows={4} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-surface-500 uppercase">Website Category</label>
                    <select value={section} onChange={e => setSection(e.target.value)} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors">
                      <option value="">Select...</option>
                      {siteStructureSections.map((so: string) => (
                        <option key={so} value={so}>{so}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-surface-500 uppercase">Page Type</label>
                    <select value={pageType} onChange={e => setPageType(e.target.value)} className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors">
                      <option value="">Select...</option>
                      {PAGE_TYPES.map((pt) => (
                        <option key={pt.slug} value={pt.slug}>
                          {pt.slug} ({pt.labelRu})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-surface-500 uppercase">Blog Category</label>
                  <input
                    list="blog-categories"
                    value={blogCategory}
                    onChange={e => setBlogCategory(e.target.value)}
                    className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none transition-colors"
                    placeholder="Type or select..."
                  />
                  <datalist id="blog-categories">
                    {semanticCategories.map((cat: string) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
