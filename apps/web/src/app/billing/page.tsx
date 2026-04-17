import DashboardLayout from "@/components/layout/DashboardLayout";
import { Coins, CreditCard, Zap, ArrowUpRight } from "lucide-react";

export const metadata = { title: "Billing" };

const tokenUsage = [
  { action: "AI Categorization", cost: 10, icon: "🧠" },
  { action: "AI Classification", cost: 20, icon: "🏷️" },
  { action: "Content Generation", cost: 50, icon: "📝" },
  { action: "SEO Analysis", cost: 15, icon: "🔍" },
  { action: "Image Generation", cost: 30, icon: "🖼️" },
];

export default function BillingPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">Billing & Tokens</h1>
          <p className="text-surface-400 mt-1">Manage your token balance and subscription</p>
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
                  <p className="text-3xl font-bold text-surface-50">200 <span className="text-sm font-normal text-surface-400">tokens</span></p>
                </div>
              </div>
              <button className="btn-primary">
                <CreditCard className="w-4 h-4" /> Buy Tokens
              </button>
            </div>
            <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full" style={{ width: "100%" }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-surface-500">Free Plan — 200 tokens</span>
              <span className="badge badge-brand text-xs">Free</span>
            </div>
          </div>
        </div>

        {/* Token Pricing */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Token Usage Guide
          </h2>
          <div className="space-y-2">
            {tokenUsage.map((item) => (
              <div key={item.action} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/20 hover:bg-surface-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-surface-200">{item.action}</span>
                </div>
                <span className="text-sm font-medium text-brand-400">{item.cost} tokens</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
