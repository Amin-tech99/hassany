import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAudioProcessor } from "@/hooks/use-audio-processor";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AudioFile {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string;
  status: string;
  segments: number;
  processingProgress?: number;
}

export function ProcessingQueue() {
  const { cancelProcessing, deleteAudio, isCancelling, isDeleting } = useAudioProcessor();
  const { toast } = useToast();
  const [downloadingSegmentId, setDownloadingSegmentId] = useState<number | null>(null);
  
  const { data: audioFiles, isLoading } = useQuery<AudioFile[]>({
    queryKey: ["/api/audio"],
  });
  
  // Format file size to human-readable format
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string, progress?: number) => {
    switch (status.toLowerCase()) {
      case "processed":
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Processed</Badge>;
      case "processing":
        return (
          <div className="flex items-center">
            <Badge className="mr-2 bg-blue-600 text-white hover:bg-blue-700">Processing</Badge>
            {progress !== undefined && <span className="text-xs text-white/70">{progress}%</span>}
          </div>
        );
      case "error":
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Error</Badge>;
      case "uploading":
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Uploading</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Handle cancel processing
  const handleCancelProcessing = (fileId: number) => {
    cancelProcessing(fileId);
  };
  
  // Handle download segments
  const handleDownloadSegments = async (fileId: number, filename: string) => {
    setDownloadingSegmentId(fileId);
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      console.log("Retrieved token:", token);
      
      if (!token) {
        throw new Error('Authentication failed: Token not found in storage.');
      }

      // IMPORTANT: Ensure the token has the "Bearer " prefix
      let authHeaderValue = token;
      if (!token.startsWith('Bearer ')) {
        authHeaderValue = 'Bearer ' + token;
      }
      
      console.log("Using Authorization header:", authHeaderValue.substring(0, 20) + "...");

      const response = await fetch(`/api/audio/${fileId}/segments/download`, {
        method: 'GET',
        headers: {
          'Authorization': authHeaderValue
        },
      });

      if (!response.ok) {
        let errorMsg = `Download failed: ${response.statusText || 'Server error'}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg; 
        } catch (e) {
            // If response is not JSON, use the status text
        }
        console.error('Download error response status:', response.status);
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      
      // Try to get filename from Content-Disposition, fallback to a generated name
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = `segments_audio_file_${fileId}.zip`; // Default
      if (contentDisposition) {
        const filenameRegex = /filename[^;=\n]*=((['"])(.*?)\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[3]) {
          downloadFilename = matches[3];
        } else {
          // Handle filename*=UTF-8'' format
          const utf8FilenameRegex = /filename\*\s*=\s*UTF-8''(.*?)(?:;|$)/i;
          const utf8Matches = utf8FilenameRegex.exec(contentDisposition);
          if (utf8Matches != null && utf8Matches[1]) {
            try {
               downloadFilename = decodeURIComponent(utf8Matches[1]);
            } catch (e) {
               console.warn("Failed to decode UTF-8 filename");
            }
          }
        }
      }
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

    } catch (error: any) {
      console.error('Segment download error:', error);
      toast({
        title: "Segment Download Failed",
        description: error.message || "Failed to download the segment archive. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadingSegmentId(null);
    }
  };
  
  // Handle delete audio
  const handleDeleteAudio = (fileId: number) => {
    if (confirm("Are you sure you want to delete this audio file? This action cannot be undone.")) {
      deleteAudio(fileId);
    }
  };
  
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-white">Processing Queue</h3>
      <div className="mt-2 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {isLoading ? (
                <div className="flex justify-center py-8 bg-black/30 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-black/20">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">
                        File Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Size
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Uploaded
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Segments
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-black/20 backdrop-blur-sm">
                    {audioFiles && audioFiles.length > 0 ? (
                      audioFiles.map((file) => (
                        <tr key={file.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                            {file.filename}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-white/70">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-white/70">
                            {formatDate(file.uploadedAt)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {getStatusBadge(file.status, file.processingProgress)}
                            {file.status.toLowerCase() === "processing" && file.processingProgress !== undefined && (
                              <div className="mt-1 w-full bg-gray-600 rounded-full h-1.5">
                                <Progress value={file.processingProgress} className="h-1.5" />
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-white/70">
                            {file.segments || "--"}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Delete button - first in the row to make it always visible */}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteAudio(file.id)}
                                disabled={isDeleting}
                                title="Delete file"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    <span>Delete</span>
                                  </>
                                )}
                              </Button>
                            
                              {file.status.toLowerCase() === "processing" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelProcessing(file.id)}
                                  disabled={isCancelling}
                                >
                                  {isCancelling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Cancel"
                                  )}
                                </Button>
                              ) : file.status.toLowerCase() === "processed" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadSegments(file.id, file.filename)}
                                  disabled={downloadingSegmentId === file.id}
                                  className={cn(
                                    "flex items-center text-sm px-3 py-1 h-8",
                                    "bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100",
                                    "dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800 dark:hover:bg-primary-900/30"
                                  )}
                                >
                                  {downloadingSegmentId === file.id ? (
                                    <>
                                      <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2" />
                                      <span>Downloading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-1" />
                                      <span>Download Segments</span>
                                    </>
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-white/50 text-center">
                          No audio files found. Upload an audio file to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
