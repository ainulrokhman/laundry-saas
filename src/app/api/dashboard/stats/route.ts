/**
 * Dashboard Stats API
 *
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the authenticated outlet.
 * Supports Global Mode for OWNER without active outlet.
 */

import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { DashboardService } from "@/services/DashboardService";
import { DashboardDTO } from "@/dto/DashboardDTO";
import { Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const dashboardService = new DashboardService();

      // Global Mode: OWNER without active outlet
      const isGlobalMode = !session.outletId && session.role === Role.OWNER;

      if (isGlobalMode) {
        // Fetch owned outlets
        const ownedOutlets = await prisma.outlet.findMany({
          where: { ownerId: session.userId },
          select: { id: true },
        });
        const outletIds = ownedOutlets.map((o) => o.id);

        if (outletIds.length === 0) {
          return Response.json({
            success: true,
            data: {
              ordersToday: 0,
              revenueToday: 0,
              pendingOrders: 0,
              totalCustomers: 0,
            },
            isGlobalMode: true,
          });
        }

        const stats = await dashboardService.getGlobalDashboardStats(outletIds);

        return Response.json({
          success: true,
          data: DashboardDTO.statsToResponse(stats),
          isGlobalMode: true,
        });
      }

      // Single Outlet Mode
      if (!session.outletId) {
        return Response.json(
          { success: false, error: "Outlet context required" },
          { status: 400 },
        );
      }

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
        isGlobalMode: false,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return Response.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch dashboard stats",
        },
        { status: 500 },
      );
    }
  },
  {
    roles: [Role.OWNER, Role.STAFF], // Only OWNER and STAFF can access dashboard
    requireOutlet: false, // Allow global mode for OWNER
  },
);
