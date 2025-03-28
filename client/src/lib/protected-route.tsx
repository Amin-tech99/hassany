import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { queryClient } from "./queryClient";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
  allowedRoles = [],
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();
  
  // Refresh user data on route access
  useEffect(() => {
    if (!isLoading) {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check for admin access if required
  if (adminOnly && user.role !== 'admin') {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-center">
            You don't have permission to access this page. This area is restricted to administrators.
          </p>
        </div>
      </Route>
    );
  }

  // Check for allowed roles if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-center">
            You don't have permission to access this page. This area is restricted to specific roles.
          </p>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
