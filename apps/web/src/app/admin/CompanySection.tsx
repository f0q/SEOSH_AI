"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Building2 } from "lucide-react";
import { trpc } from "@/trpc/client";

interface FieldDef {
  key: "legalName" | "shortName" | "inn" | "kpp" | "ogrn" | "legalAddress" | "postalAddress"
    | "bankName" | "accountNumber" | "correspondentAccount" | "bik" | "directorName"
    | "directorTitle" | "contactEmail" | "contactPhone";
  label: string;
  placeholder: string;
  wide?: boolean;
}

const FIELDS: readonly FieldDef[] = [
  { key: "legalName", label: "Юр. название", placeholder: "ООО «Название»" },
  { key: "shortName", label: "Краткое название", placeholder: "Название" },
  { key: "inn", label: "ИНН", placeholder: "1234567890" },
  { key: "kpp", label: "КПП", placeholder: "123456789" },
  { key: "ogrn", label: "ОГРН/ОГРНИП", placeholder: "1234567890123" },
  { key: "legalAddress", label: "Юридический адрес", placeholder: "г. Москва, ул. ...", wide: true },
  { key: "postalAddress", label: "Почтовый адрес", placeholder: "(если отличается)", wide: true },
  { key: "bankName", label: "Банк", placeholder: "ПАО «Сбербанк»" },
  { key: "accountNumber", label: "Расчётный счёт", placeholder: "40702..." },
  { key: "correspondentAccount", label: "Корреспондентский счёт", placeholder: "30101..." },
  { key: "bik", label: "БИК", placeholder: "044525225" },
  { key: "directorName", label: "Имя руководителя", placeholder: "Иванов И.И." },
  { key: "directorTitle", label: "Должность", placeholder: "Генеральный директор" },
  { key: "contactEmail", label: "Email для связи", placeholder: "billing@example.com" },
  { key: "contactPhone", label: "Телефон", placeholder: "+7 ..." },
];

type FormShape = Record<FieldDef["key"], string>;

const EMPTY: FormShape = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {} as FormShape);

export default function CompanySection() {
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
    return <div className="flex items-center gap-2 text-surface-400"><Loader2 className="w-4 h-4 animate-spin" /> Загрузка…</div>;
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 space-y-4">
      <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-brand-400" />
        Реквизиты компании-получателя
      </h2>
      <p className="text-xs text-surface-500">
        Видны в счёте на оплату, который генерирует пользователь.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.wide ? "md:col-span-2" : ""}`}>
            <span className="text-xs text-surface-400">{f.label}</span>
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-surface-500">
          {savedAt && Date.now() - savedAt < 5000 ? "✓ Сохранено" : ""}
        </span>
        <button type="submit" disabled={updateMut.isPending} className="btn-primary gap-2">
          {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить
        </button>
      </div>
    </form>
  );
}
