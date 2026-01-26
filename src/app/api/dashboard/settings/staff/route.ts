/**
 * Staff Management API Routes (OWNER-only, outlet scope)
 *
 * - GET: list staff per outlet aktif (session.outletId)
 * - POST: create staff (role selalu STAFF, outletId selalu dari session)
 */

import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { UserDTO } from '@/dto/UserDTO';
import { StaffService, StaffServiceError } from '@/services/StaffService';

const staffService = new StaffService();

const createStaffSchema = z
  .object({
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
    if (!session.outletId) {
      return Response.json(
        { success: false, error: 'Outlet context required' },
        { status: 403 }
      );
    }

    const staff = await staffService.listStaffByOutletId(session.outletId);
    return Response.json({
      success: true,
      data: UserDTO.toResponseArray(staff as any),
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
});

/**
 * POST /api/dashboard/settings/staff
 */
export const POST = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  try {
    if (!session.outletId) {
      return Response.json(
        { success: false, error: 'Outlet context required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    const created = await staffService.createStaff({
      outletId: session.outletId,
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
});

