"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProject } from "@/lib/project-context";
import { trpc } from "@/trpc/client";
import {
  Bot, Calendar, CheckCircle2, XCircle, Edit3,
  ToggleLeft, ToggleRight, Sparkles, ChevronRight, Clock, LayoutList, Loader2,
  Globe, Bell,
} from "lucide-react";

// Schedule options — visual values only; labels resolved via i18n
const SCHEDULE_OPTIONS = [
  { value: "1d", labelKey: "oneDay" },
  { value: "3w", labelKey: "threeWeek" },
  { value: "1w", labelKey: "oneWeek" },
];

// Status visuals only — label is resolved by status key via i18n
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
  DRAFT:       { color: "text-surface-300", bg: "bg-surface-700/30 border-surface-600/30", icon: Clock },
  IN_PROGRESS: { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     icon: Clock },
  GENERATED:   { color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20",   icon: Sparkles },
  OPTIMIZED:   { color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20",       icon: CheckCircle2 },
  REVIEW:      { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     icon: Clock },
  SCHEDULED:   { color: "text-brand-400",   bg: "bg-brand-500/10 border-brand-500/20",     icon: CheckCircle2 },
  PUBLISHING:  { color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       icon: Loader2 },
  PUBLISHED:   { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Globe },
  FAILED:      { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         icon: XCircle },
};

function TelegramSection({ projectId, autoApprove }: { projectId: string; autoApprove: boolean }) {
  const t = useTranslations("autopilotPage.telegram");
  const statusQ = trpc.autopilot.getTelegramStatus.useQuery({ projectId }, { enabled: !!projectId });
  const utils = trpc.useUtils();
  const connectMut = trpc.autopilot.setTelegramConfig.useMutation({
    onSuccess: () => {
      utils.autopilot.getTelegramStatus.invalidate({ projectId });
      setBotToken("");
      setChatId("");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });
  const disconnectMut = trpc.autopilot.removeTelegramConfig.useMutation({
    onSuccess: () => utils.autopilot.getTelegramStatus.invalidate({ projectId }),
  });

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = statusQ.data;
  const connected = status?.connected;
  const broken = connected && "broken" in status && status.broken;

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-surface-400" />
        <h3 className="text-sm font-semibold text-surface-200">{t("title")}</h3>
      </div>
      <p className="text-xs text-surface-500">{t("body")}</p>

      {autoApprove && !connected && (
        <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
          {t("autoApproveConflict")}
        </p>
      )}

      {connected ? (
        <div className="space-y-2 pt-1 border-t border-surface-800/60">
          {status.botUsername && (
            <p className="text-xs text-surface-300">
              {t.rich("connectedAs", { username: status.botUsername, strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          )}
          <p className="text-xs text-surface-500">
            {t.rich("connectedChat", { chatId: status.chatId, code: (chunks) => <code className="text-surface-300">{chunks}</code> })}
          </p>
          {broken && (
            <p className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded px-2 py-1.5">
              {t("broken")}
            </p>
          )}
          <button
            onClick={() => disconnectMut.mutate({ projectId })}
            disabled={disconnectMut.isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {disconnectMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
            {disconnectMut.isPending ? t("disconnecting") : t("disconnect")}
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-1 border-t border-surface-800/60">
          <p className="text-[11px] text-surface-500 leading-snug">
            {t.rich("configHint", {
              bot: (c) => <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{c}</a>,
              ud: (c) => <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{c}</a>,
            })}
          </p>
          <div className="space-y-1">
            <label className="text-[10px] text-surface-500 uppercase">{t("botTokenLabel")}</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder={t("botTokenPlaceholder")}
              className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-surface-500 uppercase">{t("chatIdLabel")}</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={t("chatIdPlaceholder")}
              className="w-full bg-surface-800/50 border border-surface-700 rounded p-2 text-xs text-surface-200 focus:border-brand-500 outline-none font-mono"
            />
          </div>
          {error && (
            <p className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded px-2 py-1.5">{error}</p>
          )}
          <button
            onClick={() => {
              setError(null);
              connectMut.mutate({ projectId, botToken: botToken.trim(), chatId: chatId.trim() });
            }}
            disabled={!botToken.trim() || !chatId.trim() || connectMut.isPending}
            className="w-full text-xs px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {connectMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            {connectMut.isPending ? t("connecting") : t("connect")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AutopilotPage() {
  const t = useTranslations("autopilotPage");
  const tStatus = useTranslations("autopilotPage.queue.status");
  const tPlannerTitle = useTranslations("contentPlanner")("title");
  const tPlannerCta = useTranslations("contentPlanner.header")("startPlanning");
  const locale = useLocale();
  const router = useRouter();
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? "";

  const configQ = trpc.autopilot.getConfig.useQuery({ projectId }, { enabled: !!projectId });
  const queueQ = trpc.autopilot.getQueue.useQuery({ projectId }, { enabled: !!projectId });
  const statsQ = trpc.autopilot.getStats.useQuery({ projectId }, { enabled: !!projectId });
  const connectorsQ = trpc.publisher.listForProject.useQuery({ projectId }, { enabled: !!projectId });

  const utils = trpc.useUtils();
  const refetch = () => {
    utils.autopilot.getConfig.invalidate({ projectId });
    utils.autopilot.getQueue.invalidate({ projectId });
    utils.autopilot.getStats.invalidate({ projectId });
  };

  const updateMut = trpc.autopilot.updateConfig.useMutation({ onSuccess: refetch });
  const approveMut = trpc.autopilot.approveItem.useMutation({ onSuccess: refetch });
  const rejectMut = trpc.autopilot.rejectItem.useMutation({ onSuccess: refetch });

  const enabled = configQ.data?.enabled ?? false;
  const schedule = configQ.data?.scheduleFreq ?? "3w";
  const autoApprove = configQ.data?.autoApprove ?? false;

  const hasActiveConnector = (connectorsQ.data ?? []).some((c) => c.isActive && c.configured);
  const [enableError, setEnableError] = useState<string | null>(null);

  const toggleEnabled = async () => {
    setEnableError(null);
    try {
      await updateMut.mutateAsync({ projectId, enabled: !enabled });
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : t("toggleError"));
    }
  };

  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-surface-400">{t("selectProject")}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all ${
              enabled ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-violet-500 to-purple-600"
            }`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-50">{t("title")}</h1>
              <p className={`text-sm ${enabled ? "text-emerald-400" : "text-surface-500"}`}>
                {enabled ? t("running") : t("paused")}
              </p>
            </div>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={updateMut.isPending || (!enabled && !hasActiveConnector)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-medium text-sm transition-all disabled:opacity-50 ${
              enabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                : "bg-brand-500/10 border-brand-500/30 text-brand-400 hover:bg-brand-500/15"
            }`}
          >
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {enabled ? t("stop") : t("enable")}
          </button>
        </div>

        {!hasActiveConnector && (
          <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5 text-sm text-amber-200">
            {t.rich("needConnector", {
              link: (chunks) => <Link className="underline" href="/project-settings">{chunks}</Link>,
            })}
          </div>
        )}
        {enableError && (
          <div className="glass-card p-4 border-red-500/30 bg-red-500/5 text-sm text-red-300">
            {enableError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — config */}
          <div className="space-y-4">
            <button
              onClick={() => router.push("/autopilot/content-planner")}
              className="glass-card p-5 w-full text-left group hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0fb881] flex items-center justify-center shadow-lg shadow-[#0fb881]/20">
                    <LayoutList className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-100 group-hover:text-white">{tPlannerTitle}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{tPlannerCta}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-600 group-hover:text-emerald-400" />
              </div>
            </button>

            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-surface-400" />
                <h2 className="text-sm font-semibold text-surface-200">{t("schedule.title")}</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SCHEDULE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateMut.mutate({ projectId, scheduleFreq: opt.value })}
                    disabled={updateMut.isPending}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-left ${
                      schedule === opt.value
                        ? "bg-brand-500/15 border-brand-500/30 text-brand-400"
                        : "bg-surface-800/20 border-surface-700/20 text-surface-400 hover:border-surface-600/30"
                    }`}
                  >
                    {t(`schedule.${opt.labelKey}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-200">{t("autoApprove.title")}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{t("autoApprove.subtitle")}</p>
                </div>
                <button
                  onClick={() => updateMut.mutate({ projectId, autoApprove: !autoApprove })}
                  className="text-surface-400 hover:text-brand-400 transition-colors"
                  disabled={updateMut.isPending}
                >
                  {autoApprove ? <ToggleRight className="w-8 h-8 text-brand-400" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </div>

            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-surface-400" />
                <h2 className="text-sm font-semibold text-surface-200">{t("connectors.title")}</h2>
              </div>
              {(connectorsQ.data ?? []).length === 0 ? (
                <p className="text-xs text-surface-500">{t("connectors.empty")}</p>
              ) : (
                <ul className="space-y-1">
                  {connectorsQ.data!.map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-surface-300">{c.name}</span>
                      <span className={c.configured ? "text-emerald-400" : "text-amber-400"}>
                        {c.configured ? `✓ ${c.type}` : t("connectors.noCreds")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/project-settings" className="text-xs text-brand-400 hover:underline">{t("connectors.manage")}</Link>
            </div>
          </div>

          {/* RIGHT — queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { labelKey: "inQueue", value: statsQ.data?.inQueue ?? "—", color: "text-brand-400" },
                { labelKey: "pending", value: statsQ.data?.pending ?? "—", color: "text-amber-400" },
                { labelKey: "published", value: statsQ.data?.published ?? "—", color: "text-emerald-400" },
                { labelKey: "thisMonth", value: statsQ.data?.publishedThisMonth ?? "—", color: "text-cyan-400" },
              ].map((s) => (
                <div key={s.labelKey} className="glass-card p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-surface-500 mt-1">{t(`stats.${s.labelKey}`)}</p>
                </div>
              ))}
            </div>

            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-700/30">
                <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  {t("queue.title")}
                </h3>
              </div>

              <div className="divide-y divide-surface-700/20 max-h-[600px] overflow-y-auto">
                {queueQ.isLoading && (
                  <div className="px-5 py-8 text-center text-surface-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("queue.loading")}
                  </div>
                )}
                {!queueQ.isLoading && (queueQ.data ?? []).length === 0 && (
                  <p className="px-5 py-8 text-center text-surface-500 text-sm">
                    {t.rich("queue.empty", {
                      link: (chunks) => <Link href="/autopilot/content-planner" className="text-brand-400 hover:underline">{chunks}</Link>,
                    })}
                  </p>
                )}
                {queueQ.data?.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DRAFT;
                  const StatusIcon = cfg.icon;
                  const canApprove = item.status === "REVIEW" || item.status === "OPTIMIZED" || item.status === "GENERATED";
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-800/20 transition-colors group">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {tStatus(item.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-100 font-medium truncate">
                          {item.metaTitle || item.title || "Untitled"}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US") : "—"}
                          {item.publishedUrl && (
                            <> · <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{t("queue.openTooltip")}</a></>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.seoScore != null && (
                          <div className={`text-sm font-semibold ${item.seoScore >= 85 ? "text-emerald-400" : item.seoScore >= 70 ? "text-amber-400" : "text-red-400"}`}>
                            {item.seoScore}
                          </div>
                        )}
                        {canApprove && (
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={() => approveMut.mutate({ itemId: item.id })}
                              disabled={approveMut.isPending}
                              className="btn-ghost p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              title={t("queue.approve")}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/autopilot/content-planner?item=${item.id}`)}
                              className="btn-ghost p-1.5 text-brand-400 hover:bg-brand-500/10 rounded-lg"
                              title={t("queue.edit")}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rejectMut.mutate({ itemId: item.id })}
                              disabled={rejectMut.isPending}
                              className="btn-ghost p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                              title={t("queue.reject")}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <TelegramSection projectId={projectId} autoApprove={autoApprove} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
