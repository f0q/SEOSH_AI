import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { LEGAL } from "@/lib/legal-info";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import {
  Sparkles, Bot, FileText, BarChart3, Layers, Globe, ShieldCheck, ArrowRight, Check, Star,
} from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("landing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// Render on each request — packages live in the DB and may not be reachable
// at build time (CI without DB). The query is cheap; ISR could be added later.
export const dynamic = "force-dynamic";

function formatRub(kopecks: number, locale: string): string {
  return (kopecks / 100).toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}

const FEATURE_KEYS = [
  { key: "semanticCore", icon: Layers },
  { key: "contentPlan", icon: FileText },
  { key: "aiGeneration", icon: Sparkles },
  { key: "seoAnalysis", icon: BarChart3 },
  { key: "wordpress", icon: Globe },
  { key: "autopilot", icon: Bot },
] as const;

const WORKFLOW_STEPS = ["1", "2", "3", "4", "5"] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  let packages: Awaited<ReturnType<typeof prisma.tokenPackage.findMany>> = [];
  try {
    packages = await prisma.tokenPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    packages = [];
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Header */}
      <header className="border-b border-surface-800/50 backdrop-blur-md sticky top-0 z-50 bg-surface-950/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">SEOSH.AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-surface-300">
            <a href="#features" className="hover:text-white transition">{t("nav.features")}</a>
            <a href="#workflow" className="hover:text-white transition">{t("nav.workflow")}</a>
            <a href="#pricing" className="hover:text-white transition">{t("nav.pricing")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <Link href="/login" className="text-sm text-surface-300 hover:text-white px-3 py-1.5">
              {t("nav.login")}
            </Link>
            <Link
              href="/register"
              className="text-sm bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              {t("nav.start")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs mb-6">
              <Star className="w-3.5 h-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              {t("hero.titleLine1")}<br />
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                {t("hero.titleLine2")}
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-surface-400 max-w-2xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-6 py-3 rounded-xl text-base font-semibold transition shadow-lg shadow-brand-500/30"
              >
                {t("hero.ctaPrimary")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 border border-surface-700 hover:border-surface-500 text-surface-200 px-6 py-3 rounded-xl text-base font-medium transition"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
            <p className="mt-4 text-xs text-surface-500">
              {t("hero.bonus")}
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-24 border-t border-surface-800/40">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">{t("features.title")}</h2>
          <p className="text-center text-surface-400 mt-3 max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {FEATURE_KEYS.map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-2xl border border-surface-800/60 bg-surface-900/40 p-6 hover:border-brand-500/40 transition">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-lg text-surface-100">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-surface-400 leading-relaxed">{t(`features.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-16 md:py-24 border-t border-surface-800/40 bg-surface-900/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">{t("workflow.title")}</h2>
          <ol className="mt-10 space-y-4">
            {WORKFLOW_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-4 p-4 rounded-xl bg-surface-900/40 border border-surface-800/50">
                <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-surface-200 pt-1">{t(`workflow.steps.${step}`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24 border-t border-surface-800/40">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">{t("pricing.title")}</h2>
          <p className="text-center text-surface-400 mt-3">
            {t("pricing.subtitle")}
          </p>

          {packages.length === 0 ? (
            <p className="text-center text-surface-500 mt-12">
              {t("pricing.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-2xl p-7 relative ${
                    pkg.highlighted
                      ? "border-2 border-brand-500 bg-gradient-to-b from-brand-500/10 to-transparent shadow-xl shadow-brand-500/10"
                      : "border border-surface-800/60 bg-surface-900/40"
                  }`}
                >
                  {pkg.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {t("pricing.popular")}
                    </div>
                  )}
                  <h3 className="text-xl font-bold">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-surface-400 mt-2 min-h-[40px]">{pkg.description}</p>
                  )}
                  <div className="my-6">
                    <p className="text-4xl font-extrabold">
                      {formatRub(pkg.priceRub, locale)}
                      <span className="text-lg font-medium text-surface-400 ml-1">₽</span>
                    </p>
                    <p className="text-sm text-brand-400 font-medium mt-1">
                      {t("pricing.tokensLabel", { count: pkg.tokens.toLocaleString(locale === "ru" ? "ru-RU" : "en-US") })}
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-surface-300 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>{t("pricing.perks.operations", { n: Math.floor(pkg.tokens / 100) })}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>{t("pricing.perks.unlimited")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>{t("pricing.perks.wordpress")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>{t("pricing.perks.payment")}</span>
                    </li>
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center w-full py-3 rounded-xl font-semibold transition ${
                      pkg.highlighted
                        ? "bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20"
                        : "bg-surface-800 hover:bg-surface-700 text-surface-100"
                    }`}
                  >
                    {t("pricing.ctaWithPlan", { plan: pkg.name })}
                  </Link>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-surface-500 mt-10">
            {t("pricing.footnote")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-surface-800/40">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ShieldCheck className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold">{t("cta.title")}</h2>
          <p className="mt-4 text-surface-400 text-lg">
            {t("cta.body")}
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl text-base font-semibold transition shadow-lg shadow-brand-500/30"
          >
            {t("cta.button")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/40 py-10">
        <div className="max-w-6xl mx-auto px-6 space-y-6 text-sm text-surface-400">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-surface-300">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="font-semibold">SEOSH.AI</span>
              <span className="text-surface-600">· © {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-5 text-surface-400">
              <Link href="/login" className="hover:text-white transition">{t("footer.signIn")}</Link>
              <Link href="/register" className="hover:text-white transition">{t("footer.register")}</Link>
              <a href="#pricing" className="hover:text-white transition">{t("footer.pricing")}</a>
            </div>
          </div>

          <div className="text-xs leading-relaxed">
            {LEGAL.legalForm} {LEGAL.fullName} · ИНН {LEGAL.inn} ·{" "}
            Email: <a href={`mailto:${LEGAL.email}`} className="text-brand-400 hover:text-brand-300">{LEGAL.email}</a> ·{" "}
            Тел: <a href={`tel:${LEGAL.phone.replace(/[^+\d]/g, "")}`} className="text-brand-400 hover:text-brand-300">{LEGAL.phone}</a>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-surface-500">
            <Link href="/legal/offer" className="hover:text-white transition">{t("footer.offer")}</Link>
            <span>|</span>
            <Link href="/legal/privacy" className="hover:text-white transition">{t("footer.privacy")}</Link>
            <span>|</span>
            <Link href="/legal/payment" className="hover:text-white transition">{t("footer.payment")}</Link>
            <span>|</span>
            <Link href="/legal/refund" className="hover:text-white transition">{t("footer.refund")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
