import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon, PauseIcon, Volume2, VolumeX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Get token from localStorage - using correct token name 'auth_token'
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    setToken(storedToken);
    
    if (storedToken) {
      console.log("Audio player: Auth token found");
    } else {
      console.log("Audio player: No auth token found in localStorage");
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl || !token) return;
    
    console.log("Attempting to load audio from:", audioUrl);
    setLoading(true);
    
    console.log("Using token to fetch audio...");
    
    // Use fetch with proper authentication header
    fetch(audioUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      console.log("Audio fetch successful, processing response...");
      return response.blob();
    })
    .then(blob => {
      // Create a blob URL from the audio data
      const objectUrl = URL.createObjectURL(blob);
      console.log("Created blob URL for audio");
      
      // Create and configure the audio element
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      
      audio.addEventListener("loadedmetadata", () => {
        console.log("Audio metadata loaded, duration:", audio.duration);
        setDuration(audio.duration);
        setLoading(false);
      });
      
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        if (onEnded) onEnded();
      });
    })
    .catch(error => {
      console.error('Error loading audio:', error.message);
      setError(error.message);
      setLoading(false);
    });
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl, onEnded, token]);

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

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

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

  // Toggle mute
  const toggleMute = () => {
    setMuted(!muted);
  };

  // Handle volume slider change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (muted && value[0] > 0) {
      setMuted(false);
    }
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
    <div className="bg-gray-100 rounded-lg p-3 sm:p-5 shadow-md border border-gray-200 w-full">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Play button with more prominent styling and better touch target */}
          <Button
            size="default"
            variant="default"
            className="min-w-[44px] h-10 sm:min-w-[48px] sm:h-12 w-10 sm:w-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md flex items-center justify-center"
            onClick={togglePlayback}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <PlayIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
          
          <div className="flex-1 flex flex-col space-y-1">
            <div 
              className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 cursor-pointer shadow-inner"
              onClick={handleSeek}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div 
                className="bg-primary h-2.5 sm:h-3 rounded-full transition-all" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="font-medium text-gray-700">
                {formatTime(currentTime)}
              </span>
              <span className="font-medium text-gray-700">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full"
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-gray-600" />
              ) : (
                <Volume2 className="h-4 w-4 text-gray-600" />
              )}
            </Button>
            <div className="w-20 hidden sm:block">
              <Slider
                value={[muted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                aria-label="Volume"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center space-x-2 sm:space-x-3">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Speed:</span>
            <Select
              value={playbackSpeed}
              onValueChange={setPlaybackSpeed}
            >
              <SelectTrigger className="w-[70px] sm:w-[90px] h-8 sm:h-9 bg-white text-xs sm:text-sm">
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
      
      {/* Error message display */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          Error: {error}
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center mt-2">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600">Loading audio...</span>
        </div>
      )}
    </div>
  );
}
