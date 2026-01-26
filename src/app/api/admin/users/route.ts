/**
 * Admin Users API Routes
 *
 * CRUD untuk users (SuperAdmin only)
 * - GET: list users + filter
 * - POST: create user (OWNER/STAFF/SUPERADMIN)
 */

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { UserRepository } from '@/repositories/UserRepository';
import { UserDTO } from '@/dto/UserDTO';
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import { securityLogService, SecurityEventType } from '@/services/security/SecurityLogService';
import { getWhatsAppService } from '@/services/whatsapp/WhatsAppServiceFactory';

const userRepository = new UserRepository();

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function generateTempPin(length: 4 | 6 = 6): string {
  if (length === 4) {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

const listQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  outletId: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val))
    .refine((val) => val === undefined || val === 'null' || isValidUuid(val), {
      message: 'outletId tidak valid',
    })
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === 'null') return null;
      return val;
    }),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  q: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v > 0), {
      message: 'page harus angka > 0',
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v > 0), {
      message: 'limit harus angka > 0',
    }),
});

const createUserSchema = z
  .object({
    phone: z.string().min(8, 'Nomor WhatsApp harus diisi'),
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    role: z.nativeEnum(Role),
    outletId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    sendPinViaWhatsApp: z.boolean().optional().default(true),
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
    } else {
      if (!val.outletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['outletId'],
          message: 'Outlet wajib dipilih untuk role OWNER/STAFF',
        });
      }
    }
  });

/**
 * GET /api/admin/users
 */
export const GET = withAdminAuth(async (request: Request, _session) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.parse({
      role: searchParams.get('role') || undefined,
      outletId: searchParams.get('outletId') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      q: searchParams.get('q') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const result = await userRepository.findAll(
      {
        role: parsed.role,
        outletId: parsed.outletId as any,
        isActive: parsed.isActive as any,
        search: parsed.q,
      },
      { page: parsed.page, limit: parsed.limit }
    );

    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    return Response.json({
      success: true,
      data: UserDTO.toResponseArray(result.data),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/users
 */
export const POST = withAdminAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    const normalizedPhone = normalizePhoneNumber(validated.phone);
    const formattedPhone = formatPhoneNumber(validated.phone);

    if (!isValidPhoneNumber(formattedPhone)) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Format nomor WhatsApp tidak valid',
        },
        { status: 400 }
      );
    }

    // Enforce SUPERADMIN outletId rule (defensive)
    const outletId = validated.role === Role.SUPERADMIN ? null : (validated.outletId ?? null);

    // Ensure phone uniqueness
    const existing = await userRepository.findByPhone(normalizedPhone);
    if (existing) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Nomor WhatsApp sudah terdaftar',
        },
        { status: 409 }
      );
    }

    // Generate temp PIN and hash
    const tempPin = generateTempPin(6);
    const pinHash = await bcrypt.hash(tempPin, 10);

    const created = await userRepository.create({
      phone: normalizedPhone,
      name: validated.name.trim(),
      role: validated.role,
      outletId,
      pinHash,
      isActive: validated.isActive,
      isPinSet: true,
    });

    // Send temp PIN via WhatsApp (best-effort)
    let waSent = false;
    let waError: string | undefined;
    if (validated.sendPinViaWhatsApp) {
      try {
        const wa = getWhatsAppService();
        const message =
          `Akun Laundry SaaS Anda sudah dibuat.\n\n` +
          `Nama: *${created.name}*\n` +
          `Role: *${created.role}*\n` +
          `PIN sementara: *${tempPin}*\n\n` +
          `Silakan login, lalu segera ubah PIN di menu Settings → Ubah PIN.\n` +
          `Jangan bagikan PIN ini kepada siapapun.`;
        waSent = await wa.sendMessage(normalizedPhone, message);
        if (!waSent) {
          waError = 'Gagal mengirim pesan WhatsApp (provider mengembalikan status gagal)';
        }
      } catch (e) {
        waSent = false;
        waError = e instanceof Error ? e.message : 'Gagal mengirim pesan WhatsApp';
      }
    }

    await securityLogService.logEvent({
      userId: session.userId,
      phone: session.phone,
      eventType: SecurityEventType.ADMIN_USER_CREATE,
      success: true,
      metadata: {
        createdUserId: created.id,
        createdRole: created.role,
        createdOutletId: created.outletId,
        waSent,
        waError,
      },
    });

    const createdWithOutlet = await userRepository.findById(created.id);

    return Response.json(
      {
        success: true,
        data: createdWithOutlet ? UserDTO.toResponse(createdWithOutlet as any) : undefined,
        message: waSent
          ? 'User berhasil dibuat dan PIN dikirim via WhatsApp'
          : 'User berhasil dibuat (PIN belum terkirim via WhatsApp)',
        ...(process.env.NODE_ENV !== 'production' && !waSent && {
          // Hanya untuk dev agar tidak terblokir saat WA belum dikonfigurasi
          tempPin,
          waError,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((i) => {
        const field = i.path.join('.');
        return `${field}: ${i.message}`;
      });

      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: errorMessages.join(', '),
          errors: error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: false,
        error: 'Failed to create user',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

