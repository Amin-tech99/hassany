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

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, update: UserUpdate): Promise<User>;

  // Audio file operations
  createAudioFile(file: InsertAudioFile): Promise<AudioFile>;
  getAudioFiles(userId: number, isAdmin: boolean): Promise<any[]>;
  getAudioFileById(id: number): Promise<AudioFile | undefined>;
  updateAudioFile(id: number, updates: Partial<AudioFile>): Promise<AudioFile>;
  updateAudioFileStatus(id: number, status: string): Promise<AudioFile>;

  // Audio segment operations
  createAudioSegment(segment: InsertAudioSegment): Promise<AudioSegment>;
  getAudioSegmentById(id: number): Promise<AudioSegment | undefined>;
  updateAudioSegment(id: number, updates: AudioSegmentUpdate): Promise<AudioSegment>;
  updateAudioSegmentStatus(id: number, status: string): Promise<AudioSegment>;
  getAudioSegmentsByFileId(fileId: number): Promise<AudioSegment[]>;
  getAvailableSegments(): Promise<AudioSegment[]>;
  
  // Transcription operations
  createTranscription(transcription: InsertTranscription): Promise<Transcription>;
  getTranscriptionBySegmentId(segmentId: number): Promise<Transcription | undefined>;
  updateTranscription(id: number, updates: Partial<Transcription>): Promise<Transcription>;
  getTranscriptionTasks(userId: number, status?: string): Promise<TranscriptionTask[]>;
  getVerifiedTranscriptions(startDate?: string, endDate?: string): Promise<FormattedTranscription[]>;
  
  // Export operations
  createExport(exportData: InsertExport): Promise<Export>;
  getExports(): Promise<Export[]>;
  getExportById(id: number): Promise<Export | undefined>;
  
  // Dashboard operations
  getTaskSummary(userId: number): Promise<TaskSummary>;
  getRecentActivities(userId: number, isAdmin: boolean): Promise<RecentActivity[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private audioFiles: Map<number, AudioFile>;
  private audioSegments: Map<number, AudioSegment>;
  private transcriptions: Map<number, Transcription>;
  private exports: Map<number, Export>;
  sessionStore: session.SessionStore;
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
    });
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
    const audioFile: AudioFile = {
      ...file,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.audioFiles.set(id, audioFile);
    return audioFile;
  }

  async getAudioFiles(userId: number, isAdmin: boolean): Promise<any[]> {
    const files = Array.from(this.audioFiles.values());
    
    // Filter files by user unless admin
    const filteredFiles = isAdmin 
      ? files 
      : files.filter(file => file.uploadedBy === userId);
      
    // Format for response
    return filteredFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      uploadedAt: file.createdAt.toISOString(),
      status: file.status,
      segments: file.segments,
      processingProgress: file.status === "processing" ? Math.floor(Math.random() * 100) : undefined // Mock progress for demo
    }));
  }

  async getAudioFileById(id: number): Promise<AudioFile | undefined> {
    return this.audioFiles.get(id);
  }

  async updateAudioFile(id: number, updates: Partial<AudioFile>): Promise<AudioFile> {
    const file = await this.getAudioFileById(id);
    if (!file) {
      throw new Error(`Audio file with ID ${id} not found`);
    }
    
    const updatedFile: AudioFile = {
      ...file,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.audioFiles.set(id, updatedFile);
    return updatedFile;
  }
  
  async updateAudioFileStatus(id: number, status: string): Promise<AudioFile> {
    return this.updateAudioFile(id, { status });
  }

  // Audio segment operations
  async createAudioSegment(segment: InsertAudioSegment): Promise<AudioSegment> {
    const id = this.currentAudioSegmentId++;
    const audioSegment: AudioSegment = {
      ...segment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      ...(updates.status && { status: updates.status }),
      ...(updates.assignedTo !== undefined && { assignedTo: updates.assignedTo }),
      ...(updates.transcribedBy !== undefined && { transcribedBy: updates.transcribedBy }),
      ...(updates.reviewedBy !== undefined && { reviewedBy: updates.reviewedBy }),
      ...(updates.segmentPath && { segmentPath: updates.segmentPath }),
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
    // Get all segments with status 'available' (processed but not assigned)
    return Array.from(this.audioSegments.values())
      .filter(segment => segment.status === "available")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // Sort oldest first
  }

  // Transcription operations
  async createTranscription(transcription: InsertTranscription): Promise<Transcription> {
    const id = this.currentTranscriptionId++;
    const newTranscription: Transcription = {
      ...transcription,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transcriptions.set(id, newTranscription);
    return newTranscription;
  }

  async getTranscriptionBySegmentId(segmentId: number): Promise<Transcription | undefined> {
    return Array.from(this.transcriptions.values())
      .find(t => t.segmentId === segmentId);
  }

  async updateTranscription(id: number, updates: Partial<Transcription>): Promise<Transcription> {
    const transcription = this.transcriptions.get(id);
    if (!transcription) {
      throw new Error(`Transcription with ID ${id} not found`);
    }
    
    const updatedTranscription: Transcription = {
      ...transcription,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.transcriptions.set(id, updatedTranscription);
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
        
        // Create a due date 3 days from the segment creation date
        const dueDate = new Date(segment.createdAt);
        dueDate.setDate(dueDate.getDate() + 3);
        
        return {
          id: segment.id,
          audioId: `Segment_${segment.id}`,
          duration: segment.duration,
          assignedTo: user ? user.fullName : "Unassigned",
          status: segment.status,
          dueDate: dueDate.toISOString(),
        };
      })
    );
    
    return tasks;
  }

  async getVerifiedTranscriptions(startDate?: string, endDate?: string): Promise<FormattedTranscription[]> {
    // Get all transcriptions with "approved" status
    const verified = Array.from(this.transcriptions.values())
      .filter(t => t.status === "approved")
      .filter(t => {
        if (!startDate && !endDate) return true;
        
        const createdAt = new Date(t.createdAt);
        
        if (startDate && !endDate) {
          return createdAt >= new Date(startDate);
        }
        
        if (!startDate && endDate) {
          return createdAt <= new Date(endDate);
        }
        
        return createdAt >= new Date(startDate!) && createdAt <= new Date(endDate!);
      });
    
    console.log(`Found ${verified.length} transcriptions with "approved" status`);
    
    const formattedTranscriptions: FormattedTranscription[] = await Promise.all(
      verified.map(async t => {
        const segment = await this.getAudioSegmentById(t.segmentId);
        if (!segment) {
          console.log(`Warning: Segment ${t.segmentId} not found for transcription ${t.id}`);
          return null;
        }
        
        return {
          id: t.id,
          text: t.text,
          audioPath: segment.segmentPath || "",
          duration: segment.duration || 0,
          startTime: segment.startTime,
          endTime: segment.endTime,
          speaker: "unknown", // Placeholder, would be populated from real data
          confidence: 0.95, // Placeholder, would be populated from real data
          verified: true,
        };
      })
    );
    
    // Filter out any null values (from missing segments)
    const filteredTranscriptions = formattedTranscriptions.filter(t => t !== null) as FormattedTranscription[];
    console.log(`Returning ${filteredTranscriptions.length} formatted transcriptions`);
    
    return filteredTranscriptions;
  }

  // Export operations
  async createExport(exportData: InsertExport): Promise<Export> {
    const id = this.currentExportId++;
    const newExport: Export = {
      ...exportData,
      id,
      createdAt: new Date(),
    };
    this.exports.set(id, newExport);
    return newExport;
  }

  async getExports(): Promise<Export[]> {
    return Array.from(this.exports.values())
      .map(exp => ({
        ...exp,
        // Include user name for display
        createdBy: this.users.get(exp.createdBy as number)?.fullName || `User ${exp.createdBy}`
      })) as Export[];
  }

  async getExportById(id: number): Promise<Export | undefined> {
    return this.exports.get(id);
  }

  // Dashboard operations
  async getTaskSummary(userId: number): Promise<TaskSummary> {
    const segments = Array.from(this.audioSegments.values());
    const user = this.users.get(userId);
    const isAdmin = user?.role === 'admin';
    const isTranscriber = user?.role === 'transcriber';
    
    // Count assigned tasks (tasks assigned to this user that aren't completed)
    const assigned = segments.filter(s => 
      s.assignedTo === userId && 
      s.status !== "reviewed"
    ).length;
    
    // Count pending review tasks
    const pendingReview = segments.filter(s => {
      // For transcribers, count segments they've transcribed that are waiting for review
      if (isTranscriber) {
        return s.transcribedBy === userId && s.status === "transcribed";
      }
      
      // For reviewers, count segments with status "transcribed" that they're assigned to review
      if (user?.role === "reviewer" && s.status === "transcribed") {
        return s.reviewedBy === userId;
      }
      
      // For admin, show all pending reviews
      if (isAdmin && s.status === "transcribed") {
        return true;
      }
      
      return false;
    }).length;
    
    // Count completed tasks
    const completed = segments.filter(s => {
      // For all users, include segments they've worked on that are reviewed
      if (s.status === "reviewed") {
        if (isAdmin) {
          return true; // For admin, show all completed tasks
        }
        
        // For transcribers and reviewers, include segments they've worked on
        return s.transcribedBy === userId || s.reviewedBy === userId;
      }
      
      return false;
    }).length;
    
    console.log(`Task summary for user ${userId} (${user?.role}):`, { assigned, pendingReview, completed });
    
    return {
      assigned,
      completed,
      pendingReview
    };
  }

  async getRecentActivities(userId: number, isAdmin: boolean): Promise<RecentActivity[]> {
    // Get segments involving this user
    const segments = Array.from(this.audioSegments.values())
      .filter(s => isAdmin || s.assignedTo === userId || s.transcribedBy === userId || s.reviewedBy === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10); // Get 10 most recent
    
    const activities: RecentActivity[] = segments.map(s => {
      // Determine activity type based on segment status
      let type = "Transcription";
      if (s.status === "transcribed" || s.status === "reviewed" || s.status === "rejected") {
        type = "Verification";
      } else if (s.status === "available") {
        type = "Processing";
      }
      
      return {
        id: s.id,
        type,
        status: s.status,
        updatedAt: s.updatedAt.toISOString(),
        task: `Audio Segment ${s.id}`,
      };
    });
    
    return activities;
  }
}

export const storage = new MemStorage();
