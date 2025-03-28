import { MainLayout } from "@/components/layout/main-layout";
import { ExportData } from "@/components/admin/export-data";

export default function ExportDataPage() {
  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <ExportData />
      </div>
    </MainLayout>
  );
}
