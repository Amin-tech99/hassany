import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Trash2, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CleanupResponse {
  message: string;
  filesRemoved: number;
  errors?: Array<{fileId: number, error: string}>;
}

export function CleanupStorage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/audio/cleanup");
      const data = await response.json();
      return data as CleanupResponse;
    },
    onSuccess: (data) => {
      toast({
        title: "Storage Cleanup",
        description: data.message,
      });
      
      // Refresh the audio files list
      queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
      
      // Hide confirmation
      setShowConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
      
      // Hide confirmation
      setShowConfirm(false);
    },
  });
  
  const handleCleanup = () => {
    if (showConfirm) {
      cleanupMutation.mutate();
    } else {
      setShowConfirm(true);
    }
  };
  
  const handleDownloadAll = async () => {
    try {
      setIsDownloading(true);
      
      toast({
        title: "Preparing Download",
        description: "Creating archive of all audio files. This may take a moment...",
      });
      
      // Use the apiRequest function to properly handle authentication
      const response = await apiRequest("GET", "/api/audio/export-all");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download audio files");
      }
      
      // Get the blob content
      const blob = await response.blob();
      
      // Create a download link for the blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      // Set attributes for download
      link.href = url;
      link.download = `audio-files-${new Date().toISOString().slice(0, 10)}.zip`;
      
      // Add to document, trigger click, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Success message
      toast({
        title: "Download Started",
        description: "Your audio files are being downloaded now."
      });
      
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Storage Management</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Download or remove processed audio files to manage storage space
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showConfirm ? (
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-400">Warning</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              This will permanently delete all processed audio files. 
              The transcriptions and segments data will remain in the database.
              This action cannot be undone.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Removing processed audio files can help free up storage space on your hosting service.
              Audio data will be removed from the filesystem, but transcriptions and metadata will be preserved.
            </p>
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-600 dark:text-blue-400">Backup Recommendation</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Consider downloading all audio files before cleanup to ensure you have a backup
                for future use or training purposes.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-b-lg">
        {!showConfirm && (
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={isDownloading || cleanupMutation.isPending}
            className="flex items-center"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download All
              </>
            )}
          </Button>
        )}
        
        {showConfirm && (
          <Button
            variant="outline"
            onClick={() => setShowConfirm(false)}
            disabled={cleanupMutation.isPending}
          >
            Cancel
          </Button>
        )}
        
        <Button
          variant={showConfirm ? "destructive" : "default"}
          onClick={handleCleanup}
          disabled={cleanupMutation.isPending || isDownloading}
          className="flex items-center"
        >
          {cleanupMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              {showConfirm ? "Confirm Cleanup" : "Clean Storage"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 