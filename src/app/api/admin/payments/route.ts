/**
 * Admin Payments API - List Route
 *
 * GET /api/admin/payments
 * List subscription payments with filters (SUPERADMIN only)
 */

import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { PaymentStatus } from '@/generated/prisma';
import { SubscriptionPaymentService } from '@/services/admin/SubscriptionPaymentService';
import { TransactionDTO } from '@/dto/TransactionDTO';

const querySchema = z.object({
    status: z.nativeEnum(PaymentStatus).optional(),
    page: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 1))
        .refine((v) => Number.isFinite(v) && v > 0, {
            message: 'page harus angka > 0',
        }),
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 50))
        .refine((v) => Number.isFinite(v) && v > 0 && v <= 100, {
            message: 'limit harus angka 1-100',
        }),
    search: z.string().optional(),
});

/**
 * GET /api/admin/payments
 * List subscription payments
 */
export const GET = withAdminAuth(async (request: Request, _session) => {
    try {
        const { searchParams } = new URL(request.url);
        const parsed = querySchema.parse({
            status: searchParams.get('status') || undefined,
            page: searchParams.get('page') || undefined,
            limit: searchParams.get('limit') || undefined,
            search: searchParams.get('search') || undefined,
        });

        const service = new SubscriptionPaymentService();
        const result = await service.getPayments({
            status: parsed.status,
            page: parsed.page,
            limit: parsed.limit,
            search: parsed.search,
        });

        // Transform to DTO
        const data = result.data.map((payment) => TransactionDTO.toAdminResponse(payment as any));

        return Response.json(
            {
                success: true,
                data,
                pagination: result.pagination,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching subscription payments:', error);

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

        return Response.json(
            {
                success: false,
                error: 'Failed to fetch subscription payments',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
