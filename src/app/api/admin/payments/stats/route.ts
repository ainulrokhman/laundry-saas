/**
 * Admin Payments API - Stats Route
 *
 * GET /api/admin/payments/stats
 * Get subscription payment statistics (SUPERADMIN only)
 */

import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { SubscriptionPaymentService } from '@/services/admin/SubscriptionPaymentService';

/**
 * GET /api/admin/payments/stats
 * Get payment statistics
 */
export const GET = withAdminAuth(async (_request: Request, _session) => {
    try {
        const service = new SubscriptionPaymentService();
        const stats = await service.getStats();

        return Response.json(
            {
                success: true,
                data: stats,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching payment stats:', error);

        return Response.json(
            {
                success: false,
                error: 'Failed to fetch payment stats',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
