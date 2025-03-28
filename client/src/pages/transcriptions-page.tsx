import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { TranscriptionList } from "@/components/transcription/transcription-list";
import { TranscriptionModal } from "@/components/transcription/transcription-modal";
import { useLocation, useParams, useRoute } from "wouter";

export default function TranscriptionsPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute<{id: string}>("/transcriptions/:id");
  
  // Extract segment ID from URL if present (for direct linking to a transcription)
  const segmentIdFromUrl = params?.id ? parseInt(params.id, 10) : null;
  
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(segmentIdFromUrl);
  const [isModalOpen, setIsModalOpen] = useState(segmentIdFromUrl !== null);
  
  // Update state when URL params change
  useEffect(() => {
    if (segmentIdFromUrl) {
      setSelectedSegmentId(segmentIdFromUrl);
      setIsModalOpen(true);
    }
  }, [segmentIdFromUrl, location]);
  
  // Close modal and clear selected segment
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSegmentId(null);
    
    // Navigate back to main transcriptions page when modal is closed
    setLocation('/transcriptions');
  };
  
  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <TranscriptionList />
        
        <TranscriptionModal
          segmentId={selectedSegmentId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </MainLayout>
  );
}
