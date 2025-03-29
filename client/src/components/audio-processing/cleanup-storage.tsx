import { useState, useRef, useEffect } from "react";
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
  const downloadFrameRef = useRef<HTMLIFrameElement>(null);
  
  // This ensures authentication is maintained for downloads
  useEffect(() => {
    // Create a dummy request to keep session alive
    const keepSessionAlive = async () => {
      try {
        await apiRequest("GET", "/api/user/current");
      } catch (error) {
        console.error("Error refreshing session:", error);
      }
    };
    
    // Call once when component mounts
    keepSessionAlive();
  }, []);
  
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
      
      // Use a hidden iframe to handle the download with credentials
      // This works better than the blob approach because it maintains the session
      if (downloadFrameRef.current) {
        // Set the src to the export endpoint
        downloadFrameRef.current.src = "/api/audio/export-all";
        
        // Show a success message after a delay to allow download to start
        setTimeout(() => {
          setIsDownloading(false);
          toast({
            title: "Download Started",
            description: "If the download didn't start automatically, please check your browser settings."
          });
        }, 5000);
      } else {
        throw new Error("Download frame not available");
      }
      
    } catch (error) {
      setIsDownloading(false);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      
      // Log additional debug information
      console.error("Download error details:", {
        error,
        cookiesPresent: document.cookie.length > 0,
        iframeRef: downloadFrameRef.current ? "Available" : "Not available"
      });
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
        
        {/* Hidden iframe for downloads */}
        <iframe 
          ref={downloadFrameRef} 
          style={{ display: 'none' }} 
          title="download-frame"
        />
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