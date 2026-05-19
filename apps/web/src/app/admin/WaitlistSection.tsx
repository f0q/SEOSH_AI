"use client";

import { useState } from "react";
import { Loader2, Mail, Building2, Calendar, Trash2 } from "lucide-react";
import { trpc } from "@/trpc/client";

type Status = "NEW" | "CONTACTED" | "ONBOARDED" | "REJECTED";

const STATUS_LABELS: Record<Status, { label: string; color: string }> = {
  NEW:        { label: "Новые",       color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  CONTACTED:  { label: "В работе",    color: "text-brand-400 bg-brand-500/10 border-brand-500/20" },
  ONBOARDED:  { label: "Подключены",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  REJECTED:   { label: "Отклонены",   color: "text-surface-500 bg-surface-700/30 border-surface-600/30" },
};

export default function WaitlistSection() {
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const listQ = trpc.waitlist.list.useQuery({
    limit: 200,
    status: filter === "ALL" ? undefined : filter,
  });
  const updateMut = trpc.waitlist.updateStatus.useMutation({ onSuccess: () => listQ.refetch() });
  const removeMut = trpc.waitlist.remove.useMutation({ onSuccess: () => listQ.refetch() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-400" />
          Waitlist ({listQ.data?.length ?? 0})
        </h2>
        <div className="flex gap-1">
          {(["ALL", "NEW", "CONTACTED", "ONBOARDED", "REJECTED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs rounded transition ${
                filter === s
                  ? "bg-brand-500 text-white"
                  : "bg-surface-800/50 text-surface-400 hover:bg-surface-700"
              }`}
            >
              {s === "ALL" ? "Все" : STATUS_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {listQ.isLoading && (
          <div className="p-8 text-center text-surface-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Загрузка…
          </div>
        )}
        {!listQ.isLoading && (listQ.data ?? []).length === 0 && (
          <p className="p-8 text-center text-surface-500 text-sm">
            Пока никто не записался.
          </p>
        )}
        <div className="divide-y divide-surface-800/40">
          {listQ.data?.map((row) => {
            const meta = STATUS_LABELS[row.status as Status];
            return (
              <div key={row.id} className="p-4 hover:bg-surface-800/20 transition">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${row.email}`} className="text-sm font-medium text-surface-100 hover:text-brand-400 truncate">
                        {row.email}
                      </a>
                      <span className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-500 mt-1">
                      {row.name && <span>{row.name}</span>}
                      {row.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{row.company}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(row.createdAt).toLocaleString("ru-RU")}</span>
                      {row.source && <span className="text-surface-600">{row.source}</span>}
                    </div>
                    {row.message && (
                      <p className="text-xs text-surface-400 mt-2 whitespace-pre-wrap bg-surface-900/40 p-2 rounded border border-surface-800/40">
                        {row.message}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => confirm(`Удалить запись ${row.email}?`) && removeMut.mutate({ id: row.id })}
                    className="text-red-400 hover:bg-red-500/10 p-1.5 rounded transition flex-shrink-0"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(["NEW", "CONTACTED", "ONBOARDED", "REJECTED"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateMut.mutate({ id: row.id, status: s })}
                      disabled={row.status === s || updateMut.isPending}
                      className={`text-xs px-2.5 py-1 rounded transition ${
                        row.status === s
                          ? "bg-surface-700 text-surface-300 cursor-default"
                          : "bg-surface-800/50 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
                      }`}
                    >
                      → {STATUS_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
