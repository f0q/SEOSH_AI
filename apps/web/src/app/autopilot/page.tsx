"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Bot, Send, Globe,
  Calendar, CheckCircle2, XCircle, Edit3,
  ToggleLeft, ToggleRight, Sparkles, Bell,
  Play, Pause, ChevronRight, Clock,
} from "lucide-react";


const SCHEDULE_OPTIONS = [
  { label: "1 article / day",   value: "1d" },
  { label: "3 articles / week", value: "3w" },
  { label: "1 article / week",  value: "1w" },
  { label: "Custom",            value: "custom" },
];

const MOCK_QUEUE = [
  { id: "1", title: "Как выбрать кроссовки для бега",       status: "pending",   score: 87, scheduled: "Today, 14:00" },
  { id: "2", title: "Топ-10 беговых кроссовок 2024",         status: "approved",  score: 91, scheduled: "Tomorrow, 10:00" },
  { id: "3", title: "Nike vs Adidas: что выбрать бегуну",    status: "rejected",  score: 74, scheduled: "Apr 20, 09:00" },
  { id: "4", title: "Уход за кроссовками после пробежки",    status: "published", score: 89, scheduled: "Apr 18, 11:00" },
];

const STATUS_CONFIG = {
  pending:   { label: "Awaiting Approval", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: Clock },
  approved:  { label: "Approved",          color: "text-brand-400",  bg: "bg-brand-500/10 border-brand-500/20",  icon: CheckCircle2 },
  rejected:  { label: "Rejected",          color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",      icon: XCircle },
  published: { label: "Published",         color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20", icon: Globe },
};

export default function AutopilotPage() {
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState("3w");
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [wpConnected, setWpConnected] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [wpUrl, setWpUrl] = useState("");
  const [wpToken, setWpToken] = useState("");
  const [tgToken, setTgToken] = useState("");
  const [tgChat, setTgChat] = useState("");

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all ${
              enabled
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"
                : "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20"
            }`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-50">Autopilot</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  enabled ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-surface-600"
                }`} />
                <p className={`text-sm ${
                  enabled ? "text-emerald-400" : "text-surface-500"
                }`}>
                  {enabled ? "Running — publishing automatically" : "Paused — connect integrations and enable"}
                </p>
              </div>
            </div>
          </div>

          {/* Master toggle */}
          <button
            onClick={() => setEnabled(e => !e)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border font-medium text-sm transition-all ${
              enabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/8 hover:border-red-500/20 hover:text-red-400"
                : "bg-brand-500/10 border-brand-500/30 text-brand-400 hover:bg-brand-500/15"
            }`}
          >
            {enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {enabled ? "Running" : "Enable"}
          </button>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Config ───────────────────────── */}
          <div className="space-y-4">

            {/* Schedule */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-surface-400" />
                <h2 className="text-sm font-semibold text-surface-200">Publishing Schedule</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSchedule(opt.value)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-center ${
                      schedule === opt.value
                        ? "bg-brand-500/15 border-brand-500/30 text-brand-400"
                        : "bg-surface-800/20 border-surface-700/20 text-surface-400 hover:border-surface-600/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-approve toggle */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-200">Auto-Approve</p>
                  <p className="text-xs text-surface-500 mt-0.5">Skip Telegram approval step</p>
                </div>
                <button onClick={() => setAutoApprove(a => !a)} className="text-surface-400 hover:text-brand-400 transition-colors">
                  {autoApprove ? <ToggleRight className="w-8 h-8 text-brand-400" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </div>

            {/* WordPress connector */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-surface-400" />
                  <h2 className="text-sm font-semibold text-surface-200">WordPress</h2>
                </div>
                <span className={`badge text-xs ${wpConnected ? "badge-success" : "bg-surface-700/30 text-surface-500"}`}>
                  {wpConnected ? "✓ Connected" : "Not connected"}
                </span>
              </div>
              <input
                type="url"
                value={wpUrl}
                onChange={e => setWpUrl(e.target.value)}
                placeholder="https://your-site.com"
                className="input-field text-sm"
              />
              <input
                type="password"
                value={wpToken}
                onChange={e => setWpToken(e.target.value)}
                placeholder="Application Password"
                className="input-field text-sm"
              />
              <button
                onClick={() => setWpConnected(true)}
                disabled={!wpUrl || !wpToken}
                className="btn-secondary w-full justify-center text-sm"
              >
                {wpConnected ? "✓ Reconnect" : "Connect"}
              </button>
            </div>

            {/* Telegram connector */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-surface-400" />
                  <h2 className="text-sm font-semibold text-surface-200">Telegram Bot</h2>
                </div>
                <span className={`badge text-xs ${telegramConnected ? "badge-success" : "bg-surface-700/30 text-surface-500"}`}>
                  {telegramConnected ? "✓ Connected" : "Not connected"}
                </span>
              </div>
              <input
                type="text"
                value={tgToken}
                onChange={e => setTgToken(e.target.value)}
                placeholder="Bot Token (from @BotFather)"
                className="input-field text-sm"
              />
              <input
                type="text"
                value={tgChat}
                onChange={e => setTgChat(e.target.value)}
                placeholder="Chat ID (your Telegram ID)"
                className="input-field text-sm"
              />
              <button
                onClick={() => setTelegramConnected(true)}
                disabled={!tgToken || !tgChat}
                className="btn-secondary w-full justify-center text-sm"
              >
                {telegramConnected ? "✓ Reconnect" : "Connect"}
              </button>
              {!telegramConnected && (
                <p className="text-xs text-surface-500">
                  Create a bot via <span className="text-brand-400">@BotFather</span>, get your Chat ID via <span className="text-brand-400">@userinfobot</span>
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: Queue ────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "In Queue",   value: "12", color: "text-brand-400" },
                { label: "Pending",    value: "1",  color: "text-amber-400" },
                { label: "Published",  value: "8",  color: "text-emerald-400" },
                { label: "This Month", value: "23", color: "text-cyan-400" },
              ].map(s => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-surface-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Queue list */}
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-700/30">
                <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  Content Queue
                </h3>
                <button className="btn-primary text-xs gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Generate Next
                </button>
              </div>

              <div className="divide-y divide-surface-700/20">
                {MOCK_QUEUE.map(item => {
                  const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-800/20 transition-colors group">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-100 font-medium truncate">{item.title}</p>
                        <p className="text-xs text-surface-500 mt-0.5">{item.scheduled}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`text-sm font-semibold ${
                          item.score >= 85 ? "text-emerald-400" : item.score >= 70 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {item.score}
                        </div>
                        {item.status === "pending" && (
                          <div className="hidden group-hover:flex items-center gap-1 animate-fade-in">
                            <button className="btn-ghost p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg" title="Approve">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button className="btn-ghost p-1.5 text-brand-400 hover:bg-brand-500/10 rounded-lg" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-surface-600 group-hover:text-surface-400 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Telegram preview */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-surface-400" />
                <h3 className="text-sm font-semibold text-surface-200">Telegram Approval Preview</h3>
              </div>
              <div className="bg-[#17212b] rounded-xl p-4 font-mono text-sm space-y-3">
                <div className="bg-[#232e3c] rounded-lg p-3 text-[#c3c3c3] text-xs space-y-2 max-w-sm">
                  <p className="text-white font-medium">📝 New content ready!</p>
                  <p><span className="text-[#6b9eff]">Topic:</span> Как выбрать кроссовки для бега</p>
                  <p><span className="text-[#6b9eff]">SEO Score:</span> 87/100</p>
                  <p><span className="text-[#6b9eff]">Uniqueness:</span> 94%</p>
                  <p><span className="text-[#6b9eff]">Words:</span> 1,420</p>
                  <div className="grid grid-cols-2 gap-1.5 pt-2">
                    {["👁 Preview", "✏️ Edit", "✅ Publish", "❌ Reject"].map(btn => (
                      <div key={btn} className="text-center bg-[#2b5278] rounded px-2 py-1 text-[#6b9eff] text-xs cursor-pointer hover:bg-[#3a6a9e] transition-colors">
                        {btn}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
