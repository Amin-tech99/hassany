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
    
    // We'll get the duration from the VAD processor results instead of using ffprobe
    console.log('Preparing for VAD processing...');
    
    try {
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
      const vadCommand = `python3 "${path.join(process.cwd(), 'server', 'vad_processor.py')}" "${audioFile.originalPath}" "${fileSegmentsDir}"`;      
      console.log(`Running VAD processor: ${vadCommand}`);
      
      try {
        const { stdout, stderr } = await execAsync(vadCommand);
        
        // Log any stderr output for debugging
        if (stderr) {
          console.log('VAD processor stderr:', stderr);
        }
        
        let vadResponse: VadResponse;
        try {
          vadResponse = JSON.parse(stdout);
        } catch (parseError) {
          console.error('Error parsing VAD response. Raw output:', stdout);
          throw new Error(`Failed to parse VAD response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
        
        if (vadResponse.status === 'error' || !vadResponse.segments) {
          throw new Error(vadResponse.error || 'Unknown VAD processing error');
        }
        
        // Calculate total duration from all segments
        const totalDuration = vadResponse.segments.reduce((total, segment) => total + segment.duration, 0);
        
        // Update audio file with total duration
        await storage.updateAudioFile(audioFile.id, {
          duration: Math.round(totalDuration)
        });
        
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
      
      // Mark file as processed
      await storage.updateAudioFileStatus(audioFile.id, "processed");
      console.log(`Successfully processed audio file ${audioFile.id} into ${vadResponse.segments.length} segments.`);
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
  } finally {
    processingFiles.delete(audioFile.id);
  }
}

/**
 * Cancel processing of an audio file
 */
export async function cancelProcessing(fileId: number): Promise<void> {
  processingFiles.set(fileId, false);
}
