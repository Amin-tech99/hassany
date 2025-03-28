import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { AudioFile, type InsertAudioSegment } from "@shared/schema";
import { IStorage } from "./storage";

const execAsync = promisify(exec);

// Map to track processing status
const processingFiles = new Map<number, boolean>();

/**
 * Process an audio file by splitting it into 10-second segments and removing silence
 */
export async function processAudio(audioFile: AudioFile, storage: IStorage): Promise<void> {
  try {
    // Mark file as processing
    processingFiles.set(audioFile.id, true);

    const uploadsDir = path.join(process.cwd(), "uploads");
    const segmentsDir = path.join(uploadsDir, "segments");
    
    // Create processed directory if it doesn't exist
    await fs.mkdir(segmentsDir, { recursive: true });
    
    // Get audio duration using ffprobe
    const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile.originalPath}"`;
    const { stdout: durationOutput } = await execAsync(durationCommand);
    const duration = parseFloat(durationOutput.trim()) * 1000; // Convert to milliseconds
    
    // Update audio file with duration
    await storage.updateAudioFile(audioFile.id, {
      duration: Math.round(duration),
    });
    
    // Split audio into 10-second segments
    const segmentLength = 10000; // 10 seconds in milliseconds
    const numberOfSegments = Math.ceil(duration / segmentLength);
    
    // Create a directory for this file's segments
    const fileSegmentsDir = path.join(segmentsDir, `file_${audioFile.id}`);
    await fs.mkdir(fileSegmentsDir, { recursive: true });
    
    // Update audio file with processed path
    await storage.updateAudioFile(audioFile.id, {
      processedPath: fileSegmentsDir,
    });
    
    // Process each segment
    for (let i = 0; i < numberOfSegments; i++) {
      // Check if processing was cancelled
      if (!processingFiles.get(audioFile.id)) {
        console.log(`Processing of file ${audioFile.id} was cancelled.`);
        return;
      }
      
      const startTime = i * segmentLength / 1000; // In seconds for ffmpeg
      const segmentPath = path.join(fileSegmentsDir, `segment_${i + 1}.mp3`);
      
      // Use ffmpeg to extract segment and remove silence
      const ffmpegCommand = `ffmpeg -y -i "${audioFile.originalPath}" -ss ${startTime} -t 10 -af silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB:detection=peak,aformat=dblp,areverse,silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB:detection=peak,aformat=dblp,areverse "${segmentPath}"`;
      
      await execAsync(ffmpegCommand);
      
      // Get segment duration
      const segDurationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${segmentPath}"`;
      const { stdout: segDurationOutput } = await execAsync(segDurationCommand);
      const segmentDuration = parseFloat(segDurationOutput.trim()) * 1000; // Convert to milliseconds
      
      // Create segment in database
      const segmentData: InsertAudioSegment = {
        audioFileId: audioFile.id,
        segmentPath,
        startTime: Math.round(startTime * 1000), // Convert back to milliseconds
        endTime: Math.round(startTime * 1000 + segmentDuration),
        duration: Math.round(segmentDuration),
        status: "available",
        assignedTo: null,
        transcribedBy: null,
        reviewedBy: null,
      };
      
      await storage.createAudioSegment(segmentData);
      
      // Update audio file with number of segments processed so far
      await storage.updateAudioFile(audioFile.id, {
        segments: i + 1,
      });
    }
    
    // Mark file as processed
    await storage.updateAudioFileStatus(audioFile.id, "processed");
    processingFiles.delete(audioFile.id);
    
    console.log(`Successfully processed audio file ${audioFile.id} into ${numberOfSegments} segments.`);
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
