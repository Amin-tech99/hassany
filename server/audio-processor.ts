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
      // Update the audio file with the error message
      await storage.updateAudioFile(audioFile.id, {
        status: "error",
        error: `FFMPEG installation issue: ${errorMessage}`,
      });
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
      
      // Split audio into 10-second segments
      const segmentLength = 10000; // 10 seconds in milliseconds
      const numberOfSegments = Math.ceil(duration / segmentLength);
      
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
        const ffmpegCommand = `ffmpeg -y -i "${audioFile.originalPath}" -ss ${startTime} -t 10 -c:a mp3 -q:a 2 "${segmentPath}"`;
        console.log(`Running ffmpeg command for segment ${i+1}: ${ffmpegCommand}`);
        
        try {
          console.log(`Executing ffmpeg command for segment ${i+1}...`);
          const { stderr } = await execAsync(ffmpegCommand);
          
          // Check if the segment file was created successfully
          try {
            await fs.access(segmentPath, fs.constants.R_OK);
            console.log(`Segment file created successfully: ${segmentPath}`);
          } catch (accessError) {
            console.error(`Failed to create segment file: ${segmentPath}`);
            console.error(`FFMPEG stderr: ${stderr}`);
            throw new Error(`Failed to create segment file: ${accessError instanceof Error ? accessError.message : 'Unknown error'}`);
          }
          
          // Get segment duration
          const segDurationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${segmentPath}"`;
          console.log(`Running duration command for segment: ${segDurationCommand}`);
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
        } catch (segmentError) {
          console.error(`Error processing segment ${i+1}: ${segmentError}`);
          // Update the audio file with the specific segment error
          await storage.updateAudioFile(audioFile.id, {
            status: "error",
            error: `Error processing segment ${i+1}: ${segmentError instanceof Error ? segmentError.message : 'Unknown error'}`,
          });
          throw segmentError;
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
