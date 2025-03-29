import { MainLayout } from "@/components/layout/main-layout";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        
        <div className="mt-4">
          <DashboardCards />
        </div>

        <div className="mt-8">
          <RecentActivities />
        </div>
      </div>
    </MainLayout>
  );
}
