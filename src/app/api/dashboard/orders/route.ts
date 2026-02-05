/**
 * Orders API Routes (OWNER/STAFF, outlet scope)
 *
 * - GET: list orders + filter + pagination (supports Global Mode for OWNER)
 * - POST: create order (POS)
 */

import { z } from "zod";
import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { Role, OrderStatus, PaymentStatus } from "@/generated/prisma";
import { OrderService } from "@/services/OrderService";
import { OrderDTO } from "@/dto/OrderDTO";
import { prisma } from "@/lib/prisma";
import { securityLogService, SecurityEventType } from "@/services/security/SecurityLogService";
import { logError } from "@/lib/logger";

const orderService = new OrderService();

const querySchema = z.object({
  q: z.string().trim().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});

const createSchema = z
  .object({
    customerId: z.string().uuid("customerId tidak valid").optional(), // Relasi ke Customer (opsional)
    customerName: z
      .string()
      .trim()
      .max(100, "Nama maksimal 100 karakter")
      .optional(),
    customerPhone: z
      .string()
      .trim()
      .max(20, "Nomor telepon maksimal 20 digit")
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Catatan maksimal 500 karakter")
      .optional(),
    items: z
      .array(
        z
          .object({
            serviceId: z.string().uuid("serviceId tidak valid"),
            quantity: z.coerce.number().finite().positive("Qty harus > 0"),
            unitPrice: z.coerce
              .number()
              .finite()
              .min(0, "Harga tidak boleh negatif")
              .optional(),
          })
          .strict(),
      )
      .min(1, "Minimal satu layanan harus dipilih"),
    paid: z.boolean(),
    paidAt: z.string().datetime().optional(),
    paymentNote: z
      .string()
      .trim()
      .max(200, "Catatan pembayaran maksimal 200 karakter")
      .optional(),
    dpAmount: z.coerce
      .number()
      .finite()
      .min(0, "Nominal DP minimal 0")
      .optional(),
    dpNote: z
      .string()
      .trim()
      .max(200, "Catatan DP maksimal 200 karakter")
      .optional(),
    cashReceived: z.coerce
      .number()
      .finite()
      .min(0, "Uang diterima minimal 0")
      .optional(),
  })
  .strict();

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const url = new URL(request.url);
      const parsed = querySchema.parse({
        q: url.searchParams.get("q") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        paymentStatus: url.searchParams.get("paymentStatus") ?? undefined,
        page: url.searchParams.get("page") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
      });

      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };

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
              items: [],
              pagination: {
                total: 0,
                page: 1,
                limit: parsed.limit,
                totalPages: 0,
              },
            },
            isGlobalMode: true,
          });
        }

        const result = await orderService.listGlobalOrders(
          sessionUser,
          outletIds,
          {
            q: parsed.q,
            status: parsed.status,
            paymentStatus: parsed.paymentStatus,
            page: parsed.page,
            limit: parsed.limit,
          },
        );

        // Map with outlet info
        const items = result.data.map((order: any) => ({
          ...OrderDTO.toResponse(order),
          outletId: order.outlet?.id,
          outletName: order.outlet?.name,
        }));

        return Response.json({
          success: true,
          data: {
            items,
            pagination: {
              total: result.total,
              page: result.page,
              limit: result.limit,
              totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
            },
          },
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

      const result = await orderService.listOrders(sessionUser, {
        q: parsed.q,
        status: parsed.status,
        paymentStatus: parsed.paymentStatus,
        page: parsed.page,
        limit: parsed.limit,
      } as any);

      return Response.json({
        success: true,
        data: {
          items: OrderDTO.toResponseArray(result.data as any),
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
          },
        },
        isGlobalMode: false,
      });
    } catch (error) {
      console.error("Error listing orders:", error);
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            success: false,
            error: "Invalid query parameters",
            message: error.issues.map((i) => i.message).join(", "),
          },
          { status: 400 },
        );
      }
      return Response.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to list orders",
        },
        { status: 500 },
      );
    }
  },
  { roles: [Role.OWNER, Role.STAFF], requireOutlet: false },
);

export const POST = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const body = await request.json();
      const validated = createSchema.parse(body);

      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };

      const created = await orderService.createOrder(sessionUser, {
        customerId: validated.customerId,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        notes: validated.notes,
        items: validated.items,
        paid: validated.paid,
        paidAt: validated.paidAt,
        paymentNote: validated.paymentNote,
        dpAmount: validated.dpAmount,
        dpNote: validated.dpNote,
        cashReceived: validated.cashReceived,
      });

      await securityLogService.logEvent({
        userId: session.userId,
        eventType: SecurityEventType.ORDER_CREATE,
        success: true,
        metadata: { orderId: created.id, outletId: session.outletId, trackingCode: (created as any).trackingCode },
      });

      return Response.json(
        {
          success: true,
          data: OrderDTO.toResponse(created as any),
          message: "Order berhasil dibuat",
        },
        { status: 201 },
      );
    } catch (error) {
      logError('Error creating order', error, { userId: session.userId, outletId: session.outletId ?? undefined });

      if (error instanceof z.ZodError) {
        return Response.json(
          {
            success: false,
            error: "Validation error",
            message: error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(", "),
            errors: error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }

      return Response.json(
        {
          success: false,
          error: "Failed to create order",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },
  { roles: [Role.OWNER, Role.STAFF], requireOutlet: true },
);
