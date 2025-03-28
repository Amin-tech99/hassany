import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Extract status from URL if present
  const searchParams = new URLSearchParams(location.split("?")[1]);
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
      setLocation("/transcriptions");
    } else {
      setLocation(`/transcriptions?status=${value}`);
    }
  };

  // Format duration in seconds to "Xs" format
  const formatDuration = (durationInMs: number) => {
    return `${Math.round(durationInMs / 1000)}s`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "in_progress":
      case "in progress":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
      case "needs_revision":
      case "needs revision":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Needs Revision</Badge>;
      case "pending_review":
      case "pending review":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pending Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
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
    setLocation(`/transcriptions/${taskId}`);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Transcriptions</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all transcription tasks assigned to you and their current status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="assigned">Assigned to Me</SelectItem>
              <SelectItem value="review">Pending Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Audio ID
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Duration
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Assigned To
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Due Date
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {transcriptionTasks && transcriptionTasks.length > 0 ? (
                      transcriptionTasks.map((task) => (
                        <tr key={task.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {task.audioId}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDuration(task.duration)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {task.assignedTo}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {getStatusBadge(task.status)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(task.dueDate)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => openTranscriptionTask(task.id)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              {getActionText(task.status)}
                              <span className="sr-only">, {task.audioId}</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
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
