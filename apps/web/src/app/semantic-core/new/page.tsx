"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SemanticCoreWizard from "@/components/semantic-core/SemanticCoreWizard";

function SemanticCoreWizardWrapper() {
  const params = useSearchParams();
  const coreId = params.get("coreId") || undefined;
  return <SemanticCoreWizard isNew={!coreId} existingCoreId={coreId} />;
}

export default function SemanticCorePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-surface-400">Loading wizard...</div>}>
        <SemanticCoreWizardWrapper />
      </Suspense>
    </DashboardLayout>
  );
}
