import { Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import TranscriptionsPage from "@/pages/transcriptions-page";
import AudioProcessingPage from "@/pages/audio-processing-page";
import TeamManagementPage from "@/pages/team-management-page";
import ExportDataPage from "@/pages/export-data-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transcriptions" element={<TranscriptionsPage />} />
        <Route path="/transcriptions/:id" element={<TranscriptionsPage />} />
        <Route path="/audio-processing" element={<AudioProcessingPage />} />
      </Route>
      <Route element={<ProtectedRoute adminOnly={true}><MainLayout /></ProtectedRoute>}>
        <Route path="/team" element={<TeamManagementPage />} />
        <Route path="/export" element={<ExportDataPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
