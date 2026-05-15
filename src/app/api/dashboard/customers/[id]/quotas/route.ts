import { withAuth } from "@/lib/proxy/route-proxy";
import { ExtendedSession } from "@/lib/auth";
import { QuotaService } from "@/services/QuotaService";
import { Role } from "@/generated/prisma";

const quotaService = new QuotaService();

export const GET = withAuth(
  async (request: Request, session: ExtendedSession, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      
      const [quotas, transactions] = await Promise.all([
        quotaService.getCustomerQuotas(session as any, id),
        quotaService.getQuotaTransactions(session as any, id),
      ]);
      
      return Response.json({ 
        success: true, 
        data: {
          balances: quotas,
          transactions: transactions
        }
      });
    } catch (error) {
      console.error("Get quotas error:", error);
      return Response.json({ success: false, error: "Gagal mengambil data kuota" }, { status: 500 });
    }
  },
  { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
);
