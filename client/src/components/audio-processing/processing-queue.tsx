import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAudioProcessor } from "@/hooks/use-audio-processor";
import { Progress } from "@/components/ui/progress";

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
  const { cancelProcessing, isCancelling } = useAudioProcessor();
  
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Processed</Badge>;
      case "processing":
        return (
          <div className="flex items-center">
            <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>
            {progress !== undefined && <span className="text-xs text-gray-500">{progress}%</span>}
          </div>
        );
      case "error":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Error</Badge>;
      case "uploading":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Uploading</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Handle view details
  const handleViewDetails = (fileId: number) => {
    // Navigate to file details view
    window.location.href = `/audio-processing?file=${fileId}`;
  };
  
  // Handle cancel processing
  const handleCancelProcessing = (fileId: number) => {
    cancelProcessing(fileId);
  };
  
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900">Processing Queue</h3>
      <div className="mt-2 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {isLoading ? (
                <div className="flex justify-center py-8 bg-white">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        File Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Size
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Uploaded
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Segments
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {audioFiles && audioFiles.length > 0 ? (
                      audioFiles.map((file) => (
                        <tr key={file.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {file.filename}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(file.uploadedAt)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {getStatusBadge(file.status, file.processingProgress)}
                            {file.status.toLowerCase() === "processing" && file.processingProgress !== undefined && (
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                <Progress value={file.processingProgress} className="h-1.5" />
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {file.segments || "--"}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            {file.status.toLowerCase() === "processing" ? (
                              <Button
                                variant="destructive"
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
                            ) : (
                              <Button
                                variant="link"
                                className="text-primary-600 hover:text-primary-900"
                                onClick={() => handleViewDetails(file.id)}
                              >
                                View Details
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
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
