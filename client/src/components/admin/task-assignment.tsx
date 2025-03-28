import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types for available segments and users
interface AudioSegment {
  id: number;
  audioFileId: number;
  duration: number;
  status: string;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export function TaskAssignment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  // Fetch available segments
  const { 
    data: availableSegments, 
    isLoading: isLoadingSegments 
  } = useQuery<AudioSegment[]>({
    queryKey: ["/api/admin/available-segments"],
  });

  // Fetch users who can be assigned (transcribers)
  const { 
    data: users, 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (data) => data.filter(user => 
      user.role === "transcriber" || user.role === "reviewer"
    ),
  });

  // Mutation for assigning segment
  const assignMutation = useMutation({
    mutationFn: async ({ segmentIds, userId }: { segmentIds: number[], userId: number }) => {
      // Use the bulk assignment endpoint instead of individual calls
      const response = await apiRequest("POST", "/api/admin/assign-segments", { 
        segmentIds, 
        userId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Show success message with details
      toast({
        title: "Tasks assigned successfully",
        description: `${data.success} audio segment(s) have been assigned to the selected user.${data.errors ? ` (${data.errors.length} failed)` : ''}`,
      });
      
      // Reset selections
      setSelectedSegments([]);
      setSelectedUser(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/available-segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign tasks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format duration in seconds to "Xs" format
  const formatDuration = (durationInMs: number) => {
    return `${Math.round(durationInMs / 1000)}s`;
  };

  // Handle segment selection/deselection
  const handleSegmentSelect = (segmentId: number) => {
    setSelectedSegments(prevSelected => {
      // If already selected, remove it
      if (prevSelected.includes(segmentId)) {
        return prevSelected.filter(id => id !== segmentId);
      }
      // Otherwise add it
      return [...prevSelected, segmentId];
    });
  };

  // Toggle select all segments
  const handleSelectAll = () => {
    if (!availableSegments) return;
    
    if (selectedSegments.length === availableSegments.length) {
      // If all are selected, clear selection
      setSelectedSegments([]);
    } else {
      // Otherwise select all
      setSelectedSegments(availableSegments.map(segment => segment.id));
    }
  };

  // Handle user selection
  const handleUserChange = (userId: string) => {
    setSelectedUser(parseInt(userId));
  };

  // Handle assignment
  const handleAssign = () => {
    if (selectedSegments.length === 0 || !selectedUser) {
      toast({
        title: "Selection required",
        description: "Please select both segments and a user for assignment.",
        variant: "destructive",
      });
      return;
    }

    assignMutation.mutate({ 
      segmentIds: selectedSegments, 
      userId: selectedUser 
    });
  };

  const isLoading = isLoadingSegments || isLoadingUsers || assignMutation.isPending;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Task Assignment</CardTitle>
        <CardDescription>
          Assign available audio segments to transcribers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium">Available Segments</h3>
                {availableSegments && availableSegments.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAll}
                  >
                    {selectedSegments.length === availableSegments.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
                {selectedSegments.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedSegments.length} selected
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Select 
                  disabled={selectedSegments.length === 0 || assignMutation.isPending} 
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select transcriber" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  disabled={selectedSegments.length === 0 || !selectedUser || assignMutation.isPending}
                  onClick={handleAssign}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Assign ({selectedSegments.length})
                </Button>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Segment ID</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableSegments && availableSegments.length > 0 ? (
                    availableSegments.map((segment) => (
                      <TableRow 
                        key={segment.id}
                        className={selectedSegments.includes(segment.id) ? "bg-slate-100" : ""}
                        onClick={() => handleSegmentSelect(segment.id)}
                      >
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedSegments.includes(segment.id)}
                            onChange={() => {}}
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell>Audio Segment {segment.id}</TableCell>
                        <TableCell>{formatDuration(segment.duration)}</TableCell>
                        <TableCell>{new Date(segment.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                        No available segments to assign
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}