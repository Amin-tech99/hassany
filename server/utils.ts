import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

// Promisify exec for async/await usage
export const execAsync = promisify(exec);

/**
 * Recursively searches directories for files matching the pattern
 * @param directory Directory to search
 * @param pattern File pattern to match (e.g., "segment_1.mp3" or partial match like "1.mp3")
 * @returns Array of matching file paths
 */
export async function findFilesRecursively(directory: string, pattern: string): Promise<string[]> {
  console.log(`Searching recursively in ${directory} for pattern: ${pattern}`);
  const results: string[] = [];
  
  try {
    // Read all entries in the directory
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    
    // Process each entry
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        // If it's a directory, search recursively
        try {
          const subResults = await findFilesRecursively(fullPath, pattern);
          results.push(...subResults);
        } catch (err) {
          console.warn(`Error searching subdirectory ${fullPath}:`, err);
          // Continue with other directories even if one fails
        }
      } else if (entry.isFile()) {
        // Check if file matches pattern
        if (entry.name.includes(pattern)) {
          console.log(`Found matching file: ${fullPath}`);
          results.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error searching directory ${directory}:`, err);
  }
  
  return results;
}

/**
 * Find segment file using multiple search strategies
 * @param segmentId Segment ID to find
 * @param baseDir Base directory to start the search
 * @returns Path to the segment file if found, null otherwise
 */
export async function findSegmentFile(segmentId: number, baseDir?: string): Promise<string | null> {
  console.log(`Starting comprehensive search for segment ID: ${segmentId}`);
  
  // Get base directory (usually uploads)
  const rootDir = baseDir || path.join(process.cwd(), "uploads");
  const segmentsDir = path.join(rootDir, "segments");
  
  // Try different file patterns that might match the segment
  const patterns = [
    `segment_${segmentId}.mp3`,
    `segment_${segmentId}.wav`,
    `${segmentId}.mp3`,
    `${segmentId}.wav`,
    `_${segmentId}.`,
    `${segmentId}_`
  ];
  
  // Search for exact filename matches in file_X directories
  try {
    const fileIdDirs = await fs.promises.readdir(segmentsDir);
    for (const dir of fileIdDirs) {
      if (dir.startsWith('file_')) {
        const fileDir = path.join(segmentsDir, dir);
        if ((await fs.promises.stat(fileDir)).isDirectory()) {
          for (const pattern of patterns) {
            const potentialPath = path.join(fileDir, pattern);
            console.log(`Checking specific path: ${potentialPath}`);
            if (fs.existsSync(potentialPath)) {
              console.log(`Found segment file at specific path: ${potentialPath}`);
              return potentialPath;
            }
          }
          
          // Look for files with the segment ID in their name
          try {
            const files = await fs.promises.readdir(fileDir);
            for (const file of files) {
              if (file.includes(`_${segmentId}.`) || file.includes(`${segmentId}_`)) {
                const filePath = path.join(fileDir, file);
                console.log(`Found segment file with ID in name: ${filePath}`);
                return filePath;
              }
            }
          } catch (err) {
            console.error(`Error reading directory ${fileDir}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error searching file_X directories: ${err}`);
  }
  
  // Use the recursive search function for each pattern
  for (const pattern of patterns) {
    try {
      const files = await findFilesRecursively(segmentsDir, pattern);
      if (files.length > 0) {
        console.log(`Found segment files using pattern "${pattern}":`, files);
        return files[0]; // Return the first match
      }
    } catch (err) {
      console.error(`Error in recursive search for pattern ${pattern}:`, err);
    }
  }
  
  // Last attempt: Search for any file containing the segment ID
  try {
    console.log(`Final attempt: searching for any file containing "${segmentId}"`);
    const files = await findFilesRecursively(segmentsDir, String(segmentId));
    if (files.length > 0) {
      console.log(`Found potential segment files in final search:`, files);
      return files[0];
    }
  } catch (err) {
    console.error(`Error in final search attempt:`, err);
  }
  
  console.log(`No segment file found for ID ${segmentId} after exhaustive search`);
  return null;
} 