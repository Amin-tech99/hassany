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
    try {
      // At this point, req.user is already set by isAuthenticated middleware
      const segmentId = parseInt(req.params.id);
      const segment = await storage.getAudioSegmentById(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      
      // Verify access rights
      const audioFile = await storage.getAudioFileById(segment.audioFileId);
      if (!audioFile) {
        return res.status(404).json({ message: "Associated audio file not found" });
      }
      
      // Check if user can access this segment
      const canAccess = 
        req.user!.role === "admin" || 
        audioFile.uploadedBy === req.user!.id || 
        segment.assignedTo === req.user!.id ||
        segment.transcribedBy === req.user!.id ||
        segment.reviewedBy === req.user!.id;
      
      if (!canAccess) {
        return res.status(403).json({ message: "You don't have access to this segment" });
      }
      
      // Log successful access
      console.log(`User ${req.user!.username} accessing audio segment ${segmentId}`);
      
      // Serve the audio file
      res.sendFile(segment.segmentPath, { root: "/" });
      
    } catch (error: any) {
      console.error(`Error serving audio segment ${req.params.id}:`, error);
      res.status(500).json({ message: error.message });
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
      
      // Get transcriptions based on criteria
      let transcriptions;
      if (exportType === "all_verified") {
        transcriptions = await storage.getVerifiedTranscriptions(startDate, endDate);
      } else {
        // For selected files, we would need file IDs
        // This is a simplified implementation
        transcriptions = await storage.getVerifiedTranscriptions(startDate, endDate);
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

  // Add batch approval endpoint
  app.post("/api/transcriptions/batch-approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No valid transcription IDs provided" });
      }
      
      const results = [];
      const errors = [];
      
      // Process each transcription
      for (const id of ids) {
        try {
          // Get the segment
          const segment = await storage.getAudioSegmentById(id);
          if (!segment) {
            errors.push({ id, error: "Segment not found" });
            continue;
          }
          
          // Get or create a transcription for this segment
          let transcription = await storage.getTranscriptionBySegmentId(id);
          
          if (!transcription) {
            errors.push({ id, error: "Transcription not found for this segment" });
            continue;
          }
          
          // Update transcription status to approved
          const updatedTranscription = await storage.updateTranscription(transcription.id, {
            status: "approved",
            reviewedBy: req.user!.id,
            reviewNotes: "Batch approved",
            rating: 5 // Default 5 star rating for batch approvals
          });
          
          // Update segment status to reviewed
          const updatedSegment = await storage.updateAudioSegment(id, {
            status: "reviewed",
            reviewedBy: req.user!.id
          });
          
          results.push({ id, status: "approved" });
        } catch (err) {
          errors.push({ id, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
      
      res.status(200).json({
        success: results.length,
        errors: errors.length > 0 ? errors : undefined,
        results
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add transcription download endpoint
  app.get("/api/transcriptions/download", isAuthenticated, async (req, res) => {
    try {
      // Get segment IDs from query parameters
      const segmentIds = req.query.id;
      let ids: number[] = [];
      
      if (Array.isArray(segmentIds)) {
        ids = segmentIds.map(id => parseInt(id as string)).filter(id => !isNaN(id));
      } else if (segmentIds) {
        const parsedId = parseInt(segmentIds as string);
        if (!isNaN(parsedId)) {
          ids = [parsedId];
        }
      }
      
      if (ids.length === 0) {
        return res.status(400).json({ message: "No valid segment IDs provided" });
      }
      
      // Get transcriptions for each segment
      const transcriptionsData = [];
      const errors = [];
      
      for (const id of ids) {
        try {
          // Get the segment
          const segment = await storage.getAudioSegmentById(id);
          if (!segment) {
            errors.push({ id, error: "Segment not found" });
            continue;
          }
          
          // Get transcription for this segment
          const transcription = await storage.getTranscriptionBySegmentId(id);
          
          if (!transcription) {
            errors.push({ id, error: "Transcription not found for this segment" });
            continue;
          }
          
          // Format the data for downloading
          transcriptionsData.push({
            id: transcription.id,
            segmentId: segment.id,
            text: transcription.text,
            audioId: `Segment_${segment.id}`,
            duration: segment.duration,
            startTime: segment.startTime,
            endTime: segment.endTime,
            status: transcription.status,
            createdAt: transcription.createdAt,
            updatedAt: transcription.updatedAt
          });
        } catch (err) {
          errors.push({ id, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
      
      if (transcriptionsData.length === 0) {
        return res.status(404).json({ 
          message: "No transcriptions found for the provided segment IDs",
          errors: errors.length > 0 ? errors : undefined
        });
      }
      
      // Create JSON content
      const jsonContent = JSON.stringify(transcriptionsData, null, 2);
      
      // Set download headers
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `transcriptions_${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the JSON content as response
      res.send(jsonContent);
      
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Add audio segments download endpoint (as ZIP)
  app.get("/api/segments/download-audio", isAuthenticated, async (req, res) => {
    try {
      // Get segment IDs from query parameters
      const segmentIds = req.query.id;
      let ids: number[] = [];
      
      if (Array.isArray(segmentIds)) {
        ids = segmentIds.map(id => parseInt(id as string)).filter(id => !isNaN(id));
      } else if (segmentIds) {
        const parsedId = parseInt(segmentIds as string);
        if (!isNaN(parsedId)) {
          ids = [parsedId];
        }
      }
      
      console.log(`Attempting to download audio segments with IDs: ${ids.join(', ')}`);
      
      if (ids.length === 0) {
        return res.status(400).json({ message: "No valid segment IDs provided" });
      }
      
      // Get segments data
      const segmentsData: { id: number; filename: string }[] = [];
      const errors: { id: number; error: string }[] = [];
      
      // Create a timestamp for the zip filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const zipFilename = `audio_segments_${timestamp}.zip`;
      const zipFilePath = path.join(exportsDir, zipFilename);
      
      console.log(`Creating zip file at: ${zipFilePath}`);
      
      // First check if all segments exist and have valid transcriptions
      // This prevents creating an empty or invalid zip file
      let validSegmentCount = 0;
      
      for (const id of ids) {
        try {
          // Get the segment
          const segment = await storage.getAudioSegmentById(id);
          if (!segment) {
            console.log(`Segment ${id} not found`);
            errors.push({ id, error: "Segment not found" });
            continue;
          }
          
          // Don't require transcription, just check if the audio file exists
          if (!fs.existsSync(segment.segmentPath)) {
            console.log(`Audio file not found for segment ${id}: ${segment.segmentPath}`);
            errors.push({ id, error: "Audio file not found on server" });
            continue;
          }
          
          validSegmentCount++;
        } catch (err) {
          console.error(`Error checking segment ${id}:`, err);
          errors.push({ id, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
      
      if (validSegmentCount === 0) {
        return res.status(404).json({ 
          message: "No valid audio segments found for the provided IDs",
          errors: errors.length > 0 ? errors : undefined
        });
      }
      
      console.log(`Found ${validSegmentCount} valid segments to include in zip`);
      
      // Create a write stream for the zip file
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Set up event listeners
      output.on('close', async () => {
        try {
          console.log(`Zip file created successfully. Size: ${archive.pointer()} bytes`);
          // Send the zip file as download
          res.download(zipFilePath, zipFilename, (err) => {
            if (err) {
              console.error('Download error:', err);
              if (!res.headersSent) {
                res.status(500).json({ message: err.message });
              }
            }
            // Remove the temporary zip file after sending
            setTimeout(() => {
              fs.unlink(zipFilePath, (unlinkErr: NodeJS.ErrnoException | null) => {
                if (unlinkErr) console.error('Error removing temp zip file:', unlinkErr);
              });
            }, 5000); // Give a 5 second delay to ensure download starts
          });
        } catch (err) {
          console.error('Error sending zip file:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error sending zip file' });
          }
        }
      });
      
      archive.on('warning', (err: Error) => {
        console.warn('Zip warning:', err);
        // Don't fail on warnings
      });
      
      archive.on('error', (err: Error) => {
        console.error('Zip creation error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error creating zip file: ' + err.message });
        }
      });
      
      // Pipe archive data to the output file
      archive.pipe(output);
      
      // Process each segment and add audio files to the archive
      for (const id of ids) {
        try {
          // Get the segment
          const segment = await storage.getAudioSegmentById(id);
          if (!segment) {
            continue; // Already checked above
          }
          
          // Check if the segment audio file exists
          if (!fs.existsSync(segment.segmentPath)) {
            continue; // Already checked above
          }
          
          console.log(`Adding segment ${id} to zip: ${segment.segmentPath}`);
          
          // Add file to archive with a meaningful name
          const audioFilename = `Segment_${segment.id}.wav`;
          archive.file(segment.segmentPath, { name: audioFilename });
          
          // Add segment to successful results
          segmentsData.push({
            id: segment.id,
            filename: audioFilename
          });
        } catch (err) {
          console.error(`Error adding segment ${id} to zip:`, err);
          // Skip this segment but continue with others
        }
      }
      
      // Check if we found any segments to add
      if (segmentsData.length === 0) {
        archive.abort(); // Cancel the archive operation
        output.end();    // Close the output stream
        
        return res.status(404).json({ 
          message: "Failed to add any audio segments to the zip file",
          errors: errors.length > 0 ? errors : undefined
        });
      }
      
      // Include a README.txt file with information about the segments
      const readmeContent = `Audio Segments Export
Generated: ${new Date().toISOString()}
Number of segments: ${segmentsData.length}

Included segments:
${segmentsData.map(s => `- Segment_${s.id}.wav`).join('\n')}
`;
      archive.append(readmeContent, { name: 'README.txt' });
      
      // Include a JSON metadata file with segment information
      const metadataContent = JSON.stringify(segmentsData, null, 2);
      archive.append(metadataContent, { name: 'metadata.json' });
      
      // Finalize the archive
      archive.finalize();
      
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ message: error.message || 'Server error creating download' });
    }
  });

  return createServer(app);
}