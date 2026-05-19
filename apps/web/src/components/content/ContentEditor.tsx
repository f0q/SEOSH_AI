"use client";

/**
 * @component ContentEditor
 * @description AI content generation editor.
 *
 * Workflow:
 *   1. Set topic/keywords/page type
 *   2. Upload materials (photos, notes, video links, existing text)
 *   3. AI generates article (Markdown)
 *   4. SEO analysis (uniqueness, keyword density, wateriness, spam)
 *   5. Apply recommendations with AI
 *   6. Preview HTML output
 *   7. Schedule or publish to WordPress
 */

import { useState, useRef } from "react";
import {
  Sparkles, FileText, Image, Link2, Upload,
  BarChart3, Check, Send, Clock, ChevronDown,
  AlertTriangle, TrendingUp, Eye,
  Loader2, RefreshCw, BookOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AIModelSelector } from "../ui/AIModelSelector";

type Tab = "write" | "seo" | "preview";
type GenerationStatus = "idle" | "generating" | "done";

interface Material {
  type: "note" | "video" | "file";
  content: string;
  name?: string;
}

interface SeoMetrics {
  uniqueness: number;
  wateriness: number;
  spaminess: number;
  keywordDensity: number;
  wordCount: number;
  score: number;
}

export default function ContentEditor() {
  const t = useTranslations("content.editorPage");
  const [tab, setTab] = useState<Tab>("write");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pageType, setPageType] = useState("article");
  const [targetLength, setTargetLength] = useState("1500");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [noteText, setNoteText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [seoMetrics, setSeoMetrics] = useState<SeoMetrics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedModelId, setSelectedModelId] = useState<string>("");

  // Estimate input length for cost calculation
  const promptTextLength = topic.length + keywords.length + noteText.length + materials.reduce((acc, m) => acc + m.content.length, 0);
  const estimatedPromptTokens = Math.ceil(promptTextLength / 4);
  const estimatedOutputTokens = parseInt(targetLength) || 1500;

  const addNote = () => {
    if (!noteText.trim()) return;
    setMaterials(m => [...m, { type: "note", content: noteText }]);
    setNoteText("");
  };

  const addVideo = () => {
    if (!videoUrl.trim()) return;
    setMaterials(m => [...m, { type: "video", content: videoUrl, name: videoUrl }]);
    setVideoUrl("");
  };

  const removeMaterial = (i: number) => setMaterials(m => m.filter((_, j) => j !== i));

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerationStatus("generating");
    setTab("write");

    // Simulate AI generation with streaming effect — body intentionally
    // stays as-is because the AI prompt itself is what the user crafts;
    // we only translate UI chrome around it.
    const mockContent = `# ${topic}

## Введение

${topic} — это важная тема, которую необходимо рассмотреть детально. В данной статье мы разберём основные аспекты и дадим практические рекомендации.

## Ключевые аспекты

Рассматривая **${topic}**, важно учитывать следующее:

- Первый важный пункт, связанный с тематикой
- Второй аспект, который влияет на результат
- Третий момент, требующий особого внимания

## Практические советы

Для достижения лучших результатов по запросам ${keywords.split(",").slice(0, 3).join(", ")} следует:

1. Регулярно анализировать данные и метрики
2. Применять проверенные методы оптимизации
3. Тестировать различные подходы к улучшению

## Заключение

Подводя итог, можно сказать, что правильный подход к **${topic}** обеспечивает стабильный рост показателей и достижение поставленных целей.

---
*Статья оптимизирована для поисковых запросов: ${keywords}*`;

    // Typing effect
    let i = 0;
    const interval = setInterval(() => {
      setContent(mockContent.slice(0, i));
      i += 15;
      if (i > mockContent.length) {
        clearInterval(interval);
        setContent(mockContent);
        setGenerationStatus("done");
      }
    }, 16);
  };

  const handleAnalyzeSEO = async () => {
    setAnalyzing(true);
    setTab("seo");
    await new Promise(r => setTimeout(r, 2000));
    setSeoMetrics({
      uniqueness: 94,
      wateriness: 18,
      spaminess: 4,
      keywordDensity: 2.3,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      score: 82,
    });
    setAnalyzing(false);
  };

  const handleOptimizeWithAI = async () => {
    setGenerationStatus("generating");
    await new Promise(r => setTimeout(r, 1500));
    setContent(prev => prev + "\n\n*[SEO оптимизировано: добавлены ключевые слова, снижена водность]*");
    setGenerationStatus("done");
    setSeoMetrics(prev => prev ? { ...prev, score: 91, wateriness: 12, uniqueness: 96 } : null);
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const publishItems = [
    { key: "publishNow" as const, icon: Send },
    { key: "schedule" as const, icon: Clock },
    { key: "saveDraft" as const, icon: BookOpen },
  ];

  const TAB_DEFS = [
    { id: "write" as const, icon: FileText },
    { id: "seo" as const, icon: BarChart3 },
    { id: "preview" as const, icon: Eye },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{t("title")}</h1>
            <p className="text-sm text-surface-400">{t("subtitle")}</p>
          </div>
        </div>

        {/* Publish button */}
        <div className="relative">
          <button
            onClick={() => setShowPublishMenu(!showPublishMenu)}
            disabled={!content}
            className={`btn-primary gap-2 ${!content ? "opacity-40 pointer-events-none" : ""}`}
          >
            <Send className="w-4 h-4" />
            {t("publish")}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPublishMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 glass-card py-2 shadow-xl z-50 animate-fade-in">
              {publishItems.map(item => (
                <button
                  key={item.key}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-surface-200 hover:bg-surface-800/50 transition-colors"
                >
                  <item.icon className="w-4 h-4 text-surface-400" />
                  {t(item.key)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Setup Panel ─────────────────────────────── */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-surface-200">{t("setupTitle")}</h2>

            {/* Topic */}
            <div>
              <label className="label-text">{t("topicLabel")}</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={t("topicPlaceholder")}
                className="input-field"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="label-text">{t("keywordsLabel")}</label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder={t("keywordsPlaceholder")}
                className="input-field"
              />
            </div>

            {/* Page Type */}
            <div>
              <label className="label-text">{t("pageTypeLabel")}</label>
              <select
                value={pageType}
                onChange={e => setPageType(e.target.value)}
                className="input-field"
              >
                <option value="article">{t("pageType.article")}</option>
                <option value="category">{t("pageType.category")}</option>
                <option value="product">{t("pageType.product")}</option>
                <option value="landing">{t("pageType.landing")}</option>
                <option value="faq">{t("pageType.faq")}</option>
              </select>
            </div>

            {/* Target length */}
            <div>
              <label className="label-text">{t("targetLengthLabel")}</label>
              <select
                value={targetLength}
                onChange={e => setTargetLength(e.target.value)}
                className="input-field"
              >
                <option value="800">{t("length.short")}</option>
                <option value="1500">{t("length.standard")}</option>
                <option value="2500">{t("length.longform")}</option>
                <option value="4000">{t("length.pillar")}</option>
              </select>
            </div>
          </div>

          {/* Materials */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-surface-200">{t("materialsTitle")}</h2>
            <p className="text-xs text-surface-500">{t("materialsBody")}</p>

            {/* Note */}
            <div>
              <label className="label-text">{t("notesLabel")}</label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="input-field min-h-[72px] resize-y text-sm"
                rows={3}
              />
              <button onClick={addNote} disabled={!noteText.trim()} className="btn-ghost text-xs mt-1">
                {t("addNote")}
              </button>
            </div>

            {/* Video */}
            <div>
              <label className="label-text">{t("videoLabel")}</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder={t("videoPlaceholder")}
                  className="input-field flex-1 text-sm"
                />
                <button onClick={addVideo} disabled={!videoUrl.trim()} className="btn-ghost p-2">
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="label-text">{t("filesLabel")}</label>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary w-full justify-center text-sm"
              >
                <Upload className="w-4 h-4" /> {t("uploadFiles")}
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" accept="image/*,.txt,.docx,.pdf" />
            </div>

            {/* Material list */}
            {materials.length > 0 && (
              <div className="space-y-1.5">
                {materials.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-800/30 border border-surface-700/20">
                    {m.type === "note" && <FileText className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />}
                    {m.type === "video" && <Link2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    {m.type === "file" && <Image className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    <span className="text-xs text-surface-300 flex-1 truncate">{m.content.slice(0, 40)}</span>
                    <button onClick={() => removeMaterial(i)} className="text-surface-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate button & Model Selector */}
          <div className="space-y-3 pt-2 border-t border-surface-700/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">{t("modelLabel")}</span>
              <AIModelSelector
                onModelSelect={setSelectedModelId}
                selectedModelId={selectedModelId}
                estimatedPromptTokens={estimatedPromptTokens}
                expectedOutputTokens={estimatedOutputTokens}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || generationStatus === "generating"}
              className={`btn-primary w-full justify-center gap-2 py-3 ${!topic.trim() ? "opacity-40 pointer-events-none" : ""}`}
            >
              {generationStatus === "generating" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("generating")}</>
              ) : generationStatus === "done" ? (
                <><RefreshCw className="w-4 h-4" /> {t("regenerate")}</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {t("generate")}</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Editor + SEO + Preview ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-800/30 border border-surface-700/20 w-fit">
            {TAB_DEFS.map(tabDef => (
              <button
                key={tabDef.id}
                onClick={() => setTab(tabDef.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === tabDef.id
                    ? "bg-surface-700 text-surface-100 shadow-sm"
                    : "text-surface-400 hover:text-surface-300"
                }`}
              >
                <tabDef.icon className="w-3.5 h-3.5" />
                {t(`tabs.${tabDef.id}`)}
              </button>
            ))}
          </div>

          {/* Write tab */}
          {tab === "write" && (
            <div className="glass-card p-0 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-700/30 bg-surface-800/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-surface-500">{t("wordCount", { n: wordCount })}</span>
                  {generationStatus === "done" && (
                    <span className="badge badge-brand gap-1 text-xs">
                      <Check className="w-3 h-3" /> {t("generatedBadge")}
                    </span>
                  )}
                </div>
                {generationStatus === "done" && (
                  <button onClick={handleAnalyzeSEO} className="btn-secondary text-xs gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> {t("analyzeSEO")}
                  </button>
                )}
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t("writePlaceholder")}
                className="w-full min-h-[540px] bg-transparent p-5 text-sm font-mono text-surface-200 resize-none outline-none leading-relaxed placeholder:text-surface-600"
              />
            </div>
          )}

          {/* SEO tab */}
          {tab === "seo" && (
            <div className="glass-card p-6 space-y-6">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-sm text-surface-400">{t("seo.analyzing")}</p>
                </div>
              ) : seoMetrics ? (
                <>
                  {/* Overall Score */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" className="text-surface-700" strokeWidth="8" />
                        <circle
                          cx="40" cy="40" r="32"
                          fill="none"
                          stroke="url(#scoreGrad)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(seoMetrics.score / 100) * 201} 201`}
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-surface-50">{seoMetrics.score}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-surface-100">{t("seo.scoreTitle")}</p>
                      <p className="text-sm text-surface-400">
                        {seoMetrics.score >= 90 ? t("seo.scoreExcellent") : seoMetrics.score >= 70 ? t("seo.scoreGood") : t("seo.scoreNeeds")}
                      </p>
                      <p className="text-xs text-surface-500 mt-1">{t("seo.wordCount", { n: seoMetrics.wordCount })}</p>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: "uniqueness" as const, value: seoMetrics.uniqueness, unit: "%", good: (v: number) => v >= 85, warn: (v: number) => v >= 70 },
                      { key: "wateriness" as const, value: seoMetrics.wateriness, unit: "%", good: (v: number) => v <= 15, warn: (v: number) => v <= 25 },
                      { key: "spaminess" as const, value: seoMetrics.spaminess, unit: "%", good: (v: number) => v <= 5, warn: (v: number) => v <= 10 },
                      { key: "density" as const, value: seoMetrics.keywordDensity, unit: "%", good: (v: number) => v >= 1 && v <= 3, warn: (v: number) => v <= 4 },
                    ].map(metric => {
                      const isGood = metric.good(metric.value);
                      const isWarn = !isGood && metric.warn(metric.value);
                      return (
                        <div key={metric.key} className={`p-4 rounded-xl border text-center ${
                          isGood ? "bg-emerald-500/8 border-emerald-500/20"
                          : isWarn ? "bg-amber-500/8 border-amber-500/20"
                          : "bg-red-500/8 border-red-500/20"
                        }`}>
                          <p className={`text-2xl font-bold ${isGood ? "text-emerald-400" : isWarn ? "text-amber-400" : "text-red-400"}`}>
                            {metric.value}{metric.unit}
                          </p>
                          <p className="text-xs text-surface-400 mt-1">{t(`seo.metrics.${metric.key}`)}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> {t("seo.recommendationsTitle")}
                    </h3>
                    <div className="space-y-2">
                      {[
                        seoMetrics.wateriness > 15 && t("seo.recommendations.reduceWatery"),
                        seoMetrics.uniqueness < 90 && t("seo.recommendations.improveUniqueness"),
                        seoMetrics.keywordDensity < 1 && t("seo.recommendations.addKeywords"),
                        t("seo.recommendations.addInternals"),
                      ].filter(Boolean).map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-surface-800/20 border border-surface-700/20">
                          <TrendingUp className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-surface-300">{rec as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-surface-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-400">{t("seo.optimizationModel")}</span>
                      <AIModelSelector
                        onModelSelect={setSelectedModelId}
                        selectedModelId={selectedModelId}
                        estimatedPromptTokens={Math.ceil(content.length / 4)}
                        expectedOutputTokens={Math.ceil(content.length / 4)}
                      />
                    </div>
                    <button onClick={handleOptimizeWithAI} className="btn-primary w-full justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> {t("seo.applyAll")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-surface-500" />
                  </div>
                  <div>
                    <p className="text-surface-300 font-medium mb-1">{t("seo.emptyTitle")}</p>
                    <p className="text-sm text-surface-500">{t("seo.emptyBody")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview tab */}
          {tab === "preview" && (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-700/30 bg-surface-800/20">
                <Eye className="w-3.5 h-3.5 text-surface-500" />
                <span className="text-xs text-surface-400">{t("preview.header")}</span>
              </div>
              <div className="p-6 prose prose-invert prose-sm max-w-none">
                {content ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-surface-200 leading-relaxed">{content}</pre>
                ) : (
                  <p className="text-surface-500 text-center py-12">{t("preview.empty")}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
