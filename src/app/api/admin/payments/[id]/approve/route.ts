/**
 * Admin Payments API - Approve Route
 *
 * POST /api/admin/payments/[id]/approve
 * Approve subscription payment (SUPERADMIN only)
 */

import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionPaymentService } from '@/services/admin/SubscriptionPaymentService';
import { TransactionDTO } from '@/dto/TransactionDTO';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid payment ID format'),
});

/**
 * POST /api/admin/payments/[id]/approve
 * Approve payment
 */
export const POST = withAdminAuth(async (request: Request, session: ExtendedSession, context: any) => {
    try {
        const params = await context.params;
        const { id } = paramsSchema.parse({ id: params.id });

        const service = new SubscriptionPaymentService();
        const payment = await service.approvePayment(id, session.userId);

        return Response.json(
            {
                success: true,
                data: TransactionDTO.toAdminResponse(payment as any),
                message: 'Pembayaran berhasil disetujui',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error approving payment:', error);

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

        if (error instanceof Error && error.message.includes('Cannot approve')) {
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
                error: 'Failed to approve payment',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
