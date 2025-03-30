import { Link } from "react-router-dom";
import { ExternalLink, File, FileText, Headphones, MoreHorizontal, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

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
  
  // Track whether we're on mobile or not
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Mobile card view for activities
  const MobileActivityCard = ({ activity }: { activity: RecentActivity }) => (
    <Link to={getActionLink(activity)} className="block">
      <Card className="mb-3 bg-black/30 border-white/10 hover:bg-black/40 transition-colors duration-200">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="truncate mr-4">
              <h3 className="font-medium text-white text-sm truncate">{activity.task}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-white/70">{activity.type}</span>
                <span className="text-xs text-white/70">•</span>
                <span className="text-xs text-white/70">{getTimeAgo(activity.updatedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(activity.status)}
              <ChevronRight className="h-4 w-4 text-white/50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  if (isLoading) {
    return (
      <div className="align-middle min-w-full overflow-x-auto shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-3 sm:px-6 bg-black/40 border border-white/10">
          <h2 className="text-base sm:text-lg font-medium text-white">Recent Activities</h2>
        </div>
        <div className="flex justify-center py-8 bg-black/30">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Return mobile view
  if (isMobile) {
    return (
      <div className="overflow-hidden sm:rounded-lg border border-white/10">
        <h2 className="px-4 py-3 text-base font-medium text-white bg-black/40 border-b border-white/10">
          Recent Activities
        </h2>
        <div className="p-3 bg-black/30">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <MobileActivityCard key={activity.id} activity={activity} />
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-white/70 text-center">
              No recent activities found.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop table view
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
