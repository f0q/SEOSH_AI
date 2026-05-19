"use client";

import { useState } from "react";
import { Save, Loader2, CreditCard, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/trpc/client";

function useCredentialFields() {
  const t = useTranslations("admin.providers");
  return {
    yookassa: [
      { key: "shopId", label: t("shopIdLabel"), hint: t("shopIdHint") },
      { key: "secretKey", label: t("secretKeyLabel"), hint: t("secretKeyHint") },
    ],
    manual_invoice: [] as Array<{ key: string; label: string; hint?: string }>,
  } as Record<string, Array<{ key: string; label: string; hint?: string }>>;
}

export default function ProvidersSection() {
  const t = useTranslations("admin.providers");
  const tCommon = useTranslations("admin.common");
  const listQ = trpc.admin.listProviders.useQuery();
  const updateMut = trpc.admin.updateProvider.useMutation({ onSuccess: () => listQ.refetch() });
  const fieldDefs = useCredentialFields();

  if (listQ.isLoading) {
    return <div className="flex items-center gap-2 text-surface-400"><Loader2 className="w-4 h-4 animate-spin" /> {tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-brand-400" />
        {t("heading")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listQ.data?.map((row) => (
          <ProviderCard
            key={row.slug}
            row={row}
            fields={fieldDefs[row.slug] ?? []}
            onSave={(input) => updateMut.mutateAsync(input)}
            saving={updateMut.isPending}
          />
        ))}
      </div>
      <p className="text-xs text-surface-500">
        {t("webhookHint", {
          url: typeof window !== "undefined" ? `${window.location.origin}/api/payments/yookassa/webhook` : "/api/payments/yookassa/webhook",
        })}
      </p>
    </div>
  );
}

interface ProviderRow {
  slug: string;
  displayName: string;
  enabled: boolean;
  testMode: boolean;
  credentialKeys: string[];
}

function ProviderCard(props: {
  row: ProviderRow;
  fields: Array<{ key: string; label: string; hint?: string }>;
  onSave: (input: { slug: string; enabled: boolean; testMode: boolean; credentials?: Record<string, string> }) => Promise<unknown>;
  saving: boolean;
}) {
  const t = useTranslations("admin.providers");
  const tCommon = useTranslations("admin.common");
  const { row, fields } = props;
  const [enabled, setEnabled] = useState(row.enabled);
  const [testMode, setTestMode] = useState(row.testMode);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});

  const save = async () => {
    await props.onSave({
      slug: row.slug,
      enabled,
      testMode,
      credentials: Object.fromEntries(
        Object.entries(creds).filter(([, v]) => v && v.length > 0)
      ),
    });
    setCreds({});
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-surface-100">{row.displayName}</h3>
        <span className="text-[10px] uppercase text-surface-500">{row.slug}</span>
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>{t("enabled")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
          <span>{t("testMode")}</span>
        </label>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-surface-500">
            {row.credentialKeys.length > 0
              ? t("credsSaved", { keys: row.credentialKeys.join(", ") })
              : t("credsEmpty")}
          </p>
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs text-surface-400">{f.label}</span>
              <div className="relative">
                <input
                  type={show[f.key] ? "text" : "password"}
                  value={creds[f.key] ?? ""}
                  onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
                  placeholder={t("credsPlaceholder")}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 pr-9"
                />
                <button type="button" onClick={() => setShow({ ...show, [f.key]: !show[f.key] })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-surface-500 hover:text-surface-300">
                  {show[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {f.hint && <span className="text-[10px] text-surface-600">{f.hint}</span>}
            </label>
          ))}
        </div>
      )}

      <button onClick={save} disabled={props.saving} className="btn-primary gap-2 w-full">
        {props.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {tCommon("save")}
      </button>
    </div>
  );
}
