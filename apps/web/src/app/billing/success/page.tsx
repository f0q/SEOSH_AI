import { Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BillingSuccessClient from "./BillingSuccessClient";

export const metadata = { title: "Платёж выполнен" };

export default function BillingSuccessPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-surface-400">Загрузка…</div>}>
        <BillingSuccessClient />
      </Suspense>
    </DashboardLayout>
  );
}
