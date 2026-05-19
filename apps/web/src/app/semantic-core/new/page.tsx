"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SemanticCoreWizard from "@/components/semantic-core/SemanticCoreWizard";

function SemanticCoreWizardWrapper() {
  const params = useSearchParams();
  const coreId = params.get("coreId") || undefined;
  return <SemanticCoreWizard isNew={!coreId} existingCoreId={coreId} />;
}

export default function SemanticCorePage() {
  const t = useTranslations("projects");
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-surface-400">{t("loadingWizard")}</div>}>
        <SemanticCoreWizardWrapper />
      </Suspense>
    </DashboardLayout>
  );
}
