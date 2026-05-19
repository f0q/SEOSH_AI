"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/trpc/client";

type FieldKey = "legalName" | "shortName" | "inn" | "kpp" | "ogrn" | "legalAddress" | "postalAddress"
  | "bankName" | "accountNumber" | "correspondentAccount" | "bik" | "directorName"
  | "directorTitle" | "contactEmail" | "contactPhone";

const FIELDS: ReadonlyArray<{ key: FieldKey; wide?: boolean }> = [
  { key: "legalName" },
  { key: "shortName" },
  { key: "inn" },
  { key: "kpp" },
  { key: "ogrn" },
  { key: "legalAddress", wide: true },
  { key: "postalAddress", wide: true },
  { key: "bankName" },
  { key: "accountNumber" },
  { key: "correspondentAccount" },
  { key: "bik" },
  { key: "directorName" },
  { key: "directorTitle" },
  { key: "contactEmail" },
  { key: "contactPhone" },
];

type FormShape = Record<FieldKey, string>;

const EMPTY: FormShape = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {} as FormShape);

export default function CompanySection() {
  const t = useTranslations("admin.company");
  const tCommon = useTranslations("admin.common");
  const dataQ = trpc.admin.getCompanyDetails.useQuery();
  const updateMut = trpc.admin.updateCompanyDetails.useMutation({
    onSuccess: () => dataQ.refetch(),
  });
  const [form, setForm] = useState<FormShape>(EMPTY);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (dataQ.data) {
      const next = { ...EMPTY };
      for (const f of FIELDS) {
        const v = (dataQ.data as Record<string, unknown>)[f.key];
        next[f.key] = typeof v === "string" ? v : "";
      }
      setForm(next);
    }
  }, [dataQ.data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMut.mutateAsync(form);
    setSavedAt(Date.now());
  };

  if (dataQ.isLoading) {
    return <div className="flex items-center gap-2 text-surface-400"><Loader2 className="w-4 h-4 animate-spin" /> {tCommon("loading")}</div>;
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 space-y-4">
      <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-brand-400" />
        {t("heading")}
      </h2>
      <p className="text-xs text-surface-500">
        {t("hint")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.wide ? "md:col-span-2" : ""}`}>
            <span className="text-xs text-surface-400">{t(`fields.${f.key}`)}</span>
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={t(`fields.${f.key}Placeholder`)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-surface-500">
          {savedAt && Date.now() - savedAt < 5000 ? tCommon("saved") : ""}
        </span>
        <button type="submit" disabled={updateMut.isPending} className="btn-primary gap-2">
          {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {tCommon("save")}
        </button>
      </div>
    </form>
  );
}
