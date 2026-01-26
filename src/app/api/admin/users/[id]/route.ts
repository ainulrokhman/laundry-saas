/**
 * Admin User Detail API Routes
 *
 * SuperAdmin only:
 * - GET: detail user
 * - PUT: update user (role/outlet/name/phone/isActive)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { UserRepository } from '@/repositories/UserRepository';
import { UserDTO } from '@/dto/UserDTO';
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import { securityLogService, SecurityEventType } from '@/services/security/SecurityLogService';

const userRepository = new UserRepository();

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const updateUserSchema = z
  .object({
    phone: z.string().optional(),
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter').optional(),
    role: z.nativeEnum(Role).optional(),
    outletId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === Role.SUPERADMIN) {
      if (val.outletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['outletId'],
          message: 'SuperAdmin tidak boleh memiliki outletId',
        });
      }
    }
  });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async () => {
    try {
      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID user tidak valid' },
          { status: 400 }
        );
      }

      const user = await userRepository.findById(id);
      if (!user) {
        return Response.json(
          { success: false, error: 'User not found', message: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      return Response.json({ success: true, data: UserDTO.toResponse(user as any) });
    } catch (error) {
      console.error('Error fetching user:', error);
      return Response.json(
        { success: false, error: 'Failed to fetch user', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })(request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (_req: Request, session) => {
    try {
      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID user tidak valid' },
          { status: 400 }
        );
      }

      const body = await request.json();
      if (!body || Object.keys(body).length === 0) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'Minimal satu field harus diisi untuk update' },
          { status: 400 }
        );
      }

      const validated = updateUserSchema.parse(body);

      const existing = await userRepository.findById(id);
      if (!existing) {
        return Response.json(
          { success: false, error: 'User not found', message: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      // Safety: jangan izinkan self-deactivate
      if (validated.isActive === false && id === session.userId) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Anda tidak bisa menonaktifkan akun Anda sendiri',
          },
          { status: 400 }
        );
      }

      // Safety: jangan izinkan menghilangkan SuperAdmin terakhir (deactivate/demote)
      const willRemoveSuperAdmin =
        existing.role === Role.SUPERADMIN &&
        ((validated.isActive === false) || (validated.role && validated.role !== Role.SUPERADMIN));

      if (willRemoveSuperAdmin) {
        const remaining = await userRepository.countActiveSuperAdmins(existing.id);
        if (remaining <= 0) {
          return Response.json(
            {
              success: false,
              error: 'Validation error',
              message: 'Tidak bisa menonaktifkan/menurunkan SuperAdmin terakhir',
            },
            { status: 400 }
          );
        }
      }

      // Phone normalization + uniqueness (jika diupdate)
      let normalizedPhone: string | undefined;
      if (validated.phone !== undefined) {
        normalizedPhone = normalizePhoneNumber(validated.phone);
        const formattedPhone = formatPhoneNumber(validated.phone);
        if (!isValidPhoneNumber(formattedPhone)) {
          return Response.json(
            { success: false, error: 'Validation error', message: 'Format nomor WhatsApp tidak valid' },
            { status: 400 }
          );
        }

        if (normalizedPhone !== existing.phone) {
          const duplicate = await userRepository.findByPhone(normalizedPhone);
          if (duplicate) {
            return Response.json(
              { success: false, error: 'Validation error', message: 'Nomor WhatsApp sudah terdaftar' },
              { status: 409 }
            );
          }
        }
      }

      // Business rule: role determines outletId
      let nextRole = validated.role ?? existing.role;
      let nextOutletId: string | null | undefined = validated.outletId;

      if (nextRole === Role.SUPERADMIN) {
        nextOutletId = null;
      } else {
        // Untuk OWNER/STAFF outlet wajib ada
        const outletIdCandidate = validated.outletId !== undefined ? validated.outletId : existing.outletId;
        if (!outletIdCandidate) {
          return Response.json(
            { success: false, error: 'Validation error', message: 'Outlet wajib dipilih untuk role OWNER/STAFF' },
            { status: 400 }
          );
        }
        nextOutletId = outletIdCandidate;
      }

      const updated = await userRepository.update(id, {
        phone: normalizedPhone,
        name: validated.name,
        role: validated.role,
        outletId: nextOutletId,
        isActive: validated.isActive,
      });

      await securityLogService.logEvent({
        userId: session.userId,
        phone: session.phone,
        eventType: SecurityEventType.ADMIN_USER_UPDATE,
        success: true,
        metadata: {
          targetUserId: id,
          changes: {
            phone: validated.phone !== undefined ? true : undefined,
            name: validated.name !== undefined ? true : undefined,
            role: validated.role !== undefined ? true : undefined,
            outletId: validated.outletId !== undefined ? true : undefined,
            isActive: validated.isActive !== undefined ? true : undefined,
          },
        },
      });

      const updatedWithOutlet = await userRepository.findById(updated.id);

      return Response.json({
        success: true,
        data: updatedWithOutlet ? UserDTO.toResponse(updatedWithOutlet as any) : undefined,
        message: 'User berhasil diperbarui',
      });
    } catch (error) {
      console.error('Error updating user:', error);

      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: errorMessages.join(', '),
            errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          },
          { status: 400 }
        );
      }

      return Response.json(
        { success: false, error: 'Failed to update user', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })(request);
}

