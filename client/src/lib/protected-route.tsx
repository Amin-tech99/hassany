import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { queryClient } from "./queryClient";
import { useEffect, ReactNode } from "react";

type ProtectedRouteProps = {
  children: ReactNode;
  adminOnly?: boolean;
  allowedRoles?: string[];
};

export function ProtectedRoute({
  children,
  adminOnly = false,
  allowedRoles = []
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Refresh user data on route access
  useEffect(() => {
    if (!isLoading) {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check for admin access if required
  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600 text-center">
          You don't have permission to access this page. This area is restricted to administrators.
        </p>
      </div>
    );
  }

  // Check for allowed roles if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600 text-center">
          You don't have permission to access this page. This area is restricted to specific roles.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
