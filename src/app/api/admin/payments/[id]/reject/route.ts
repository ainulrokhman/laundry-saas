/**
 * Admin Payments API - Reject Route
 *
 * POST /api/admin/payments/[id]/reject
 * Reject subscription payment (SUPERADMIN only)
 */

import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionPaymentService } from '@/services/admin/SubscriptionPaymentService';
import { TransactionDTO } from '@/dto/TransactionDTO';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid payment ID format'),
});

const bodySchema = z.object({
    reason: z.string().optional(),
});

/**
 * POST /api/admin/payments/[id]/reject
 * Reject payment
 */
export const POST = withAdminAuth(async (request: Request, session: ExtendedSession, context: any) => {
    try {
        const params = await context.params;
        const { id } = paramsSchema.parse({ id: params.id });
        const body = await request.json();
        const { reason } = bodySchema.parse(body);

        const service = new SubscriptionPaymentService();
        const payment = await service.rejectPayment(id, session.userId, reason);

        return Response.json(
            {
                success: true,
                data: TransactionDTO.toAdminResponse(payment as any),
                message: 'Pembayaran ditolak',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error rejecting payment:', error);

        if (error instanceof z.ZodError) {
            return Response.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: error.issues.map((i) => i.message).join(', '),
                },
                { status: 400 }
            );
        }

        if (error instanceof Error && error.message.includes('not found')) {
            return Response.json(
                {
                    success: false,
                    error: 'Not found',
                    message: error.message,
                },
                { status: 404 }
            );
        }

        if (error instanceof Error && error.message.includes('Cannot reject')) {
            return Response.json(
                {
                    success: false,
                    error: 'Invalid operation',
                    message: error.message,
                },
                { status: 400 }
            );
        }

        return Response.json(
            {
                success: false,
                error: 'Failed to reject payment',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
