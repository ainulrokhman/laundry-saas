/**
 * Order DP (Down Payment / Uang Muka) API (OWNER/STAFF, outlet scope)
 *
 * PATCH /api/dashboard/orders/[id]/dp
 * Set nominal DP, timestamp DP, dan catatan DP. Otomatis menyesuaikan paymentStatus:
 * - dpAmount = 0 => UNPAID (jika belum lunas)
 * - dpAmount > 0 => PENDING (jika belum lunas)
 * - dpAmount == total => SETTLEMENT
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import { OrderService } from '@/services/OrderService';
import { InvoiceDTO } from '@/dto/InvoiceDTO';
import { OrderRepository } from '@/repositories/OrderRepository';

const orderService = new OrderService();
const orderRepository = new OrderRepository();

function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const patchSchema = z
  .object({
    dpAmount: z.coerce.number().finite().min(0, 'Nominal DP minimal 0'),
    dpPaidAt: z.string().datetime().optional(),
    dpNote: z.string().trim().max(200, 'Catatan DP maksimal 200 karakter').optional(),
    cashReceived: z.coerce.number().finite().min(0).optional(),
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

        await orderService.setDownPayment(sessionUser, id, {
          dpAmount: validated.dpAmount,
          dpPaidAt: validated.dpPaidAt,
          dpNote: validated.dpNote,
          cashReceived: validated.cashReceived,
        });

        // Kembalikan payload invoice agar UI invoice langsung sinkron
        const updatedForInvoice = await orderRepository.findByIdForInvoice(session.outletId, id);
        return Response.json({
          success: true,
          data: updatedForInvoice ? InvoiceDTO.toResponse(updatedForInvoice as any) : null,
          message: 'DP berhasil disimpan',
        });
      } catch (error) {
        console.error('Error updating order DP:', error);

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
            error: 'Failed to update DP',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    },
    { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
  )(request as any);
}

