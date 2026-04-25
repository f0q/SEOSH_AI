"use client";

import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SemanticCoreWizard from "@/components/semantic-core/SemanticCoreWizard";

export default function SemanticCorePage() {
  const params = useSearchParams();
  const coreId = params.get("coreId") || undefined;

  return (
    <DashboardLayout>
      <SemanticCoreWizard isNew={!coreId} existingCoreId={coreId} />
    </DashboardLayout>
  );
}
