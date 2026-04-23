import DashboardLayout from "@/components/layout/DashboardLayout";
import SemanticCoreWizard from "@/components/semantic-core/SemanticCoreWizard";

export const metadata = { title: "Semantic Core" };

export default function SemanticCorePage() {
  return (
    <DashboardLayout>
      <SemanticCoreWizard isNew={true} />
    </DashboardLayout>
  );
}

