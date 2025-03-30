import { MainLayout } from "@/components/layout/main-layout";
import { AudioUpload } from "@/components/audio-processing/audio-upload";
import { ProcessingQueue } from "@/components/audio-processing/processing-queue";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface AudioFileDetails {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string;
  status: string;
  segments: number;
  processingProgress?: number;
  segmentsList?: Array<{
    id: number;
    startTime: number;
    endTime: number;
    duration: number;
    status: string;
  }>;
}

export default function AudioProcessingPage() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("file");
  const [downloadingSegmentId, setDownloadingSegmentId] = useState<number | null>(null);
  const { toast } = useToast();

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

  // Format time in seconds to MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  // Handle download segments
  const handleDownloadSegments = async (fileId: number, filename: string) => {
    setDownloadingSegmentId(fileId);
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication failed: Token not found in storage.');
      }

      // IMPORTANT: Ensure the token has the "Bearer " prefix
      let authHeaderValue = token;
      if (!token.startsWith('Bearer ')) {
        authHeaderValue = 'Bearer ' + token;
      }

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
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      
      // Try to get filename from Content-Disposition, fallback to a generated name
      let downloadFilename = `segments_audio_file_${fileId}.zip`;
      
      if (filename) {
        // Remove file extension and add our own
        const baseFilename = filename.replace(/\.[^/.]+$/, "");
        downloadFilename = `${baseFilename}_segments.zip`;
      }
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download successful",
        description: "Audio segments downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setDownloadingSegmentId(null);
    }
  };

  // Fetch file details if fileId is provided
  const { data: fileDetails, isLoading: isLoadingDetails } = useQuery<AudioFileDetails>({
    queryKey: ["/api/audio", fileId],
    queryFn: async () => {
      if (!fileId) return null;
      const response = await fetch(`/api/audio/${fileId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audio file details");
      }
      return response.json();
    },
    enabled: !!fileId,
  });

  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        {fileId && fileDetails ? (
          <div>
            <div className="sm:flex sm:items-center mb-6">
              <div className="sm:flex-auto">
                <div className="flex items-center gap-3">
                  <Link to="/audio-processing">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Back to Processing Queue
                    </Button>
                  </Link>
                  <h1 className="text-2xl font-semibold text-gray-900">Audio File Details</h1>
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  View details and segments for this audio file.
                </p>
              </div>
            </div>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>File Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Filename</dt>
                        <dd className="mt-1 text-sm text-gray-900">{fileDetails.filename}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(fileDetails.uploadedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Size</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatFileSize(fileDetails.size)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">{getStatusBadge(fileDetails.status, fileDetails.processingProgress)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Segments</dt>
                        <dd className="mt-1 text-sm text-gray-900">{fileDetails.segments || "--"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Actions</dt>
                        <dd className="mt-1">
                          {fileDetails.status.toLowerCase() === "processed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadSegments(fileDetails.id, fileDetails.filename)}
                              disabled={downloadingSegmentId === fileDetails.id}
                              className="flex items-center gap-2"
                            >
                              {downloadingSegmentId === fileDetails.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              Download Segments
                            </Button>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {fileDetails.segmentsList && fileDetails.segmentsList.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Segments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Segment #
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Start Time
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                End Time
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Duration
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {fileDetails.segmentsList.map((segment, index) => (
                              <tr key={segment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatTime(segment.startTime)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatTime(segment.endTime)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatTime(segment.duration)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {getStatusBadge(segment.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h1 className="text-2xl font-semibold text-gray-900">Audio Processing</h1>
                <p className="mt-2 text-sm text-gray-700">
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
          </>
        )}
      </div>
    </MainLayout>
  );
}
