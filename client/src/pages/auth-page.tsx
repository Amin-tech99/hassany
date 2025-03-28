import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export default function AuthPage() {
  const { user, isLoading, error } = useAuth();
  
  // Log authentication status for debugging
  console.log("Auth status:", { user, isLoading, error });
  
  // Force refetch on auth page to ensure correct state
  useEffect(() => {
    // Invalidate user query when auth page loads
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }, []);
  
  // Redirect to dashboard if already logged in
  if (user && !isLoading) {
    console.log("User is authenticated, redirecting to dashboard");
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Auth Form Column */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Hassaniya Arabic Transcription
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access the transcription platform
            </p>
          </div>
          <AuthForm />
        </div>
      </div>

      {/* Hero/Info Column */}
      <div className="flex-1 bg-gradient-to-r from-primary-700 to-primary-900 p-8 flex flex-col justify-center text-white hidden md:flex">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            Collaborative Speech-to-Text Transcription
          </h1>
          <p className="text-lg mb-8">
            A platform designed for teams to efficiently collect, process, and transcribe
            Hassaniya Arabic audio data for machine learning model training.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white text-primary-600 mr-3">
                ✓
              </div>
              <p>Efficient workflow management for team collaboration</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white text-primary-600 mr-3">
                ✓
              </div>
              <p>Advanced audio processing with automated segmentation</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white text-primary-600 mr-3">
                ✓
              </div>
              <p>Quality control with review and approval process</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white text-primary-600 mr-3">
                ✓
              </div>
              <p>Automated JSON export for machine learning models</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
