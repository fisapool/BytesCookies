import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DeviceService, DeviceInfo } from './device.service';

const prisma = new PrismaClient();
const deviceService = new DeviceService();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface TokenPayload {
  userId: string;
  tokenId: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  async createUser(email: string, password: string): Promise<string> {
    try {
      // Check if user exists
      const existingUser = await prisma.$queryRaw`
        SELECT * FROM "User" WHERE "email" = ${email}
      `;

      if (existingUser && Array.isArray(existingUser) && existingUser.length > 0) {
        throw new AuthError('Email already registered', 'EMAIL_EXISTS', 400);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.$queryRaw`
        INSERT INTO "User" ("id", "email", "password", "createdAt", "updatedAt")
        VALUES (${uuidv4()}, ${email}, ${hashedPassword}, ${new Date()}, ${new Date()})
        RETURNING *
      `;

      // Add type assertion to fix the 'user is of type unknown' error
      const userResult = user as Array<{ id: string }>;
      return userResult[0].id;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to create user', 'USER_CREATION_FAILED', 500);
    }
  }

  async validateCredentials(email: string, password: string): Promise<string> {
    try {
      const user = await prisma.$queryRaw`
        SELECT * FROM "User" WHERE "email" = ${email}
      `;

      if (!user || !Array.isArray(user) || user.length === 0) {
        throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
      }

      // Add type assertion to fix the 'user is of type unknown' error
      const userResult = user as Array<{ id: string; password: string }>;
      const isValidPassword = await bcrypt.compare(password, userResult[0].password);
      if (!isValidPassword) {
        throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
      }

      return userResult[0].id;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Authentication failed', 'AUTH_FAILED', 500);
    }
  }

  async createSession(email: string, password: string, deviceInfo: DeviceInfo): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Validate credentials
      const userId = await this.validateCredentials(email, password);
      
      // Register device
      const deviceId = await deviceService.registerDevice(userId, deviceInfo);
      
      // Generate tokens
      const tokenId = uuidv4();
      const accessToken = jwt.sign(
        { userId, tokenId, deviceId },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );
      
      const refreshToken = jwt.sign(
        { userId, tokenId, deviceId },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );
      
      // Create session
      await prisma.$queryRaw`
        INSERT INTO "Session" (
          "id", "userId", "tokenId", "deviceId", "refreshToken",
          "isValid", "expiresAt", "lastActivity", "createdAt", "updatedAt"
        ) VALUES (
          ${uuidv4()}, ${userId}, ${tokenId}, ${deviceId}, ${refreshToken},
          true, ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}, ${new Date()}, ${new Date()}, ${new Date()}
        )
      `;
      
      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to create session', 'SESSION_CREATION_FAILED', 500);
    }
  }

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      
      const session = await prisma.session.findFirst({
        where: {
          AND: [
            { tokenId: decoded.tokenId },
            { userId: decoded.userId },
            { deviceId: decoded.deviceId },
            { isValid: true },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });
      
      if (!session) {
        throw new AuthError('Invalid or expired session', 'INVALID_SESSION', 401);
      }
      
      // Update last activity
      await prisma.session.update({
        where: { id: session.id },
        data: {
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      });
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid token', 'INVALID_TOKEN', 401);
      }
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Token validation failed', 'TOKEN_VALIDATION_FAILED', 500);
    }
  }

  async refreshSession(refreshToken: string, deviceInfo: DeviceInfo): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const session = await prisma.session.findFirst({
        where: {
          AND: [
            { refreshToken },
            { isValid: true }
          ]
        },
        include: {
          user: {
            select: {
              email: true,
              password: true
            }
          }
        }
      });

      if (!session) {
        throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
      }

      if (new Date(session.expiresAt) < new Date()) {
        throw new AuthError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED', 401);
      }

      // Add userId to deviceInfo for device registration
      deviceInfo.userId = session.userId;
      
      // Register or get existing device
      const deviceId = await deviceService.registerDevice(session.userId, deviceInfo);

      // Invalidate the old session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          isValid: false,
          updatedAt: new Date()
        }
      });

      // Create a new session
      return this.createSession(session.user.email, session.user.password, deviceInfo);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to refresh session', 'REFRESH_FAILED', 500);
    }
  }

  async invalidateSession(tokenId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { tokenId },
        data: {
          isValid: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      throw new AuthError('Failed to invalidate session', 'INVALIDATION_FAILED', 500);
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { userId },
        data: {
          isValid: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      throw new AuthError('Failed to invalidate user sessions', 'INVALIDATION_FAILED', 500);
    }
  }

  async invalidateDeviceSessions(userId: string, deviceId: string): Promise<void> {
    try {
      const device = await prisma.$queryRaw`
        SELECT * FROM "Device"
        WHERE "deviceId" = ${deviceId}
      `;

      if (!device || !Array.isArray(device) || device.length === 0) {
        throw new AuthError('Device not found', 'DEVICE_NOT_FOUND', 404);
      }

      await prisma.$executeRaw`
        UPDATE "Session"
        SET "isValid" = false, "updatedAt" = ${new Date()}
        WHERE "userId" = ${userId}
        AND "deviceId" = ${deviceId}
      `;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to invalidate device sessions', 'INVALIDATION_FAILED', 500);
    }
  }
} 