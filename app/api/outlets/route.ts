/**
 * Outlets API Route
 * Handles GET /api/outlets - List all outlets (SuperAdmin only)
 * Following SOLID principles and security best practices
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@/types/enums/Role";
import { outletRepository } from "@/repositories/OutletRepository";
import type { OutletWithStats } from "@/repositories/OutletRepository";

/**
 * GET /api/outlets
 * List all outlets (SuperAdmin only)
 * Returns list of outlets with statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Require SUPERADMIN role
    const session = await requireRole(Role.SUPERADMIN);

    // Get all outlets (no outletId filter for SUPERADMIN)
    const outlets = await outletRepository.findAll();

    // Transform to DTO (scrub sensitive fields)
    const outletDTOs = outlets.map((outlet: OutletWithStats) => ({
      id: outlet.id,
      name: outlet.name,
      slug: outlet.slug,
      address: outlet.address,
      bankInfo: outlet.bankInfo,
      isPro: outlet.isPro,
      createdAt: outlet.createdAt,
      updatedAt: outlet.updatedAt,
      // Include statistics
      stats: {
        users: outlet._count.users,
        orders: outlet._count.orders,
        services: outlet._count.services,
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: outletDTOs,
        message: "Outlets retrieved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication/authorization errors
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: error.message,
            },
          },
          { status: 403 }
        );
      }
    }

    // Handle other errors
    console.error("Error fetching outlets:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch outlets",
        },
      },
      { status: 500 }
    );
  }
}
