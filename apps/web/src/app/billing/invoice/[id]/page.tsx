"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

function formatRub(kopecks: number, locale: string): string {
  return (kopecks / 100).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { minimumFractionDigits: 2 });
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("invoice");
  const locale = useLocale();
  const dash = t("dash");
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
          <p>{t("notFound")}</p>
        </div>
      </DashboardLayout>
    );
  }

  const invoiceNo = payment.id.slice(0, 8).toUpperCase();
  const created = new Date(payment.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US");
  const total = formatRub(payment.amountRub, locale);
  const currency = t("currency");
  const contactEmail = company?.contactEmail || "<email>";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href="/billing" className="btn-ghost gap-2"><ArrowLeft className="w-4 h-4" /> {t("backToBilling")}</Link>
          <button onClick={() => window.print()} className="btn-primary gap-2">
            <Printer className="w-4 h-4" /> {t("print")}
          </button>
        </div>

        <div className="glass-card p-10 print:bg-white print:text-black space-y-6">
          <div className="flex items-start justify-between border-b border-surface-700/40 print:border-gray-300 pb-4">
            <div>
              <h1 className="text-2xl font-bold">{t("title", { no: invoiceNo })}</h1>
              <p className="text-sm text-surface-400 print:text-gray-600">{t("dateOf", { date: created })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-surface-500 print:text-gray-500">{t("totalLabel")}</p>
              <p className="text-2xl font-bold">{total} {currency}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h2 className="font-semibold mb-2">{t("supplier")}</h2>
              <p>{company?.legalName || company?.shortName || dash}</p>
              <p>{t("innKpp", { inn: company?.inn || dash, kpp: company?.kpp || dash })}</p>
              <p>{t("ogrn", { ogrn: company?.ogrn || dash })}</p>
              <p>{company?.legalAddress || dash}</p>
              <p className="mt-2 text-xs text-surface-500 print:text-gray-600">
                {t("bank", { bank: company?.bankName || dash })}<br />
                {t("account", { account: company?.accountNumber || dash })}<br />
                {t("correspondent", { acct: company?.correspondentAccount || dash })}<br />
                {t("bik", { bik: company?.bik || dash })}
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-2">{t("purpose")}</h2>
              <p>{t("purposeBody")}</p>
              <p>{t("paymentNo", { no: invoiceNo })}</p>
              <p className="text-xs text-surface-500 print:text-gray-600 mt-2">
                {t("noVatNote")}
              </p>
            </div>
          </div>

          <table className="w-full text-sm border-t border-b border-surface-700/40 print:border-gray-300">
            <thead>
              <tr>
                <th className="text-left py-2">{t("tableService")}</th>
                <th className="text-right py-2">{t("tableQty")}</th>
                <th className="text-right py-2">{t("tableSum")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-surface-700/30 print:border-gray-200">
                <td className="py-2">{t("tokenPackageLine", { name: payment.package?.name ?? dash, tokens: payment.tokens.toLocaleString(locale === "ru" ? "ru-RU" : "en-US") })}</td>
                <td className="text-right py-2">1</td>
                <td className="text-right py-2">{total} {currency}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-right py-2 font-semibold">{t("totalRow")}</td>
                <td className="text-right py-2 font-bold">{total} {currency}</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-sm">
            <p className="font-semibold">{t("director", { name: company?.directorName || dash, title: company?.directorTitle || dash })}</p>
            <p className="text-xs text-surface-500 print:text-gray-600 mt-1">
              {t("contacts", { email: company?.contactEmail || dash, phone: company?.contactPhone || dash })}
            </p>
          </div>

          <p className="text-xs text-surface-500 print:text-gray-600 border-t border-surface-700/40 print:border-gray-300 pt-3">
            {t("afterPaymentNote", { email: contactEmail })}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
