/**
 * @page New Project
 * @description Onboarding wizard page for creating a new SEO project.
 */

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export async function generateMetadata() {
  const t = await getTranslations("projects");
  return { title: t("new") };
}

export default async function NewProjectPage() {
  const t = await getTranslations("projects");
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center text-surface-400">{t("loadingWizard")}</div>}>
        <OnboardingWizard />
      </Suspense>
    </DashboardLayout>
  );
}
