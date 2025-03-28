import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon, PauseIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AudioPlayerProps {
  audioUrl: string;
  onEnded?: () => void;
}

export function AudioPlayer({ audioUrl, onEnded }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;
    
    // Create a new XMLHttpRequest to fetch the audio with authorization
    const xhr = new XMLHttpRequest();
    xhr.open('GET', audioUrl, true);
    
    // Get the JWT token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    xhr.responseType = 'blob';
    xhr.onload = function() {
      if (xhr.status === 200) {
        // Create a blob URL from the audio data
        const blob = new Blob([xhr.response], { type: 'audio/mpeg' });
        const objectUrl = URL.createObjectURL(blob);
        
        // Create and configure the audio element with the blob URL
        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        
        audio.addEventListener("loadedmetadata", () => {
          setDuration(audio.duration);
        });
        
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
          if (onEnded) onEnded();
        });
      } else {
        console.error('Failed to load audio:', xhr.status, xhr.statusText);
      }
    };
    
    xhr.onerror = function() {
      console.error('Error loading audio file');
    };
    
    xhr.send();
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl, onEnded]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(playbackSpeed);
    }
  }, [playbackSpeed]);

  // Start/stop progress tracking
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const total = audioRef.current.duration;
          setCurrentTime(current);
          setProgress((current / total) * 100);
        }
      }, 100);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) {
      console.error("Audio element is not available yet");
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Handle play with a promise to catch any errors
      const playPromise = audioRef.current.play();
      
      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Playback started successfully
            console.log("Audio playback started");
          })
          .catch(error => {
            // Playback failed due to a user interaction requirement or other issue
            console.error("Error playing audio:", error);
          });
      }
    }
    
    setIsPlaying(!isPlaying);
  };

  // Format time as mm:ss
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Seek to position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const clickPercentage = clickPosition / rect.width;
    
    const newTime = clickPercentage * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(clickPercentage * 100);
  };

  // Speed options
  const speedOptions = [
    { value: "0.5", label: "0.5x" },
    { value: "0.75", label: "0.75x" },
    { value: "1", label: "1x" },
    { value: "1.25", label: "1.25x" },
    { value: "1.5", label: "1.5x" },
    { value: "2", label: "2x" },
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          {/* Play button with prominent styling */}
          <Button
            size="sm"
            variant="default"
            className="min-w-[36px] h-9 p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center justify-center"
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </Button>
          
          <div 
            className="flex-1 bg-gray-200 rounded-full h-2 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="bg-primary-600 h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <span className="text-sm font-medium text-gray-500 min-w-[80px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-gray-600">Speed:</span>
          <Select
            value={playbackSpeed}
            onValueChange={setPlaybackSpeed}
          >
            <SelectTrigger className="w-[90px] h-8">
              <SelectValue placeholder="1x" />
            </SelectTrigger>
            <SelectContent>
              {speedOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
