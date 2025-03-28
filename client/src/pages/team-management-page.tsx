import { MainLayout } from "@/components/layout/main-layout";
import { TeamManagement } from "@/components/admin/team-management";

export default function TeamManagementPage() {
  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <TeamManagement />
      </div>
    </MainLayout>
  );
}
