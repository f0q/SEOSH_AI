"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/trpc/client";
import {
  X, Save, Loader2, Wand2, BarChart3, RefreshCw,
  CheckCircle2, AlertCircle, Eye, Pencil, FileText, BrainCircuit,
  Download, Send, ChevronDown, Fingerprint, Search, BrainCog, Sparkles,
  AlertTriangle, Type
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
  const [viewMode, setViewMode] = useState<"preview" | "edit" | "issues">("preview");
  const [publishOpen, setPublishOpen] = useState(false);

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
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  // Fetch item
  const { data: contentItem, isLoading } = trpc.contentPlan.getContentItem.useQuery(
    { id: itemId },
    { 
      enabled: !!itemId,
      refetchInterval: (query) => {
        const analysis = query.state?.data?.seoAnalysis as any;
        return analysis?.isTextRuPending ? 5000 : false;
      }
    }
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

  // Track if analysis is outdated per-phase
  const [localOutdated, setLocalOutdated] = useState(false);
  const { isExpertOutdated, isAiOutdated } = useMemo(() => {
    const a = contentItem?.seoAnalysis as any;
    if (!a?.contentModifiedAt) return { isExpertOutdated: localOutdated, isAiOutdated: localOutdated };
    const modified = new Date(a.contentModifiedAt).getTime();
    return {
      isExpertOutdated: localOutdated || !a.expertAnalyzedAt || modified > new Date(a.expertAnalyzedAt).getTime(),
      isAiOutdated: localOutdated || !a.aiAnalyzedAt || modified > new Date(a.aiAnalyzedAt).getTime(),
    };
  }, [contentItem, localOutdated]);
  const isAnalysisOutdated = isExpertOutdated || isAiOutdated;

  const generateMut = trpc.contentPlan.generateContent.useMutation({
    onSuccess: (data) => {
      if (data.item?.markdownBody) {
        setMarkdown(data.item.markdownBody);
        setLocalOutdated(true);
      }
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(""), 5000);
    }
  });

  const analyzeMut = trpc.contentPlan.analyzeContent.useMutation({
    onSuccess: (data) => {
      if (data && "success" in data && data.success === false) {
        setErrorMessage(data.message as string);
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
      setLocalOutdated(false);
      utils.contentPlan.getContentItem.setData({ id: itemId }, (oldData) => {
        if (!oldData || !data.item) return oldData;
        return {
          ...oldData,
          seoAnalysis: data.analysis as any,
          seoScore: data.item.seoScore,
          uniqueness: data.item.uniqueness,
          status: data.item.status,
        };
      });
      utils.contentPlan.getByProject.invalidate();
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(""), 5000);
    }
  });
  const regenerateMut = trpc.contentPlan.regenerateContent.useMutation({
    onSuccess: (data) => {
      if (data && "success" in data && data.success === false) {
        setErrorMessage(data.message as string);
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
      if (data.item?.markdownBody) {
        setMarkdown(data.item.markdownBody);
        setLocalOutdated(true);
      }
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(""), 5000);
    }
  });

  const generateSeoMut = trpc.contentPlan.generateSeoDataBulk.useMutation({
    onSuccess: () => {
      utils.contentPlan.getByProject.invalidate();
      utils.contentPlan.getContentItem.invalidate({ id: itemId });
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(""), 5000);
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

  const handleExportJSON = () => {
    if (!contentItem) return;
    const data = JSON.stringify({
      title: contentItem.title,
      metaTitle: contentItem.metaTitle,
      metaDescription: contentItem.metaDesc,
      targetKeywords: contentItem.targetKeywords,
      content: markdown
    }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contentItem.slug || "content"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLLMS = () => {
    if (!contentItem) return;
    const data = `# ${contentItem.title}\n\n${markdown}`;
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llms.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
              <div className={`absolute top-1 left-7 flex items-center gap-1.5 text-red-400 text-xs transition-opacity duration-300 ${errorMessage ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-2 text-surface-400 hover:text-surface-200 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
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
                  buttonClassName="max-w-sm"
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
                    analyzeMut.mutate({ contentItemId: itemId, modelId: selectedModelId || undefined, phase: "expert" });
                  }}
                  disabled={analyzeMut.isPending || saveDraftMut.isPending || !markdown}
                  className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/50 hover:border-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500/10 disabled:hover:border-blue-500/50"
                  title="Expert Analysis (уникальность, правописание, спам, вода)"
                >
                  {(analyzeMut.isPending && analyzeMut.variables?.phase === "expert") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  Expert Analysis
                </button>

                <button
                  onClick={async () => {
                    if (isDirty) {
                      await saveDraftMut.mutateAsync({ contentItemId: itemId, markdownBody: markdown });
                    }
                    analyzeMut.mutate({ contentItemId: itemId, modelId: selectedModelId || undefined, phase: "ai" });
                  }}
                  disabled={analyzeMut.isPending || saveDraftMut.isPending || !markdown}
                  className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/50 hover:border-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500/10 disabled:hover:border-blue-500/50"
                  title="AI Analysis (EEAT, естественность, читабельность, рекомендации)"
                >
                  {(analyzeMut.isPending && analyzeMut.variables?.phase === "ai") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  AI Analysis
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
                    onClick={() => setViewMode("preview")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === "preview" ? "bg-brand-500/15 text-brand-400" : "text-surface-500 hover:text-surface-300"}`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" /> Preview
                  </button>
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === "edit" ? "bg-brand-500/15 text-brand-400" : "text-surface-500 hover:text-surface-300"}`}
                  >
                    <Pencil className="w-3 h-3 inline mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => setViewMode("issues")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === "issues" ? "bg-red-500/15 text-red-400" : "text-surface-500 hover:text-surface-300"}`}
                    title="Spelling & SEO issues from Expert Analysis"
                  >
                    <AlertTriangle className="w-3 h-3 inline mr-1" /> Issues
                    {analysis && (analysis as any).spellDetail?.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold">{(analysis as any).spellDetail.length}</span>
                    )}
                  </button>
                </div>
                {markdown && (
                  <div className="text-[10px] text-surface-500 flex items-center gap-2 bg-surface-800/50 px-2 py-1 rounded-md">
                    <span title="Character count">{markdown.length} chars</span>
                    <span className="text-surface-600">|</span>
                    <span title="Word count">{markdown.split(/\s+/).filter(w => w.length > 0).length} words</span>
                  </div>
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
                ) : viewMode === "edit" ? (
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className="w-full h-[600px] bg-transparent text-surface-200 text-sm font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar"
                    placeholder="Write your content in markdown..."
                  />
                ) : viewMode === "issues" ? (
                  <div className="h-[600px] overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    {(() => {
                      // Try to get detailed data, or extract from raw response for old analyses
                      let spellErrors = (analysis as any)?.spellDetail || [];
                      let seoInfo = (analysis as any)?.seoDetail || null;

                      // Fallback: parse from raw Text.ru response if detailed fields are missing
                      if (analysis && (spellErrors.length === 0 || !seoInfo)) {
                        const rawData = (analysis as any)?.raw;
                        const textRuRaw = rawData?.textRu || rawData; // hybrid stores under .textRu, direct stores at root
                        if (textRuRaw) {
                          // Parse spell_check from raw
                          if (spellErrors.length === 0 && textRuRaw.spell_check) {
                            try {
                              const parsed = typeof textRuRaw.spell_check === 'string' ? JSON.parse(textRuRaw.spell_check) : textRuRaw.spell_check;
                              if (Array.isArray(parsed)) spellErrors = parsed;
                            } catch {}
                          }
                          // Parse seo_check from raw
                          if (!seoInfo && textRuRaw.seo_check) {
                            try {
                              const parsed = typeof textRuRaw.seo_check === 'string' ? JSON.parse(textRuRaw.seo_check) : textRuRaw.seo_check;
                              seoInfo = {
                                countWords: parsed.count_words,
                                countChars: parsed.count_chars_with_space,
                                listKeys: parsed.list_keys || [],
                                listKeysGroup: parsed.list_keys_group || [],
                                mixedWords: parsed.mixed_words || [],
                              };
                            } catch {}
                          }
                        }
                      }

                      const hasIssues = spellErrors.length > 0 || seoInfo;
                      if (!analysis) {
                        return (
                          <div className="flex flex-col items-center justify-center text-center py-20">
                            <AlertTriangle className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400">Run Expert Analysis first to see issues</p>
                          </div>
                        );
                      }
                      if (!hasIssues) {
                        return (
                          <div className="flex flex-col items-center justify-center text-center py-20">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-3" />
                            <p className="text-surface-400">No issues found! Content looks good.</p>
                          </div>
                        );
                      }
                      return (
                        <>
                          {/* Spelling Errors */}
                          {spellErrors.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Type className="w-4 h-4 text-red-400" />
                                <h3 className="text-sm font-semibold text-surface-200">Spelling & Grammar</h3>
                                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">{spellErrors.length} issues</span>
                              </div>
                              <div className="space-y-2">
                                {spellErrors.map((err: any, idx: number) => (
                                  <div key={idx} className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/50 hover:border-red-500/30 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/15 text-red-400">{err.error_type || 'Ошибка'}</span>
                                        </div>
                                        <p className="text-xs text-surface-300 mb-1.5">
                                          <span className="text-red-400 bg-red-500/10 px-1 rounded font-medium">{err.error_text}</span>
                                        </p>
                                        {err.reason && (
                                          <p className="text-[11px] text-surface-500 leading-snug">{err.reason}</p>
                                        )}
                                      </div>
                                      {err.replacements && err.replacements.length > 0 && (
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                          {err.replacements.slice(0, 3).map((rep: string, rIdx: number) => (
                                            <span key={rIdx} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{rep}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* SEO Keywords */}
                          {seoInfo?.listKeys?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-semibold text-surface-200">Keywords Density</h3>
                              </div>
                              <div className="space-y-1">
                                {seoInfo.listKeys.slice(0, 20).map((kw: any, idx: number) => {
                                  const maxCount = seoInfo.listKeys[0]?.count || 1;
                                  const barWidth = Math.round((kw.count / maxCount) * 100);
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <span className="text-surface-400 w-[180px] truncate flex-shrink-0" title={kw.key_title}>{kw.key_title}</span>
                                      <div className="flex-1 h-3 bg-surface-800 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${kw.count > 5 ? 'bg-amber-500/60' : 'bg-blue-500/40'}`}
                                          style={{ width: barWidth + '%' }}
                                        />
                                      </div>
                                      <span className={`text-[10px] font-mono w-6 text-right ${kw.count > 5 ? 'text-amber-400' : 'text-surface-500'}`}>{kw.count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Mixed words (latin in cyrillic) */}
                          {seoInfo?.mixedWords?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <h3 className="text-sm font-semibold text-surface-200">Mixed Alphabet Words</h3>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">{seoInfo.mixedWords.length}</span>
                              </div>
                              <p className="text-[11px] text-surface-500 mb-2">Words with characters from different alphabets (e.g. Latin in Cyrillic text)</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
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
            <div className="glass-card p-4 flex flex-col gap-3 relative z-10">
              <button
                onClick={handleSave}
                disabled={updateItemMut.isPending || saveDraftMut.isPending}
                className="btn-primary w-full justify-center gap-2 py-2"
              >
                {(updateItemMut.isPending || saveDraftMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save All Changes
              </button>

              {/* Publish Actions */}
              <div className="relative w-full">
                <button
                  onClick={() => setPublishOpen(!publishOpen)}
                  className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-brand-500/10 border border-brand-500/30 hover:border-brand-500 hover:bg-brand-500/20 text-brand-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Publish Actions
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </button>
                {publishOpen && (
                  <div className="absolute right-0 left-0 top-full mt-2 dropdown-panel overflow-hidden z-50">
                    <div className="p-2 text-[10px] text-surface-400 font-medium uppercase tracking-wider border-b border-surface-700/50">
                      Integrations
                    </div>
                    <button className="w-full text-left px-3 py-2 text-xs text-surface-300 hover:bg-surface-700 hover:text-white transition-colors flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-blue-400" />
                      Telegram
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs text-surface-300 hover:bg-surface-700 hover:text-white transition-colors flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-300" />
                      WordPress
                    </button>
                    <div className="p-2 text-[10px] text-surface-500 border-t border-surface-700/50 bg-surface-800/50">
                      Configure in project settings
                    </div>
                  </div>
                )}
              </div>

              {/* Exports */}
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={handleExportJSON}
                  className="flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-surface-700 hover:border-surface-500 bg-surface-800 hover:bg-surface-700 text-surface-200 transition-colors"
                  title="Export as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
                <button
                  onClick={handleExportLLMS}
                  className="flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-surface-700 hover:border-surface-500 bg-surface-800 hover:bg-surface-700 text-surface-200 transition-colors"
                  title="Export as llms.txt"
                >
                  <FileText className="w-3.5 h-3.5" />
                  llms.txt
                </button>
              </div>
            </div>

            {/* SEO Analysis Results */}
            {analysis && (
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">SEO Analysis</h3>
                  <div className="flex items-center gap-2">
                    {isAnalysisOutdated && (
                      <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Outdated
                      </span>
                    )}
                    {contentItem.seoScore != null && (
                      <span className={`text-lg font-black px-3 py-1 rounded-lg ${
                        contentItem.seoScore >= 80 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                        contentItem.seoScore >= 50 ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' :
                        'text-red-400 bg-red-500/10 border border-red-500/20'
                      }`} title="Overall SEO Score">
                        {contentItem.seoScore}
                      </span>
                    )}
                  </div>
                </div>
                {isAnalysisOutdated && (
                  <p className="text-[10px] text-amber-400/80 leading-tight">
                    The data is outdated due to changes in existing content.
                  </p>
                )}
                {/* Expert Analysis Metrics */}
                <div className="space-y-2 mb-4 pb-4 border-b border-surface-700/50">
                  <div className="text-[10px] uppercase text-surface-500 font-semibold mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3"/> Expert Analysis
                    {isExpertOutdated && (
                      <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 normal-case font-medium">
                        <AlertCircle className="w-2.5 h-2.5" /> outdated
                      </span>
                    )}
                    {analysis.isTextRuPending && <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-1" />}
                    {analysis.isTextRuPending && <span className="text-blue-400 normal-case font-normal ml-1">processing...</span>}
                    {analysis.textRuError && <span className="text-red-400 normal-case font-normal ml-1 text-[9px]">Error: {analysis.textRuError}</span>}
                  </div>
                  {[
                    { label: "Уникальность", value: analysis.uniqueness, good: 80, isPercentage: true },
                    ...(analysis.spellingErrors !== undefined ? [{ label: "Ошибок правописания", value: analysis.spellingErrors, good: 0, invert: true, isPercentage: false }] : []),
                    { label: "Заспамленность", value: analysis.spamScore, good: 30, invert: true, isPercentage: true },
                    { label: "Вода", value: analysis.waterScore, good: 15, invert: true, isPercentage: true },
                  ].map(metric => {
                    const isGood = metric.invert ? metric.value <= metric.good : metric.value >= metric.good;
                    return (
                      <div key={metric.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-surface-400">{metric.label}</span>
                          <span className={isGood ? "text-emerald-400" : "text-amber-400"}>
                            {metric.isPercentage ? `${Math.round(metric.value)}%` : metric.value}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-800/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isGood ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${metric.isPercentage ? Math.min(100, Math.max(0, metric.value)) : metric.value === 0 ? 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Metrics */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase text-surface-500 font-semibold mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3"/> AI Analysis
                    {isAiOutdated && (
                      <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 normal-case font-medium">
                        <AlertCircle className="w-2.5 h-2.5" /> outdated
                      </span>
                    )}
                  </div>
                  {[
                    { label: "Естественность", value: analysis.naturalness, good: 80, isPercentage: true },
                    { label: "E-E-A-T", value: analysis.eeat, good: 70, isPercentage: true },
                    { label: "Читабельность", value: analysis.readability, good: 70, isPercentage: true },
                  ].map(metric => {
                    const isGood = metric.value >= metric.good;
                    return (
                      <div key={metric.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-surface-400">{metric.label}</span>
                          <span className={isGood ? "text-emerald-400" : "text-amber-400"}>
                            {metric.isPercentage ? `${Math.round(metric.value)}%` : metric.value}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-800/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isGood ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recommendations */}
                {analysis.recommendations?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-surface-700/30">
                    <h4 className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">AI Recommendations</h4>
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

                {/* Debug: Raw Response */}
                <details className="mt-3 pt-3 border-t border-surface-700/30">
                  <summary className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider cursor-pointer hover:text-surface-300 select-none">
                    🔍 Debug: Raw Server Response
                  </summary>
                  <pre className="mt-2 text-[9px] text-surface-500 bg-surface-900/80 p-3 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar leading-relaxed whitespace-pre-wrap break-all">
                    {JSON.stringify(analysis, null, 2)}
                  </pre>
                </details>
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

      {/* Toast Notification for errors */}
      <div className={`absolute bottom-6 right-6 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 z-50 ${errorMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">{errorMessage}</span>
        <button onClick={() => setErrorMessage("")} className="ml-2 p-1 hover:bg-red-500/20 rounded-md transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
