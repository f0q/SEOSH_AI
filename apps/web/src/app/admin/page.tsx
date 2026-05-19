"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ShieldCheck, Users, Building2, Package, CreditCard, Receipt, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import UsersSection from "./UsersSection";
import CompanySection from "./CompanySection";
import PackagesSection from "./PackagesSection";
import ProvidersSection from "./ProvidersSection";
import PaymentsSection from "./PaymentsSection";
import WaitlistSection from "./WaitlistSection";

const TABS = [
  { key: "users", icon: Users },
  { key: "waitlist", icon: Mail },
  { key: "payments", icon: Receipt },
  { key: "packages", icon: Package },
  { key: "providers", icon: CreditCard },
  { key: "company", icon: Building2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const t = useTranslations("admin");
  const [tab, setTab] = useState<TabKey>("users");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
            {t("title")}
          </h1>
          <p className="text-surface-400 mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-surface-700/40 overflow-x-auto">
          {TABS.map((tabDef) => {
            const Icon = tabDef.icon;
            const active = tab === tabDef.key;
            return (
              <button
                key={tabDef.key}
                onClick={() => setTab(tabDef.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-surface-400 hover:text-surface-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(`tabs.${tabDef.key}`)}
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
