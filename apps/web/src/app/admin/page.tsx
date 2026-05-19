"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ShieldCheck, Users, Building2, Package, CreditCard, Receipt, Mail } from "lucide-react";
import UsersSection from "./UsersSection";
import CompanySection from "./CompanySection";
import PackagesSection from "./PackagesSection";
import ProvidersSection from "./ProvidersSection";
import PaymentsSection from "./PaymentsSection";
import WaitlistSection from "./WaitlistSection";

const TABS = [
  { key: "users", label: "Пользователи", icon: Users },
  { key: "waitlist", label: "Waitlist", icon: Mail },
  { key: "payments", label: "Платежи", icon: Receipt },
  { key: "packages", label: "Тарифы", icon: Package },
  { key: "providers", label: "Провайдеры", icon: CreditCard },
  { key: "company", label: "Реквизиты", icon: Building2 },
] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("users");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
            Admin Panel
          </h1>
          <p className="text-surface-400 mt-1">Управление пользователями, токенами и биллингом</p>
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-surface-700/40 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-surface-400 hover:text-surface-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "users" && <UsersSection />}
        {tab === "waitlist" && <WaitlistSection />}
        {tab === "payments" && <PaymentsSection />}
        {tab === "packages" && <PackagesSection />}
        {tab === "providers" && <ProvidersSection />}
        {tab === "company" && <CompanySection />}
      </div>
    </DashboardLayout>
  );
}
