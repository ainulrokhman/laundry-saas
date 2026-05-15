/**
 * Service Management Detail API Routes (OWNER-only, outlet scope)
 *
 * - GET: detail service by id
 * - PUT: update service (partial)
 * - DELETE: delete service
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ServiceDTO } from '@/dto/ServiceDTO';
import { ServiceService } from '@/services/ServiceService';
import { ServiceRepository } from '@/repositories/ServiceRepository';

const serviceService = new ServiceService(new ServiceRepository());

function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const serviceTypeSchema = z.enum(['KILOAN', 'SATUAN', 'PAKET']);

const updateServiceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nama layanan minimal 2 karakter')
      .max(100, 'Nama layanan maksimal 100 karakter')
      .optional(),
    type: serviceTypeSchema.optional(),
    price: z.coerce.number().finite().min(0, 'Harga tidak boleh negatif').optional(),
    cogs: z.coerce.number().finite().min(0, 'HPP tidak boleh negatif').optional(),
    unit: z.string().trim().max(20, 'Unit maksimal 20 karakter').optional(),
    description: z.string().trim().max(500, 'Deskripsi maksimal 500 karakter').optional(),
    memberPrice: z.coerce.number().finite().min(0, 'Harga member tidak boleh negatif').optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : '';
  return (
    msg.toLowerCase().includes('not found') ||
    msg.toLowerCase().includes('non-existent') ||
    msg.toLowerCase().includes('access denied') ||
    msg.toLowerCase().includes('record to update not found') ||
    msg.toLowerCase().includes('record to delete does not exist')
  );
}

/**
 * GET /api/dashboard/services/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (_req: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
      }

      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID layanan tidak valid' },
          { status: 400 }
        );
      }

      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };

      const service = await serviceService.getServiceById(sessionUser, id);
      if (!service) {
        return Response.json(
          { success: false, error: 'Service not found', message: 'Layanan tidak ditemukan' },
          { status: 404 }
        );
      }

      return Response.json({ success: true, data: ServiceDTO.toResponse(service as any) });
    } catch (error) {
      console.error('Error fetching service detail:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch service detail',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * PUT /api/dashboard/services/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (req: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
      }

      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID layanan tidak valid' },
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

      const validated = updateServiceSchema.parse(body);
      const hasAnyField = Object.values(validated).some((v) => v !== undefined);
      if (!hasAnyField) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Minimal satu field harus diisi untuk update',
          },
          { status: 400 }
        );
      }

      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };

      try {
        const updated = await serviceService.updateService(sessionUser, id, {
          name: validated.name,
          type: validated.type,
          price: validated.price,
          cogs: validated.cogs,
          unit: validated.unit,
          description: validated.description,
          memberPrice: validated.memberPrice,
          isActive: validated.isActive,
        });

        return Response.json({
          success: true,
          data: ServiceDTO.toResponse(updated as any),
          message: 'Layanan berhasil diperbarui',
        });
      } catch (dbError: unknown) {
        if (isNotFoundError(dbError)) {
          return Response.json(
            {
              success: false,
              error: 'Service not found',
              message: 'Layanan tidak ditemukan atau tidak memiliki akses',
            },
            { status: 404 }
          );
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error updating service:', error);

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

      return Response.json(
        {
          success: false,
          error: 'Failed to update service',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * DELETE /api/dashboard/services/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (_req: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
      }

      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID layanan tidak valid' },
          { status: 400 }
        );
      }

      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };

      try {
        await serviceService.deleteService(sessionUser, id);
        return Response.json({ success: true, message: 'Layanan berhasil dihapus' });
      } catch (dbError: unknown) {
        if (isNotFoundError(dbError)) {
          return Response.json(
            {
              success: false,
              error: 'Service not found',
              message: 'Layanan tidak ditemukan atau tidak memiliki akses',
            },
            { status: 404 }
          );
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to delete service',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

