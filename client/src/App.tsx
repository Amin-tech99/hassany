import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import TranscriptionsPage from "@/pages/transcriptions-page";
import AudioProcessingPage from "@/pages/audio-processing-page";
import TeamManagementPage from "@/pages/team-management-page";
import ExportDataPage from "@/pages/export-data-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./components/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/transcriptions" component={TranscriptionsPage} />
      <ProtectedRoute path="/transcriptions/:id" component={TranscriptionsPage} />
      <ProtectedRoute path="/audio-processing" component={AudioProcessingPage} />
      <ProtectedRoute path="/team" component={TeamManagementPage} adminOnly={true} />
      <ProtectedRoute path="/export" component={ExportDataPage} adminOnly={true} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
