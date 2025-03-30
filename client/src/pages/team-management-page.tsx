import { TeamManagement } from "@/components/admin/team-management";
import { TaskAssignment } from "@/components/admin/task-assignment";
import { useAuth } from "@/hooks/use-auth";

export default function TeamManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8">
      <TeamManagement />
      
      {/* Task assignment section - only visible to admins */}
      {isAdmin && <TaskAssignment />}
    </div>
  );
}
