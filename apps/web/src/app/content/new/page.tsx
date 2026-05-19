import { getTranslations } from "next-intl/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ContentEditor from "@/components/content/ContentEditor";

export async function generateMetadata() {
  const t = await getTranslations("content");
  return { title: t("createNew") };
}

export default function NewContentPage() {
  return (
    <DashboardLayout>
      <ContentEditor />
    </DashboardLayout>
  );
}
