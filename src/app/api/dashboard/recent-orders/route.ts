/**
 * Recent Orders API
 * 
 * GET /api/dashboard/recent-orders?limit=10
 * Returns recent orders for the authenticated outlet.
 */

import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { DashboardService } from '@/services/DashboardService';
import { DashboardDTO } from '@/dto/DashboardDTO';
import { Role } from '@/generated/prisma';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const url = new URL(request.url);
      const query = querySchema.parse({
        limit: url.searchParams.get('limit'),
      });

      const dashboardService = new DashboardService();
      // Convert ExtendedSession to SessionUser format
      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };
      const orders = await dashboardService.getRecentOrders(sessionUser, query.limit);

      return Response.json({
        success: true,
        data: DashboardDTO.recentOrdersToResponse(orders),
      });
    } catch (error) {
      console.error('Recent orders error:', error);
      
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            success: false,
            error: 'Invalid query parameters',
            message: error.issues.map((issue) => issue.message).join(', '),
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch recent orders',
        },
        { status: 500 }
      );
    }
  },
  {
    roles: [Role.OWNER, Role.STAFF], // Only OWNER and STAFF can access dashboard
    requireOutlet: true,
  }
);
