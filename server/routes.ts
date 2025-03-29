import type { Express, Request, Response, NextFunction } from "express"; // Import types only
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as fsPromises from "fs/promises";
import { existsSync } from "fs";
import { processAudio, cancelProcessing } from "./audio-processor";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import archiver from "archiver";
import { AudioFile, AudioSegment } from '@shared/schema'; // Import correct types

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
const segmentsDir = path.join(uploadsDir, "segments");
const exportsDir = path.join(uploadsDir, "exports");

async function ensureDirectoriesExist() {
  try {
    if (!existsSync(uploadsDir)) {
      await fsPromises.mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(segmentsDir)) {
      await fsPromises.mkdir(segmentsDir, { recursive: true });
    }
    if (!existsSync(exportsDir)) {
      await fsPromises.mkdir(exportsDir, { recursive: true });
    }
  } catch (error) {
    console.error("Error creating directories:", error);
  }
}

// Configure multer storage
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage: storage_config,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP3, WAV, and FLAC are allowed.") as any);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize directories
  await ensureDirectoriesExist();

  // Set up authentication routes
  setupAuth(app);

  // User routes
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { username, password, fullName, role } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the user
      const user = await storage.createUser({
        username,
        password,
        fullName,
        role,
      });
      
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, password, fullName, role } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If changing username, check if it's already taken
      if (username && username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(username);
        if (userWithSameUsername && userWithSameUsername.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, {
        username,
        password,
        fullName,
        role,
      });
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Audio processing routes
  app.post("/api/audio/upload", isAuthenticated, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const originalPath = req.file.path;
      const fileSize = req.file.size;
      const filename = path.basename(req.file.originalname);
      
      // Create a record in the database
      const audioFile = await storage.createAudioFile({
        filename,
        originalPath,
        processedPath: null,
        uploadedBy: req.user!.id,
        status: "processing",
        segments: 0,
        duration: 0,
        size: fileSize,
      });
      
      // Process the audio file asynchronously
      processAudio(audioFile, storage);
      
      res.status(201).json({ id: audioFile.id, filename, status: "processing" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/audio", isAuthenticated, async (req, res) => {
    try {
      const audioFiles = await storage.getAudioFiles(req.user!.id, req.user!.role === "admin");
      res.json(audioFiles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/audio/:id", isAuthenticated, async (req, res) => {
    try {
      const audioFile = await storage.getAudioFileById(parseInt(req.params.id));
      if (!audioFile) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      // Check if user has access to this file
      if (audioFile.uploadedBy !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You don't have access to this file" });
      }
      
      res.json(audioFile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/audio/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const audioFile = await storage.getAudioFileById(fileId);
      
      if (!audioFile) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      // Check if user has access to this file
      if (audioFile.uploadedBy !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You don't have access to this file" });
      }
      
      // Cancel processing
      await cancelProcessing(fileId);
      await storage.updateAudioFileStatus(fileId, "cancelled");
      
      res.json({ message: "Processing cancelled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Segments and transcriptions routes
  app.get("/api/segments/:id", isAuthenticated, async (req, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const segment = await storage.getAudioSegmentById(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      
      // Check if user can access this segment
      const audioFile = await storage.getAudioFileById(segment.audioFileId);
      if (!audioFile) {
        return res.status(404).json({ message: "Associated audio file not found" });
      }
      
      const canAccess = 
        req.user!.role === "admin" || 
        audioFile.uploadedBy === req.user!.id || 
        segment.assignedTo === req.user!.id ||
        segment.transcribedBy === req.user!.id ||
        segment.reviewedBy === req.user!.id;
      
      if (!canAccess) {
        return res.status(403).json({ message: "You don't have access to this segment" });
      }
      
      // Get transcription if it exists
      const transcription = await storage.getTranscriptionBySegmentId(segmentId);
      
      // Create the audio URL
      const audioUrl = `/api/segments/${segmentId}/audio`;
      
      res.json({
        ...segment,
        transcription,
        audioUrl,
        audioId: `Segment_${segment.id}`,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/segments/:id/audio", isAuthenticated, async (req, res) => {
    const segmentId = parseInt(req.params.id);
    console.log(`Audio download request for segment ID: ${segmentId}`);
    
    try {
      const segment = await storage.getAudioSegmentById(segmentId);
      
      if (!segment) {
        console.error(`Segment not found for ID: ${segmentId}`);
        return res.status(404).json({ message: "Segment not found" });
      }
      
      // Verify access rights
      const audioFile = await storage.getAudioFileById(segment.audioFileId);
      if (!audioFile) {
        console.error(`Associated audio file not found for segment ID: ${segmentId}`);
        return res.status(404).json({ message: "Associated audio file not found" });
      }
      
      const canAccess = 
        req.user!.role === "admin" || 
        audioFile.uploadedBy === req.user!.id || 
        segment.assignedTo === req.user!.id ||
        segment.transcribedBy === req.user!.id ||
        segment.reviewedBy === req.user!.id;
      
      if (!canAccess) {
        console.warn(`User ${req.user!.id} (${req.user!.role}) forbidden access to segment ${segmentId}`);
        return res.status(403).json({ message: "You don't have access to this segment" });
      }
      
      // --- File Path Validation ---
      const segmentPath = segment.segmentPath;
      if (!segmentPath) {
        console.error(`Segment ${segmentId} is missing segmentPath in database.`);
        return res.status(500).json({ message: "Segment path information is missing." });
      }
      
      // Ensure the path is absolute or resolve it relative to a known base directory
      const absolutePath = path.resolve(segmentPath); // Use path.resolve for robustness
      
      console.log(`Attempting to serve file from path: ${absolutePath}`);
      
      // Check if the file actually exists on the server filesystem
      if (!fs.existsSync(absolutePath)) {
        console.error(`Audio file not found on disk at path: ${absolutePath} for segment ${segmentId}`);
        return res.status(404).json({ message: "Audio file not found on server." });
      }
      
      // --- Use res.download() ---
      console.log(`User ${req.user!.id} authorized. Sending file: ${absolutePath}`);
      const filename = path.basename(absolutePath); // Extract filename for download prompt
      
      res.download(absolutePath, filename, (err) => {
        if (err) {
          console.error(`Error during file download transmission for segment ${segmentId}:`, err);
          if (!res.headersSent) {
             res.status(500).json({ message: "Error sending the audio file." });
          }
        } else {
          console.log(`Successfully sent file ${filename} for segment ${segmentId}`);
        }
      });
      
    } catch (error: any) {
      console.error(`Unexpected error serving audio segment ${segmentId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || "Internal server error processing audio request." });
      }
    }
  });

  app.post("/api/transcriptions/:segmentId", isAuthenticated, async (req, res) => {
    try {
      const segmentId = parseInt(req.params.segmentId);
      const { text, notes, status, rating, reviewNotes } = req.body;
      
      const segment = await storage.getAudioSegmentById(segmentId);
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      
      // Get existing transcription if any
      const existingTranscription = await storage.getTranscriptionBySegmentId(segmentId);
      
      if (existingTranscription) {
        // Update existing transcription
        const updatedTranscription = await storage.updateTranscription(existingTranscription.id, {
          text: text || existingTranscription.text,
          notes: notes !== undefined ? notes : existingTranscription.notes,
          reviewedBy: req.user!.role === "reviewer" || req.user!.role === "admin" ? req.user!.id : existingTranscription.reviewedBy,
          status: status || existingTranscription.status,
          rating: rating !== undefined ? rating : existingTranscription.rating,
          reviewNotes: reviewNotes !== undefined ? reviewNotes : existingTranscription.reviewNotes,
        });
        
        // Update segment status based on transcription status
        if (status) {
          let segmentStatus = segment.status;
          if (status === "approved") {
            segmentStatus = "reviewed";
          } else if (status === "rejected") {
            segmentStatus = "rejected";
          }
          await storage.updateAudioSegmentStatus(segmentId, segmentStatus);
        }
        
        res.json(updatedTranscription);
      } else {
        // Create new transcription
        const transcription = await storage.createTranscription({
          segmentId,
          text,
          createdBy: req.user!.id,
          reviewedBy: req.user!.role === "reviewer" || req.user!.role === "admin" ? req.user!.id : null,
          status: status || "pending_review",
          notes,
          rating,
          reviewNotes,
        });
        
        // Update segment status
        await storage.updateAudioSegment(segmentId, {
          status: "transcribed",
          transcribedBy: req.user!.id,
        });
        
        res.status(201).json(transcription);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/transcriptions", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const transcriptions = await storage.getTranscriptionTasks(req.user!.id, status);
      res.json(transcriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard summary
  app.get("/api/tasks/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getTaskSummary(req.user!.id);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Recent activities
  app.get("/api/activities/recent", isAuthenticated, async (req, res) => {
    try {
      const activities = await storage.getRecentActivities(req.user!.id, req.user!.role === "admin");
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all users (for admin)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive information like passwords
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt
      }));
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get available segments for assignment
  app.get("/api/admin/available-segments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const segments = Array.from(await storage.getAvailableSegments());
      res.json(segments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Assign segment to transcriber
  app.post("/api/admin/assign-segment", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { segmentId, userId } = req.body;
      
      if (!segmentId || !userId) {
        return res.status(400).json({ message: "segmentId and userId are required" });
      }
      
      const segment = await storage.getAudioSegmentById(segmentId);
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only allow assignment if segment status is 'available'
      if (segment.status !== "available") {
        return res.status(400).json({ message: "Segment is not available for assignment" });
      }
      
      // Update segment
      const updatedSegment = await storage.updateAudioSegment(segmentId, {
        assignedTo: userId,
        status: "assigned"
      });
      
      res.status(200).json(updatedSegment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk assign segments to transcriber
  app.post("/api/admin/assign-segments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { segmentIds, userId } = req.body;
      
      if (!segmentIds || !Array.isArray(segmentIds) || segmentIds.length === 0 || !userId) {
        return res.status(400).json({ message: "segmentIds array and userId are required" });
      }
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Process each segment
      const results = [];
      const errors = [];
      
      for (const segmentId of segmentIds) {
        try {
          // Get segment
          const segment = await storage.getAudioSegmentById(segmentId);
          if (!segment) {
            errors.push({ segmentId, error: "Segment not found" });
            continue;
          }
          
          // Verify segment is available
          if (segment.status !== "available") {
            errors.push({ segmentId, error: "Segment is not available for assignment" });
            continue;
          }
          
          // Update segment
          const updatedSegment = await storage.updateAudioSegment(segmentId, {
            assignedTo: userId,
            status: "assigned"
          });
          
          results.push(updatedSegment);
        } catch (err) {
          errors.push({ segmentId, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
      
      res.status(200).json({
        success: results.length,
        errors: errors.length > 0 ? errors : undefined,
        segments: results
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export routes
  app.post("/api/exports", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        exportType, 
        format, 
        includeSpeaker, 
        includeTimestamps, 
        includeConfidence 
      } = req.body;
      
      // Generate a unique filename
      const filename = `export_${Date.now()}.json`;
      const filePath = path.join(exportsDir, filename);
      
      // Get fully validated transcriptions based on criteria
      let transcriptions;
      if (exportType === "all_verified") {
        transcriptions = await storage.getVerifiedTranscriptions(startDate, endDate);
        console.log(`Found ${transcriptions.length} verified transcriptions for export`);
      } else {
        // For selected files, we would need file IDs
        // This is a simplified implementation
        transcriptions = await storage.getVerifiedTranscriptions(startDate, endDate);
        console.log(`Found ${transcriptions.length} verified transcriptions for export`);
      }
      
      // Format the data according to the selected format
      let exportData;
      if (format === "whisper") {
        exportData = transcriptions.map(t => ({
          audio_filepath: t.audioPath,
          text: t.text,
          ...(includeSpeaker && t.speaker ? { speaker: t.speaker } : {}),
          ...(includeTimestamps ? { 
            start: t.startTime,
            end: t.endTime 
          } : {}),
          ...(includeConfidence && t.confidence ? { confidence: t.confidence } : {})
        }));
        console.log(`Formatted ${exportData.length} transcriptions for Whisper export`);
      } else if (format === "standard") {
        exportData = transcriptions.map(t => ({
          id: t.id,
          text: t.text,
          audio_path: t.audioPath,
          duration: t.duration,
          ...(includeSpeaker && t.speaker ? { speaker: t.speaker } : {}),
          ...(includeTimestamps ? { 
            start_time: t.startTime,
            end_time: t.endTime 
          } : {}),
          ...(includeConfidence && t.confidence ? { confidence: t.confidence } : {})
        }));
      } else {
        // Custom format
        exportData = transcriptions;
      }
      
      // Write to file
      await fsPromises.writeFile(filePath, JSON.stringify(exportData, null, 2));
      
      // Calculate file size
      const stats = await fsPromises.stat(filePath);
      
      // Create export record in database
      const exportRecord = await storage.createExport({
        filename,
        path: filePath,
        format,
        createdBy: req.user!.id,
        records: transcriptions.length,
        size: stats.size,
        includeSpeaker,
        includeTimestamps,
        includeConfidence,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      
      res.status(201).json(exportRecord);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/exports", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const exports = await storage.getExports();
      res.json(exports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/exports/:id/download", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const exportId = parseInt(req.params.id);
      const exportRecord = await storage.getExportById(exportId);
      
      if (!exportRecord) {
        return res.status(404).json({ message: "Export not found" });
      }
      
      // Verify path exists
      const filePath = exportRecord.path;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Export file not found on server" });
      }
      
      // Use res.download for proper file download handling
      return res.download(filePath, exportRecord.filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          // Only respond if headers haven't been sent yet
          if (!res.headersSent) {
            res.status(500).json({ message: err.message });
          }
        }
      });
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // --- Token Cleanup Function (Keep) ---
  const downloadTokens = new Map<string, { userId: number, expires: Date, used: boolean }>();
  function cleanupExpiredTokens() {
    const now = new Date();
    // Use forEach to avoid downlevelIteration issue
    downloadTokens.forEach((data, token) => {
      if (data.expires < now) {
        downloadTokens.delete(token);
        console.log(`Cleaned up expired download token: ${token}`);
      }
    });
  }
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // Run every hour

  // Endpoint to create a download token (Keep)
  app.post("/api/audio/create-download-token", isAuthenticated, isAdmin, (req: Request, res: Response) => {
    try {
      const token = randomUUID(); // Use crypto.randomUUID for better randomness
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10); // Token valid for 10 minutes
      
      downloadTokens.set(token, {
        userId: req.user!.id,
        expires,
        used: false
      });
      
      console.log(`Generated download token ${token} for user ${req.user!.id}, expires at ${expires.toISOString()}`);
      res.json({ token });
      
    } catch (error) {
      console.error("Error creating download token:", error);
      res.status(500).json({ error: "Failed to create download token" });
    }
  });

  // Token-based bulk download endpoint (Refactored to use real files)
  app.get("/api/audio/download/:token", async (req: Request, res: Response) => {
    const token = req.params.token;
    console.log(`Bulk audio download request with token: ${token}`);

    // 1. Verify Token
    const tokenData = downloadTokens.get(token);
    if (!tokenData) {
      console.log("Token not found:", token);
      return res.status(401).json({ error: "Invalid or expired download token (not found)" });
    }
    if (tokenData.expires < new Date()) {
      console.log("Token expired:", token);
      downloadTokens.delete(token); // Clean up expired token
      return res.status(401).json({ error: "Download token has expired" });
    }
    if (tokenData.used) {
        console.log("Token already used:", token);
        return res.status(401).json({ error: "Download token has already been used" });
    }

    // Mark token as used immediately
    tokenData.used = true;
    downloadTokens.set(token, tokenData);

    console.log(`Token ${token} validated for user ID: ${tokenData.userId}`);

    try {
        // 2. Prepare ZIP Archive
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const zipFilename = `all_audio_export_${timestamp}.zip`;
        const zipFilePath = path.join(exportsDir, zipFilename);
        console.log(`Creating bulk audio ZIP archive at: ${zipFilePath}`);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        let filesAdded = 0;
        let segmentsAdded = 0;

        // Setup archive event listeners
        output.on('close', () => {
            console.log(`ZIP archive created successfully. Size: ${archive.pointer()} bytes. Contains ${filesAdded} original files and ${segmentsAdded} segments.`);
            res.download(zipFilePath, zipFilename, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error sending ZIP file:', downloadErr);
                } else {
                    console.log(`Successfully sent ZIP file: ${zipFilename}`);
                }
                // Cleanup ZIP file after delay
                setTimeout(() => {
                    fs.unlink(zipFilePath, (unlinkErr) => {
                        if (unlinkErr) console.error(`Error removing temp ZIP file ${zipFilePath}:`, unlinkErr);
                        else console.log(`Cleaned up temp ZIP file: ${zipFilePath}`);
                    });
                }, 15000);
            });
        });

        archive.on('warning', (warnErr) => console.warn('ZIP archive warning:', warnErr));
        archive.on('error', (archiveErr) => {
            console.error('ZIP archive creation error:', archiveErr);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create ZIP archive' });
            }
             output.end();
             fs.unlink(zipFilePath, (unlinkErr) => {
                 if (unlinkErr) console.error(`Error removing partial ZIP file ${zipFilePath} after error:`, unlinkErr);
             });
        });

        archive.pipe(output);

        // 3. Fetch and Add REAL Files/Segments
        console.log("Fetching all audio files and segments from storage...");
        
        // Use getAudioFiles(null, true) to fetch all files, assuming it returns AudioFile[]
        // Explicitly type 'file' as 'AudioFile' (assuming AudioFile type is defined/imported)
        const audioFiles: AudioFile[] = await storage.getAudioFiles(null, true); 
        console.log(`Found ${audioFiles.length} total audio file records.`);

        // Add original uploaded files
        for (const file of audioFiles) { // Type 'file' is now AudioFile
            if (file.originalPath) {
                 const absolutePath = path.resolve(file.originalPath);
                 if (fs.existsSync(absolutePath)) {
                     archive.file(absolutePath, { name: `original_uploads/${path.basename(absolutePath)}` });
                     filesAdded++;
                 } else {
                      console.warn(`Original file path not found on disk: ${absolutePath} for file ID ${file.id}`);
                 }
            }
        }

        // Fetch and add segment files using the correct type AudioSegment
        const allSegments: AudioSegment[] = await storage.getAllSegments(); // Use AudioSegment
        console.log(`Found ${allSegments.length} total segment records.`);
        for (const segment of allSegments) { // Use AudioSegment for loop variable
             if (segment.segmentPath) {
                 const absolutePath = path.resolve(segment.segmentPath);
                 try {
                     await fsPromises.access(absolutePath, fs.constants.R_OK);
                     const parentDir = `file_${segment.audioFileId}_segments`;
                     archive.file(absolutePath, { name: `${parentDir}/${path.basename(absolutePath)}` });
                     segmentsAdded++;
                 } catch (accessErr) {
                     console.warn(`Segment file path not found or not readable: ${absolutePath} for segment ID ${segment.id}`);
                 }
             }
        }

        console.log(`Adding ${filesAdded} original files and ${segmentsAdded} segments to the archive.`);

        // Add README
        const readmeContent = `Bulk Audio Export\nGenerated: ${new Date().toISOString()}\nToken: ${token}\nUser ID: ${tokenData.userId}\n\nContains:\n- ${filesAdded} original uploaded audio files\n- ${segmentsAdded} processed segment files\n`;
        archive.append(readmeContent, { name: 'README.txt' });

        // Finalize archive
        console.log("Finalizing ZIP archive...");
        await archive.finalize();

    } catch (error: any) {
        console.error(`Error during bulk audio download process for token ${token}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Internal server error during bulk download' });
        }
    }
  });
  
  // --- Cleanup Endpoint (Refactored) ---
  app.post("/api/audio/cleanup", isAuthenticated, isAdmin, async (req, res) => {
      console.log("Cleanup request received from user:", req.user!.id);
      try {
          const allFilesResult: any[] = await storage.getAudioFiles(null, true);
          const processedFiles = allFilesResult.filter(fileData => fileData && (fileData as AudioFile).status === 'processed') as AudioFile[];
          console.log(`Found ${processedFiles.length} processed files to potentially clean.`);

          let filesRemovedCount = 0;
          const errors: Array<{ fileId: number; error: string }> = [];

          for (const file of processedFiles) { 
              try {
                   let deletedOriginal = false;
                   let deletedProcessed = false;

                  // Delete original file if exists
                  if (file.originalPath) {
                       const absPath = path.resolve(file.originalPath);
                       try {
                            await fsPromises.unlink(absPath);
                            console.log(`Deleted original file: ${file.originalPath}`);
                            deletedOriginal = true;
                       } catch (e: any) { if (e.code !== 'ENOENT') throw e; } 
                  }
                  // Delete processed file dir if exists
                  if (file.processedPath) {
                       const absPath = path.resolve(file.processedPath);
                       try {
                            await fsPromises.rm(absPath, { recursive: true, force: true });
                            console.log(`Deleted processed dir: ${file.processedPath}`);
                            deletedProcessed = true;
                       } catch (e: any) { if (e.code !== 'ENOENT') throw e; } 
                  }

                  // Delete associated segment files physically
                  // Use correct method name and type
                  const segments: AudioSegment[] = await storage.getAudioSegmentsByFileId(file.id); // Correct method and type
                  for (const segment of segments) { // Use AudioSegment for loop variable
                      if (segment.segmentPath) {
                          const absPath = path.resolve(segment.segmentPath);
                          try {
                               await fsPromises.unlink(absPath);
                               console.log(`Deleted segment file: ${segment.segmentPath}`);
                          } catch (e: any) { 
                              if (e.code !== 'ENOENT') { 
                                  console.error(`Error deleting segment file ${absPath}:`, e);
                              }
                          }
                      }
                  }
                  
                  if (deletedOriginal || deletedProcessed) {
                       filesRemovedCount++;
                  }

              } catch (err: any) {
                  console.error(`Error cleaning up file ID ${file.id}:`, err);
                  errors.push({ fileId: file.id, error: err.message });
              }
          } // end for loop

          console.log(`Cleanup finished. Removed files/dirs related to ${filesRemovedCount} entries.`);
          res.json({
              message: `Cleanup complete. Processed ${processedFiles.length} entries.`,
              filesRemoved: filesRemovedCount,
              errors: errors,
          });

      } catch (error: any) {
          console.error("Error during cleanup:", error);
          res.status(500).json({ error: error.message || "Internal server error during cleanup" });
      }
  });

  // Return the server instance
  try {
    return createServer(app);
  } catch (error) {
    console.error("Error creating HTTP server:", error);
    throw error;
  } finally {
    console.log("Server initialization complete");
  }
}