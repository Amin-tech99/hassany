import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

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

export function setupAuth(app: Express) {
  // Generate a random secret if none is provided
  const sessionSecret = process.env.SESSION_SECRET || "hassaniya-transcription-secret-key";
  
  // Use the session store from our storage implementation
  const sessionSettings: session.SessionOptions = {
    name: "connect.sid", // Default express-session cookie name
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for development
      secure: false, // Allow non-HTTPS
      httpOnly: true,
      path: '/'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Session save explicitly to ensure the session is stored before responding
        req.session.save(() => {
          return res.status(201).json(user);
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        // Session save explicitly to ensure the session is stored before responding
        req.session.save(() => {
          return res.status(200).json(user);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      // Destroy session to ensure complete logout
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res, next) => {
    try {
      // Check if the user is authenticated and the session is valid
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized: You must log in to access this resource" });
      }
      // Refresh session expiration time on each check
      req.session.touch();
      // Explicitly save the session
      req.session.save((err) => {
        if (err) return next(err);
        // Return user data without password
        const userWithoutPassword = { ...req.user };
        delete userWithoutPassword.password;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user) {
    // Touch and save session to extend validity
    req.session.touch();
    req.session.save((err: any) => {
      if (err) return next(err);
      return next();
    });
  } else {
    res.status(401).json({ message: "Unauthorized: You must log in to access this resource" });
  }
}

export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user && req.user.role === "admin") {
    // Touch and save session to extend validity
    req.session.touch();
    req.session.save((err: any) => {
      if (err) return next(err);
      return next();
    });
  } else if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: "Unauthorized: You must log in to access this resource" });
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
}
