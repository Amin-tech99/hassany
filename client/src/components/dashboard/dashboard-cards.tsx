import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  linkText: string;
  linkHref: string;
  className?: string;
}

function DashboardCard({
  title,
  value,
  icon,
  linkText,
  linkHref,
  className = "",
}: DashboardCardProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${className}`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-semibold text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-6 py-4">
        <div className="text-sm">
          <Link href={linkHref}>
            <a className="font-medium text-primary-600 hover:text-primary-500">
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
  const { data: taskSummary, isLoading } = useQuery({
    queryKey: ["/api/tasks/summary"],
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white overflow-hidden shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
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
        icon={<FileText className="h-6 w-6 text-primary-600" />}
        linkText="View all tasks"
        linkHref="/transcriptions"
        className="bg-primary-100"
      />
      
      <DashboardCard
        title="Completed Tasks"
        value={completed}
        icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
        linkText="View completed"
        linkHref="/transcriptions?status=completed"
        className="bg-green-100"
      />
      
      <DashboardCard
        title="Pending Review"
        value={pendingReview}
        icon={<Clock className="h-6 w-6 text-yellow-600" />}
        linkText="View pending reviews"
        linkHref="/transcriptions?status=review"
        className="bg-yellow-100"
      />
    </div>
  );
}
// Lucide icons used with the component
function FileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

