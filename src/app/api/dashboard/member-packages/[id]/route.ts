import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { MemberPackageService } from "@/services/MemberPackageService";
import { Role } from "@/generated/prisma";
import { z } from "zod";

const packageService = new MemberPackageService();

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  quota: z.number().min(0.1).optional(),
  type: z.enum(["KG", "PCS"]).optional(),
  expiryDays: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const PUT = withAuth(
  async (request: Request, session: ExtendedSession, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateSchema.parse(body);
      
      const pkg = await packageService.updatePackage(session as any, id, parsed as any);
      
      return Response.json({ success: true, data: pkg, message: "Paket berhasil diperbarui" });
    } catch (error) {
      console.error("Update package error:", error);
      return Response.json({ success: false, error: "Gagal memperbarui paket" }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);

export const DELETE = withAuth(
  async (request: Request, session: ExtendedSession, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      await packageService.deletePackage(session as any, id);
      
      return Response.json({ success: true, message: "Paket berhasil dihapus" });
    } catch (error) {
      console.error("Delete package error:", error);
      return Response.json({ success: false, error: "Gagal menghapus paket" }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);
