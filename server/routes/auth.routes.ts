import express from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthError } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { DeviceInfo } from '../auth/device.service';

const router = express.Router();
const authService = new AuthService();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const registerSchema = loginSchema.extend({
  confirmPassword: z.string()
}).refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Error handler middleware
const errorHandler = (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Auth error:', err);

  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

// Helper function to get device info
const getDeviceInfo = (req: express.Request): DeviceInfo => {
  const platform = req.headers['sec-ch-ua-platform'];
  const deviceId = req.headers['x-device-id'];
  
  return {
    userAgent: req.headers['user-agent'] || 'unknown',
    platform: Array.isArray(platform) ? platform[0] : (platform || 'unknown'),
    language: req.headers['accept-language'] || 'en-US',
    deviceId: Array.isArray(deviceId) ? deviceId[0] : (deviceId || uuidv4())
  };
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AuthError('Email and password are required', 'INVALID_INPUT', 400);
    }

    const deviceInfo = getDeviceInfo(req);
    const result = await authService.createSession(email, password, deviceInfo);
    return res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    } else {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AuthError('Email and password are required', 'INVALID_INPUT', 400);
    }

    const deviceInfo = getDeviceInfo(req);
    const result = await authService.createSession(email, password, deviceInfo);
    return res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    } else {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AuthError('Refresh token is required', 'INVALID_INPUT', 400);
    }

    const deviceInfo = getDeviceInfo(req);
    const result = await authService.refreshSession(refreshToken, deviceInfo);
    return res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    } else {
      console.error('Refresh error:', error);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('No token provided', 'INVALID_TOKEN', 401);
    }

    const token = authHeader.split(' ')[1];
    await authService.invalidateSession(token);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    } else {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
});

// Test protected route
router.get('/protected', async (_req, res) => {
  return res.json({ message: 'You have access to this protected route!' });
});

// Apply error handler
router.use(errorHandler);

export default router; 