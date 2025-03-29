import { MainLayout } from "@/components/layout/main-layout";
import { AudioUpload } from "@/components/audio-processing/audio-upload";
import { ProcessingQueue } from "@/components/audio-processing/processing-queue";
import { CleanupStorage } from "@/components/audio-processing/cleanup-storage";
import { useAuth } from "@/hooks/use-auth";

export default function AudioProcessingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Audio Processing</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Upload and process audio files to prepare them for transcription.
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mt-6">
          <AudioUpload />
        </div>

        {/* Processing Queue */}
        <div className="mt-8">
          <ProcessingQueue />
        </div>

        {/* Storage Management - Only for admins */}
        {isAdmin && (
          <div className="mt-8">
            <CleanupStorage />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
