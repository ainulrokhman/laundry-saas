/**
 * Registration API Route
 * 
 * POST /api/auth/register
 * Register new OWNER with outlet
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { otpService } from '@/services/auth/OtpService';
import { signIn } from '@/lib/auth';
import { OtpType, Role } from '@/generated/prisma';
import { normalizePhoneNumber, formatPhoneNumber, isValidPhoneNumber, generateSlug } from '@/lib/utils';
import { ApiResponse } from '@/types';
import bcrypt from 'bcryptjs';

const registerSchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  outletName: z.string().min(2, 'Outlet name must be at least 2 characters'),
  outletAddress: z.string().min(5, 'Outlet address must be at least 5 characters'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

/**
 * Generate unique slug from outlet name
 */
async function generateUniqueSlug(name: string): Promise<string> {
  let slug = generateSlug(name);

  // If empty, use default
  if (!slug) {
    slug = 'outlet';
  }

  // Check if slug exists, append number if needed
  let finalSlug = slug;
  let counter = 1;
  while (await prisma.outlet.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otpCode, name, outletName, outletAddress, pin } = registerSchema.parse(body);

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phone);
    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (!isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid phone number format',
        },
        { status: 400 }
      );
    }

    // Check if OTP is valid for registration
    // Allow OTP to be used for registration even if it was already verified in step 2
    // as long as it's not expired and matches the code
    const now = new Date();
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone, // Use normalized phone (without +)
        code: otpCode,
        type: OtpType.REGISTER,
        expiresAt: {
          gt: now, // Not expired
        },
        // Don't check isUsed - allow OTP to be used for registration even if verified
        // This allows the flow: verify OTP -> register (using same OTP)
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent OTP
      },
    });

    if (!otpRecord) {
      // Log for debugging
      console.error('OTP validation failed:', {
        phone: normalizedPhone,
        formattedPhone,
        code: otpCode,
        type: OtpType.REGISTER,
        now: now.toISOString(),
      });
      
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid or expired OTP code. Please verify your OTP code and try again.',
        },
        { status: 400 }
      );
    }

    // Mark OTP as used after successful registration validation
    // This prevents the OTP from being used again
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Check if phone number already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Phone number already registered',
        },
        { status: 409 } // Conflict
      );
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Generate unique slug
    const slug = await generateUniqueSlug(outletName);

    // Create outlet and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create outlet
      const outlet = await tx.outlet.create({
        data: {
          name: outletName,
          slug,
          address: outletAddress,
          isPro: false,
        },
      });

      // Create user (store phone without + prefix)
      const user = await tx.user.create({
        data: {
          phone: normalizedPhone,
          name,
          pin: hashedPin,
          role: Role.OWNER,
          outletId: outlet.id,
          isActive: true,
          isPinSet: true,
          pinChangedAt: new Date(),
        },
      });

      return { user, outlet };
    });

    // Note: Auto login will be handled client-side after successful registration
    // The client will redirect to login page or dashboard

    return NextResponse.json<ApiResponse<{ userId: string; outletId: string }>>(
      {
        success: true,
        message: 'Registration successful',
        data: {
          userId: result.user.id,
          outletId: result.outlet.id,
        },
      },
      { status: 201 }
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

    console.error('Registration error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}
