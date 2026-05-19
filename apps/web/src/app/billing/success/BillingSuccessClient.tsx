"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "CANCELED", "REFUNDED"]);

export default function BillingSuccessClient() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [refreshed, setRefreshed] = useState(false);
  const utils = trpc.useUtils();

  const query = trpc.billing.getPayment.useQuery(
    { paymentId: paymentId ?? "" },
    {
      enabled: !!paymentId,
      refetchInterval: (q) => {
        const status = q.state.data?.status;
        return status && TERMINAL.has(status) ? false : 3000;
      },
    }
  );
  const refresh = trpc.billing.refreshPayment.useMutation();

  // Ask the server to actively re-check the provider once on first arrival —
  // covers the case where YooKassa's webhook hasn't reached us yet.
  useEffect(() => {
    if (!paymentId || refreshed) return;
    if (!query.data || TERMINAL.has(query.data.status)) return;
    setRefreshed(true);
    refresh.mutateAsync({ paymentId })
      .finally(() => utils.billing.getPayment.invalidate({ paymentId }));
  }, [paymentId, query.data, refreshed, refresh, utils]);

  if (!paymentId) {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h1 className="text-xl font-bold text-surface-100">Платёж не найден</h1>
        <p className="text-sm text-surface-500">URL не содержит идентификатора платежа.</p>
        <Link href="/billing" className="btn-primary inline-block">Назад к биллингу</Link>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-400 mx-auto" />
        <h1 className="text-xl font-bold text-surface-100">Загружаем платёж…</h1>
      </div>
    );
  }

  const p = query.data;

  if (p.status === "SUCCEEDED") {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h1 className="text-2xl font-bold text-surface-100">Оплата прошла!</h1>
        <p className="text-sm text-surface-400">
          {p.tokens.toLocaleString("ru-RU")} токенов добавлены на ваш баланс.
        </p>
        <Link href="/billing" className="btn-primary inline-block">К балансу</Link>
      </div>
    );
  }

  if (p.status === "FAILED" || p.status === "CANCELED") {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h1 className="text-2xl font-bold text-surface-100">
          {p.status === "CANCELED" ? "Платёж отменён" : "Не удалось оплатить"}
        </h1>
        <p className="text-sm text-surface-400">Можно попробовать ещё раз.</p>
        <Link href="/billing" className="btn-primary inline-block">Назад</Link>
      </div>
    );
  }

  // PENDING / WAITING
  return (
    <div className="max-w-lg mx-auto glass-card p-8 text-center space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-brand-400 mx-auto" />
      <h1 className="text-xl font-bold text-surface-100">Ожидаем подтверждение от платёжной системы…</h1>
      <p className="text-sm text-surface-500">
        Это занимает до минуты. Страница обновится автоматически.
      </p>
    </div>
  );
}
