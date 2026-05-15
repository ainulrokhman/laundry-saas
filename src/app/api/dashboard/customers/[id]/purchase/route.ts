import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { QuotaService } from "@/services/QuotaService";
import { Role } from "@/generated/prisma";
import { z } from "zod";

const quotaService = new QuotaService();

const purchaseSchema = z.object({
  packageId: z.string().uuid("ID paket tidak valid"),
});

export const POST = withAuth(
  async (request: Request, session: ExtendedSession, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { packageId } = purchaseSchema.parse(body);
      
      const result = await quotaService.purchasePackage(session as any, id, packageId);
      
      return Response.json({ 
        success: true, 
        data: result,
        message: "Paket berhasil dibeli dan kuota telah ditambahkan"
      });
    } catch (error) {
      console.error("Purchase package error:", error);
      if (error instanceof z.ZodError) {
        return Response.json({ success: false, error: error.issues[0].message }, { status: 400 });
      }
      return Response.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Gagal memproses pembelian paket" 
      }, { status: 500 });
    }
  },
  { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
);
