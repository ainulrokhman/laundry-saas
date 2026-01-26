/**
 * Order Payment (bookkeeping) API (OWNER/STAFF, outlet scope)
 *
 * PATCH /api/dashboard/orders/[id]/payment
 * Update status pembayaran: PAID (SETTLEMENT) / UNPAID, plus paidAt & paymentNote.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { Role } from '@/generated/prisma';
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
    paid: z.boolean(),
    paidAt: z.string().datetime().optional(),
    paymentNote: z.string().trim().max(200, 'Catatan pembayaran maksimal 200 karakter').optional(),
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

        const updated = await orderService.setPaymentStatus(sessionUser, id, {
          paid: validated.paid,
          paidAt: validated.paidAt,
          paymentNote: validated.paymentNote,
        });

        return Response.json({
          success: true,
          data: OrderDTO.toResponse(updated as any),
          message: validated.paid ? 'Order ditandai lunas' : 'Order ditandai belum dibayar',
        });
      } catch (error) {
        console.error('Error updating order payment:', error);

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
            error: 'Failed to update payment status',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    },
    { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
  )(request as any);
}

