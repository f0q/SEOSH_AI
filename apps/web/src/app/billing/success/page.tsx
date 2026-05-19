import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BillingSuccessClient from "./BillingSuccessClient";

export async function generateMetadata() {
  const t = await getTranslations("billing");
  return { title: t("successPageTitle") };
}

export default async function BillingSuccessPage() {
  const t = await getTranslations("billing");
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-surface-400">{t("loading")}</div>}>
        <BillingSuccessClient />
      </Suspense>
    </DashboardLayout>
  );
}
