/**
 * Example: Using Tenant Helpers in Service Layer
 * 
 * This file demonstrates how to use tenant isolation helpers
 * in service layer following .cursorrules requirements.
 * 
 * Key principles:
 * 1. Always get session in service layer
 * 2. Use buildTenantWhere to add outletId filter
 * 3. Verify tenant access before operations
 * 4. Never trust client-side outlet_id
 */

import { getSession, requireAuth, verifyTenantAccess } from "@/lib/auth-helpers";
import { buildTenantWhere, verifyTenantAccess as verifyAccess } from "@/lib/tenant-helpers";
import { prisma } from "@/lib/prisma";
import type { ExtendedSession } from "@/types/auth";

/**
 * Example Service: Order Service with Tenant Isolation
 * 
 * This demonstrates proper tenant isolation in service layer
 */
export class OrderServiceExample {
  /**
   * Get orders for current user's outlet
   * ✅ CORRECT: Uses buildTenantWhere to add outletId filter
   */
  async getOrders() {
    const session = await requireAuth();
    
    // Build where clause with tenant isolation
    const where = buildTenantWhere(session, {
      status: "QUEUED", // Additional filter
    });

    // Query with tenant filter
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Scrub sensitive fields (DTO pattern)
    return orders.map((order) => ({
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      totalAmount: order.totalAmount,
      // Exclude: outletId, internal fields
    }));
  }

  /**
   * Get order by ID with tenant isolation
   * ✅ CORRECT: Verifies tenant access before query
   */
  async getOrderById(orderId: string) {
    const session = await requireAuth();

    // Build where clause with tenant isolation
    const where = buildTenantWhere(session, { id: orderId });

    const order = await prisma.order.findFirst({
      where,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify access (double check)
    verifyAccess(session, order.outletId);

    // Return DTO (scrub sensitive fields)
    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      totalAmount: order.totalAmount,
    };
  }

  /**
   * Create order with tenant isolation
   * ✅ CORRECT: Uses session.outletId (never trust client)
   */
  async createOrder(data: {
    totalAmount: number;
    // Note: outletId comes from session, not from client
  }) {
    const session = await requireAuth();

    // Use session.outletId (server-side, trusted)
    const order = await prisma.order.create({
      data: {
        ...data,
        outletId: session.outletId, // From session, not client
        trackingCode: this.generateTrackingCode(),
        status: "QUEUED",
        paymentStatus: "UNPAID",
      },
    });

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
    };
  }

  /**
   * Update order with tenant isolation
   * ✅ CORRECT: Verifies access before update
   */
  async updateOrder(orderId: string, data: { status: string }) {
    const session = await requireAuth();

    // First, get order with tenant filter
    const where = buildTenantWhere(session, { id: orderId });
    const existingOrder = await prisma.order.findFirst({ where });

    if (!existingOrder) {
      throw new Error("Order not found");
    }

    // Verify access
    verifyAccess(session, existingOrder.outletId);

    // Update with tenant filter
    const updated = await prisma.order.update({
      where: { id: orderId, outletId: session.outletId }, // Tenant filter in update
      data,
    });

    return {
      id: updated.id,
      trackingCode: updated.trackingCode,
      status: updated.status,
    };
  }

  /**
   * Delete order with tenant isolation
   * ✅ CORRECT: Uses tenant filter in delete
   */
  async deleteOrder(orderId: string) {
    const session = await requireAuth();

    // Verify order exists and user has access
    const where = buildTenantWhere(session, { id: orderId });
    const order = await prisma.order.findFirst({ where });

    if (!order) {
      throw new Error("Order not found");
    }

    // Delete with tenant filter
    await prisma.order.delete({
      where: {
        id: orderId,
        outletId: session.outletId, // Tenant filter
      },
    });
  }

  /**
   * ❌ WRONG EXAMPLE: Missing tenant filter
   * DO NOT DO THIS
   */
  async getOrdersWrong() {
    const session = await requireAuth();

    // ❌ Missing outletId filter - violates tenant isolation
    const orders = await prisma.order.findMany({
      where: {
        status: "QUEUED", // Missing outletId!
      },
    });

    return orders; // Exposes data from all outlets!
  }

  /**
   * ❌ WRONG EXAMPLE: Trusting client-side outlet_id
   * DO NOT DO THIS
   */
  async createOrderWrong(data: {
    totalAmount: number;
    outletId: string; // ❌ Client-provided outletId
  }) {
    const session = await requireAuth();

    // ❌ Using client-provided outletId - security risk!
    const order = await prisma.order.create({
      data: {
        ...data,
        outletId: data.outletId, // ❌ Never trust client!
        trackingCode: this.generateTrackingCode(),
      },
    });

    return order;
  }

  private generateTrackingCode(): string {
    // Generate random tracking code
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

/**
 * Example: API Route Handler with Tenant Isolation
 * 
 * This demonstrates how to use tenant helpers in API routes
 */
export async function exampleApiRouteHandler(request: Request) {
  try {
    // 1. Get session (required)
    const session = await requireAuth();

    // 2. Get outletId from session (never from request body/params)
    const outletId = session.outletId;

    // 3. Build tenant filter for queries
    const where = buildTenantWhere(session, {
      status: "ACTIVE",
    });

    // 4. Query with tenant filter
    const data = await prisma.order.findMany({ where });

    // 5. Return DTO (scrub sensitive fields)
    return Response.json({
      data: data.map((item) => ({
        id: item.id,
        trackingCode: item.trackingCode,
        // Exclude: outletId, internal fields
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 401 }
    );
  }
}
