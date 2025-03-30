import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-full md:mx-auto px-2 sm:px-4 md:px-6">
      <h1 className="text-xl md:text-2xl font-semibold text-white">Dashboard</h1>
      
      <div className="mt-4">
        <DashboardCards />
      </div>

      <div className="mt-6 md:mt-8">
        <RecentActivities />
      </div>
    </div>
  );
}
