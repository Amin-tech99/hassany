import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AddUserModal } from "./add-user-modal";

interface TeamMember {
  id: number;
  fullName: string;
  username: string;
  role: string;
  tasksCompleted: number;
  lastActive: string;
}

export function TeamManagement() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  
  const { data: teamMembers, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/users"],
  });
  
  // Format role for display
  const formatRole = (role: string): string => {
    switch (role) {
      case "admin":
        return "Team Leader";
      case "transcriber":
        return "Transcriber";
      case "reviewer":
        return "Reviewer";
      case "collector":
        return "Audio Collector";
      default:
        return role;
    }
  };
  
  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      
      // If it's today, show relative time
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
      
      if (diffInHours < 24) {
        if (diffInHours < 1) {
          return "Just now";
        } else {
          return `${Math.floor(diffInHours)} hours ago`;
        }
      } else if (diffInHours < 48) {
        return "Yesterday";
      } else {
        return format(date, "MMM d, yyyy");
      }
    } catch (error) {
      return "Unknown";
    }
  };
  
  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get background color for avatar based on name
  const getAvatarColor = (userId: number): string => {
    const colors = [
      "bg-primary-600",
      "bg-amber-600",
      "bg-green-600",
      "bg-rose-600",
      "bg-purple-600",
      "bg-cyan-600"
    ];
    
    return colors[userId % colors.length];
  };
  
  // Handle edit user
  const handleEditUser = (userId: number) => {
    setEditingUserId(userId);
    setIsAddUserModalOpen(true);
  };
  
  // Handle add user modal close
  const handleModalClose = () => {
    setIsAddUserModalOpen(false);
    setEditingUserId(null);
  };
  
  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage team members and their roles in the transcription workflow.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button onClick={() => setIsAddUserModalOpen(true)}>
            Add User
          </Button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {isLoading ? (
                <div className="flex justify-center py-8 bg-white">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Email
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Role
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tasks Completed
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Last Active
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {teamMembers && teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <tr key={member.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="flex items-center">
                              <div className={`h-8 w-8 rounded-full ${getAvatarColor(member.id)} flex items-center justify-center text-white font-medium`}>
                                {getInitials(member.fullName)}
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{member.fullName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {member.username}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatRole(member.role)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {member.tasksCompleted}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatTimeAgo(member.lastActive)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Button
                              variant="link"
                              className="text-primary-600 hover:text-primary-900"
                              onClick={() => handleEditUser(member.id)}
                            >
                              Edit
                              <span className="sr-only">, {member.fullName}</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          No team members found. Add a user to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={handleModalClose} 
        userId={editingUserId}
      />
    </>
  );
}
