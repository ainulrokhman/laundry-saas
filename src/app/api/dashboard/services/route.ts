/**
 * Service Management API Routes (OWNER-only, outlet scope)
 *
 * - GET: list services per outlet aktif (session.outletId)
 * - POST: create service (outletId selalu dari session)
 */

import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ServiceDTO } from '@/dto/ServiceDTO';
import { ServiceService } from '@/services/ServiceService';
import { ServiceRepository } from '@/repositories/ServiceRepository';

const serviceService = new ServiceService(new ServiceRepository());

const serviceTypeSchema = z.enum(['KILOAN', 'SATUAN', 'PAKET']);

const createServiceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nama layanan minimal 2 karakter')
      .max(100, 'Nama layanan maksimal 100 karakter'),
    type: serviceTypeSchema,
    price: z.coerce.number().finite().min(0, 'Harga tidak boleh negatif'),
    unit: z.string().trim().max(20, 'Unit maksimal 20 karakter').optional(),
    description: z.string().trim().max(500, 'Deskripsi maksimal 500 karakter').optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

/**
 * GET /api/dashboard/services
 */
export const GET = withOwnerAuth(async (_request: Request, session: ExtendedSession) => {
  try {
    if (!session.outletId) {
      return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
    }

    const sessionUser = {
      userId: session.userId,
      outletId: session.outletId,
      role: session.role,
      phone: session.phone,
    };

    const services = await serviceService.getServices(sessionUser);
    return Response.json({
      success: true,
      data: ServiceDTO.toResponseArray(services as any),
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch services',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dashboard/services
 */
export const POST = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  try {
    if (!session.outletId) {
      return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createServiceSchema.parse(body);

    const sessionUser = {
      userId: session.userId,
      outletId: session.outletId,
      role: session.role,
      phone: session.phone,
    };

    const created = await serviceService.createService(sessionUser, {
      name: validated.name,
      type: validated.type,
      price: validated.price,
      unit: validated.unit?.trim() || undefined,
      description: validated.description?.trim() || undefined,
      isActive: validated.isActive ?? true,
    });

    return Response.json(
      {
        success: true,
        data: ServiceDTO.toResponse(created as any),
        message: 'Layanan berhasil dibuat',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating service:', error);

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
        error: 'Failed to create service',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

