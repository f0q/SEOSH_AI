/**
 * @page New Project
 * @description Onboarding wizard page for creating a new SEO project.
 */

import DashboardLayout from "@/components/layout/DashboardLayout";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "New Project",
};

import { Suspense } from "react";

export default function NewProjectPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-surface-400">Loading wizard...</div>}>
        <OnboardingWizard />
      </Suspense>
    </DashboardLayout>
  );
}
