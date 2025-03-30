import { useState, useEffect } from "react";
import { TranscriptionList } from "@/components/transcription/transcription-list";
import { TranscriptionModal } from "@/components/transcription/transcription-modal";
import { useLocation, useParams, useNavigate } from "react-router-dom";

export default function TranscriptionsPage() {
  const location = useLocation();
  const params = useParams<{id: string}>();
  const navigate = useNavigate();
  
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
    navigate('/transcriptions');
  };
  
  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">Transcriptions</h1>
          <p className="mt-2 text-sm text-white/70">
            View and edit transcription segments from your processed audio files.
          </p>
        </div>
      </div>
      
      <TranscriptionList />
      
      <TranscriptionModal
        segmentId={selectedSegmentId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
