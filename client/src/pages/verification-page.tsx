import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Filter, CheckSquare, Download, Music } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TranscriptionTask {
  id: number;
  audioId: string;
  duration: number;
  assignedTo: string;
  status: string;
  dueDate: string;
  text?: string;
}

export default function VerificationPage() {
  const [selectedTranscriptions, setSelectedTranscriptions] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("transcribed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get transcriptions based on status
  const { data: transcriptionTasks, isLoading } = useQuery<TranscriptionTask[]>({
    queryKey: [`/api/transcriptions?status=${statusFilter}`],
  });

  // Load saved selection from localStorage
  useEffect(() => {
    const savedSelection = localStorage.getItem('selectedTranscriptions');
    if (savedSelection) {
      try {
        const parsed = JSON.parse(savedSelection);
        if (Array.isArray(parsed)) {
          setSelectedTranscriptions(parsed);
        }
      } catch (error) {
        console.error("Error loading saved selection:", error);
      }
    }
  }, []);

  // Save selection to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedTranscriptions', JSON.stringify(selectedTranscriptions));
  }, [selectedTranscriptions]);

  // Toggle selection of a transcription
  const toggleSelection = (id: number) => {
    setSelectedTranscriptions(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Toggle all transcriptions
  const toggleAll = () => {
    if (!transcriptionTasks) return;
    
    if (selectedTranscriptions.length === transcriptionTasks.length) {
      // Deselect all
      setSelectedTranscriptions([]);
    } else {
      // Select all - using segment IDs instead of task IDs
      const segmentIds = transcriptionTasks.map(task => getSegmentIdFromAudioId(task.audioId));
      setSelectedTranscriptions(segmentIds);
    }
  };

  // Batch approve mutation
  const batchApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      setIsSubmitting(true);
      // Add logging to see what IDs are being sent
      console.log("Sending IDs for batch approval:", ids);
      return apiRequest("POST", "/api/transcriptions/batch-approve", { ids });
    },
    onSuccess: (response) => {
      console.log("Batch approval response:", response);
      toast({
        title: "Batch Approval Successful",
        description: `Successfully approved ${selectedTranscriptions.length} transcriptions.`,
      });
      setSelectedTranscriptions([]);
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/summary"] });
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      console.error("Batch approval error:", error);
      toast({
        title: "Batch Approval Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  // Handle approve button click
  const handleApprove = () => {
    if (selectedTranscriptions.length === 0) {
      toast({
        title: "No Transcriptions Selected",
        description: "Please select at least one transcription to approve.",
        variant: "destructive",
      });
      return;
    }

    // Log original selection for debugging
    console.log("Original selection:", selectedTranscriptions);
    
    // Filter out any invalid segment IDs and ensure proper format
    const validIds = selectedTranscriptions
      .map(id => formatSegmentId(id))
      .filter(id => id > 0);
    
    console.log("Selected IDs:", selectedTranscriptions);
    console.log("Valid segment IDs for approval:", validIds);
    
    if (validIds.length === 0) {
      toast({
        title: "No Valid Segments",
        description: "Could not find valid segment IDs in your selection.",
        variant: "destructive",
      });
      return;
    }
    
    // Let user know we're processing
    toast({
      title: "Processing Approval",
      description: `Approving ${validIds.length} transcriptions...`,
    });
    
    batchApproveMutation.mutate(validIds);
  };

  // Download selected transcriptions
  const downloadSelectedMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      setIsDownloading(true);
      // Add logging to see what IDs are being sent
      console.log("Downloading transcriptions with IDs:", ids);
      
      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication failed: Please log in again');
      }

      // Create URL with query parameters for segment IDs
      const queryString = ids.map(id => `id=${id}`).join('&');
      const url = `/api/transcriptions/download?${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        throw new Error(`Download failed: ${response.statusText || 'Server error'}`);
      }

      const blob = await response.blob();
      
      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = contentDisposition ? filenameRegex.exec(contentDisposition) : null;
      const filename = matches && matches[1] ? matches[1].replace(/['"]/g, '') : 'segments.json';
      
      // Create a download link and trigger download
      const url2 = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url2;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url2);
      document.body.removeChild(link);
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Download Successful",
        description: "Transcriptions have been downloaded in JSON format.",
      });
      setIsDownloading(false);
    },
    onError: (error: Error) => {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsDownloading(false);
    }
  });

  // Handle download button click
  const handleDownload = () => {
    if (selectedTranscriptions.length === 0) {
      toast({
        title: "No Transcriptions Selected",
        description: "Please select at least one transcription to download.",
        variant: "destructive",
      });
      return;
    }

    // Log original selection for debugging
    console.log("Original selection:", selectedTranscriptions);
    
    // Filter out any invalid segment IDs and ensure proper format
    const validIds = selectedTranscriptions
      .map(id => formatSegmentId(id))
      .filter(id => id > 0);
    
    console.log("Selected IDs:", selectedTranscriptions);
    console.log("Valid segment IDs for download:", validIds);
    
    if (validIds.length === 0) {
      toast({
        title: "No Valid Segments",
        description: "Could not find valid segment IDs in your selection.",
        variant: "destructive",
      });
      return;
    }
    
    // Let user know we're processing
    toast({
      title: "Processing Download",
      description: `Preparing ${validIds.length} transcriptions for download...`,
    });
    
    downloadSelectedMutation.mutate(validIds);
  };

  // Download selected audio segments
  const downloadAudioMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      setIsDownloadingAudio(true);
      // Add logging to see what IDs are being sent
      console.log("Downloading audio segments with IDs:", ids);
      
      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication failed: Please log in again');
      }

      // Format segment IDs to ensure they're in the correct format
      // Create URL with query parameters for segment IDs
      const queryString = ids.map(id => `id=${id}`).join('&');
      const url = `/api/segments/download-audio?${queryString}`;

      try {
        console.log("Sending request to:", url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          let errorMessage = `Download failed: ${response.statusText || 'Server error'}`;
          
          try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
            console.error('Download error response:', errorData);
          } catch (parseError) {
            // If response is not JSON, try to get text
            const errorText = await response.text();
            console.error('Download error text response:', errorText);
          }
          
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        
        // Get filename from Content-Disposition header if available
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = contentDisposition ? filenameRegex.exec(contentDisposition) : null;
        const filename = matches && matches[1] ? matches[1].replace(/['"]/g, '') : 'audio_segments.zip';
        
        // Create a download link and trigger download
        const url2 = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url2;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url2);
        document.body.removeChild(link);
        
        return true;
      } catch (error) {
        console.error('Download error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Download Successful",
        description: "Audio segments have been downloaded as a ZIP file.",
      });
      setIsDownloadingAudio(false);
    },
    onError: (error: Error) => {
      console.error("Download audio error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download audio segments. Please try again.",
        variant: "destructive",
      });
      setIsDownloadingAudio(false);
    }
  });

  // Format segment ID for API calls - ensuring ID is properly extracted 
  const formatSegmentId = (id: number | string): number => {
    if (typeof id === 'number') return id;
    
    if (typeof id === 'string' && id.includes('Segment_')) {
      const match = id.match(/Segment_(\d+)/i);
      return match && match[1] ? parseInt(match[1], 10) : 0;
    }
    
    return parseInt(id as string) || 0;
  };

  // Handle download audio button click
  const handleDownloadAudio = () => {
    if (selectedTranscriptions.length === 0) {
      toast({
        title: "No Segments Selected",
        description: "Please select at least one segment to download the audio.",
        variant: "destructive",
      });
      return;
    }

    // Log original selection for debugging
    console.log("Original selection:", selectedTranscriptions);
    
    // Filter out any invalid segment IDs and ensure proper format
    const validIds = selectedTranscriptions
      .map(id => formatSegmentId(id))
      .filter(id => id > 0);
    
    console.log("Selected IDs:", selectedTranscriptions);
    console.log("Valid segment IDs for download:", validIds);
    
    if (validIds.length === 0) {
      toast({
        title: "No Valid Segments",
        description: "Could not find valid segment IDs in your selection.",
        variant: "destructive",
      });
      return;
    }
    
    // Let user know we're processing
    toast({
      title: "Processing Download",
      description: `Preparing ${validIds.length} audio segments for download...`,
    });
    
    downloadAudioMutation.mutate(validIds);
  };

  // Format duration in seconds
  const formatDuration = (durationInMs: number) => {
    return `${Math.round(durationInMs / 1000)}s`;
  };

  // Extract segment ID from audioId string
  const getSegmentIdFromAudioId = (audioId: string): number => {
    if (!audioId) return 0;
    
    try {
      const match = audioId.match(/Segment_(\d+)/i);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        return isNaN(id) ? 0 : id;
      }
      return 0;
    } catch (error) {
      console.error("Error extracting segment ID from", audioId, error);
      return 0;
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Batch Verification</h1>
          <p className="mt-2 text-sm text-gray-700">
            Select multiple transcriptions to approve them, download JSON, or download audio files.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Verification Tools</CardTitle>
            <CardDescription>Filter, select, approve and download transcriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transcribed">Pending Review</SelectItem>
                    <SelectItem value="assigned">In Progress</SelectItem>
                    <SelectItem value="reviewed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 sm:ml-6">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleAll}
                  className="whitespace-nowrap"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {transcriptionTasks && selectedTranscriptions.length > 0 && 
                   selectedTranscriptions.length >= transcriptionTasks.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                
                <Button 
                  onClick={handleApprove}
                  disabled={selectedTranscriptions.length === 0 || isSubmitting}
                  className="whitespace-nowrap bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Approve Selected ({selectedTranscriptions.length})
                </Button>

                <Button 
                  onClick={handleDownload}
                  disabled={selectedTranscriptions.length === 0 || isDownloading}
                  className="whitespace-nowrap bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download JSON
                </Button>

                <Button 
                  onClick={handleDownloadAudio}
                  disabled={selectedTranscriptions.length === 0 || isDownloadingAudio}
                  className="whitespace-nowrap bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {isDownloadingAudio ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Music className="mr-2 h-4 w-4" />
                  )}
                  Download Audio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white shadow overflow-hidden rounded-lg">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Checkbox 
                        checked={
                          transcriptionTasks && 
                          transcriptionTasks.length > 0 && 
                          selectedTranscriptions.length >= transcriptionTasks.length
                        }
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcriber
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transcriptionTasks && transcriptionTasks.length > 0 ? (
                    transcriptionTasks.map((task) => {
                      const segmentId = getSegmentIdFromAudioId(task.audioId);
                      return (
                        <tr 
                          key={task.id}
                          className={cn(
                            "hover:bg-gray-50 cursor-pointer",
                            selectedTranscriptions.includes(segmentId) && "bg-primary-50"
                          )}
                          onClick={() => toggleSelection(segmentId)}
                        >
                          <td className="pl-6 py-4 whitespace-nowrap">
                            <Checkbox 
                              checked={selectedTranscriptions.includes(segmentId)}
                              onCheckedChange={() => toggleSelection(segmentId)}
                              aria-label={`Select transcription ${task.id}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {task.audioId}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(task.duration)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {task.assignedTo}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={cn(
                              "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                              task.status === "transcribed" && "bg-yellow-100 text-yellow-800",
                              task.status === "assigned" && "bg-blue-100 text-blue-800",
                              task.status === "reviewed" && "bg-green-100 text-green-800"
                            )}>
                              {task.status === "transcribed" ? "Pending Review" :
                               task.status === "assigned" ? "In Progress" :
                               task.status === "reviewed" ? "Completed" : task.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        No transcriptions found matching the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 