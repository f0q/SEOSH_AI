"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Coins, Zap, History, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { trpc } from "@/trpc/client";

const REASON_LABELS: Record<string, { label: string; icon: string }> = {
  AI_CONTENT_GENERATE: { label: "Content Generation", icon: "📝" },
  AI_CONTENT_OPTIMIZE: { label: "Content Optimization", icon: "✨" },
  AI_CATEGORIES: { label: "AI Categorization", icon: "🧠" },
  AI_CLASSIFY: { label: "AI Classification", icon: "🏷️" },
  SEO_ANALYSIS: { label: "SEO Analysis", icon: "🔍" },
  AI_IMAGE_GENERATE: { label: "Image Generation", icon: "🖼️" },
  PURCHASE: { label: "Token Purchase", icon: "💰" },
  SIGNUP_BONUS: { label: "Signup Bonus", icon: "🎁" },
  REFUND: { label: "Refund / Adjustment", icon: "↩️" },
};

export default function BillingPage() {
  const balanceQuery = trpc.settings.getTokenBalance.useQuery();
  const historyQuery = trpc.settings.getTokenHistory.useQuery({ limit: 50 });
  const pricingQuery = trpc.settings.getPricing.useQuery();

  const balance = balanceQuery.data?.tokens ?? 0;
  const isLoading = balanceQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">Billing & Tokens</h1>
          <p className="text-surface-400 mt-1">Manage your token balance and usage</p>
        </div>

        {/* Balance Card */}
        <div className="glass-card p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-surface-400">Current Balance</p>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-surface-400 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-surface-50">
                      {balance} <span className="text-sm font-normal text-surface-400">tokens</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (balance / 200) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-surface-500">
                Signup bonus: {pricingQuery.data?.signupBonus || "200 tokens"}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                balance > 100 ? "bg-emerald-500/10 text-emerald-400" :
                balance > 0 ? "bg-amber-500/10 text-amber-400" :
                "bg-red-500/10 text-red-400"
              }`}>
                {balance > 100 ? "Healthy" : balance > 0 ? "Low Balance" : "Empty"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pricing Table */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Estimated Token Usage
            </h2>
            <p className="text-xs text-surface-500 mb-3">
              Token cost depends on the AI model selected. Faster models cost fewer tokens.
            </p>
            <div className="space-y-1.5">
              {pricingQuery.data?.estimatedCosts?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/20 hover:bg-surface-800/40 transition-colors">
                  <div>
                    <span className="text-sm text-surface-200">{item.operation}</span>
                    <span className="text-xs text-surface-500 ml-2">({item.model})</span>
                  </div>
                  <span className={`text-xs font-mono font-medium ${
                    item.estimatedTokens === "0 (uses your API key)" ? "text-emerald-400" : "text-brand-400"
                  }`}>
                    {item.estimatedTokens} tokens
                  </span>
                </div>
              )) || (
                <p className="text-xs text-surface-500">Loading pricing...</p>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-surface-400" />
              Recent Transactions
            </h2>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {historyQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
                </div>
              )}
              {historyQuery.data?.length === 0 && (
                <p className="text-xs text-surface-500 text-center py-8">
                  No transactions yet. Use AI features to see activity here.
                </p>
              )}
              {historyQuery.data?.map((tx) => {
                const meta = REASON_LABELS[tx.reason] || { label: tx.reason, icon: "📋" };
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{meta.icon}</span>
                      <div>
                        <p className="text-sm text-surface-200">{meta.label}</p>
                        <p className="text-[10px] text-surface-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-mono font-medium ${
                      isPositive ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isPositive ? "+" : ""}{tx.amount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
