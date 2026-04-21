import { useState, useEffect } from 'react';
import StepSitemap from './StepSitemap';
import StepQueries from './StepQueries';
import StepCategories from './StepCategories';
import StepResults from './StepResults';
import type { SitemapPage, QueryGroup, CategoryItem, ResultRow } from '../api/client';
import { getResults } from '../api/client';
import { Globe, FileText, Brain, BarChart3, Check, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Сайт и Sitemap', icon: Globe },
  { id: 2, label: 'Запросы', icon: FileText },
  { id: 3, label: 'Категории ИИ', icon: Brain },
  { id: 4, label: 'Результаты', icon: BarChart3 },
];

interface Props {
  initialSessionId?: string | null;
  onSessionChange?: (id: string) => void;
}

export default function Wizard({ initialSessionId, onSessionChange }: Props) {
  const [currentStep, setCurrentStep] = useState(initialSessionId ? 4 : 1);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [siteUrl, setSiteUrl] = useState('');
  const [sitemapPages, setSitemapPages] = useState<SitemapPage[]>([]);
  const [queryGroups, setQueryGroups] = useState<QueryGroup[]>([]);
  const [totalQueries, setTotalQueries] = useState(0);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loadingSession, setLoadingSession] = useState(!!initialSessionId);

  // Only auto-load results on mount if initialSessionId is provided
  useEffect(() => {
    if (initialSessionId) {
      setLoadingSession(true);
      getResults(initialSessionId)
        .then(({ results: r, summary: s }) => {
          setResults(r);
          setSummary(s);
          if (r.length > 0) {
            setCurrentStep(4);
          } else {
            // Session exists but no results yet — go to step 1
            setCurrentStep(1);
          }
        })
        .catch(() => {
          setCurrentStep(1);
        })
        .finally(() => setLoadingSession(false));
    }
  }, []); // Run ONLY once on mount

  const updateSessionId = (id: string) => {
    setSessionId(id);
    onSessionChange?.(id);
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 4));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Step indicators */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            // Allow clicking: any completed step, or the next adjacent step if sessionId exists
            const isClickable = isDone || (step.id === currentStep + 1 && sessionId);

            const handleStepClick = () => {
              if (isDone) {
                setCurrentStep(step.id);
              } else if (isClickable) {
                setCurrentStep(step.id);
              }
            };

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step circle */}
                <div
                  className={`flex items-center gap-3 ${isDone || isClickable ? 'cursor-pointer' : ''}`}
                  onClick={handleStepClick}
                  role={isDone || isClickable ? 'button' : undefined}
                  tabIndex={isDone || isClickable ? 0 : undefined}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                      ${isDone
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        : isActive
                          ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400 shadow-lg shadow-brand-500/20 animate-pulse-glow'
                          : isClickable
                            ? 'bg-surface-800 border border-surface-600 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                            : 'bg-surface-800 border border-surface-700 text-surface-500'
                      }
                    `}
                  >
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-surface-100' : isDone ? 'text-emerald-400 hover:text-emerald-300' : isClickable ? 'text-surface-400 hover:text-surface-200' : 'text-surface-500'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-surface-600">Шаг {step.id}</p>
                  </div>
                </div>

                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-4 h-px relative">
                    <div className="absolute inset-0 bg-surface-700" />
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-700"
                      style={{ width: isDone ? '100%' : isActive ? '50%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="animate-slide-up">
        {currentStep === 1 && (
          <StepSitemap
            sessionId={sessionId}
            siteUrl={siteUrl}
            sitemapPages={sitemapPages}
            onSessionCreated={(id, url) => {
              updateSessionId(id);
              setSiteUrl(url);
            }}
            onSitemapParsed={(pages) => setSitemapPages(pages)}
            onNext={goNext}
          />
        )}
        {currentStep === 2 && sessionId && (
          <StepQueries
            sessionId={sessionId}
            queryGroups={queryGroups}
            totalQueries={totalQueries}
            onQueriesGrouped={(groups, total) => {
              setQueryGroups(groups);
              setTotalQueries(total);
            }}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && sessionId && (
          <StepCategories
            sessionId={sessionId}
            categories={categories}
            onCategoriesGenerated={setCategories}
            onCategorized={(r, s) => {
              setResults(r);
              setSummary(s);
            }}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 4 && sessionId && !loadingSession && (
          <StepResults
            key={results.length}
            sessionId={sessionId}
            results={results}
            summary={summary}
            onBack={goBack}
            onResultsUpdated={(r, s) => {
              setResults(r);
              setSummary(s);
            }}
          />
        )}
        {loadingSession && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center animate-pulse-glow">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
            <p className="text-surface-300 font-medium">Загрузка сессии...</p>
          </div>
        )}
      </div>
    </div>
  );
}
