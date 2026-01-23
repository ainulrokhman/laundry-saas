/**
 * OTP Request API Route
 * 
 * POST /api/auth/otp/request
 * Request OTP code to be sent via WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { otpService } from '@/services/auth/OtpService';
import { OtpType } from '@/generated/prisma';
import { normalizePhoneNumber, formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils';
import { ApiResponse } from '@/types';
import { prisma } from '@/lib/prisma';
import { securityLogService } from '@/services/security/SecurityLogService';

const requestSchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  type: z.nativeEnum(OtpType).default(OtpType.REGISTER),
});

export async function POST(request: NextRequest) {
  let body: any;
  let formattedPhone: string | null = null;

  try {
    body = await request.json();
    const { phone, type } = requestSchema.parse(body);

    // Format and validate phone number
    formattedPhone = formatPhoneNumber(phone);
    if (!isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Format nomor telepon tidak valid',
        },
        { status: 400 }
      );
    }

    // Normalize phone for database lookup
    const normalizedPhone = normalizePhoneNumber(phone);

    // For REGISTER type, check if phone number already exists
    if (type === OtpType.REGISTER) {
      const existingUser = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Nomor telepon sudah terdaftar. Silakan gunakan nomor lain atau login dengan nomor ini.',
          },
          { status: 409 } // Conflict
        );
      }
    }

    // Generate and send OTP (service will normalize phone for storage)
    await otpService.generateOtp(phone, type);

    // Log successful OTP request
    await securityLogService.logOtpRequest(normalizedPhone, true);

    // Get rate limit info for response
    const rateLimitInfo = otpService.getRateLimitInfo(normalizedPhone);

    return NextResponse.json<ApiResponse<{ remaining: number; resetAt: string }>>(
        {
          success: true,
          message: 'Kode OTP telah dikirim ke WhatsApp Anda',
          data: {
            remaining: rateLimitInfo.remaining,
            resetAt: rateLimitInfo.resetAt.toISOString(),
          },
        },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Data tidak valid',
          message: error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    // Handle rate limit error
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      // Use formattedPhone if available, otherwise try to get from body
      if (!formattedPhone && body?.phone) {
        formattedPhone = formatPhoneNumber(body.phone);
      }

      if (formattedPhone) {
        const normalizedPhone = normalizePhoneNumber(formattedPhone);
        const rateLimitInfo = otpService.getRateLimitInfo(normalizedPhone);

        // Log rate limit exceeded
        await securityLogService.logEvent({
          phone: normalizedPhone,
          eventType: 'RATE_LIMIT_EXCEEDED' as any,
          success: false,
          errorMessage: error.message,
        });

        return NextResponse.json<ApiResponse<{ remaining: number; resetAt: string }>>(
          {
            success: false,
            error: error.message,
            data: {
              remaining: rateLimitInfo.remaining,
              resetAt: rateLimitInfo.resetAt.toISOString(),
            },
          },
          { status: 429 } // Too Many Requests
        );
      }
    }

    // Log failed OTP request
    if (formattedPhone) {
      const normalizedPhone = normalizePhoneNumber(formattedPhone);
      await securityLogService.logOtpRequest(
        normalizedPhone,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Handle other errors
    console.error('OTP request error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal mengirim OTP',
      },
      { status: 500 }
    );
  }
}
