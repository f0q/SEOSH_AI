"use client";

import { useState } from "react";
import { Plus, Loader2, Package, Star, Trash2 } from "lucide-react";
import { trpc } from "@/trpc/client";

type PackageForm = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  tokens: number;
  priceRub: number; // in kopecks
  sortOrder: number;
  active: boolean;
  highlighted: boolean;
};

const EMPTY: PackageForm = {
  slug: "",
  name: "",
  description: "",
  tokens: 1000,
  priceRub: 10000,
  sortOrder: 0,
  active: true,
  highlighted: false,
};

export default function PackagesSection() {
  const listQ = trpc.admin.listPackages.useQuery();
  const upsertMut = trpc.admin.upsertPackage.useMutation({ onSuccess: () => listQ.refetch() });
  const deleteMut = trpc.admin.deletePackage.useMutation({ onSuccess: () => listQ.refetch() });
  const [form, setForm] = useState<PackageForm>(EMPTY);
  const [editing, setEditing] = useState(false);

  const startEdit = (pkg: PackageForm) => {
    setForm(pkg);
    setEditing(true);
  };

  const reset = () => {
    setForm(EMPTY);
    setEditing(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertMut.mutateAsync({
      ...(editing && form.id ? { id: form.id } : {}),
      slug: form.slug,
      name: form.name,
      description: form.description || undefined,
      tokens: form.tokens,
      priceRub: form.priceRub,
      sortOrder: form.sortOrder,
      active: form.active,
      highlighted: form.highlighted,
    });
    reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-5">
        <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-brand-400" />
          Тарифы ({listQ.data?.length ?? 0})
        </h2>
        <div className="space-y-2">
          {listQ.data?.map((pkg) => (
            <div key={pkg.id} className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/40 flex items-center justify-between">
              <button onClick={() => startEdit({
                id: pkg.id,
                slug: pkg.slug,
                name: pkg.name,
                description: pkg.description ?? "",
                tokens: pkg.tokens,
                priceRub: pkg.priceRub,
                sortOrder: pkg.sortOrder,
                active: pkg.active,
                highlighted: pkg.highlighted,
              })} className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-100">{pkg.name}</span>
                  {pkg.highlighted && <Star className="w-3 h-3 text-amber-400" />}
                  {!pkg.active && <span className="text-[10px] text-red-400 uppercase">inactive</span>}
                </div>
                <p className="text-xs text-surface-500">
                  {(pkg.priceRub / 100).toLocaleString("ru-RU")} ₽ → {pkg.tokens.toLocaleString("ru-RU")} токенов
                </p>
                <p className="text-[10px] text-surface-600">slug: {pkg.slug}</p>
              </button>
              <button
                onClick={() => confirm(`Деактивировать тариф "${pkg.name}"?`) && deleteMut.mutate({ id: pkg.id })}
                className="text-red-400 hover:bg-red-500/10 p-1.5 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={save} className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-surface-100">
          {editing ? `Редактировать ${form.name}` : "Создать тариф"}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="starter" />
          <Field label="Название" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Starter" />
          <Field label="Цена в копейках" type="number" value={String(form.priceRub)} onChange={(v) => setForm({ ...form, priceRub: Number(v) })} placeholder="49000" hint={`= ${(form.priceRub / 100).toLocaleString("ru-RU")} ₽`} />
          <Field label="Токены" type="number" value={String(form.tokens)} onChange={(v) => setForm({ ...form, tokens: Number(v) })} placeholder="5000" />
          <Field label="Порядок" type="number" value={String(form.sortOrder)} onChange={(v) => setForm({ ...form, sortOrder: Number(v) })} placeholder="0" />
          <Field label="Описание" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Для пробы" wide />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span className="text-surface-300">Активен</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={form.highlighted} onChange={(e) => setForm({ ...form, highlighted: e.target.checked })} />
            <span className="text-surface-300">Подсветить как «популярный»</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={upsertMut.isPending} className="btn-primary gap-2 flex-1">
            {upsertMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editing ? "Сохранить" : "Создать"}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="btn-ghost">Отменить</button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  wide?: boolean;
  hint?: string;
}) {
  return (
    <label className={`block ${props.wide ? "col-span-2" : ""}`}>
      <span className="text-xs text-surface-400">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
      />
      {props.hint && <span className="text-[10px] text-surface-600">{props.hint}</span>}
    </label>
  );
}
