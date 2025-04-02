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
      // Try multiple Python commands to find the available one
      let pythonCommand = '';
      
      // Check for python3 command
      try {
        const { stdout } = await execAsync('python3 --version');
        console.log('Python3 version:', stdout.trim());
        pythonCommand = 'python3';
      } catch (pythonError) {
        console.log('Python3 not found, error:', pythonError instanceof Error ? pythonError.message : 'Unknown error');
      }
      
      // If python3 failed, try python command
      if (!pythonCommand) {
        try {
          const { stdout } = await execAsync('python --version');
          console.log('Python version:', stdout.trim());
          pythonCommand = 'python';
        } catch (pythonError2) {
          console.log('Python not found, error:', pythonError2 instanceof Error ? pythonError2.message : 'Unknown error');
        }
      }
      
      // If both failed, try specific paths
      if (!pythonCommand) {
        const possiblePaths = [
          '/usr/bin/python3.10',
          '/usr/bin/python3',
          '/usr/bin/python',
          '/usr/local/bin/python3',
          '/usr/local/bin/python'
        ];
        
        for (const path of possiblePaths) {
          try {
            const { stdout } = await execAsync(`${path} --version`);
            console.log(`Python at ${path} version:`, stdout.trim());
            pythonCommand = path;
            break;
          } catch (pathError) {
            console.log(`Python not found at ${path}`);
          }
        }
      }
      
      // If all attempts failed
      if (!pythonCommand) {
        console.error('No Python installation found after trying multiple paths');
        throw new Error('Python is not installed or not in PATH. Please install Python 3.x');
      }
      
      // Check Python environment
      try {
        const { stdout: envOutput } = await execAsync(`${pythonCommand} -c "import sys; print('Python path:', sys.executable); print('Python version:', sys.version); print('Path:', sys.path)"`); 
        console.log('Python environment:', envOutput);
      } catch (envError) {
        console.warn('Could not check Python environment:', envError);
      }
      
      // Check if torch is available
      try {
        const { stdout: torchOutput } = await execAsync(`${pythonCommand} -c "import torch; print('Torch version:', torch.__version__); print('Torch hub dir:', torch.hub.get_dir()); print('Torch available:', torch.cuda.is_available() if hasattr(torch, 'cuda') else 'N/A')"`);
        console.log('Torch environment:', torchOutput);
      } catch (torchError) {
        console.warn('Could not check Torch environment:', torchError instanceof Error ? torchError.message : 'Unknown error');
        
        // Try to get more detailed error information
        try {
          const { stdout: pipList } = await execAsync(`${pythonCommand} -m pip list | grep -E 'torch|audio'`);
          console.log('Installed torch packages:', pipList.trim());
        } catch (pipError) {
          console.warn('Could not check pip packages:', pipError instanceof Error ? pipError.message : 'Unknown error');
        }
      }
      
      const vadCommand = `${pythonCommand} "${path.join(process.cwd(), 'server', 'vad_processor.py')}" "${audioFile.originalPath}" "${fileSegmentsDir}"`;      
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
