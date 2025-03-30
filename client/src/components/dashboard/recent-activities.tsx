import { Link } from "react-router-dom";
import { ExternalLink, File, FileText, Headphones, MoreHorizontal, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
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
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Completed</Badge>;
      case "pending_review":
      case "pending review":
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Pending Review</Badge>;
      case "in_progress":
      case "in progress":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">In Progress</Badge>;
      case "rejected":
      case "needs_revision":
      case "needs revision":
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Needs Revision</Badge>;
      default:
        return <Badge className="bg-slate-600 text-white hover:bg-slate-700">{status}</Badge>;
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
        <div className="px-6 py-3 bg-black/40 border border-white/10">
          <h2 className="text-lg font-medium text-white">Recent Activities</h2>
        </div>
        <div className="flex justify-center py-8 bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="align-middle min-w-full overflow-x-auto shadow overflow-hidden sm:rounded-lg border border-white/10">
      <h2 className="px-6 py-3 text-lg font-medium text-white bg-black/40 border-b border-white/10">
        Recent Activities
      </h2>
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr className="bg-black/40">
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Task
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Updated
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-black/30 divide-y divide-gray-700">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {activity.task}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                  {activity.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(activity.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                  {getTimeAgo(activity.updatedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link 
                    to={getActionLink(activity)} 
                    className="text-primary-400 hover:text-primary-300"
                  >
                    {getActionText(activity)}
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-white/70 text-center">
                No recent activities found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
