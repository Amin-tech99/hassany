import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
}

export function TranscriptionList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  // Extract status from URL if present
  const searchParams = new URLSearchParams(location.search);
  const urlStatus = searchParams.get("status");

  // Set filter from URL if not already set
  if (urlStatus && statusFilter === "all") {
    setStatusFilter(urlStatus);
  }

  // Prepare query parameters
  const queryParams = statusFilter !== "all" ? `?status=${statusFilter}` : "";

  const { data: transcriptionTasks, isLoading } = useQuery<TranscriptionTask[]>({
    queryKey: [`/api/transcriptions${queryParams}`],
  });

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      navigate("/transcriptions");
    } else {
      navigate(`/transcriptions?status=${value}`);
    }
    
    // Force refresh data when filter changes
    queryClient.invalidateQueries({ 
      queryKey: [`/api/transcriptions${value !== "all" ? `?status=${value}` : ""}`]
    });
  };

  // Format duration in seconds to "Xs" format
  const formatDuration = (durationInMs: number) => {
    return `${Math.round(durationInMs / 1000)}s`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Completed</Badge>;
      case "in_progress":
      case "in progress":
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">In Progress</Badge>;
      case "needs_revision":
      case "needs revision":
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Needs Revision</Badge>;
      case "pending_review":
      case "pending review":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Pending Review</Badge>;
      default:
        return <Badge className="bg-slate-600 text-white hover:bg-slate-700">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get action text based on status
  const getActionText = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
      case "in progress":
        return "Continue";
      case "needs_revision":
      case "needs revision":
        return "Edit";
      case "pending_review":
      case "pending review":
        return "Review";
      default:
        return "View";
    }
  };

  // Open transcription task
  const openTranscriptionTask = (taskId: number) => {
    // Directly navigate to the task with the segment ID
    navigate(`/transcriptions/${taskId}`);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">Transcriptions</h1>
          <p className="mt-2 text-sm text-white/70">
            A list of all transcription tasks assigned to you and their current status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px] bg-black/30 border-white/20 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/20 text-white">
              <SelectItem value="all" className="text-white hover:bg-white/10">All Tasks</SelectItem>
              <SelectItem value="assigned" className="text-white hover:bg-white/10">Assigned to Me</SelectItem>
              <SelectItem value="review" className="text-white hover:bg-white/10">Pending Review</SelectItem>
              <SelectItem value="completed" className="text-white hover:bg-white/10">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-white/10 ring-opacity-5 md:rounded-lg">
              {isLoading ? (
                <div className="flex justify-center py-8 bg-black/30">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-black/40">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">
                        Audio ID
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Duration
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Assigned To
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Due Date
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-black/30 divide-y divide-gray-700">
                    {transcriptionTasks && transcriptionTasks.length > 0 ? (
                      transcriptionTasks.map((task) => (
                        <tr key={task.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                            {task.audioId}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-white/70">
                            {formatDuration(task.duration)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-white/70">
                            {task.assignedTo}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {getStatusBadge(task.status)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-white/70">
                            {formatDate(task.dueDate)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => openTranscriptionTask(task.id)}
                              className="text-primary-400 hover:text-primary-300"
                            >
                              {getActionText(task.status)}
                              <span className="sr-only">, {task.audioId}</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-white/70 text-center">
                          No transcription tasks found.
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
