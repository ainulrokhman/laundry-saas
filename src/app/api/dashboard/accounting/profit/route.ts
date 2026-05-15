/**
 * Accounting Profit API Route
 */

import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { AccountingService } from '@/services/AccountingService';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const accountingService = new AccountingService();

export const GET = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
      const endDate = searchParams.get('endDate') || new Date().toISOString();

      if (session.role !== Role.OWNER) {
        return Response.json({ success: false, error: 'Hanya OWNER yang dapat mengakses data ini' }, { status: 403 });
      }

      const sessionUser = {
        userId: session.userId,
        outletId: session.outletId,
        role: session.role,
        phone: session.phone,
      };

      let result;
      if (!session.outletId) {
        // Global Mode
        const ownedOutlets = await prisma.outlet.findMany({
          where: { ownerId: session.userId },
          select: { id: true },
        });
        const outletIds = ownedOutlets.map((o: any) => o.id);
        result = await accountingService.getGlobalGrossProfitReport(sessionUser as any, outletIds, { startDate, endDate });
      } else {
        // Single Outlet Mode
        result = await accountingService.getGrossProfitReport(sessionUser as any, { startDate, endDate });
      }

      return Response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in Accounting API:', error);
      return Response.json(
        {
          success: false,
          error: 'Gagal mengambil data keuangan',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [Role.OWNER], requireOutlet: false }
);
