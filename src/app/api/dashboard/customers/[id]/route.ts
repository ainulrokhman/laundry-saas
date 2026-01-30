import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { CustomerService } from "@/services/dashboard/CustomerService";
import { CustomerRepository } from "@/repositories/CustomerRepository";
import { CustomerDTO } from "@/dto/CustomerDTO";
import { Role } from "@/generated/prisma";
import { z } from "zod";
import {
  sanitizeString,
  sanitizePhone,
  sanitizeEmail,
} from "@/lib/utils/sanitize";

const customerRepo = new CustomerRepository();
const customerService = new CustomerService(customerRepo);

const updateSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Format email tidak valid")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
});

export const GET = withAuth(
  async (
    request: Request,
    session: ExtendedSession,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const url = new URL(request.url);
      const includeOrders = url.searchParams.get("include") === "orders";

      // Fetch customer with or without orders based on include param
      const customer = includeOrders
        ? await customerService.getCustomerWithOrders(session.outletId!, id)
        : await customerService.getCustomer(session.outletId!, id);

      if (!customer) {
        return Response.json(
          { success: false, error: "Pelanggan tidak ditemukan" },
          { status: 404 },
        );
      }

      // Return with or without orders
      const data = includeOrders
        ? CustomerDTO.toResponseWithOrders(customer as any)
        : CustomerDTO.toResponse(customer);

      return Response.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Get customer error:", error);
      return Response.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Gagal mengambil data pelanggan",
        },
        { status: 500 },
      );
    }
  },
  {
    roles: [Role.OWNER, Role.STAFF],
    requireOutlet: true,
  },
);

export const PUT = withAuth(
  async (
    request: Request,
    session: ExtendedSession,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateSchema.parse(body);

      // Sanitize inputs
      const sanitizedData = {
        name: parsed.name ? sanitizeString(parsed.name) : undefined,
        phone: parsed.phone ? sanitizePhone(parsed.phone) : undefined,
        email: parsed.email ? sanitizeEmail(parsed.email) : undefined,
        address: parsed.address ? sanitizeString(parsed.address) : undefined,
      };

      const customer = await customerService.updateCustomer(
        session.outletId!,
        id,
        sanitizedData,
      );

      return Response.json({
        success: true,
        data: CustomerDTO.toResponse(customer),
        message: "Data pelanggan berhasil diperbarui",
      });
    } catch (error) {
      console.error("Update customer error:", error);

      if (error instanceof z.ZodError) {
        return Response.json(
          {
            success: false,
            error:
              (error as any).errors?.[0]?.message || "Validation error",
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
              : "Gagal memperbarui data pelanggan",
        },
        { status: 500 },
      );
    }
  },
  {
    roles: [Role.OWNER, Role.STAFF],
    requireOutlet: true,
  },
);

export const DELETE = withAuth(
  async (
    request: Request,
    session: ExtendedSession,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      await customerService.deleteCustomer(session.outletId!, id);

      return Response.json({
        success: true,
        message: "Pelanggan berhasil dihapus",
      });
    } catch (error) {
      console.error("Delete customer error:", error);
      return Response.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Gagal menghapus pelanggan",
        },
        { status: 500 },
      );
    }
  },
  {
    roles: [Role.OWNER, Role.STAFF],
    requireOutlet: true,
  },
);
