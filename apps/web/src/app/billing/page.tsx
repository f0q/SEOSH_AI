"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Coins, History, ArrowDownRight, ArrowUpRight, Loader2, Check, FileText, Star } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/trpc/client";

const REASON_ICONS: Record<string, string> = {
  AI_CONTENT_GENERATE: "📝",
  AI_CONTENT_OPTIMIZE: "✨",
  AI_CATEGORIES: "🧠",
  AI_CLASSIFY: "🏷️",
  SEO_ANALYSIS: "🔍",
  AI_IMAGE_GENERATE: "🖼️",
  PURCHASE: "💰",
  SIGNUP_BONUS: "🎁",
  REFUND: "↩️",
  ADMIN_GRANT: "🛡️",
  ADMIN_REVOKE: "⛔",
};

function formatRub(kopecks: number, locale: string): string {
  return (kopecks / 100).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { minimumFractionDigits: 0 });
}

export default function BillingPage() {
  const t = useTranslations("billing");
  const locale = useLocale();
  const intlLocale = locale === "ru" ? "ru-RU" : "en-US";

  const balanceQuery = trpc.billing.getBalance.useQuery();
  const historyQuery = trpc.billing.getHistory.useQuery({ limit: 50 });
  const packagesQuery = trpc.billing.getPackages.useQuery();
  const providersQuery = trpc.billing.getProviders.useQuery();
  const createPayment = trpc.billing.createPayment.useMutation();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance = balanceQuery.data?.tokens ?? 0;
  const providers = providersQuery.data ?? [];
  const packages = packagesQuery.data ?? [];

  const handleBuy = async (packageSlug: string, providerSlug: string) => {
    setError(null);
    setSelectedPackage(`${packageSlug}:${providerSlug}`);
    try {
      const res = await createPayment.mutateAsync({ packageSlug, providerSlug });
      window.location.href = res.confirmationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("startPaymentFailed"));
      setSelectedPackage(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">{t("title")}</h1>
          <p className="text-surface-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* Balance card */}
        <div className="glass-card p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-surface-400">{t("balanceLabel")}</p>
              {balanceQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-surface-400 mt-1" />
              ) : (
                <p className="text-3xl font-bold text-surface-50">
                  {balance.toLocaleString(intlLocale)}{" "}
                  <span className="text-sm font-normal text-surface-400">{t("tokensSuffix")}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Packages */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-surface-100 mb-4">{t("topUp")}</h2>
          {packagesQuery.isLoading && (
            <div className="flex items-center gap-2 text-surface-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("loadingPackages")}
            </div>
          )}
          {packages.length === 0 && !packagesQuery.isLoading && (
            <p className="text-sm text-surface-500">{t("noPackages")}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`glass-card p-6 relative ${
                  pkg.highlighted ? "border-brand-500/40 ring-1 ring-brand-500/20" : ""
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-2 right-4 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                    <Star className="w-3 h-3" /> {t("popular")}
                  </div>
                )}
                <h3 className="text-lg font-bold text-surface-50">{pkg.name}</h3>
                {pkg.description && (
                  <p className="text-xs text-surface-400 mt-1">{pkg.description}</p>
                )}
                <div className="my-4">
                  <p className="text-2xl font-bold text-surface-100">
                    {formatRub(pkg.priceRub, locale)} ₽
                  </p>
                  <p className="text-sm text-brand-400 font-medium mt-1">
                    {pkg.tokens.toLocaleString(intlLocale)} {t("tokensSuffix")}
                  </p>
                </div>
                <div className="space-y-2 mt-4">
                  {providers.length === 0 && (
                    <p className="text-xs text-amber-400">
                      {t("noProviders")}
                    </p>
                  )}
                  {providers.map((prov) => {
                    const key = `${pkg.slug}:${prov.slug}`;
                    const isBusy = createPayment.isPending && selectedPackage === key;
                    return (
                      <button
                        key={prov.slug}
                        onClick={() => handleBuy(pkg.slug, prov.slug)}
                        disabled={createPayment.isPending}
                        className={`w-full text-sm py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                          prov.slug === "yookassa"
                            ? "bg-brand-500 hover:bg-brand-600 text-white"
                            : "bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700/50"
                        } disabled:opacity-50`}
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : prov.slug === "manual_invoice" ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {prov.slug === "yookassa" ? t("payWith", { provider: prov.displayName }) : prov.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p className="text-sm text-red-400 mt-3">{error}</p>
          )}
        </div>

        {/* Transaction history */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-surface-400" />
            {t("historyTitle")}
          </h2>
          <div className="space-y-1 max-h-[420px] overflow-y-auto">
            {historyQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
              </div>
            )}
            {historyQuery.data?.length === 0 && (
              <p className="text-xs text-surface-500 text-center py-8">
                {t("historyEmpty")}
              </p>
            )}
            {historyQuery.data?.map((tx) => {
              const icon = REASON_ICONS[tx.reason] || "📋";
              const reasonLabel = REASON_ICONS[tx.reason] ? t(`reasons.${tx.reason}`) : tx.reason;
              const isPositive = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-base">{icon}</span>
                    <div>
                      <p className="text-sm text-surface-200">{reasonLabel}</p>
                      <p className="text-[10px] text-surface-500">
                        {new Date(tx.createdAt).toLocaleString(intlLocale)}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-mono font-medium ${
                    isPositive ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isPositive ? "+" : ""}{tx.amount.toLocaleString(intlLocale)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
