import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
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
  
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<CleanupResponse>("POST", "/api/audio/cleanup");
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
  
  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Storage Management</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Remove processed audio files to free up storage space
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
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Removing processed audio files can help free up storage space on your hosting service.
            Audio data will be removed from the filesystem, but transcriptions and metadata will be preserved.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-b-lg">
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
          disabled={cleanupMutation.isPending}
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