/**
 * OTP Service
 * 
 * Service for generating, verifying, and managing OTP codes.
 * Includes rate limiting to prevent abuse.
 */

import { OtpType } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { getWhatsAppService } from '../whatsapp/WhatsAppServiceFactory';
import { normalizePhoneNumber, formatPhoneNumber } from '../../lib/utils';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  MAX_REQUESTS: 3,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes
};

/**
 * OTP configuration
 */
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
};

/**
 * In-memory rate limit store
 * Key: phone number, Value: array of request timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Clean up old rate limit entries (older than the window)
 */
function cleanupRateLimit(phone: string): void {
  const now = Date.now();
  const timestamps = rateLimitStore.get(phone) || [];
  const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT.WINDOW_MS);
  
  if (validTimestamps.length === 0) {
    rateLimitStore.delete(phone);
  } else {
    rateLimitStore.set(phone, validTimestamps);
  }
}

/**
 * Check if phone number has exceeded rate limit
 */
function checkRateLimit(phone: string): boolean {
  cleanupRateLimit(phone);
  const timestamps = rateLimitStore.get(phone) || [];
  return timestamps.length < RATE_LIMIT.MAX_REQUESTS;
}

/**
 * Record OTP request for rate limiting
 */
function recordRequest(phone: string): void {
  const now = Date.now();
  const timestamps = rateLimitStore.get(phone) || [];
  timestamps.push(now);
  rateLimitStore.set(phone, timestamps);
}

/**
 * Generate random OTP code
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class OtpService {
  /**
   * Generate and send OTP code
   * @param phone - Phone number in international format
   * @param type - OTP type (currently only REGISTER)
   * @returns Generated OTP code (for testing/debugging, not sent to client)
   * @throws Error if rate limit exceeded or WhatsApp service fails
   */
  async generateOtp(phone: string, type: OtpType): Promise<string> {
    // Normalize phone for storage (without +)
    const normalizedPhone = normalizePhoneNumber(phone);
    // Format phone for WhatsApp API (with +)
    const formattedPhone = formatPhoneNumber(phone);
    
    // Check rate limit (use normalized phone for consistency)
    if (!checkRateLimit(normalizedPhone)) {
      throw new Error(
        `Rate limit exceeded. Maximum ${RATE_LIMIT.MAX_REQUESTS} requests per ${RATE_LIMIT.WINDOW_MS / 60000} minutes.`
      );
    }

    // Generate OTP code
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    // Invalidate previous unused OTPs for this phone and type
    await prisma.otpCode.updateMany({
      where: {
        phone: normalizedPhone,
        type,
        isUsed: false,
      },
      data: {
        isUsed: true, // Mark as used to invalidate
      },
    });

    // Create new OTP record (store phone without + prefix)
    await prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        code,
        type,
        expiresAt,
        isUsed: false,
      },
    });

    // Send OTP via WhatsApp (use formatted phone with +)
    const whatsappService = getWhatsAppService();
    const sent = await whatsappService.sendOtp(formattedPhone, code);

    if (!sent) {
      // If WhatsApp fails, still record the request for rate limiting
      // but throw error so caller knows it failed
      recordRequest(normalizedPhone);
      throw new Error('Failed to send OTP via WhatsApp. Please try again later.');
    }

    // Record successful request (use normalized phone)
    recordRequest(normalizedPhone);

    // In production, don't return the code - only for testing
    // For security, we should return a success message instead
    return code;
  }

  /**
   * Verify OTP code
   * @param phone - Phone number
   * @param code - OTP code to verify
   * @param type - OTP type
   * @returns true if OTP is valid and not expired
   */
  async verifyOtp(phone: string, code: string, type: OtpType): Promise<boolean> {
    // Normalize phone for database lookup (without +)
    const normalizedPhone = normalizePhoneNumber(phone);
    const now = new Date();

    // Find valid OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        type,
        isUsed: false,
        expiresAt: {
          gt: now, // Not expired
        },
      },
    });

    if (!otp) {
      // Log for debugging
      console.error('OTP verification failed - no matching OTP found:', {
        normalizedPhone,
        code,
        type,
        now: now.toISOString(),
      });
      return false;
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    return true;
  }

  /**
   * Cleanup expired OTPs (background job)
   * Should be called periodically (e.g., via cron job or scheduled task)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const now = new Date();

    const result = await prisma.otpCode.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Get remaining rate limit for a phone number
   * @param phone - Phone number
   * @returns Object with remaining requests and reset time
   */
  getRateLimitInfo(phone: string): { remaining: number; resetAt: Date } {
    // Normalize phone for rate limit lookup
    const normalizedPhone = normalizePhoneNumber(phone);
    cleanupRateLimit(normalizedPhone);
    const timestamps = rateLimitStore.get(normalizedPhone) || [];
    const remaining = Math.max(0, RATE_LIMIT.MAX_REQUESTS - timestamps.length);
    
    // Calculate reset time (oldest timestamp + window)
    const resetAt = timestamps.length > 0
      ? new Date(Math.min(...timestamps) + RATE_LIMIT.WINDOW_MS)
      : new Date();

    return { remaining, resetAt };
  }
}

// Export singleton instance
export const otpService = new OtpService();
