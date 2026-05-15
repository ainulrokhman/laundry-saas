import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { MemberPackageService } from "@/services/MemberPackageService";
import { Role, Prisma } from "@/generated/prisma";
import { z } from "zod";

const packageService = new MemberPackageService();

const createSchema = z.object({
  name: z.string().min(1, "Nama paket wajib diisi"),
  description: z.string().optional(),
  price: z.number().min(0, "Harga tidak valid"),
  quota: z.number().min(0.1, "Kuota minimal 0.1"),
  type: z.enum(["KG", "PCS"]),
  expiryDays: z.number().optional().nullable(),
});

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const url = new URL(request.url);
      const isActiveOnly = url.searchParams.get("active") === "true";
      
      const packages = await packageService.listPackages(session as any, isActiveOnly ? true : undefined);
      
      return Response.json({ success: true, data: packages });
    } catch (error) {
      console.error("List packages error:", error);
      return Response.json({ success: false, error: "Gagal mengambil data paket" }, { status: 500 });
    }
  },
  { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
);

export const POST = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const body = await request.json();
      const parsed = createSchema.parse(body);
      
      const pkg = await packageService.createPackage(session as any, parsed as any);
      
      return Response.json({ success: true, data: pkg, message: "Paket berhasil dibuat" });
    } catch (error) {
      console.error("Create package error:", error);
      if (error instanceof z.ZodError) {
        return Response.json({ success: false, error: error.issues[0].message }, { status: 400 });
      }
      return Response.json({ success: false, error: "Gagal membuat paket" }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);
