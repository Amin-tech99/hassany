import { pgTable, text, serial, integer, boolean, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // 'transcriber', 'reviewer', 'collector', 'admin'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Audio file model
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalPath: text("original_path").notNull(),
  processedPath: text("processed_path"),
  uploadedBy: integer("uploaded_by").notNull(), // User ID
  status: text("status").notNull(), // 'uploading', 'processing', 'processed', 'error'
  segments: integer("segments").default(0),
  duration: integer("duration"), // in seconds
  size: integer("size"), // in bytes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  error: text("error"),
});

export const insertAudioFileSchema = createInsertSchema(audioFiles).pick({
  filename: true,
  originalPath: true,
  processedPath: true,
  uploadedBy: true,
  status: true,
  segments: true,
  duration: true,
  size: true,
  error: true,
});

export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type AudioFile = typeof audioFiles.$inferSelect;

// Audio segment model
export const audioSegments = pgTable("audio_segments", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull(), // Reference to the parent audio file
  segmentPath: text("segment_path").notNull(),
  startTime: integer("start_time").notNull(), // in milliseconds
  endTime: integer("end_time").notNull(), // in milliseconds
  duration: integer("duration").notNull(), // in milliseconds
  status: text("status").notNull(), // 'available', 'assigned', 'transcribed', 'reviewed', 'rejected'
  assignedTo: integer("assigned_to"), // User ID
  transcribedBy: integer("transcribed_by"), // User ID
  reviewedBy: integer("reviewed_by"), // User ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAudioSegmentSchema = createInsertSchema(audioSegments).pick({
  audioFileId: true,
  segmentPath: true,
  startTime: true,
  endTime: true,
  duration: true,
  status: true,
  assignedTo: true,
  transcribedBy: true,
  reviewedBy: true,
});

export type InsertAudioSegment = z.infer<typeof insertAudioSegmentSchema>;
export type AudioSegment = typeof audioSegments.$inferSelect;

// Transcription model
export const transcriptions = pgTable("transcriptions", {
  id: serial("id").primaryKey(),
  segmentId: integer("segment_id").notNull(), // Reference to the audio segment
  text: text("text").notNull(),
  createdBy: integer("created_by").notNull(), // User ID
  reviewedBy: integer("reviewed_by"), // User ID
  status: text("status").notNull(), // 'pending_review', 'approved', 'rejected'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  rating: integer("rating"), // 1-5 star rating by reviewer
  reviewNotes: text("review_notes"), // Notes from reviewer if rejected
});

export const insertTranscriptionSchema = createInsertSchema(transcriptions).pick({
  segmentId: true,
  text: true,
  createdBy: true,
  reviewedBy: true,
  status: true,
  notes: true,
  rating: true,
  reviewNotes: true,
});

export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
export type Transcription = typeof transcriptions.$inferSelect;

// Export model (for tracking JSON exports)
export const exports = pgTable("exports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  format: text("format").notNull(), // 'whisper', 'standard', 'custom'
  createdBy: integer("created_by").notNull(), // User ID
  records: integer("records").notNull(), // Number of records in the export
  size: integer("size").notNull(), // Size in bytes
  includeSpeaker: boolean("include_speaker").default(false),
  includeTimestamps: boolean("include_timestamps").default(true),
  includeConfidence: boolean("include_confidence").default(false),
  startDate: timestamp("start_date"), // Filter: Start date for data
  endDate: timestamp("end_date"), // Filter: End date for data
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExportSchema = createInsertSchema(exports).pick({
  filename: true,
  path: true,
  format: true,
  createdBy: true,
  records: true,
  size: true,
  includeSpeaker: true,
  includeTimestamps: true,
  includeConfidence: true,
  startDate: true,
  endDate: true,
});

export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exports.$inferSelect;

// Login form schema (used for validation)
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form schema (used for validation)
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["transcriber", "reviewer", "collector", "admin"], {
    errorMap: () => ({ message: "Invalid role selected" }),
  }),
});
