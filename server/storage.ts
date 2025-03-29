import { 
  users, type User, type InsertUser, 
  audioFiles, type AudioFile, type InsertAudioFile, 
  audioSegments, type AudioSegment, type InsertAudioSegment, 
  transcriptions, type Transcription, type InsertTranscription, 
  exports, type Export, type InsertExport 
} from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";
// Import specific types to avoid namespace issues if possible
import type { Store as SessionStore } from "express-session"; 

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

// Define additional types needed for storage operations
interface TaskSummary {
  assigned: number;
  completed: number;
  pendingReview: number;
}

interface TranscriptionTask {
  id: number;
  audioId: string;
  duration: number;
  assignedTo: string;
  status: string;
  dueDate: string;
}

interface UserUpdate {
  username?: string;
  password?: string;
  fullName?: string;
  role?: string;
}

interface AudioSegmentUpdate {
  status?: string;
  assignedTo?: number | null;
  transcribedBy?: number | null;
  reviewedBy?: number | null;
  segmentPath?: string;
}

interface AudioFileUpdate {
  status?: string;
  processedPath?: string | null;
  segments?: number | null;
  duration?: number | null;
  error?: string | null;
}

interface RecentActivity {
  id: number;
  type: string;
  status: string;
  updatedAt: string;
  task: string;
}

interface FormattedTranscription {
  id: number;
  text: string;
  audioPath: string;
  duration: number;
  startTime?: number;
  endTime?: number;
  speaker?: string;
  confidence?: number;
  verified?: boolean;
}

// Define TranscriptionUpdate interface outside the class
interface TranscriptionUpdate {
    text?: string;
    notes?: string | null;
    reviewedBy?: number | null;
    status?: string;
    rating?: number | null;
    reviewNotes?: string | null;
}

