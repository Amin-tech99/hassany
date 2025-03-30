import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AudioPlayer } from "./audio-player";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Star, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface TranscriptionModalProps {
  segmentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

// Define the shape of the transcription data
interface Transcription {
  id?: number;
  text: string;
  notes?: string | null;
  status?: string;
  rating?: number | null;
  reviewNotes?: string | null;
}

// Define the shape of the segment data
interface SegmentData {
  id: number;
  audioId: string;
  audioUrl: string;
  transcription?: Transcription;
}

export function TranscriptionModal({
  segmentId,
  isOpen,
  onClose,
}: TranscriptionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [transcriptionText, setTranscriptionText] = useState("");
  const [notes, setNotes] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"approve" | "needs_revision" | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  
  // Make sure admin and reviewer roles can verify transcriptions
  const isReviewer = user?.role === "reviewer" || user?.role === "admin";
  
  // Fetch transcription data
  const { data: segmentData, isLoading } = useQuery<SegmentData>({
    queryKey: [`/api/segments/${segmentId}`],
    enabled: segmentId !== null && isOpen,
  });
  
  // Update local state when segment data changes
  useEffect(() => {
    if (segmentData) {
      setTranscriptionText(segmentData.transcription?.text || "");
      setNotes(segmentData.transcription?.notes || "");
      
      // Reset approval state and rating when loading a new segment
      if (isReviewer) {
        setRating(segmentData.transcription?.rating || null);
        setReviewNotes(segmentData.transcription?.reviewNotes || "");
        
        // Initialize approval status based on current transcription status
        if (segmentData.transcription?.status === "approved") {
          setApprovalStatus("approve");
        } else if (segmentData.transcription?.status === "rejected") {
          setApprovalStatus("needs_revision");
        } else {
          setApprovalStatus(null);
        }
      }
    }
  }, [segmentData, isReviewer]);
  
  // Save transcription mutation
  const saveTranscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!segmentId) throw new Error("No segment selected");
      
      const payload: any = {
        text: transcriptionText,
        notes,
      };
      
      // For transcribers submitting work (not reviewers)
      if (!isReviewer) {
        payload.status = "pending_review";
      }
      
      // If user is a reviewer, include review data
      if (isReviewer && approvalStatus) {
        Object.assign(payload, {
          status: approvalStatus === "approve" ? "approved" : "rejected",
          rating,
          reviewNotes: approvalStatus === "needs_revision" ? reviewNotes : "",
        });
        
        // Log the review action for debugging
        console.log(`Reviewer submitting: status=${payload.status}, rating=${payload.rating}`);
      }
      
      const response = await apiRequest("POST", `/api/transcriptions/${segmentId}`, payload);
      return response;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/segments/${segmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/summary"] });
      
      // Show different success messages based on action
      let title = "Transcription saved";
      let description = "Your work has been saved successfully.";
      
      if (isReviewer && approvalStatus) {
        if (approvalStatus === "approve") {
          title = "Transcription approved";
          description = "This transcription has been approved and marked as completed.";
        } else {
          title = "Revision requested";
          description = "This transcription has been sent back to the transcriber for revision.";
        }
      }
      
      toast({ title, description });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSave = () => {
    if (!transcriptionText.trim()) {
      toast({
        title: "Transcription required",
        description: "Please enter a transcription before saving.",
        variant: "destructive",
      });
      return;
    }
    
    if (isReviewer && !approvalStatus) {
      toast({
        title: "Approval status required",
        description: "Please approve or request revision before saving.",
        variant: "destructive",
      });
      return;
    }
    
    if (isReviewer && approvalStatus === "approve" && rating === null) {
      toast({
        title: "Rating required",
        description: "Please provide a rating before approving.",
        variant: "destructive",
      });
      return;
    }
    
    if (isReviewer && approvalStatus === "needs_revision" && !reviewNotes.trim()) {
      toast({
        title: "Review notes required",
        description: "Please provide feedback for the transcriber.",
        variant: "destructive",
      });
      return;
    }
    
    saveTranscriptionMutation.mutate();
  };
  
  // When closing, reset form state
  const handleClose = () => {
    if (saveTranscriptionMutation.isPending) return; // Prevent closing during save
    
    setTranscriptionText("");
    setNotes("");
    setApprovalStatus(null);
    setRating(null);
    setReviewNotes("");
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2" 
              onClick={handleClose}
              title="Return to transcription list"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DialogTitle>
              Transcribe Audio Segment: {segmentData?.audioId || "Loading..."}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Audio Player */}
            <AudioPlayer audioUrl={segmentData?.audioUrl || ""} />
            
            {/* Transcription Input */}
            <div className="mt-4">
              <Label htmlFor="transcription">Transcription</Label>
              <Textarea
                id="transcription"
                rows={4}
                placeholder="Type the transcription here..."
                value={transcriptionText}
                onChange={(e) => setTranscriptionText(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {/* Notes */}
            <div className="mt-4">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Add any notes or comments about this transcription..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {/* Quality Review (for reviewers only) */}
            {isReviewer && (
              <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Rating Stars and Label - Horizontal Layout */}
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-700 whitespace-nowrap">Rating:</h4>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              rating && star <= rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Approval Status - Horizontal Radio Layout */}
                  <div className="flex items-center gap-4">
                    <h4 className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</h4>
                    <RadioGroup
                      value={approvalStatus || ""}
                      onValueChange={(value) => 
                        setApprovalStatus(value as "approve" | "needs_revision")
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="approve" id="approve" />
                        <Label htmlFor="approve" className="text-sm cursor-pointer">Approve</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="needs_revision" id="needs-revision" />
                        <Label htmlFor="needs-revision" className="text-sm cursor-pointer">Needs Revision</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                {/* Revision Notes (compact, shown only when "Needs Revision" is selected) */}
                {approvalStatus === "needs_revision" && (
                  <div className="mt-2">
                    <Textarea
                      id="revision-notes"
                      rows={2}
                      placeholder="Provide feedback for revision..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Quality Review Section Completion Button */}
        {isReviewer && approvalStatus && !isLoading && (
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={handleSave}
              disabled={saveTranscriptionMutation.isPending}
              size="lg"
              className={cn(
                "w-full max-w-md font-bold py-3 text-white border-4",
                approvalStatus === "approve" 
                  ? "bg-green-600 hover:bg-green-700 border-green-300" 
                  : "bg-orange-600 hover:bg-orange-700 border-orange-300"
              )}
            >
              {saveTranscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {approvalStatus === "approve" ? (
                    <><span className="text-xl">✓</span> Approve and Complete</>
                  ) : (
                    <><span className="text-xl">↺</span> <span className="underline">Send Back for Revision</span></>
                  )}
                </>
              )}
            </Button>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saveTranscriptionMutation.isPending}
          >
            Cancel
          </Button>
          {!isReviewer && (
            <Button 
              onClick={handleSave}
              disabled={isLoading || saveTranscriptionMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {saveTranscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Submit for Review"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
