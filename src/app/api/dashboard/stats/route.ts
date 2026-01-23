/**
 * Dashboard Stats API
 * 
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the authenticated outlet.
 */

import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { DashboardService } from '@/services/DashboardService';
import { DashboardDTO } from '@/dto/DashboardDTO';
import { Role } from '@/generated/prisma';

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const dashboardService = new DashboardService();
      // Convert ExtendedSession to SessionUser format
      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };
      const stats = await dashboardService.getDashboardStats(sessionUser);

      return Response.json({
        success: true,
        data: DashboardDTO.statsToResponse(stats),
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
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
