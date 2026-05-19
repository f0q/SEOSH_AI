"use client";

import { useState } from "react";
import { Loader2, CreditCard, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/trpc/client";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-surface-400",
  WAITING: "text-amber-400",
  SUCCEEDED: "text-emerald-400",
  FAILED: "text-red-400",
  CANCELED: "text-surface-500",
  REFUNDED: "text-blue-400",
};

const STATUSES = ["ALL", "PENDING", "WAITING", "SUCCEEDED", "FAILED", "CANCELED", "REFUNDED"] as const;

export default function PaymentsSection() {
  const t = useTranslations("admin.payments");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const listQ = trpc.admin.listPayments.useQuery({
    limit: 100,
    status: status === "ALL" ? undefined : status,
  });
  const markMut = trpc.admin.markPaymentSucceeded.useMutation({ onSuccess: () => listQ.refetch() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-400" />
          {t("heading")}
        </h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="px-3 py-1.5 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100"
        >
          <option value="ALL">{t("allStatuses")}</option>
          {STATUSES.filter((s) => s !== "ALL").map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700/30 text-xs uppercase text-surface-500">
              <th className="text-left py-2 px-3">{t("columns.date")}</th>
              <th className="text-left py-2 px-3">{t("columns.user")}</th>
              <th className="text-left py-2 px-3">{t("columns.package")}</th>
              <th className="text-left py-2 px-3">{t("columns.provider")}</th>
              <th className="text-right py-2 px-3">{t("columns.amount")}</th>
              <th className="text-right py-2 px-3">{t("columns.tokens")}</th>
              <th className="text-left py-2 px-3">{t("columns.status")}</th>
              <th className="text-right py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading && (
              <tr><td colSpan={8} className="text-center py-6 text-surface-400"><Loader2 className="w-4 h-4 animate-spin inline" /> {tCommon("loading")}</td></tr>
            )}
            {listQ.data?.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6 text-surface-500">{t("empty")}</td></tr>
            )}
            {listQ.data?.map((p) => (
              <tr key={p.id} className="border-b border-surface-800/40 hover:bg-surface-800/20">
                <td className="py-2 px-3 text-xs text-surface-400">{new Date(p.createdAt).toLocaleString(dateLocale)}</td>
                <td className="py-2 px-3 text-xs text-surface-200">{p.user.email}</td>
                <td className="py-2 px-3 text-xs text-surface-300">{p.package?.name ?? "—"}</td>
                <td className="py-2 px-3 text-xs text-surface-400">{p.providerSlug}</td>
                <td className="py-2 px-3 text-xs text-right font-mono text-surface-200">{(p.amountRub / 100).toLocaleString(dateLocale)} ₽</td>
                <td className="py-2 px-3 text-xs text-right font-mono text-brand-400">{p.tokens.toLocaleString(dateLocale)}</td>
                <td className={`py-2 px-3 text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</td>
                <td className="py-2 px-3 text-right">
                  {p.providerSlug === "manual_invoice" && p.status !== "SUCCEEDED" && p.status !== "CANCELED" && p.status !== "FAILED" && (
                    <button
                      onClick={() => confirm(t("markConfirm")) && markMut.mutate({ paymentId: p.id })}
                      disabled={markMut.isPending}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> {t("markBtn")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
