import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { TranscriptionList } from "@/components/transcription/transcription-list";
import { TranscriptionModal } from "@/components/transcription/transcription-modal";
import { useLocation, useParams } from "wouter";

export default function TranscriptionsPage() {
  const [location] = useLocation();
  const params = useParams();
  
  // Extract segment ID from URL if present (for direct linking to a transcription)
  const segmentIdFromUrl = params && params.id ? parseInt(params.id, 10) : null;
  
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(segmentIdFromUrl);
  const [isModalOpen, setIsModalOpen] = useState(segmentIdFromUrl !== null);
  
  // Close modal and clear selected segment
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSegmentId(null);
    
    // If opened directly via URL, navigate back to main transcriptions page
    if (segmentIdFromUrl) {
      window.history.pushState(null, '', '/transcriptions');
    }
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
