"use client";

import { useState } from "react";
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

const CREDS_BY_TYPE: Record<ConnectorType, Array<{ key: string; label: string; hint?: string; type?: string }>> = {
  WORDPRESS: [
    { key: "username", label: "WordPress username", hint: "Тот, для кого создан Application Password" },
    { key: "password", label: "Application Password", type: "password", hint: "WP → Users → Profile → Application Passwords" },
  ],
  TILDA: [],
  BITRIX: [],
  OWN_CMS: [],
  CUSTOM_API: [],
};

export default function ConnectorsSection({ projectId }: { projectId: string }) {
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
      setTestResult({ id, ok: true, message: "Соединение установлено" });
    } catch (err) {
      setTestResult({ id, ok: false, message: err instanceof Error ? err.message : "Ошибка" });
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            Коннекторы публикации
          </h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Подключите CMS, куда автопилот будет публиковать контент.
          </p>
        </div>
        {!form && (
          <button onClick={startCreate} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        )}
      </div>

      {listQ.isLoading && (
        <div className="text-surface-400 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Загрузка…
        </div>
      )}

      {!listQ.isLoading && listQ.data?.length === 0 && !form && (
        <p className="text-sm text-surface-500">Пока нет коннекторов.</p>
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
                    {!c.isActive && <span className="text-[10px] text-red-400">DISABLED</span>}
                  </div>
                  <p className="text-xs text-surface-500 truncate">{c.baseUrl}</p>
                  {c.configured ? (
                    <p className="text-[10px] text-emerald-400">✓ Креденшалы сохранены</p>
                  ) : (
                    <p className="text-[10px] text-amber-400">Нужно добавить креденшалы</p>
                  )}
                  {testResult?.id === c.id && (
                    <p className={`text-xs mt-1 ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                      {testResult.ok ? "✓" : "✗"} {testResult.message}
                    </p>
                  )}
                  {hasError && testResult?.id !== c.id && (
                    <p className="text-[11px] text-red-400 mt-1 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="break-all">{c.lastError}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => test(c.id)} disabled={isTesting}
                    className="text-xs px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 disabled:opacity-50">
                    {testMut.isPending && testResult?.id === c.id ? "..." : "Проверить"}
                  </button>
                  <button onClick={() => startEdit(c)}
                    className="text-xs px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-200">
                    Изменить
                  </button>
                  <button onClick={() => confirm(`Удалить коннектор "${c.name}"?`) && deleteMut.mutate({ connectorId: c.id })}
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
            {form.id ? `Редактировать ${form.name}` : "Новый коннектор"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-surface-400">Тип</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ConnectorType, credentials: {} })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100"
              >
                <option value="WORDPRESS">WordPress</option>
                <option value="TILDA" disabled>Tilda (скоро)</option>
                <option value="BITRIX" disabled>Bitrix (скоро)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-surface-400">Название</span>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Мой блог" required
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-surface-400">Base URL</span>
              <input type="url" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://example.com" required
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100" />
            </label>
            {CREDS_BY_TYPE[form.type].map((f) => (
              <label key={f.key} className="block col-span-2">
                <span className="text-xs text-surface-400">{f.label}</span>
                <div className="relative">
                  <input
                    type={f.type === "password" && !showCreds[f.key] ? "password" : "text"}
                    value={form.credentials[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, [f.key]: e.target.value } })}
                    placeholder={form.id ? "оставьте пустым если не меняете" : ""}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 pr-9"
                  />
                  {f.type === "password" && (
                    <button type="button" onClick={() => setShowCreds({ ...showCreds, [f.key]: !showCreds[f.key] })}
                      className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                      {showCreds[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                {f.hint && <span className="text-[10px] text-surface-600">{f.hint}</span>}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Использовать как коннектор по умолчанию
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={upsertMut.isPending} className="btn-primary gap-2">
              {upsertMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Сохранить
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-ghost">Отменить</button>
          </div>
        </form>
      )}
    </div>
  );
}
