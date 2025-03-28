import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import jwt from "jsonwebtoken";

// Define JWT payload type
interface JwtPayload {
  id: number;
  username: string;
  role: string;
}

// Extend Request type with user property
declare global {
  namespace Express {
    interface Request {
      user?: SelectUser;
    }
  }
}

const scryptAsync = promisify(scrypt);

// JWT settings
const JWT_SECRET = process.env.JWT_SECRET || "hassaniya-transcription-jwt-secret-key";
const JWT_EXPIRES_IN = "30d"; // 30 days

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate JWT token
function generateToken(user: SelectUser): string {
  const payload: JwtPayload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token middleware
function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }
    
    const token = authHeader.split(" ")[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({ message: "Token not provided" });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Set user on request for downstream handlers
    storage.getUser(decoded.id)
      .then(user => {
        if (!user) {
          return res.status(401).json({ message: "Invalid token: User not found" });
        }
        req.user = user;
        next();
      })
      .catch(error => {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error" });
      });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function setupAuth(app: Express) {
  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Register attempt with:", req.body);
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Generate token
      const token = generateToken(user);
      
      // Return user info and token (exclude password)
      const userWithoutPassword = { 
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt
      };
      
      res.status(201).json({ 
        user: userWithoutPassword,
        token 
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res, next) => {
    try {
      console.log("Login attempt with:", req.body);
      
      const { username, password } = req.body;
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Generate token
      const token = generateToken(user);
      
      // Return user info and token (exclude password)
      const userWithoutPassword = { 
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt
      };
      
      res.status(200).json({ 
        user: userWithoutPassword,
        token 
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  });

  // Logout endpoint (client will handle token removal)
  app.post("/api/logout", (req, res) => {
    res.status(200).json({ message: "Logged out successfully" });
  });

  // Get current user endpoint
  app.get("/api/user", verifyToken, (req, res) => {
    // User already set in req by verifyToken middleware
    if (req.user) {
      // Return user info without password
      const userWithoutPassword = { 
        id: req.user.id,
        username: req.user.username,
        fullName: req.user.fullName,
        role: req.user.role,
        createdAt: req.user.createdAt
      };
      res.json(userWithoutPassword);
    } else {
      // This should not happen since verifyToken ensures req.user exists
      res.status(401).json({ message: "Unauthorized" });
    }
  });
}

// Auth middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  verifyToken(req, res, next);
}

// Admin middleware
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ message: "Forbidden: Admin access required" });
    }
  });
}
