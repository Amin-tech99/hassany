import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { AudioFile, type InsertAudioSegment } from "@shared/schema";
import { IStorage } from "./storage";

const execAsync = promisify(exec);

interface VadSegment {
  index: number;
  path: string;
  start_time: number;
  end_time: number;
  duration: number;
}

interface VadResponse {
  status: 'success' | 'error';
  segments?: VadSegment[];
  error?: string;
}

// Map to track processing status
const processingFiles = new Map<number, boolean>();

/**
 * Process an audio file using Silero VAD to detect speech segments
 */
export async function processAudio(audioFile: AudioFile, storage: IStorage): Promise<void> {
  try {
    // Mark file as processing
    processingFiles.set(audioFile.id, true);

    const uploadsDir = path.join(process.cwd(), "uploads");
    const segmentsDir = path.join(uploadsDir, "segments");
    
    // Create processed directory if it doesn't exist
    await fs.mkdir(segmentsDir, { recursive: true });
    
    // Check if the original file exists and is readable
    try {
      await fs.access(audioFile.originalPath, fs.constants.R_OK);
      console.log(`Original file exists and is readable: ${audioFile.originalPath}`);
    } catch (error) {
      console.error(`Cannot access original file: ${audioFile.originalPath}`);
      throw new Error(`Original file access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Verify FFMPEG is installed and working
    try {
      console.log(`Checking FFMPEG installation...`);
      const { stdout: ffmpegVersion } = await execAsync('ffmpeg -version');
      console.log(`FFMPEG version: ${ffmpegVersion.split('\n')[0]}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`FFMPEG not found or not working: ${errorMessage}`);
      throw new Error(`FFMPEG installation issue: ${errorMessage}`);
    }
    
    // Get audio duration using ffprobe
    const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile.originalPath}"`;
    console.log(`Running duration command: ${durationCommand}`);
    
    try {
      const { stdout: durationOutput } = await execAsync(durationCommand);
      const duration = parseFloat(durationOutput.trim()) * 1000; // Convert to milliseconds
      
      // Update audio file with duration
      await storage.updateAudioFile(audioFile.id, {
        duration: Math.round(duration),
      });
      
      // Create a directory for this file's segments
      const fileSegmentsDir = path.join(segmentsDir, `file_${audioFile.id}`);
      await fs.mkdir(fileSegmentsDir, { recursive: true });
      
      // Verify the segments directory is writable
      try {
        const testFile = path.join(fileSegmentsDir, 'test.txt');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        console.log(`Output directory is writable: ${fileSegmentsDir}`);
      } catch (error) {
        console.error(`Output directory is not writable: ${fileSegmentsDir}`);
        throw new Error(`Directory permission error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Update audio file with processed path
      await storage.updateAudioFile(audioFile.id, {
        processedPath: fileSegmentsDir,
      });
      
      // Check if processing was cancelled
      if (!processingFiles.get(audioFile.id)) {
        console.log(`Processing of file ${audioFile.id} was cancelled.`);
        return;
      }
      
      // Run the Python VAD processor
      const vadCommand = `python "${path.join(process.cwd(), 'server', 'vad_processor.py')}" "${audioFile.originalPath}" "${fileSegmentsDir}"`;
      console.log(`Running VAD processor: ${vadCommand}`);
      
      try {
        const { stdout } = await execAsync(vadCommand);
        const vadResponse: VadResponse = JSON.parse(stdout);
        
        if (vadResponse.status === 'error' || !vadResponse.segments) {
          throw new Error(vadResponse.error || 'Unknown VAD processing error');
        }
        
        // Process each segment detected by VAD
        for (const [index, segment] of vadResponse.segments.entries()) {
          // Create segment in database
          const segmentData: InsertAudioSegment = {
            audioFileId: audioFile.id,
            segmentPath: segment.path,
            startTime: Math.round(segment.start_time),
            endTime: Math.round(segment.end_time),
            duration: Math.round(segment.duration),
            status: "available",
            assignedTo: null,
            transcribedBy: null,
            reviewedBy: null,
          };
          
          await storage.createAudioSegment(segmentData);
          
          // Update audio file with number of segments processed so far
          await storage.updateAudioFile(audioFile.id, {
            segments: index + 1,
          });
        }
      } catch (vadError) {
        console.error(`Error processing with VAD: ${vadError}`);
        throw vadError;
      }
      }
      
      // Mark file as processed
      await storage.updateAudioFileStatus(audioFile.id, "processed");
      processingFiles.delete(audioFile.id);
      
      console.log(`Successfully processed audio file ${audioFile.id} into ${numberOfSegments} segments.`);
    } catch (durationError) {
      console.error(`Error getting audio duration: ${durationError}`);
      throw durationError;
    }
  } catch (error) {
    console.error(`Error processing audio file ${audioFile.id}:`, error);
    
    // Update file status to error
    await storage.updateAudioFile(audioFile.id, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    processingFiles.delete(audioFile.id);
  }
}

/**
 * Cancel processing of an audio file
 */
export async function cancelProcessing(fileId: number): Promise<void> {
  processingFiles.set(fileId, false);
}
