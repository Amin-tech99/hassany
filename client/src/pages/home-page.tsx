import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import DashboardPage from "./dashboard-page";

// This component serves as a redirect to the dashboard page
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If we're here, user is authenticated (thanks to ProtectedRoute)
    // Just navigate to dashboard
    navigate("/");
  }, [navigate]);

  // Return the dashboard while waiting for navigation
  return <DashboardPage />;
}
