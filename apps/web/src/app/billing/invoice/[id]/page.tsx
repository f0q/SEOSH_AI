"use client";

import { use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const paymentQ = trpc.billing.getPayment.useQuery({ paymentId: id });
  const companyQ = trpc.billing.getCompanyDetails.useQuery();

  const payment = paymentQ.data;
  const company = companyQ.data;

  if (paymentQ.isLoading || companyQ.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-surface-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!payment) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto glass-card p-8 text-center">
          <p>Счёт не найден.</p>
        </div>
      </DashboardLayout>
    );
  }

  const invoiceNo = payment.id.slice(0, 8).toUpperCase();
  const created = new Date(payment.createdAt).toLocaleDateString("ru-RU");
  const total = formatRub(payment.amountRub);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href="/billing" className="btn-ghost gap-2"><ArrowLeft className="w-4 h-4" /> К биллингу</Link>
          <button onClick={() => window.print()} className="btn-primary gap-2">
            <Printer className="w-4 h-4" /> Печать / PDF
          </button>
        </div>

        <div className="glass-card p-10 print:bg-white print:text-black space-y-6">
          <div className="flex items-start justify-between border-b border-surface-700/40 print:border-gray-300 pb-4">
            <div>
              <h1 className="text-2xl font-bold">Счёт на оплату № {invoiceNo}</h1>
              <p className="text-sm text-surface-400 print:text-gray-600">от {created}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-surface-500 print:text-gray-500">Итого к оплате</p>
              <p className="text-2xl font-bold">{total} ₽</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h2 className="font-semibold mb-2">Поставщик</h2>
              <p>{company?.legalName || company?.shortName || "—"}</p>
              <p>ИНН: {company?.inn || "—"} / КПП: {company?.kpp || "—"}</p>
              <p>ОГРН: {company?.ogrn || "—"}</p>
              <p>{company?.legalAddress || "—"}</p>
              <p className="mt-2 text-xs text-surface-500 print:text-gray-600">
                Банк: {company?.bankName || "—"}<br />
                Р/с: {company?.accountNumber || "—"}<br />
                К/с: {company?.correspondentAccount || "—"}<br />
                БИК: {company?.bik || "—"}
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Назначение платежа</h2>
              <p>Покупка пакета токенов SEOSH.AI</p>
              <p>Платёж № {invoiceNo}</p>
              <p className="text-xs text-surface-500 print:text-gray-600 mt-2">
                Без НДС. После зачисления средств токены будут добавлены администратором вручную.
              </p>
            </div>
          </div>

          <table className="w-full text-sm border-t border-b border-surface-700/40 print:border-gray-300">
            <thead>
              <tr>
                <th className="text-left py-2">Услуга</th>
                <th className="text-right py-2">Кол-во</th>
                <th className="text-right py-2">Сумма</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-surface-700/30 print:border-gray-200">
                <td className="py-2">Пакет токенов «{payment.package?.name ?? "—"}» — {payment.tokens.toLocaleString("ru-RU")} токенов</td>
                <td className="text-right py-2">1</td>
                <td className="text-right py-2">{total} ₽</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-right py-2 font-semibold">Итого:</td>
                <td className="text-right py-2 font-bold">{total} ₽</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-sm">
            <p className="font-semibold">Руководитель: {company?.directorName || "—"} ({company?.directorTitle || "—"})</p>
            <p className="text-xs text-surface-500 print:text-gray-600 mt-1">
              Контакты: {company?.contactEmail || "—"} · {company?.contactPhone || "—"}
            </p>
          </div>

          <p className="text-xs text-surface-500 print:text-gray-600 border-t border-surface-700/40 print:border-gray-300 pt-3">
            После оплаты пришлите подтверждение на {company?.contactEmail || "<email>"} — токены будут зачислены в течение рабочего дня.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
