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
          error: 'Invalid phone number format',
        },
        { status: 400 }
      );
    }

    // Generate and send OTP (service will normalize phone for storage)
    await otpService.generateOtp(phone, type);

    // Get rate limit info for response (normalize phone for lookup)
    const normalizedPhone = normalizePhoneNumber(phone);
    const rateLimitInfo = otpService.getRateLimitInfo(normalizedPhone);

    return NextResponse.json<ApiResponse<{ remaining: number; resetAt: string }>>(
      {
        success: true,
        message: 'OTP code has been sent to your WhatsApp',
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
          error: 'Invalid request data',
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

    // Handle other errors
    console.error('OTP request error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      },
      { status: 500 }
    );
  }
}
