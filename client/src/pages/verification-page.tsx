import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Filter, CheckSquare } from "lucide-react";
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

    // Filter out any invalid segment IDs
    const validIds = selectedTranscriptions.filter(id => id > 0);
    
    if (validIds.length === 0) {
      toast({
        title: "No Valid Segments",
        description: "Could not find valid segment IDs in your selection.",
        variant: "destructive",
      });
      return;
    }
    
    batchApproveMutation.mutate(validIds);
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
            Select multiple transcriptions to approve them all at once without needing to rate them individually.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Verification Tools</CardTitle>
            <CardDescription>Filter and select transcriptions for batch approval</CardDescription>
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