import { Routes, Route, Navigate } from "react-router-dom";
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

function Router() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/transcriptions" element={<ProtectedRoute><TranscriptionsPage /></ProtectedRoute>} />
      <Route path="/transcriptions/:id" element={<ProtectedRoute><TranscriptionsPage /></ProtectedRoute>} />
      <Route path="/audio-processing" element={<ProtectedRoute><AudioProcessingPage /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute adminOnly={true}><TeamManagementPage /></ProtectedRoute>} />
      <Route path="/export" element={<ProtectedRoute adminOnly={true}><ExportDataPage /></ProtectedRoute>} />
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
