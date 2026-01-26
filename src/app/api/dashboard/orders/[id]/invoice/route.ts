/**
 * Order Invoice API (OWNER/STAFF, outlet scope)
 *
 * GET /api/dashboard/orders/[id]/invoice
 * Mengembalikan data invoice/struk: order + items + outlet + DP fields.
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { ExtendedSession } from '@/lib/auth';
import { OrderRepository } from '@/repositories/OrderRepository';
import { InvoiceDTO } from '@/dto/InvoiceDTO';

const orderRepository = new OrderRepository();

function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(
    async (_req: Request, session: ExtendedSession) => {
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

        const order = await orderRepository.findByIdForInvoice(session.outletId, id);
        if (!order) {
          return Response.json(
            { success: false, error: 'Order not found', message: 'Order tidak ditemukan' },
            { status: 404 }
          );
        }

        return Response.json({
          success: true,
          data: InvoiceDTO.toResponse(order as any),
        });
      } catch (error) {
        console.error('Error fetching order invoice:', error);
        return Response.json(
          {
            success: false,
            error: 'Failed to fetch invoice',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    },
    { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
  )(request as any);
}

