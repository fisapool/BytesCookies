import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface DeviceInfo {
  userId?: string;
  userAgent: string;
  platform: string;
  language: string;
  ip?: string;
  deviceId?: string;
}

// Define a Device interface to match your database schema
export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  userAgent: string;
  ip: string;
  platform: string;
  language: string;
  name: string;
  lastUsed: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DeviceService {
  /**
   * Generate a unique device fingerprint from device information
   */
  private generateDeviceId(deviceInfo: DeviceInfo): string {
    const data = Object.values(deviceInfo).filter(Boolean).join('|');
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Register a new device for a user
   */
  async registerDevice(userId: string, deviceInfo: DeviceInfo, deviceName?: string): Promise<string> {
    const deviceId = this.generateDeviceId(deviceInfo);
    
    // Check if device already exists
    const existingDevice = await prisma.$queryRaw<Device[]>`
      SELECT * FROM "Device" 
      WHERE "userId" = ${userId} AND "deviceId" = ${deviceId}
    `;

    if (existingDevice && Array.isArray(existingDevice) && existingDevice.length > 0) {
      // Update last used timestamp
      await prisma.$executeRaw`
        UPDATE "Device" 
        SET "lastUsed" = ${new Date()} 
        WHERE "id" = ${existingDevice[0].id}
      `;
      return existingDevice[0].id;
    }

    // Create new device
    const device = await prisma.$queryRaw<Device[]>`
      INSERT INTO "Device" (
        "id", "userId", "deviceId", "userAgent", "ip", 
        "platform", "language", "name", "lastUsed", 
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        ${uuidv4()}, ${userId}, ${deviceId}, ${deviceInfo.userAgent}, 
        ${deviceInfo.ip || 'unknown'}, ${deviceInfo.platform}, 
        ${deviceInfo.language}, ${deviceName || this.generateDefaultDeviceName(deviceInfo)}, 
        ${new Date()}, true, ${new Date()}, ${new Date()}
      ) RETURNING *
    `;

    return device[0].id;
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<Device[]> {
    return prisma.$queryRaw<Device[]>`
      SELECT * FROM "Device" 
      WHERE "userId" = ${userId} 
      ORDER BY "lastUsed" DESC
    `;
  }

  /**
   * Update device name
   */
  async updateDeviceName(deviceId: string, userId: string, newName: string): Promise<Device[]> {
    return prisma.$queryRaw<Device[]>`
      UPDATE "Device" 
      SET "name" = ${newName}, "updatedAt" = ${new Date()} 
      WHERE "id" = ${deviceId} AND "userId" = ${userId}
      RETURNING *
    `;
  }

  /**
   * Deactivate a device
   */
  async deactivateDevice(deviceId: string, userId: string): Promise<void> {
    // Deactivate the device
    await prisma.$executeRaw`
      UPDATE "Device" 
      SET "isActive" = false, "updatedAt" = ${new Date()} 
      WHERE "id" = ${deviceId} AND "userId" = ${userId}
    `;

    // Invalidate all sessions for this device
    await prisma.$executeRaw`
      UPDATE "Session" 
      SET "isValid" = false, "updatedAt" = ${new Date()} 
      WHERE "userId" = ${userId} AND "deviceId" = ${deviceId}
    `;
  }

  /**
   * Generate a default device name based on device info
   */
  private generateDefaultDeviceName(deviceInfo: DeviceInfo): string {
    const browser = this.extractBrowserFromUserAgent(deviceInfo.userAgent);
    const platform = deviceInfo.platform;
    return `${browser} on ${platform}`;
  }

  /**
   * Extract browser name from user agent
   */
  private extractBrowserFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown Browser';
  }
} 