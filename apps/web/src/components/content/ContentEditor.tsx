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
  AlertTriangle, TrendingUp, Eye, Code2,
  Loader2, RefreshCw, BookOpen,
} from "lucide-react";
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
  const estimatedPromptTokens = Math.ceil(promptTextLength / 4); // rough approximation
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

    // Simulate AI generation with streaming effect
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Content Editor</h1>
            <p className="text-sm text-surface-400">AI-generated SEO content</p>
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
            Publish
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPublishMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 glass-card py-2 shadow-xl z-50 animate-fade-in">
              {[
                { label: "Publish Now", icon: Send },
                { label: "Schedule", icon: Clock },
                { label: "Save Draft", icon: BookOpen },
              ].map(item => (
                <button
                  key={item.label}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-surface-200 hover:bg-surface-800/50 transition-colors"
                >
                  <item.icon className="w-4 h-4 text-surface-400" />
                  {item.label}
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
            <h2 className="text-sm font-semibold text-surface-200">Content Setup</h2>

            {/* Topic */}
            <div>
              <label className="label-text">Topic / H1</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Как выбрать кроссовки для бега"
                className="input-field"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="label-text">Target Keywords</label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="кроссовки для бега, купить кроссовки"
                className="input-field"
              />
            </div>

            {/* Page Type */}
            <div>
              <label className="label-text">Page Type</label>
              <select
                value={pageType}
                onChange={e => setPageType(e.target.value)}
                className="input-field"
              >
                <option value="article">Article / Blog post</option>
                <option value="category">Category page</option>
                <option value="product">Product description</option>
                <option value="landing">Landing page</option>
                <option value="faq">FAQ page</option>
              </select>
            </div>

            {/* Target length */}
            <div>
              <label className="label-text">Target Word Count</label>
              <select
                value={targetLength}
                onChange={e => setTargetLength(e.target.value)}
                className="input-field"
              >
                <option value="800">~800 words (short)</option>
                <option value="1500">~1500 words (standard)</option>
                <option value="2500">~2500 words (long-form)</option>
                <option value="4000">~4000 words (pillar)</option>
              </select>
            </div>
          </div>

          {/* Materials */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-surface-200">Source Materials</h2>
            <p className="text-xs text-surface-500">Add context so AI writes accurately</p>

            {/* Note */}
            <div>
              <label className="label-text">Notes / Thesis</label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Key points, facts, specs..."
                className="input-field min-h-[72px] resize-y text-sm"
                rows={3}
              />
              <button onClick={addNote} disabled={!noteText.trim()} className="btn-ghost text-xs mt-1">
                + Add note
              </button>
            </div>

            {/* Video */}
            <div>
              <label className="label-text">Video URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="input-field flex-1 text-sm"
                />
                <button onClick={addVideo} disabled={!videoUrl.trim()} className="btn-ghost p-2">
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="label-text">Files / Photos</label>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary w-full justify-center text-sm"
              >
                <Upload className="w-4 h-4" /> Upload Files
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
              <span className="text-xs text-surface-400">Model</span>
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : generationStatus === "done" ? (
                <><RefreshCw className="w-4 h-4" /> Regenerate</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Content</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Editor + SEO + Preview ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-800/30 border border-surface-700/20 w-fit">
            {([
              { id: "write", label: "Write", icon: FileText },
              { id: "seo", label: "SEO Analysis", icon: BarChart3 },
              { id: "preview", label: "Preview", icon: Eye },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-surface-700 text-surface-100 shadow-sm"
                    : "text-surface-400 hover:text-surface-300"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Write tab */}
          {tab === "write" && (
            <div className="glass-card p-0 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-700/30 bg-surface-800/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-surface-500">{wordCount} words</span>
                  {generationStatus === "done" && (
                    <span className="badge badge-brand gap-1 text-xs">
                      <Check className="w-3 h-3" /> Generated
                    </span>
                  )}
                </div>
                {generationStatus === "done" && (
                  <button onClick={handleAnalyzeSEO} className="btn-secondary text-xs gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Analyze SEO
                  </button>
                )}
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Your content will appear here after generation, or write manually..."
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
                  <p className="text-sm text-surface-400">Analyzing with Text.ru + AI...</p>
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
                      <p className="text-lg font-semibold text-surface-100">SEO Score</p>
                      <p className="text-sm text-surface-400">
                        {seoMetrics.score >= 90 ? "Excellent" : seoMetrics.score >= 70 ? "Good — minor improvements needed" : "Needs optimization"}
                      </p>
                      <p className="text-xs text-surface-500 mt-1">{seoMetrics.wordCount} words</p>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Uniqueness", value: seoMetrics.uniqueness, unit: "%", good: (v: number) => v >= 85, warn: (v: number) => v >= 70 },
                      { label: "Wateriness", value: seoMetrics.wateriness, unit: "%", good: (v: number) => v <= 15, warn: (v: number) => v <= 25 },
                      { label: "Spaminess", value: seoMetrics.spaminess, unit: "%", good: (v: number) => v <= 5, warn: (v: number) => v <= 10 },
                      { label: "Keyword Density", value: seoMetrics.keywordDensity, unit: "%", good: (v: number) => v >= 1 && v <= 3, warn: (v: number) => v <= 4 },
                    ].map(metric => {
                      const isGood = metric.good(metric.value);
                      const isWarn = !isGood && metric.warn(metric.value);
                      return (
                        <div key={metric.label} className={`p-4 rounded-xl border text-center ${
                          isGood ? "bg-emerald-500/8 border-emerald-500/20"
                          : isWarn ? "bg-amber-500/8 border-amber-500/20"
                          : "bg-red-500/8 border-red-500/20"
                        }`}>
                          <p className={`text-2xl font-bold ${isGood ? "text-emerald-400" : isWarn ? "text-amber-400" : "text-red-400"}`}>
                            {metric.value}{metric.unit}
                          </p>
                          <p className="text-xs text-surface-400 mt-1">{metric.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Recommendations
                    </h3>
                    <div className="space-y-2">
                      {[
                        seoMetrics.wateriness > 15 && "Reduce wateriness: remove filler words and vague statements",
                        seoMetrics.uniqueness < 90 && "Improve uniqueness: rewrite some passages to be more original",
                        seoMetrics.keywordDensity < 1 && "Add more keyword mentions naturally throughout the text",
                        "Add more internal links and relevant examples",
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
                      <span className="text-xs text-surface-400">Optimization Model</span>
                      <AIModelSelector 
                        onModelSelect={setSelectedModelId} 
                        selectedModelId={selectedModelId}
                        estimatedPromptTokens={Math.ceil(content.length / 4)}
                        expectedOutputTokens={Math.ceil(content.length / 4)}
                      />
                    </div>
                    <button onClick={handleOptimizeWithAI} className="btn-primary w-full justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> Apply All Recommendations
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-surface-500" />
                  </div>
                  <div>
                    <p className="text-surface-300 font-medium mb-1">No analysis yet</p>
                    <p className="text-sm text-surface-500">Generate content first, then click "Analyze SEO"</p>
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
                <span className="text-xs text-surface-400">HTML Preview</span>
              </div>
              <div className="p-6 prose prose-invert prose-sm max-w-none">
                {content ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-surface-200 leading-relaxed">{content}</pre>
                ) : (
                  <p className="text-surface-500 text-center py-12">Generate content to see preview</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
