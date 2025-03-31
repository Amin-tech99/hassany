import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { useAudioProcessor } from "@/hooks/use-audio-processor";
import { useToast } from "@/hooks/use-toast";

export function AudioUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadAudio, isUploading, uploadProgress } = useAudioProcessor();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    
    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP3, WAV, or FLAC file.",
        variant: "destructive",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      setSelectedFile(null);
      return;
    }
    
    // Validate file size (max 200MB)
    const maxSize = 200 * 1024 * 1024; // 200MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an audio file smaller than 200MB.",
        variant: "destructive",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an audio file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    uploadAudio(selectedFile, {
      onSuccess: () => {
        // Reset form
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg leading-6 font-medium text-white">Upload Audio File</h3>
        <div className="mt-2 max-w-xl text-sm text-white/70">
          <p>
            Upload audio files in MP3, WAV, or FLAC format (max 200MB). Files will be automatically split into 10-second segments.
          </p>
        </div>
        
        <form className="mt-5 sm:flex sm:items-center" onSubmit={handleSubmit}>
          <div className="w-full sm:max-w-xs">
            <Input
              ref={fileInputRef}
              type="file"
              id="audio-file"
              name="audio-file"
              className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-900/40 file:text-primary-300 hover:file:bg-primary-800/60 bg-black/30 border-white/20"
              accept=".mp3,.wav,.flac"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Process
              </>
            )}
          </Button>
        </form>
        
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-black/50 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
