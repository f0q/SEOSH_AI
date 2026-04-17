/**
 * @page New Project
 * @description Onboarding wizard page for creating a new SEO project.
 */

import DashboardLayout from "@/components/layout/DashboardLayout";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "New Project",
};

export default function NewProjectPage() {
  return (
    <DashboardLayout>
      <OnboardingWizard />
    </DashboardLayout>
  );
}
