import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm'; // Import eq from drizzle-orm

// Assuming you have these imports from your schema setup
import { users, ApiKey, usersSchema } from '@shared/schema'; // Adjust path as necessary
import { db } from './db'; // Adjust path as necessary

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'agent';
  permissions: string[];
  apiKeys: ApiKey[];
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  agentIds?: string[];
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export class AuthService {
  // These in-memory maps are likely to be replaced by actual database operations
  // If you are fetching all users from the DB, you might not need these maps
  private users: Map<string, User> = new Map();
  private sessions: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor() {
    // Remove the in-memory initialization since we're using database
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.username, username)
      });
      return result || null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.email, email)
      });
      return result || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      return result || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateJWT(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
  }

  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  generateApiKey(userId: string, name: string, permissions: string[], agentIds?: string[]): ApiKey {
    const apiKey: ApiKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      key: `sk-${Math.random().toString(36).substr(2, 32)}`,
      permissions,
      agentIds,
      rateLimit: {
        requests: 100,
        windowMs: 60 * 1000, // 1 minute
      },
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // This part might need to be updated to interact with the database for API keys
    const user = this.users.get(userId);
    if (user) {
      user.apiKeys.push(apiKey);
    }

    return apiKey;
  }

  validateApiKey(key: string): ApiKey | null {
    // This part might need to be updated to interact with the database for API keys
    for (const user of this.users.values()) {
      const apiKey = user.apiKeys.find(k => k.key === key && k.isActive);
      if (apiKey) {
        // Check expiration
        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
          apiKey.isActive = false;
          return null;
        }
        return apiKey;
      }
    }
    return null;
  }

  // Middleware functions
  authenticateJWT = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = this.verifyJWT(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  authenticateApiKey = (req: any, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const validKey = this.validateApiKey(apiKey);
    if (!validKey) {
      return res.status(403).json({ error: 'Invalid or expired API key' });
    }

    req.apiKey = validKey;
    next();
  };

  requirePermission = (permission: string) => {
    return (req: any, res: Response, next: NextFunction) => {
      const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];

      if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  };

  requireRole = (roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient role privileges' });
      }
      next();
    };
  };

  createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
    return rateLimit({
      windowMs,
      max,
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
  };

  // PII Detection and Masking
  detectPII(text: string): { hasPII: boolean; detectedTypes: string[]; maskedText: string } {
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    };

    const detectedTypes: string[] = [];
    let maskedText = text;

    Object.entries(patterns).forEach(([type, pattern]) => {
      // Make sure to use the global flag on the regex for replace to work correctly
      if (pattern.global) {
        if (pattern.test(text)) {
          detectedTypes.push(type);
          maskedText = maskedText.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
        }
      } else {
        // For patterns without global flag, test first, then replace one occurrence or re-test with global
        const testPattern = new RegExp(pattern.source, pattern.flags + 'g');
        if (testPattern.test(text)) {
          detectedTypes.push(type);
          maskedText = maskedText.replace(testPattern, `[${type.toUpperCase()}_REDACTED]`);
        }
      }
    });

    return {
      hasPII: detectedTypes.length > 0,
      detectedTypes,
      maskedText,
    };
  }

  // GDPR/CCPA Compliance helpers
  logDataAccess(userId: string, dataType: string, action: string) {
    console.log(`[COMPLIANCE] User ${userId} ${action} ${dataType} at ${new Date().toISOString()}`);
  }

  anonymizeUserData(userId: string): boolean {
    // This part might need to be updated to interact with the database for user data anonymization
    const user = this.users.get(userId);
    if (user) {
      user.username = `anonymous_${Date.now()}`;
      user.email = `deleted_${Date.now()}@example.com`;
      // Keep minimal data for system integrity
      return true;
    }
    return false;
  }

  exportUserData(userId: string): any {
    // This part might need to be updated to interact with the database for user data export
    const user = this.users.get(userId);
    if (user) {
      this.logDataAccess(userId, 'user_data', 'exported');
      return {
        personalData: user,
        apiKeys: user.apiKeys.map(key => ({
          name: key.name,
          permissions: key.permissions,
          createdAt: key.createdAt,
        })),
        exportedAt: new Date().toISOString(),
      };
    }
    return null;
  }
}

export const authService = new AuthService();

// Enhancement suggestion for color combination:
// For text boxes with white text, consider a background color that provides good contrast.
// For example, a light grey background (#f0f0f0) or a subtle color like a light blue (#e3f2fd)
// would ensure readability. The actual implementation of this would be in your UI components,
// not directly in this auth service file.