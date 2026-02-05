/**
 * Dashboard Stats API
 *
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the authenticated outlet.
 * Supports Global Mode for OWNER without active outlet.
 * Uses short-lived cache (60s) to reduce DB load.
 */

import { unstable_cache } from "next/cache";
import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { DashboardService } from "@/services/DashboardService";
import { DashboardDTO } from "@/dto/DashboardDTO";
import { Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const CACHE_REVALIDATE_SECONDS = 60;

async function getCachedOutletStats(outletId: string) {
  const dashboardService = new DashboardService();
  const sessionUser = { userId: "", outletId, role: Role.STAFF, phone: "" };
  return dashboardService.getDashboardStats(sessionUser);
}

async function getCachedGlobalStats(outletIds: string[]) {
  const dashboardService = new DashboardService();
  return dashboardService.getGlobalDashboardStats(outletIds);
}

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      // Global Mode: OWNER without active outlet
      const isGlobalMode = !session.outletId && session.role === Role.OWNER;

      if (isGlobalMode) {
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

        const cacheKey = ["dashboard-stats-global", session.userId, outletIds.sort().join(",")];
        const stats = await unstable_cache(
          () => getCachedGlobalStats(outletIds),
          cacheKey,
          { revalidate: CACHE_REVALIDATE_SECONDS }
        )();

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

      const cacheKey = ["dashboard-stats", session.outletId];
      const stats = await unstable_cache(
        () => getCachedOutletStats(session.outletId!),
        cacheKey,
        { revalidate: CACHE_REVALIDATE_SECONDS }
      )();

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