// Define FormattedExport interface for getExports return type
interface FormattedExport extends Omit<Export, 'createdBy'> {
  createdByName: string;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, update: UserUpdate): Promise<User>;

  // Audio file operations
  createAudioFile(file: InsertAudioFile): Promise<AudioFile>;
  getAudioFiles(userId: number | null, isAdmin: boolean): Promise<any[]>;
  getAudioFileById(id: number): Promise<AudioFile | undefined>;
  updateAudioFile(id: number, updates: AudioFileUpdate): Promise<AudioFile>;
  updateAudioFileStatus(id: number, status: string): Promise<AudioFile>;
  getAllAudioFileRecords(): Promise<AudioFile[]>;

  // Audio segment operations
  createAudioSegment(segment: InsertAudioSegment): Promise<AudioSegment>;
  getAudioSegmentById(id: number): Promise<AudioSegment | undefined>;
  updateAudioSegment(id: number, updates: AudioSegmentUpdate): Promise<AudioSegment>;
  updateAudioSegmentStatus(id: number, status: string): Promise<AudioSegment>;
  getAudioSegmentsByFileId(fileId: number): Promise<AudioSegment[]>;
  getAvailableSegments(): Promise<AudioSegment[]>;
  getAllSegments(): Promise<AudioSegment[]>;
  
  // Transcription operations
  createTranscription(transcription: InsertTranscription): Promise<Transcription>;
  getTranscriptionBySegmentId(segmentId: number): Promise<Transcription | undefined>;
  updateTranscription(id: number, updates: TranscriptionUpdate): Promise<Transcription>;
  getTranscriptionTasks(userId: number, status?: string): Promise<TranscriptionTask[]>;
  getVerifiedTranscriptions(startDate?: string, endDate?: string): Promise<FormattedTranscription[]>;
  
  // Export operations
  createExport(exportData: InsertExport): Promise<Export>;
  getExports(): Promise<FormattedExport[]>;
  getExportById(id: number): Promise<Export | undefined>;
  
  // Dashboard operations
  getTaskSummary(userId: number): Promise<TaskSummary>;
  getRecentActivities(userId: number, isAdmin: boolean): Promise<RecentActivity[]>;
  
  // Session store
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private audioFiles: Map<number, AudioFile>;
  private audioSegments: Map<number, AudioSegment>;
  private transcriptions: Map<number, Transcription>;
  private exports: Map<number, Export>;
  sessionStore: SessionStore;
  currentUserId: number;
  currentAudioFileId: number;
  currentAudioSegmentId: number;
  currentTranscriptionId: number;
  currentExportId: number;

  constructor() {
    this.users = new Map();
    this.audioFiles = new Map();
    this.audioSegments = new Map();
    this.transcriptions = new Map();
    this.exports = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }) as SessionStore;
    this.currentUserId = 1;
    this.currentAudioFileId = 1;
    this.currentAudioSegmentId = 1;
    this.currentTranscriptionId = 1;
    this.currentExportId = 1;
    
    // Add a default admin user
    this.createInitialAdminUser();
  }

  private async createInitialAdminUser() {
    const salt = randomBytes(16).toString("hex");
    const hash = await scryptAsync("admin123", salt, 64) as Buffer;
    const password = `${hash.toString("hex")}.${salt}`;
    
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password,
      fullName: "Admin User",
      role: "admin",
      createdAt: new Date()
    };
    
    this.users.set(adminUser.id, adminUser);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, update: UserUpdate): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      ...(update.username && { username: update.username }),
      ...(update.password && { password: update.password }),
      ...(update.fullName && { fullName: update.fullName }),
      ...(update.role && { role: update.role }),
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Audio file operations
  async createAudioFile(file: InsertAudioFile): Promise<AudioFile> {
    const id = this.currentAudioFileId++;
    const now = new Date();
    const audioFile: AudioFile = {
      id,
      filename: file.filename,
      originalPath: file.originalPath,
      status: file.status,
      uploadedBy: file.uploadedBy,
      processedPath: file.processedPath === undefined ? null : file.processedPath,
      segments: file.segments === undefined ? null : file.segments,
      duration: file.duration === undefined ? null : file.duration,
      size: file.size === undefined ? null : file.size,
      error: file.error === undefined ? null : file.error,
      createdAt: now,
      updatedAt: now,
    };
    this.audioFiles.set(id, audioFile);
    return audioFile;
  }

  async getAudioFiles(userId: number | null, isAdmin: boolean): Promise<any[]> {
    const files = Array.from(this.audioFiles.values());
    
    const filteredFiles = isAdmin 
      ? files 
      : files.filter(file => file.uploadedBy === userId);
      
    return filteredFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      uploadedAt: file.createdAt ? file.createdAt.toISOString() : null,
      status: file.status,
      segments: file.segments,
      processingProgress: file.status === "processing" ? Math.floor(Math.random() * 100) : undefined
    }));
  }

  async getAudioFileById(id: number): Promise<AudioFile | undefined> {
    return this.audioFiles.get(id);
  }

  async updateAudioFile(id: number, updates: AudioFileUpdate): Promise<AudioFile> {
    const file = await this.getAudioFileById(id);
    if (!file) {
      throw new Error(`Audio file with ID ${id} not found`);
    }
    
    const updatedFile: AudioFile = {
      ...file,
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.processedPath !== undefined && { processedPath: updates.processedPath }),
      ...(updates.segments !== undefined && { segments: updates.segments }),
      ...(updates.duration !== undefined && { duration: updates.duration }),
      ...(updates.error !== undefined && { error: updates.error }),
      updatedAt: new Date(),
    };
    
    this.audioFiles.set(id, updatedFile);
    return updatedFile;
  }
  
  async updateAudioFileStatus(id: number, status: string): Promise<AudioFile> {
    return this.updateAudioFile(id, { status });
  }

  // Add new method implementation for getting all raw AudioFile records
  async getAllAudioFileRecords(): Promise<AudioFile[]> {
    return Array.from(this.audioFiles.values());
  }

  // Audio segment operations
  async createAudioSegment(segment: InsertAudioSegment): Promise<AudioSegment> {
    const id = this.currentAudioSegmentId++;
    const now = new Date();
    const audioSegment: AudioSegment = {
      id,
      audioFileId: segment.audioFileId,
      segmentPath: segment.segmentPath,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.duration,
      status: segment.status,
      assignedTo: segment.assignedTo === undefined ? null : segment.assignedTo,
      transcribedBy: segment.transcribedBy === undefined ? null : segment.transcribedBy,
      reviewedBy: segment.reviewedBy === undefined ? null : segment.reviewedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.audioSegments.set(id, audioSegment);
    return audioSegment;
  }

  async getAudioSegmentById(id: number): Promise<AudioSegment | undefined> {
    return this.audioSegments.get(id);
  }

  async updateAudioSegment(id: number, updates: AudioSegmentUpdate): Promise<AudioSegment> {
    const segment = await this.getAudioSegmentById(id);
    if (!segment) {
      throw new Error(`Audio segment with ID ${id} not found`);
    }
    
    const updatedSegment: AudioSegment = {
      ...segment,
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.assignedTo !== undefined && { assignedTo: updates.assignedTo }),
      ...(updates.transcribedBy !== undefined && { transcribedBy: updates.transcribedBy }),
      ...(updates.reviewedBy !== undefined && { reviewedBy: updates.reviewedBy }),
      ...(updates.segmentPath !== undefined && { segmentPath: updates.segmentPath }),
      updatedAt: new Date(),
    };
    
    this.audioSegments.set(id, updatedSegment);
    return updatedSegment;
  }
  
  async updateAudioSegmentStatus(id: number, status: string): Promise<AudioSegment> {
    return this.updateAudioSegment(id, { status });
  }

  async getAudioSegmentsByFileId(fileId: number): Promise<AudioSegment[]> {
    return Array.from(this.audioSegments.values())
      .filter(segment => segment.audioFileId === fileId);
  }
  
  async getAvailableSegments(): Promise<AudioSegment[]> {
    return Array.from(this.audioSegments.values())
      .filter(segment => segment.status === 'available')
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  // Add new method implementation for getting all raw AudioSegment records
  async getAllSegments(): Promise<AudioSegment[]> {
    return Array.from(this.audioSegments.values());
  }

  // Transcription operations
  async createTranscription(transcription: InsertTranscription): Promise<Transcription> {
    const id = this.currentTranscriptionId++;
    const now = new Date();
    const newTranscription: Transcription = {
      id,
      segmentId: transcription.segmentId,
      text: transcription.text,
      createdBy: transcription.createdBy,
      status: transcription.status,
      reviewedBy: transcription.reviewedBy === undefined ? null : transcription.reviewedBy,
      notes: transcription.notes === undefined ? null : transcription.notes,
      rating: transcription.rating === undefined ? null : transcription.rating,
      reviewNotes: transcription.reviewNotes === undefined ? null : transcription.reviewNotes,
      createdAt: now,
      updatedAt: now,
    };
    this.transcriptions.set(id, newTranscription);
    return newTranscription;
  }

  async getTranscriptionBySegmentId(segmentId: number): Promise<Transcription | undefined> {
    return Array.from(this.transcriptions.values())
      .find(t => t.segmentId === segmentId);
  }

  // Re-parse check comment
  // Method signature remains the same, referencing the interface defined outside
  async updateTranscription(id: number, updates: TranscriptionUpdate): Promise<Transcription> {
    // Find by ID using the map's get method for efficiency
    const transcription = this.transcriptions.get(id); 
    if (!transcription) {
      throw new Error(`Transcription with ID ${id} not found`);
    }
    
    // Apply updates correctly
    const updatedTranscription: Transcription = {
      ...transcription,
      ...(updates.text !== undefined && { text: updates.text }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.reviewedBy !== undefined && { reviewedBy: updates.reviewedBy }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.rating !== undefined && { rating: updates.rating }),
      ...(updates.reviewNotes !== undefined && { reviewNotes: updates.reviewNotes }),
      updatedAt: new Date(), // Always update updatedAt
    };
    
    this.transcriptions.set(id, updatedTranscription); // Use set with the ID
    return updatedTranscription;
  }

  async getTranscriptionTasks(userId: number, status?: string): Promise<TranscriptionTask[]> {
    // Get all segments that are assigned to this user or the user is an admin
    const segments = Array.from(this.audioSegments.values())
      .filter(segment => {
        // Check if user is admin 
        const user = this.users.get(userId);
        const isAdmin = user?.role === 'admin';
        
        // Filter by status if provided
        if (status) {
          if (status === "assigned") {
            return segment.assignedTo === userId;
          }
          if (status === "review") {
            // For review status, show only segments with status "transcribed" (pending review)
            if (segment.status !== "transcribed") {
              return false;
            }
            
            // For non-admin users, only show segments assigned to them for review
            if (!isAdmin && segment.reviewedBy !== userId) {
              return false;
            }
            
            return true;
          }
          if (status === "completed") {
            return segment.status === "reviewed";
          }
        }
        
        // If no status filter or status doesn't match special cases above
        
        // For admins, return all segments when no specific filter is applied
        if (isAdmin) {
          return true;
        }
        
        // For regular users, only return segments they're involved with
        return segment.assignedTo === userId || 
               segment.transcribedBy === userId || 
               segment.reviewedBy === userId;
      });
    
    // Format for response
    const tasks: TranscriptionTask[] = await Promise.all(
      segments.map(async segment => {
        const user = segment.assignedTo ? await this.getUser(segment.assignedTo) : undefined;
        
        // Handle potentially null createdAt before creating Date
        const baseDate = segment.createdAt ? new Date(segment.createdAt) : new Date(); // Default to now if null
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + 3);
        
        return {
          id: segment.id,
          audioId: `Segment_${segment.id}`,
          // Ensure duration is not null, provide default if necessary
          duration: segment.duration ?? 0, 
          assignedTo: user ? user.fullName : "Unassigned",
          status: segment.status,
          dueDate: dueDate.toISOString(),
        };
      })
    );
    
    return tasks;
  }

  async getVerifiedTranscriptions(startDate?: string, endDate?: string): Promise<FormattedTranscription[]> {
    let filteredTranscriptions = Array.from(this.transcriptions.values())
      .filter(t => t.status === 'approved');

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start || end) {
      filteredTranscriptions = filteredTranscriptions.filter(t => {
        // Check for null before creating Date
        if (!t.updatedAt) return false;
        // Explicit cast after null check for new Date()
        const updatedAtDate = new Date(t.updatedAt as Date);
        const afterStart = start ? updatedAtDate >= start : true;
        const beforeEnd = end ? updatedAtDate <= end : true;
        return afterStart && beforeEnd;
      });
    }

    // Map to FormattedTranscription, retrieving segment info
    const formatted: FormattedTranscription[] = [];
    for (const t of filteredTranscriptions) {
      const segment = await this.getAudioSegmentById(t.segmentId);
      if (segment && segment.segmentPath && segment.duration !== null) { 
        formatted.push({
          id: t.id,
          text: t.text,
          audioPath: segment.segmentPath,
          duration: segment.duration,
          startTime: segment.startTime,
          endTime: segment.endTime,
          verified: t.status === 'approved' 
        });
      }
    }
    return formatted;
  }

  // Export operations
  async createExport(exportData: InsertExport): Promise<Export> {
    const id = this.currentExportId++;
    const now = new Date();
    // Explicitly handle undefined -> null conversion for optional fields
    const newExport: Export = {
      id,
      filename: exportData.filename,
      path: exportData.path,
      size: exportData.size,
      format: exportData.format,
      records: exportData.records,
      createdBy: exportData.createdBy,
      includeSpeaker: exportData.includeSpeaker === undefined ? null : exportData.includeSpeaker,
      includeTimestamps: exportData.includeTimestamps === undefined ? null : exportData.includeTimestamps,
      includeConfidence: exportData.includeConfidence === undefined ? null : exportData.includeConfidence,
      startDate: exportData.startDate === undefined ? null : exportData.startDate,
      endDate: exportData.endDate === undefined ? null : exportData.endDate,
      createdAt: now, // Provide Date for Date | null field
    };
    this.exports.set(id, newExport);
    return newExport;
  }

  // Update return type to match interface
  async getExports(): Promise<FormattedExport[]> {
    return Array.from(this.exports.values()).map(exp => {
      const { createdBy, ...restOfExport } = exp;
      return {
        ...restOfExport,
        // Keep createdBy as number in original object, add name separately
        createdByName: this.users.get(createdBy as number)?.fullName || `User ${createdBy}`
      };
    });
    // No need for explicit type assertion if map returns the correct structure
  }

  async getExportById(id: number): Promise<Export | undefined> {
    return this.exports.get(id);
  }

  // Dashboard operations
  async getTaskSummary(userId: number): Promise<TaskSummary> {
    const segments = Array.from(this.audioSegments.values());
    const user = this.users.get(userId);
    const isAdmin = user?.role === 'admin';
    
    // Count assigned tasks (tasks assigned to this user that aren't completed)
    const assigned = segments.filter(s => 
      s.assignedTo === userId && 
      s.status !== "reviewed"
    ).length;
    
    // Count completed tasks (segments this user has transcribed that are reviewed)
    const completed = segments.filter(s => {
      // For admin, show all completed tasks
      if (isAdmin) {
        return s.status === "reviewed";
      }
      // For regular users, show tasks they've worked on that are completed
      return (s.transcribedBy === userId || s.reviewedBy === userId) && 
             s.status === "reviewed";
    }).length;
    
    // Count pending review (segments with status "transcribed" that this user can review)
    const pendingReview = segments.filter(s => {
      if (s.status !== "transcribed") return false;
      
      // For admin, show all pending reviews
      if (isAdmin) return true;
      
      // For reviewers, show segments assigned to them for review
      return s.reviewedBy === userId;
    }).length;
    
    return {
      assigned,
      completed,
      pendingReview
    };
  }

  // NOTE: This implementation seems older/different from the getRecentActivity below it.
  // It might be redundant or intended for a different purpose. 
  // Applying explicit date checks to satisfy the linter.
  async getRecentActivities(userId: number, isAdmin: boolean): Promise<RecentActivity[]> {
    // Get segments involving this user
    const segments = Array.from(this.audioSegments.values())
      .filter(s => isAdmin || s.assignedTo === userId || s.transcribedBy === userId || s.reviewedBy === userId)
      // Use explicit instanceof Date checks for sorting
      .sort((a, b) => {
          const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
          const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
          return timeB - timeA; // Sort newest first, invalid dates treated as oldest
      })
      .slice(0, 10); // Get 10 most recent
    
    const activities: RecentActivity[] = segments.map(s => {
      // Determine activity type based on segment status
      let type = "Transcription";
      if (s.status === "transcribed" || s.status === "reviewed" || s.status === "rejected") {
        type = "Verification";
      } else if (s.status === "available") {
        type = "Processing";
      }
      
      // Use explicit instanceof Date check for formatting
      const updatedAtString = s.updatedAt instanceof Date ? s.updatedAt.toISOString() : '';

      return {
        id: s.id,
        type,
        status: s.status,
        updatedAt: updatedAtString, // Use the safely formatted string
        task: `Audio Segment ${s.id}`, 
      };
    });
    
    return activities;
  }

  // NOTE: This is the implementation modified in previous steps. It correctly combines
  // segments and transcriptions and likely should replace getRecentActivities above.
  async getRecentActivity(userId: number, limit: number = 10): Promise<RecentActivity[]> {
    const user = this.users.get(userId);
    const isAdmin = user?.role === 'admin';

    // Combine segments and transcriptions
    let allActivities: (AudioSegment | Transcription)[] = [ // Add explicit union type
        ...Array.from(this.audioSegments.values()),
        ...Array.from(this.transcriptions.values()),
    ];

    // Filter based on user involvement if not admin
    if (!isAdmin) {
        allActivities = allActivities.filter(activity => {
            if ('segmentId' in activity) { // It's a Transcription
                return activity.createdBy === userId || activity.reviewedBy === userId;
            } else { // It's an AudioSegment
                return activity.assignedTo === userId || activity.transcribedBy === userId || activity.reviewedBy === userId;
            }
        });
    }

    // Sort by updatedAt date, newest first (handle nulls explicitly)
    allActivities.sort((a, b) => {
        // Use instanceof Date for robust check
        const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
        const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
        if (dateA === 0 && dateB === 0) return 0;
        if (dateA === 0) return 1; // Put items with null/invalid dates last
        if (dateB === 0) return -1; // Put items with null/invalid dates last
        return dateB - dateA; // Sort valid dates newest first
    });

    // Take the specified limit
    const recentActivities = allActivities.slice(0, limit);

    // Format the output to match RecentActivity interface
    return recentActivities.map((activity): RecentActivity => { // Add return type annotation
        let type: string;
        let task: string; // Use 'task' instead of 'description'
        let id = activity.id;
        let status = activity.status; // Common property

        if ('segmentId' in activity) { // It's a Transcription
            type = 'transcription';
            task = `Transcription ${id} (Segment ${activity.segmentId}) status changed to ${status}`;
        } else { // It's an AudioSegment
            type = 'segment';
            task = `Segment ${id} status changed to ${status}`;
        }

        // Format updatedAt as ISO string, default to empty string if null/invalid
        const updatedAtString = activity.updatedAt instanceof Date
            ? activity.updatedAt.toISOString()
            : ''; // Match interface expecting string

        return {
            id,
            type, // string
            status, // string
            updatedAt: updatedAtString, // string (ISO format or empty)
            task, // string
        };
    });
  }
}

export const storage = new MemStorage();
