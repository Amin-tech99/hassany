import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type RecentActivity = {
  id: number;
  type: string;
  status: string;
  updatedAt: string;
  task: string;
};

export function RecentActivities() {
  const { data: recentActivities, isLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/activities/recent"],
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "pending_review":
      case "pending review":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending Review</Badge>;
      case "in_progress":
      case "in progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case "rejected":
      case "needs_revision":
      case "needs revision":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Needs Revision</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const getActionLink = (activity: RecentActivity) => {
    if (activity.type.toLowerCase() === "transcription") {
      return `/transcriptions/${activity.id}`;
    } else if (activity.type.toLowerCase() === "verification" || activity.type.toLowerCase() === "review") {
      return `/transcriptions/${activity.id}?review=true`;
    } else if (activity.type.toLowerCase() === "processing") {
      return `/audio-processing?file=${activity.id}`;
    }
    return `/transcriptions/${activity.id}`;
  };

  const getActionText = (activity: RecentActivity) => {
    if (activity.status.toLowerCase() === "pending_review" || activity.status.toLowerCase() === "pending review") {
      return "Review";
    } else if (activity.status.toLowerCase() === "in_progress" || activity.status.toLowerCase() === "in progress") {
      return "Continue";
    }
    return "View";
  };

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  if (isLoading) {
    return (
      <div className="align-middle min-w-full overflow-x-auto shadow overflow-hidden sm:rounded-lg">
        <div className="px-6 py-3 bg-white">
          <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="align-middle min-w-full overflow-x-auto shadow overflow-hidden sm:rounded-lg">
      <h2 className="px-6 py-3 text-lg font-medium text-gray-900 bg-white">
        Recent Activities
      </h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Updated
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {activity.task}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {activity.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(activity.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getTimeAgo(activity.updatedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={getActionLink(activity)}>
                    <a className="text-primary-600 hover:text-primary-900">
                      {getActionText(activity)}
                    </a>
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                No recent activities found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
