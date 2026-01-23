/**
 * OTP Verify API Route
 * 
 * POST /api/auth/otp/verify
 * Verify OTP code
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { otpService } from '@/services/auth/OtpService';
import { OtpType } from '@/generated/prisma';
import { normalizePhoneNumber, formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils';
import { ApiResponse } from '@/types';
import { securityLogService } from '@/services/security/SecurityLogService';

const verifySchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  code: z.string().length(6, 'OTP code must be 6 digits'),
  type: z.nativeEnum(OtpType).default(OtpType.REGISTER),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const { phone, code, type } = verifySchema.parse(body);

    // Format and validate phone number
    const formattedPhone: string = formatPhoneNumber(phone);
    const normalizedPhone: string = normalizePhoneNumber(phone);
    
    if (!isValidPhoneNumber(formattedPhone)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid phone number format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate OTP code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      const response: ApiResponse = {
        success: false,
        error: 'OTP code must be 6 digits',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify OTP (service will normalize phone internally)
    const isValid: boolean = await otpService.verifyOtp(phone, code, type);

    if (!isValid) {
      // Log failed OTP verification
      await securityLogService.logEvent({
        phone: normalizedPhone,
        eventType: 'OTP_VERIFY' as any,
        success: false,
        errorMessage: 'Invalid or expired OTP code',
      });

      // Provide more helpful error message
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired OTP code. Please check the code and try again, or request a new OTP.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Log successful OTP verification
    await securityLogService.logEvent({
      phone: normalizedPhone,
      eventType: 'OTP_VERIFY' as any,
      success: true,
    });

    const response: ApiResponse = {
      success: true,
      message: 'OTP verified successfully',
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid request data',
        message: error.issues.map((issue) => issue.message).join(', '),
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error('OTP verify error:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify OTP',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
