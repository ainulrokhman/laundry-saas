/**
 * Order Status API (OWNER/STAFF, outlet scope)
 *
 * PATCH /api/dashboard/orders/[id]/status
 * Update status order + simpan riwayat perubahan.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { OrderStatus, Role } from '@/generated/prisma';
import { OrderService } from '@/services/OrderService';
import { OrderDTO } from '@/dto/OrderDTO';

const orderService = new OrderService();

function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const patchSchema = z
  .object({
    status: z.nativeEnum(OrderStatus),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(
    async (req: Request, session: ExtendedSession) => {
      try {
        if (!session.outletId) {
          return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
        }

        const { id } = await params;
        if (!isValidUuid(id)) {
          return Response.json(
            { success: false, error: 'Validation error', message: 'ID order tidak valid' },
            { status: 400 }
          );
        }

        const body = await req.json();
        const validated = patchSchema.parse(body);

        const sessionUser = {
          userId: session.userId,
          outletId: session.outletId,
          role: session.role,
          phone: session.phone,
        };

        const updated = await orderService.setOrderStatus(sessionUser, id, validated.status);

        return Response.json({
          success: true,
          data: OrderDTO.toResponse(updated as any),
          message: 'Status order berhasil diperbarui',
        });
      } catch (error) {
        console.error('Error updating order status:', error);

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
            error: 'Failed to update order status',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    },
    { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
  )(request as any);
}

