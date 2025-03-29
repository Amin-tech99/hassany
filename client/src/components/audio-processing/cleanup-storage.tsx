import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Trash2, AlertTriangle, Download, ExternalLink } from "lucide-react";
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
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [showBackupOption, setShowBackupOption] = useState(false);
  
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
        description: "Starting token-based download...",
      });
      
      await handleTokenDownload();
      
    } catch (error) {
      setIsDownloading(false);
      setShowBackupOption(true);
      
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      
      console.error("Download error details:", error);
    }
  };
  
  const handleTokenDownload = async () => {
    try {
      setIsGeneratingToken(true);
      
      // Use fetch directly for debugging
      const response = await fetch("/api/audio/create-download-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include" // Include cookies
      });
      
      // Log raw response for debugging
      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error("Server returned invalid response: " + responseText.substring(0, 100));
      }
      
      if (!data.token) {
        throw new Error("No token in response: " + JSON.stringify(data));
      }
      
      // Log token and open download URL
      console.log("Token received:", data.token);
      window.open(`/api/audio/download/${data.token}`, '_blank');
      
      toast({
        title: "Download Started",
        description: "Check your browser for the download"
      });
      
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingToken(false);
      setIsDownloading(false);
      setShowBackupOption(true);
    }
  };
  
  const handleRetryTokenDownload = async () => {
    try {
      setIsGeneratingToken(true);
      
      toast({
        title: "Retrying Download",
        description: "Generating a new download token...",
      });
      
      await handleTokenDownload();
      
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: error instanceof Error ? error.message : "Failed to generate download token",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingToken(false);
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
            
            {showBackupOption && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900 mt-4">
                <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-600 dark:text-green-400">Download Help</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300 space-y-4">
                  <p>
                    If the download didn't start automatically, please check your browser's popup settings and try again:
                  </p>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetryTokenDownload}
                    disabled={isGeneratingToken}
                    className="mt-2 bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 border-green-300 dark:border-green-700"
                  >
                    {isGeneratingToken ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Token...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Retry Download
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs mt-2">
                    Note: Downloads may be disabled by your browser's popup blocker. 
                    If you see a popup notification, please allow the popup and try again.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-b-lg">
        {!showConfirm && (
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={isDownloading || isGeneratingToken || cleanupMutation.isPending}
            className="flex items-center"
          >
            {isDownloading || isGeneratingToken ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isGeneratingToken ? "Generating Token..." : "Preparing..."}
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
          disabled={cleanupMutation.isPending || isDownloading || isGeneratingToken}
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