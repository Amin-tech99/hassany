import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, CheckCircle2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSummary {
  assigned: number;
  completed: number;
  pendingReview: number;
}

interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  linkText: string;
  linkHref: string;
  bgClass: string;
  iconClass: string;
}

function DashboardCard({
  title,
  value,
  icon,
  linkText,
  linkHref,
  bgClass,
  iconClass,
}: DashboardCardProps) {
  return (
    <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", bgClass)}>
            <div className={iconClass}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
        <div className="text-sm">
          <Link href={linkHref}>
            <a className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">
              {linkText}
              <span className="sr-only"> {title}</span>
            </a>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export function DashboardCards() {
  const { data: taskSummary, isLoading } = useQuery<TaskSummary>({
    queryKey: ["/api/tasks/summary"],
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white dark:bg-gray-900 overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Default values in case the API fails
  const assigned = taskSummary?.assigned || 0;
  const completed = taskSummary?.completed || 0;
  const pendingReview = taskSummary?.pendingReview || 0;
  
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardCard
        title="Assigned Tasks"
        value={assigned}
        icon={<FileText className="h-6 w-6" />}
        linkText="View all tasks"
        linkHref="/transcriptions"
        bgClass="bg-primary-100/80 dark:bg-primary-900/20"
        iconClass="text-primary-600 dark:text-primary-400"
      />
      
      <DashboardCard
        title="Completed Tasks"
        value={completed}
        icon={<CheckCircle2 className="h-6 w-6" />}
        linkText="View completed"
        linkHref="/transcriptions?status=completed"
        bgClass="bg-emerald-100/80 dark:bg-emerald-900/20"
        iconClass="text-emerald-600 dark:text-emerald-400"
      />
      
      <DashboardCard
        title="Pending Review"
        value={pendingReview}
        icon={<Clock className="h-6 w-6" />}
        linkText="View pending reviews"
        linkHref="/transcriptions?status=review"
        bgClass="bg-amber-100/80 dark:bg-amber-900/20"
        iconClass="text-amber-600 dark:text-amber-400"
      />
    </div>
  );
}
