import DashboardLayout from "@/components/layout/DashboardLayout";
import ContentEditor from "@/components/content/ContentEditor";

export const metadata = { title: "New Content" };

export default function NewContentPage() {
  return (
    <DashboardLayout>
      <ContentEditor />
    </DashboardLayout>
  );
}
