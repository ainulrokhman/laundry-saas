/**
 * Staff Management Detail API Routes (OWNER-only, outlet scope)
 *
 * - GET: detail staff by id
 * - PUT: update staff (name/phone/isActive)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { UserDTO } from '@/dto/UserDTO';
import { StaffService, StaffServiceError } from '@/services/StaffService';

const staffService = new StaffService();

function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const updateStaffSchema = z
  .object({
    phone: z.string().optional(),
    name: z
      .string()
      .trim()
      .min(2, 'Nama minimal 2 karakter')
      .max(100, 'Nama maksimal 100 karakter')
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

/**
 * GET /api/dashboard/settings/staff/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (_req: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json(
          { success: false, error: 'Outlet context required' },
          { status: 403 }
        );
      }

      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID staff tidak valid' },
          { status: 400 }
        );
      }

      const staff = await staffService.getStaffById(session.outletId, id);
      return Response.json({ success: true, data: UserDTO.toResponse(staff as any) });
    } catch (error) {
      if (error instanceof StaffServiceError && error.code === 'NOT_FOUND') {
        return Response.json(
          { success: false, error: 'Staff not found', message: 'Staff tidak ditemukan' },
          { status: 404 }
        );
      }

      console.error('Error fetching staff detail:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch staff detail',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * PUT /api/dashboard/settings/staff/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (req: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json(
          { success: false, error: 'Outlet context required' },
          { status: 403 }
        );
      }

      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID staff tidak valid' },
          { status: 400 }
        );
      }

      const body = await req.json();
      if (!body || Object.keys(body).length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Minimal satu field harus diisi untuk update',
          },
          { status: 400 }
        );
      }

      const validated = updateStaffSchema.parse(body);

      const updated = await staffService.updateStaff({
        outletId: session.outletId,
        staffId: id,
        actorUserId: session.userId,
        phone: validated.phone,
        name: validated.name,
        isActive: validated.isActive,
      });

      return Response.json({
        success: true,
        data: UserDTO.toResponse(updated as any),
        message: 'Staff berhasil diperbarui',
      });
    } catch (error) {
      console.error('Error updating staff:', error);

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
          error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'DUPLICATE_PHONE'
              ? 409
              : error.code === 'VALIDATION'
                ? 400
                : error.code === 'SELF_DEACTIVATE_NOT_ALLOWED'
                  ? 400
                  : 400;

        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: error.message,
          },
          { status }
        );
      }

      return Response.json(
        {
          success: false,
          error: 'Failed to update staff',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

