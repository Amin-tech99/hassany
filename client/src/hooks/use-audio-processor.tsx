import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Retrieve the JWT token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

interface UploadOptions {
  onSuccess?: () => void;
}

export function useAudioProcessor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Upload and process audio file
  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("audio", file);

      // Custom fetch with progress monitoring
      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", "/api/audio/upload", true);
        xhr.setRequestHeader("Accept", "application/json");
        
        // Add Authorization header if token exists
        const token = getAuthToken();
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          console.log("Adding auth token to upload request");
        } else {
          console.warn("No auth token available for upload request");
        }
        
        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            // Try to get more detailed error message from response
            let errorMessage = "Upload failed";
            try {
              if (xhr.responseText) {
                const response = JSON.parse(xhr.responseText);
                errorMessage = response.message || xhr.statusText || errorMessage;
              }
            } catch (e) {
              errorMessage = xhr.statusText || errorMessage;
            }
            
            console.error("Upload error:", xhr.status, errorMessage);
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error occurred"));
        };

        xhr.send(formData);
      });
    },
    onSuccess: () => {
      // Reset progress
      setUploadProgress(0);
      
      // Invalidate queries to refresh audio file list
      queryClient.invalidateQueries({ queryKey: ['/api/audio'] });
      
      toast({
        title: "Audio uploaded successfully",
        description: "Your audio file is being processed. You'll be notified when it's ready.",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Cancel processing
  const cancelProcessingMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest("POST", `/api/audio/${fileId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio'] });
      
      toast({
        title: "Processing cancelled",
        description: "The audio processing has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancel failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Upload audio file
  const uploadAudio = (file: File, options?: UploadOptions) => {
    uploadAudioMutation.mutate(file, {
      onSuccess: options?.onSuccess,
    });
  };

  // Cancel processing of an audio file
  const cancelProcessing = (fileId: number) => {
    cancelProcessingMutation.mutate(fileId);
  };

  return {
    uploadAudio,
    cancelProcessing,
    uploadProgress,
    isUploading: uploadAudioMutation.isPending,
    isCancelling: cancelProcessingMutation.isPending,
    uploadError: uploadAudioMutation.error,
  };
}
