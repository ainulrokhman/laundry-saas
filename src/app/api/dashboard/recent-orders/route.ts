/**
 * Recent Orders API
 *
 * GET /api/dashboard/recent-orders?limit=10
 * Returns recent orders for the authenticated outlet.
 * Supports Global Mode for OWNER without active outlet.
 */

import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { DashboardService } from "@/services/DashboardService";
import { DashboardDTO } from "@/dto/DashboardDTO";
import { Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const url = new URL(request.url);
      const query = querySchema.parse({
        limit: url.searchParams.get("limit"),
      });

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
            data: [],
            isGlobalMode: true,
          });
        }

        const orders = await dashboardService.getGlobalRecentOrders(
          outletIds,
          query.limit,
        );

        return Response.json({
          success: true,
          data: DashboardDTO.recentOrdersToResponse(orders),
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
      const orders = await dashboardService.getRecentOrders(
        sessionUser,
        query.limit,
      );

      return Response.json({
        success: true,
        data: DashboardDTO.recentOrdersToResponse(orders),
        isGlobalMode: false,
      });
    } catch (error) {
      console.error("Recent orders error:", error);

      if (error instanceof z.ZodError) {
        return Response.json(
          {
            success: false,
            error: "Invalid query parameters",
            message: error.issues.map((issue) => issue.message).join(", "),
          },
          { status: 400 },
        );
      }

      return Response.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch recent orders",
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
