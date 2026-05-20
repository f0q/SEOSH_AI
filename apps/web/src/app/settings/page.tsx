"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Settings, Key, Eye, EyeOff, Loader2, Check, Trash2, AlertCircle, Shield, Cpu, Coins, ChevronDown, ChevronRight, Users, UserPlus, Crown, Mail, X, Lock } from "lucide-react";
import { trpc } from "@/trpc/client";
import { useProject } from "@/lib/project-context";

// Provider definitions for UI — labels resolved via i18n by id
const API_KEY_PROVIDERS = [
  {
    id: "textru" as const,
    name: "Text.ru",
    docsUrl: "https://text.ru/api-check",
  },
  // Future providers can be added here:
  // { id: "copyscape", name: "Copyscape", ... },
  // { id: "pixeltools", name: "PixelTools", ... },
];

function ApiKeyRow({ provider, status, onSave, onRemove }: {
  provider: typeof API_KEY_PROVIDERS[number];
  status: { configured: boolean; masked: string | null } | undefined;
  onSave: (provider: string, key: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}) {
  const t = useTranslations("settings.apiKeys");
  const tProvider = useTranslations(`settings.apiKeys.providers.${provider.id}`);
  const [isEditing, setIsEditing] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const configured = status?.configured ?? false;

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      await onSave(provider.id, keyValue.trim());
      setKeyValue("");
      setIsEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove(provider.id);
      setKeyValue("");
      setIsEditing(false);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            configured ? 'bg-emerald-500/10' : 'bg-surface-700/50'
          }`}>
            <Key className={`w-5 h-5 ${configured ? 'text-emerald-400' : 'text-surface-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-surface-100">{provider.name}</h3>
            <p className="text-xs text-surface-400">{tProvider("description")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {justSaved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> {t("saved")}
            </span>
          )}
          {configured && !isEditing && (
            <span className="text-xs text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-mono">
              {status?.masked}
            </span>
          )}
          {configured && !isEditing && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <Check className="w-3 h-3" /> {t("active")}
            </span>
          )}
          {!configured && !isEditing && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {t("notConfigured")}
            </span>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
          >
            {configured ? t("updateKey") : t("addKey")}
          </button>
          {configured && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              {t("remove")}
            </button>
          )}
          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-surface-500 hover:text-surface-300 transition-colors ml-auto"
            >
              {t("getApiKey")}
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={tProvider("placeholder")}
              className="w-full px-3 py-2 pr-9 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 font-mono"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !keyValue.trim()}
            className="text-xs px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5 font-medium"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {t("save")}
          </button>
          <button
            onClick={() => { setIsEditing(false); setKeyValue(""); }}
            className="text-xs px-3 py-2 rounded-lg text-surface-400 hover:text-surface-200 transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Provider Colors & Labels ────────────────────────────────────────────────
