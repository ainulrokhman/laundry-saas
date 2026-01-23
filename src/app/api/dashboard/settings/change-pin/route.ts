/**
 * Change PIN API Route
 * 
 * POST /api/dashboard/settings/change-pin
 * Change user PIN with old PIN verification
 */

import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import bcrypt from 'bcryptjs';

/**
 * Rate limiting configuration for PIN change
 */
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
};

/**
 * In-memory rate limit store
 * Key: userId, Value: array of attempt timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimit(userId: string): void {
  const now: number = Date.now();
  const timestamps: number[] = rateLimitStore.get(userId) || [];
  const validTimestamps: number[] = timestamps.filter((ts: number) => now - ts < RATE_LIMIT.WINDOW_MS);
  
  if (validTimestamps.length === 0) {
    rateLimitStore.delete(userId);
  } else {
    rateLimitStore.set(userId, validTimestamps);
  }
}

/**
 * Check if user has exceeded rate limit
 */
function checkRateLimit(userId: string): boolean {
  cleanupRateLimit(userId);
  const timestamps: number[] = rateLimitStore.get(userId) || [];
  return timestamps.length < RATE_LIMIT.MAX_ATTEMPTS;
}

/**
 * Record PIN change attempt
 */
function recordAttempt(userId: string): void {
  const now: number = Date.now();
  const timestamps: number[] = rateLimitStore.get(userId) || [];
  timestamps.push(now);
  rateLimitStore.set(userId, timestamps);
}

/**
 * Validation schema
 */
const changePinSchema = z.object({
  oldPin: z.string().regex(/^\d{4,6}$/, 'PIN lama harus 4-6 digit'),
  newPin: z.string().regex(/^\d{4,6}$/, 'PIN baru harus 4-6 digit'),
});

export const POST = withAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const body: unknown = await request.json();
    const { oldPin, newPin } = changePinSchema.parse(body);

    // Trim and ensure PINs are strings
    const trimmedOldPin: string = String(oldPin).trim();
    const trimmedNewPin: string = String(newPin).trim();

    // Validate PINs are not empty after trimming
    if (!trimmedOldPin || !trimmedNewPin) {
      const response: ApiResponse = {
        success: false,
        error: 'PIN tidak boleh kosong',
      };
      return Response.json(response, { status: 400 });
    }

    // Check if old PIN and new PIN are different
    if (trimmedOldPin === trimmedNewPin) {
      const response: ApiResponse = {
        success: false,
        error: 'PIN baru harus berbeda dengan PIN lama',
      };
      return Response.json(response, { status: 400 });
    }

    // Check rate limit
    if (!checkRateLimit(session.userId)) {
      cleanupRateLimit(session.userId);
      const timestamps: number[] = rateLimitStore.get(session.userId) || [];
      const resetAt: Date = timestamps.length > 0
        ? new Date(Math.min(...timestamps) + RATE_LIMIT.WINDOW_MS)
        : new Date();

      const response: ApiResponse<{ resetAt: string }> = {
        success: false,
        error: `Terlalu banyak percobaan. Silakan coba lagi setelah ${resetAt.toLocaleString('id-ID')}`,
        data: {
          resetAt: resetAt.toISOString(),
        },
      };
      return Response.json(response, { status: 429 }); // Too Many Requests
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        pin: true,
        isActive: true,
      },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User tidak ditemukan',
      };
      return Response.json(response, { status: 404 });
    }

    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Akun tidak aktif',
      };
      return Response.json(response, { status: 403 });
    }

    if (!user.pin) {
      const response: ApiResponse = {
        success: false,
        error: 'PIN belum diatur',
      };
      return Response.json(response, { status: 400 });
    }

    // Validate stored PIN hash format (should start with $2a$, $2b$, or $2y$)
    if (!user.pin.startsWith('$2')) {
      console.error('Invalid PIN hash format in database:', {
        userId: session.userId,
        pinPrefix: user.pin.substring(0, 10),
      });
      const response: ApiResponse = {
        success: false,
        error: 'Format PIN tidak valid. Silakan hubungi administrator.',
      };
      return Response.json(response, { status: 500 });
    }

    // Verify old PIN (use trimmed version)
    const isValidOldPin: boolean = await bcrypt.compare(trimmedOldPin, user.pin);

    if (!isValidOldPin) {
      // Record failed attempt
      recordAttempt(session.userId);

      // Log for debugging (remove in production or use proper logging)
      console.error('PIN verification failed:', {
        userId: session.userId,
        oldPinLength: trimmedOldPin.length,
        oldPinValue: trimmedOldPin.replace(/./g, '*'), // Mask PIN for security
        hasStoredPin: !!user.pin,
        storedPinPrefix: user.pin.substring(0, 7), // Only show prefix, not full hash
      });

      const response: ApiResponse = {
        success: false,
        error: 'PIN lama tidak benar. Pastikan Anda memasukkan PIN yang benar.',
      };
      return Response.json(response, { status: 401 });
    }

    // Hash new PIN (use trimmed version)
    const hashedNewPin: string = await bcrypt.hash(trimmedNewPin, 10);

    // Update PIN and pinChangedAt
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        pin: hashedNewPin,
        pinChangedAt: new Date(),
        isPinSet: true,
      },
    });

    // Clear rate limit on successful change
    rateLimitStore.delete(session.userId);

    const response: ApiResponse = {
      success: true,
      message: 'PIN berhasil diubah',
    };
    return Response.json(response, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: 'Data tidak valid',
        message: error.issues.map((issue) => issue.message).join(', '),
      };
      return Response.json(response, { status: 400 });
    }

    console.error('Change PIN error:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengubah PIN',
    };
    return Response.json(response, { status: 500 });
  }
}, {
  requireOutlet: false, // PIN change doesn't require outlet context
});
