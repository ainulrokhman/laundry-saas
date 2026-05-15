/**
 * Staff Management API Routes (OWNER-only, outlet scope)
 *
 * - GET: list staff per outlet aktif (session.outletId)
 * - POST: create staff (role selalu STAFF, outletId selalu dari session atau body di mode global)
 */

import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { UserDTO } from '@/dto/UserDTO';
import { StaffService, StaffServiceError } from '@/services/StaffService';
import { prisma } from '@/lib/prisma';

const staffService = new StaffService();

const createStaffSchema = z
  .object({
    outletId: z.string().uuid('Pilih outlet yang valid').optional(),
    phone: z.string().min(8, 'Nomor WhatsApp harus diisi'),
    name: z
      .string()
      .trim()
      .min(2, 'Nama minimal 2 karakter')
      .max(100, 'Nama maksimal 100 karakter'),
    pin: z.string().regex(/^\d{4,6}$/, 'PIN harus 4-6 digit'),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

/**
 * GET /api/dashboard/settings/staff
 */
export const GET = withOwnerAuth(async (_request: Request, session: ExtendedSession) => {
  try {
    let staff;
    if (session.outletId) {
      staff = await staffService.listStaffByOutletId(session.outletId);
    } else {
      // Global Mode: list staff from all owned outlets
      staff = await staffService.listStaffByOwnerId(session.userId);
    }

    return Response.json({
      success: true,
      data: UserDTO.toResponseArray(staff as any),
      isGlobalMode: !session.outletId,
    });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch staff list',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, { requireOutlet: false });

/**
 * POST /api/dashboard/settings/staff
 */
export const POST = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    let targetOutletId = session.outletId;

    // Handle global mode: require outletId in body and verify ownership
    if (!targetOutletId) {
      if (!validated.outletId) {
        return Response.json(
          { 
            success: false, 
            error: 'Validation error', 
            message: 'Outlet harus dipilih dalam mode global', 
            errors: [{ field: 'outletId', message: 'Outlet harus dipilih' }] 
          },
          { status: 400 }
        );
      }

      // Verify ownership
      const owns = await prisma.outlet.count({
        where: { id: validated.outletId, ownerId: session.userId },
      });

      if (owns <= 0) {
        return Response.json(
          { success: false, error: 'Forbidden', message: 'Anda tidak memiliki akses ke outlet ini' },
          { status: 403 }
        );
      }

      targetOutletId = validated.outletId;
    }

    const created = await staffService.createStaff({
      outletId: targetOutletId,
      phone: validated.phone,
      name: validated.name,
      pin: validated.pin,
      isActive: validated.isActive ?? true,
    });

    return Response.json(
      {
        success: true,
        data: UserDTO.toResponse(created as any),
        message: 'Staff berhasil dibuat',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating staff:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
          errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    if (error instanceof StaffServiceError) {
      const status =
        error.code === 'DUPLICATE_PHONE'
          ? 409
          : error.code === 'VALIDATION'
            ? 400
            : 400;
      return Response.json(
        { success: false, error: 'Validation error', message: error.message },
        { status }
      );
    }

    return Response.json(
      {
        success: false,
        error: 'Failed to create staff',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, { requireOutlet: false });