const PROVIDER_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  Google:    { color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  OpenAI:    { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  Anthropic: { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  DeepSeek:  { color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  xAI:       { color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
};

function costColor(cost: number): string {
  if (cost <= 2)  return "text-emerald-400";
  if (cost <= 10) return "text-amber-400";
  if (cost <= 40) return "text-orange-400";
  return "text-red-400";
}

function estimateArticleCost(promptPerM: number, completionPerM: number): string {
  // Typical article: ~2k prompt tokens, ~3k completion tokens
  const cost = (2000 / 1_000_000 * promptPerM + 3000 / 1_000_000 * completionPerM) * 2000; // convert to SEOSH tokens
  if (cost < 1) return "<1";
  return Math.round(cost).toString();
}

const ENABLED_MODELS_KEY = "seosh_enabled_models";

function getEnabledModels(): Set<string> | null {
  try {
    const saved = localStorage.getItem(ENABLED_MODELS_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return null; // null means "all enabled" (default)
}

function saveEnabledModels(ids: Set<string>) {
  try {
    localStorage.setItem(ENABLED_MODELS_KEY, JSON.stringify([...ids]));
  } catch {}
}

function ModelPricingTable() {
  const t = useTranslations("settings.models");
  const { data: models, isLoading } = trpc.ai.listModels.useQuery();
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set(["Google", "OpenAI", "Anthropic", "DeepSeek", "xAI"]));
  const [enabledModels, setEnabledModels] = useState<Set<string> | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load enabled models from localStorage on mount
  useEffect(() => {
    const saved = getEnabledModels();
    if (saved) {
      setEnabledModels(saved);
    }
    setInitialized(true);
  }, []);

  // Initialize: if nothing saved yet, enable all models
  useEffect(() => {
    if (initialized && models && !enabledModels) {
      const allIds = new Set(models.map(m => m.id));
      setEnabledModels(allIds);
      saveEnabledModels(allIds);
    }
  }, [initialized, models, enabledModels]);

  const toggleModel = (modelId: string) => {
    setEnabledModels(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        // Don't allow disabling all models
        if (next.size <= 1) return prev;
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      saveEnabledModels(next);
      return next;
    });
  };

  const toggleProvider = (provider: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  const enableAllInProvider = (providerModels: typeof models) => {
    if (!providerModels) return;
    setEnabledModels(prev => {
      const next = new Set(prev);
      providerModels.forEach(m => next.add(m.id));
      saveEnabledModels(next);
      return next;
    });
  };

  const disableAllInProvider = (providerModels: typeof models) => {
    if (!providerModels || !enabledModels) return;
    // Calculate how many will remain after disabling
    const wouldRemove = providerModels.filter(m => enabledModels.has(m.id)).length;
    const remaining = enabledModels.size - wouldRemove;
    if (remaining < 1) return; // Don't disable all

    setEnabledModels(prev => {
      const next = new Set(prev);
      providerModels.forEach(m => next.delete(m.id));
      saveEnabledModels(next);
      return next;
    });
  };

  if (isLoading || !initialized) return <div className="animate-pulse h-32 bg-surface-800/30 rounded-xl" />;
  if (!models || models.length === 0) return null;

  // Group by provider
  const grouped: Record<string, typeof models> = {};
  for (const m of models) {
    if (!grouped[m.provider]) grouped[m.provider] = [];
    grouped[m.provider].push(m);
  }

  // Sort within each provider by costPer1k
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.costPer1k - b.costPer1k);
  }

  const providerOrder = ["Google", "OpenAI", "Anthropic", "DeepSeek", "xAI"];
  const enabledCount = enabledModels?.size || 0;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-surface-400">
          {t.rich("enabledOf", {
            enabled: enabledCount,
            total: models.length,
            strong: (chunks) => <span className="text-surface-200 font-medium">{chunks}</span>,
          })}
        </span>
      </div>

      {providerOrder.filter(p => grouped[p]).map(providerName => {
        const providerModels = grouped[providerName];
        const style = PROVIDER_STYLES[providerName] || { color: "text-surface-300", bg: "bg-surface-700/50", border: "border-surface-700/50" };
        const isExpanded = expandedProviders.has(providerName);
        const enabledInProvider = providerModels.filter(m => enabledModels?.has(m.id)).length;

        return (
          <div key={providerName} className={`glass-card overflow-hidden ${style.border}`}>
            {/* Provider header */}
            <button
              onClick={() => toggleProvider(providerName)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
                  <Cpu className={`w-4 h-4 ${style.color}`} />
                </div>
                <span className={`font-semibold ${style.color}`}>{providerName}</span>
                <span className="text-[10px] text-surface-500 bg-surface-800/50 px-2 py-0.5 rounded">
                  {t("activeOf", { enabled: enabledInProvider, total: providerModels.length })}
                </span>
              </div>
              {isExpanded 
                ? <ChevronDown className="w-4 h-4 text-surface-500" />
                : <ChevronRight className="w-4 h-4 text-surface-500" />
              }
            </button>

            {/* Models table */}
            {isExpanded && (
              <div className="px-2 pb-2">
                {/* Bulk actions */}
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button
                    onClick={() => enableAllInProvider(providerModels)}
                    className="text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-colors"
                  >
                    {t("enableAll")}
                  </button>
                  <span className="text-surface-700">|</span>
                  <button
                    onClick={() => disableAllInProvider(providerModels)}
                    className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    {t("disableAll")}
                  </button>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-700/30">
                      <th className="px-3 py-2 text-[10px] font-semibold text-surface-500 uppercase tracking-wider w-8"></th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{t("model")}</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-surface-500 uppercase tracking-wider text-right whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1">
                          <Coins className="w-3 h-3 text-emerald-400" />
                          {t("per1k")}
                        </span>
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-surface-500 uppercase tracking-wider text-right whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1">
                          <Coins className="w-3 h-3 text-emerald-400" />
                          {t("perArticle")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/15">
                    {providerModels.map(model => {
                      const articleCost = estimateArticleCost(model.promptPerM, model.completionPerM);
                      const isEnabled = enabledModels?.has(model.id) ?? true;
                      return (
                        <tr 
                          key={model.id} 
                          className={`transition-colors cursor-pointer ${isEnabled ? "hover:bg-surface-800/20" : "opacity-40 hover:opacity-60"}`}
                          onClick={() => toggleModel(model.id)}
                        >
                          <td className="px-3 py-2.5">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isEnabled 
                                ? "bg-brand-500 border-brand-500" 
                                : "border-surface-600 bg-transparent"
                            }`}>
                              {isEnabled && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm font-medium text-surface-200">{model.name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-sm font-bold ${costColor(model.costPer1k)}`}>
                              {model.costPer1k < 0.01 ? "<0.01" : model.costPer1k.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-sm font-bold tabular-nums ${costColor(Number(articleCost))}`}>
                              ~{articleCost}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/30 space-y-2">
        <p className="text-[11px] text-surface-500 flex items-start gap-2">
          <Coins className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>
            <strong className="text-surface-400">{t("per1k")}</strong> — {t("per1kBody")}
          </span>
        </p>
        <p className="text-[11px] text-surface-500 flex items-start gap-2">
          <Coins className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>
            <strong className="text-surface-400">{t("perArticle")}</strong> — {t("perArticleBody")}
          </span>
        </p>
        <div className="flex items-center gap-4 pt-1">
          <span className="text-[10px] text-emerald-400">● {t("legendCheap")}</span>
          <span className="text-[10px] text-amber-400">● {t("legendModerate")}</span>
          <span className="text-[10px] text-orange-400">● {t("legendExpensive")}</span>
          <span className="text-[10px] text-red-400">● {t("legendPremium")}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Role / Status Style Lookups (labels resolved via i18n) ───────────────────
const ROLE_STYLES: Record<string, { color: string; bg: string }> = {
  VIEWER: { color: "text-blue-400", bg: "bg-blue-500/10" },
  EDITOR: { color: "text-amber-400", bg: "bg-amber-500/10" },
  ADMIN:  { color: "text-purple-400", bg: "bg-purple-500/10" },
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "text-amber-400", bg: "bg-amber-500/10" },
  ACTIVE:  { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  REVOKED: { color: "text-red-400", bg: "bg-red-500/10" },
};

function TeamMembersSection() {
  const t = useTranslations("settings.team");
  const tTable = useTranslations("settings.team.table");
  const tRoles = useTranslations("settings.team.roles");
  const tStatus = useTranslations("settings.team.memberStatus");
  const canInviteQuery = trpc.team.canInvite.useQuery();
  const membersQuery = trpc.team.listAllMembers.useQuery();

  const utils = trpc.useUtils();
  const inviteMut = trpc.team.inviteMember.useMutation({
    onSuccess: (data) => {
      utils.team.listAllMembers.invalidate();
      setLastInviteUrl(data.inviteUrl);
      setLastInvitePassword(data.tempPassword);
      setLastInviteEmail(inviteEmail);
      setInviteEmail("");
      setInviteRole("VIEWER");
      setShowInviteForm(false);
      setInviteSuccess(true);
    },
  });
  const updateRoleMut = trpc.team.updateRole.useMutation({
    onSuccess: () => utils.team.listAllMembers.invalidate(),
  });
  const removeMut = trpc.team.removeMember.useMutation({
    onSuccess: () => utils.team.listAllMembers.invalidate(),
  });

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER");
  const [inviteProject, setInviteProject] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [lastInviteEmail, setLastInviteEmail] = useState("");
  const [lastInvitePassword, setLastInvitePassword] = useState("");
  const [copied, setCopied] = useState(false);

  const canInvite = canInviteQuery.data?.allowed ?? false;
  const projects = membersQuery.data?.projects || [];

  // Auto-select first project for invite
  useEffect(() => {
    if (projects.length > 0 && !inviteProject) setInviteProject(projects[0].id);
  }, [projects, inviteProject]);

  const activeMembers = membersQuery.data?.members.filter(m => m.status !== "REVOKED") || [];
  const revokedMembers = membersQuery.data?.members.filter(m => m.status === "REVOKED") || [];

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-surface-100">{t("title")}</h2>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            {t("invite")}
          </button>
        )}
      </div>

      {/* Billing gate message for Free plan */}
      {!canInvite && (
        <div className="glass-card p-5 mb-4 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100 mb-1">{t("upgradeTitle")}</h3>
              <p className="text-sm text-surface-400">
                {canInviteQuery.data?.reason || t("upgradeFallback")}
              </p>
              <button className="mt-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all">
                {t("viewPlans")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && canInvite && (
        <div className="glass-card p-5 mb-4 border border-indigo-500/20 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              {t("sendInvite")}
            </h3>
            <button onClick={() => setShowInviteForm(false)} className="btn-ghost p-1 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="input-field text-sm flex-1 min-w-[200px]"
            />
            <select
              value={inviteProject}
              onChange={(e) => setInviteProject(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-200 focus:outline-none focus:border-indigo-500/50"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-200 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="VIEWER">{tRoles("VIEWER")}</option>
              <option value="EDITOR">{tRoles("EDITOR")}</option>
              <option value="ADMIN">{tRoles("ADMIN")}</option>
            </select>
            <button
              onClick={() => inviteMut.mutate({ projectId: inviteProject, email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail || !inviteProject || inviteMut.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {inviteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {t("send")}
            </button>
          </div>
          {inviteMut.error && (
            <p className="text-xs text-red-400 mt-2">{inviteMut.error.message}</p>
          )}
          <p className="text-[11px] text-surface-500 mt-2">
            {t("devNote")}
          </p>
        </div>
      )}

      {/* Success with invite link */}
      {inviteSuccess && (
        <div className="glass-card p-4 mb-4 border border-emerald-500/20 animate-fade-in space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-emerald-400">
              {t.rich("successWith", { email: lastInviteEmail, strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
          {lastInviteUrl && (
            <div className="flex gap-2">
              <input readOnly value={lastInviteUrl} className="input-field text-xs flex-1 font-mono" />
              <button
                onClick={() => { navigator.clipboard.writeText(lastInviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="btn-secondary gap-1 flex-shrink-0 text-xs"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Mail className="w-3 h-3" />}
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>
          )}
          {lastInvitePassword && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50">
              <span className="text-[11px] text-surface-400">{t("password")}</span>
              <code className="text-sm text-amber-400 font-mono font-bold">{lastInvitePassword}</code>
            </div>
          )}
          <p className="text-[11px] text-surface-500">{t("shareHint")}</p>
          <button onClick={() => setInviteSuccess(false)} className="text-[11px] text-surface-500 hover:text-surface-300">{t("dismiss")}</button>
        </div>
      )}

      {/* Members table */}
      <div className="glass-card overflow-hidden">
        {membersQuery.isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-surface-500" /></div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-700/30">
                <th className="px-5 py-3 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{tTable("member")}</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{tTable("project")}</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{tTable("role")}</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{tTable("status")}</th>
                <th className="px-5 py-3 text-[10px] font-semibold text-surface-500 uppercase tracking-wider text-right">{tTable("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/15">
              {/* Owner row */}
              {membersQuery.data?.owner && (
                <tr className="bg-surface-800/10">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                        {membersQuery.data.owner.name?.[0]?.toUpperCase() || "O"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-100">{membersQuery.data.owner.name || membersQuery.data.owner.email}</p>
                        <p className="text-[11px] text-surface-500">{membersQuery.data.owner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-surface-400">{tTable("allProjects")}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      {tRoles("OWNER")}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{tStatus("ACTIVE")}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[10px] text-surface-500">—</span>
                  </td>
                </tr>
              )}

              {/* Active members */}
              {activeMembers.map(member => {
                const roleStyle = ROLE_STYLES[member.role] || ROLE_STYLES.VIEWER;
                const statusStyle = STATUS_STYLES[member.status] || STATUS_STYLES.PENDING;

                return (
                  <tr key={member.id} className="hover:bg-surface-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-surface-300 text-xs font-bold">
                          {member.email[0].toUpperCase()}
                        </div>
                        <p className="text-sm text-surface-200">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-surface-300 bg-surface-800/60 px-2 py-0.5 rounded">{member.projectName}</span>
                    </td>
                    <td className="px-5 py-3">
                      {canInvite ? (
                        <select
                          value={member.role}
                          onChange={(e) => updateRoleMut.mutate({ memberId: member.id, role: e.target.value as any })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${roleStyle.bg} ${roleStyle.color}`}
                        >
                          <option value="VIEWER">{tRoles("VIEWER")}</option>
                          <option value="EDITOR">{tRoles("EDITOR")}</option>
                          <option value="ADMIN">{tRoles("ADMIN")}</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${roleStyle.bg} ${roleStyle.color}`}>
                          {tRoles(member.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                        {tStatus(member.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canInvite && (
                        <button
                          onClick={() => removeMut.mutate({ memberId: member.id })}
                          disabled={removeMut.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {removeMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          {tTable("remove")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Empty state */}
              {activeMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center">
                    <Users className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                    <p className="text-sm text-surface-400">{tTable("noMembers")}</p>
                    {canInvite && (
                      <p className="text-xs text-surface-500 mt-1">{tTable("noMembersHint")}</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Revoked members (collapsed) */}
      {revokedMembers.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-surface-500 cursor-pointer hover:text-surface-300 transition-colors">
            {t("revokedSummary", { n: revokedMembers.length })}
          </summary>
          <div className="mt-2 space-y-1">
            {revokedMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-surface-800/20 opacity-50">
                <span className="text-xs text-surface-400">{m.email}</span>
                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{tStatus("REVOKED")}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tApi = useTranslations("settings.apiKeys");
  const tModels = useTranslations("settings.models");
  const statusQuery = trpc.settings.getApiKeyStatus.useQuery();
  const saveMut = trpc.settings.saveApiKey.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });
  const removeMut = trpc.settings.removeApiKey.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });

  const handleSave = async (provider: string, apiKey: string) => {
    await saveMut.mutateAsync({ provider: provider as any, apiKey });
  };

  const handleRemove = async (provider: string) => {
    await removeMut.mutateAsync({ provider: provider as any });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <Settings className="w-7 h-7 text-brand-400" />
            {t("title")}
          </h1>
          <p className="text-surface-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* API Keys Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-surface-100">{tApi("title")}</h2>
          </div>
          <p className="text-sm text-surface-400 mb-4">
            {tApi("intro")}
          </p>

          <div className="space-y-3">
            {API_KEY_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider.id}
                provider={provider}
                status={statusQuery.data?.[provider.id]}
                onSave={handleSave}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* Security note */}
          <div className="mt-4 p-3 rounded-lg bg-surface-800/30 border border-surface-700/30">
            <p className="text-[11px] text-surface-500 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{tApi("securityNote")}</span>
            </p>
          </div>
        </div>

        {/* Team Members Section */}
        <TeamMembersSection />

        {/* AI Models & Pricing Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-surface-100">{tModels("title")}</h2>
          </div>
          <p className="text-sm text-surface-400 mb-4">
            {tModels("intro")}
          </p>

          <ModelPricingTable />
        </div>
      </div>
    </DashboardLayout>
  );
}
