/**
 * Landing Page Settings API (OWNER)
 *
 * GET  /api/dashboard/settings/landing-page
 * PUT  /api/dashboard/settings/landing-page
 *
 * Mengelola konten landing page per outlet aktif (session.outletId).
 */

import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletLandingPageDTO } from '@/dto/OutletLandingPageDTO';

const outletRepository = new OutletRepository();

const updateSchema = z.object({
  description: z.string().trim().max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  contactPhone: z
    .string()
    .trim()
    .max(20, 'Nomor WhatsApp maksimal 20 digit')
    .regex(/^[0-9]*$/, 'Nomor WhatsApp hanya boleh berisi angka')
    .optional(),
  businessHours: z.string().trim().max(500, 'Jam operasional maksimal 500 karakter').optional(),
  seoTitle: z.string().trim().max(100, 'SEO title maksimal 100 karakter').optional(),
  seoDescription: z.string().trim().max(200, 'SEO description maksimal 200 karakter').optional(),
  logoUrl: z
    .union([
      z.string().trim().url('Logo URL tidak valid').max(2048, 'Logo URL terlalu panjang'),
      z.literal(''),
    ])
    .optional(),
  coverUrl: z
    .union([
      z.string().trim().url('Cover URL tidak valid').max(2048, 'Cover URL terlalu panjang'),
      z.literal(''),
    ])
    .optional(),
});

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDigits(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const digits = value.replace(/\D/g, '').trim();
  if (digits.length === 0) return null;
  return digits;
}

export const GET = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const { searchParams } = new URL(request.url);
    const queryOutletId = searchParams.get('outletId');
    
    const targetOutletId = session.outletId || queryOutletId;

    if (!targetOutletId) {
      // Global Mode: return success but no data yet, so frontend can show picker
      return Response.json({
        success: true,
        data: null,
        isGlobalMode: !session.outletId,
      });
    }

    // Authorization check for global mode
    if (!session.outletId && queryOutletId) {
      const owns = await outletRepository.findOwnedOutletById(session.userId, queryOutletId);
      if (!owns) {
        return Response.json(
          { success: false, error: 'Forbidden', message: 'Anda tidak memiliki akses ke outlet ini' },
          { status: 403 }
        );
      }
    }

    const outlet = await outletRepository.findLandingPageById(targetOutletId);
    if (!outlet) {
      return Response.json(
        { success: false, error: 'Outlet not found', message: 'Outlet tidak ditemukan' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: OutletLandingPageDTO.toResponse(outlet),
      isGlobalMode: !session.outletId,
    });
  } catch (error) {
    console.error('Error fetching landing page settings:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch landing page settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, { requireOutlet: false });

export const PUT = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const body: any = await request.json();
    const validated = updateSchema.parse(body);
    
    // outletId can come from body in global mode
    const targetOutletId = session.outletId || body.outletId;

    if (!targetOutletId) {
      return Response.json(
        { success: false, error: 'Validation error', message: 'Outlet harus dipilih' },
        { status: 400 }
      );
    }

    // Authorization check for global mode
    if (!session.outletId && body.outletId) {
      const owns = await outletRepository.findOwnedOutletById(session.userId, body.outletId);
      if (!owns) {
        return Response.json(
          { success: false, error: 'Forbidden', message: 'Anda tidak memiliki akses ke outlet ini' },
          { status: 403 }
        );
      }
    }

    const contactPhone = normalizeDigits(validated.contactPhone);
    if (contactPhone !== undefined && contactPhone !== null) {
      if (contactPhone.length < 8) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Nomor WhatsApp minimal 8 digit',
            errors: [{ field: 'contactPhone', message: 'Nomor WhatsApp minimal 8 digit' }],
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      description: emptyToNull(validated.description),
      contactPhone,
      businessHours: emptyToNull(validated.businessHours),
      seoTitle: emptyToNull(validated.seoTitle),
      seoDescription: emptyToNull(validated.seoDescription),
    };

    if (validated.logoUrl !== undefined) {
      updateData.logoUrl = emptyToNull(validated.logoUrl);
    }
    if (validated.coverUrl !== undefined) {
      updateData.coverUrl = emptyToNull(validated.coverUrl);
    }

    // Jika semua field selain outletId undefined, tolak
    const fieldsToUpdate = { ...updateData };
    const hasAnyField = Object.values(fieldsToUpdate).some((v) => v !== undefined);
    if (!hasAnyField) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Minimal satu field harus diisi untuk disimpan',
        },
        { status: 400 }
      );
    }

    await outletRepository.update(targetOutletId, updateData);

    const outlet = await outletRepository.findLandingPageById(targetOutletId);
    if (!outlet) {
      return Response.json(
        { success: false, error: 'Outlet not found', message: 'Outlet tidak ditemukan' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: OutletLandingPageDTO.toResponse(outlet),
      message: 'Pengaturan landing page berhasil disimpan',
      isGlobalMode: !session.outletId,
    });
  } catch (error) {
    console.error('Error updating landing page settings:', error);

    if (error instanceof z.ZodError) {
      const errors = error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: errors.map((e) => `${e.field}: ${e.message}`).join(', '),
          errors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: false,
        error: 'Failed to update landing page settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, { requireOutlet: false });

