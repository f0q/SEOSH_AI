"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Plus, Loader2, Check, AlertTriangle, Trash2, Star, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/trpc/client";

type ConnectorType = "WORDPRESS" | "TILDA" | "BITRIX" | "OWN_CMS" | "CUSTOM_API";

interface ConnectorFormState {
  id?: string;
  type: ConnectorType;
  name: string;
  baseUrl: string;
  isDefault: boolean;
  credentials: Record<string, string>;
}

const EMPTY: ConnectorFormState = {
  type: "WORDPRESS",
  name: "",
  baseUrl: "",
  isDefault: true,
  credentials: { username: "", password: "" },
};

// Credential field metadata — labels/hints resolved via i18n keys
const CREDS_BY_TYPE: Record<ConnectorType, Array<{ key: string; labelKey: string; hintKey?: string; type?: string }>> = {
  WORDPRESS: [
    { key: "username", labelKey: "wpUsername", hintKey: "wpUsernameHint" },
    { key: "password", labelKey: "wpPassword", hintKey: "wpPasswordHint", type: "password" },
  ],
  TILDA: [],
  BITRIX: [],
  OWN_CMS: [],
  CUSTOM_API: [],
};

export default function ConnectorsSection({ projectId }: { projectId: string }) {
  const t = useTranslations("projectSettings.connectors");
  const listQ = trpc.publisher.listForProject.useQuery({ projectId });
  const upsertMut = trpc.publisher.upsert.useMutation({ onSuccess: () => listQ.refetch() });
  const testMut = trpc.publisher.test.useMutation({ onSuccess: () => listQ.refetch() });
  const deleteMut = trpc.publisher.delete.useMutation({ onSuccess: () => listQ.refetch() });

  const [form, setForm] = useState<ConnectorFormState | null>(null);
  const [showCreds, setShowCreds] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const startCreate = () => setForm({ ...EMPTY });
  const startEdit = (c: NonNullable<typeof listQ.data>[number]) => setForm({
    id: c.id,
    type: c.type as ConnectorType,
    name: c.name,
    baseUrl: c.baseUrl,
    isDefault: c.isDefault,
    credentials: { username: "", password: "" }, // never echo back
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    await upsertMut.mutateAsync({
      ...(form.id ? { id: form.id } : {}),
      projectId,
      type: form.type,
      name: form.name,
      baseUrl: form.baseUrl,
      isDefault: form.isDefault,
      credentials: Object.fromEntries(
        Object.entries(form.credentials).filter(([, v]) => v && v.length > 0)
      ),
    });
    setForm(null);
  };

  const test = async (id: string) => {
    setTestResult(null);
    try {
      await testMut.mutateAsync({ connectorId: id });
      setTestResult({ id, ok: true, message: t("connectionOk") });
    } catch (err) {
      setTestResult({ id, ok: false, message: err instanceof Error ? err.message : t("errorGeneric") });
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            {t("title")}
          </h2>
          <p className="text-xs text-surface-500 mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        {!form && (
          <button onClick={startCreate} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> {t("add")}
          </button>
        )}
      </div>

      {listQ.isLoading && (
        <div className="text-surface-400 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
        </div>
      )}

      {!listQ.isLoading && listQ.data?.length === 0 && !form && (
        <p className="text-sm text-surface-500">{t("empty")}</p>
      )}

      <div className="space-y-2">
        {listQ.data?.map((c) => {
          const isTesting = testMut.isPending && testResult?.id !== c.id;
          const hasError = !!c.lastError;
          return (
            <div key={c.id} className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-100">{c.name}</span>
                    <span className="text-[10px] uppercase text-surface-500 bg-surface-800/50 px-1.5 py-0.5 rounded">
                      {c.type}
                    </span>
                    {c.isDefault && <Star className="w-3 h-3 text-amber-400" />}
                    {!c.isActive && <span className="text-[10px] text-red-400">{t("disabled")}</span>}
                  </div>
                  <p className="text-xs text-surface-500 truncate">{c.baseUrl}</p>
                  {c.configured ? (
                    <p className="text-[10px] text-emerald-400">✓ {t("credsSaved")}</p>
                  ) : (
                    <p className="text-[10px] text-amber-400">{t("credsMissing")}</p>
                  )}
                  {testResult?.id === c.id && (
                    <pre className={`text-xs mt-2 p-3 rounded-lg bg-surface-900/60 border max-h-[400px] overflow-auto whitespace-pre-wrap font-mono leading-relaxed ${
                      testResult.ok
                        ? "text-emerald-300 border-emerald-500/30"
                        : "text-red-300 border-red-500/30"
                    }`}>
                      {testResult.ok ? "✓ " : "✗ "}{testResult.message}
                    </pre>
                  )}
                  {hasError && testResult?.id !== c.id && (
                    <div className="text-[11px] text-red-300 mt-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-start gap-2 max-h-[400px] overflow-auto">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-400" />
                      <pre className="whitespace-pre-wrap font-mono leading-relaxed">{c.lastError}</pre>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => test(c.id)} disabled={isTesting}
                    className="text-xs px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 disabled:opacity-50">
                    {testMut.isPending && testResult?.id === c.id ? t("testing") : t("test")}
                  </button>
                  <button onClick={() => startEdit(c)}
                    className="text-xs px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-200">
                    {t("edit")}
                  </button>
                  <button onClick={() => confirm(t("deleteConfirm", { name: c.name })) && deleteMut.mutate({ connectorId: c.id })}
                    className="text-red-400 hover:bg-red-500/10 p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <form onSubmit={submit} className="border border-surface-700/50 rounded-lg p-4 space-y-3 bg-surface-900/40">
          <h3 className="text-sm font-semibold text-surface-100">
            {form.id ? t("editingTitle", { name: form.name }) : t("newTitle")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-surface-400">{t("fieldType")}</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ConnectorType, credentials: {} })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100"
              >
                <option value="WORDPRESS">WordPress</option>
                <option value="TILDA" disabled>{t("tilda")}</option>
                <option value="BITRIX" disabled>{t("bitrix")}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-surface-400">{t("fieldName")}</span>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("namePlaceholder")} required
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-surface-400">{t("fieldBaseUrl")}</span>
              <input type="url" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://example.com" required
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100" />
            </label>
            {CREDS_BY_TYPE[form.type].map((f) => (
              <label key={f.key} className="block col-span-2">
                <span className="text-xs text-surface-400">{t(f.labelKey)}</span>
                <div className="relative">
                  <input
                    type={f.type === "password" && !showCreds[f.key] ? "password" : "text"}
                    value={form.credentials[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, [f.key]: e.target.value } })}
                    placeholder={form.id ? t("keepUnchangedHint") : ""}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 pr-9"
                  />
                  {f.type === "password" && (
                    <button type="button" onClick={() => setShowCreds({ ...showCreds, [f.key]: !showCreds[f.key] })}
                      className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                      {showCreds[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                {f.hintKey && <span className="text-[10px] text-surface-600">{t(f.hintKey)}</span>}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            {t("useAsDefault")}
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={upsertMut.isPending} className="btn-primary gap-2">
              {upsertMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t("save")}
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-ghost">{t("cancel")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
