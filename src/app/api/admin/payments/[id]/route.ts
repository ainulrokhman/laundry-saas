/**
 * Admin Payments API - Detail Route
 *
 * GET /api/admin/payments/[id]
 * Get subscription payment details (SUPERADMIN only)
 */

import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { SubscriptionPaymentService } from '@/services/admin/SubscriptionPaymentService';
import { TransactionDTO } from '@/dto/TransactionDTO';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid payment ID format'),
});

/**
 * GET /api/admin/payments/[id]
 * Get payment details
 */
export const GET = withAdminAuth(async (request: Request, _session, context: any) => {
    try {
        const { id } = paramsSchema.parse({ id: context.params.id });

        const service = new SubscriptionPaymentService();
        const payment = await service.getPaymentById(id);

        return Response.json(
            {
                success: true,
                data: TransactionDTO.toAdminResponse(payment as any),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching payment details:', error);

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

        if (error instanceof Error && error.message === 'Payment not found') {
            return Response.json(
                {
                    success: false,
                    error: 'Not found',
                    message: 'Payment not found',
                },
                { status: 404 }
            );
        }

        return Response.json(
            {
                success: false,
                error: 'Failed to fetch payment details',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
