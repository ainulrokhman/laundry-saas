/**
 * HPP Simulation Detail/Action API Route
 */

import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { CogsSimulationService } from '@/services/CogsSimulationService';
import { Role } from '@/generated/prisma';

const simulationService = new CogsSimulationService();

export const DELETE = withAuth(
  async (_request: Request, session: ExtendedSession, { params }: any) => {
    try {
      const { id } = await params;
      await simulationService.deleteSimulation(session as any, id);
      return Response.json({ success: true, message: 'Simulasi dihapus' });
    } catch (error) {
      return Response.json({ success: false, error: 'Gagal menghapus simulasi' }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);

/**
 * POST /api/dashboard/accounting/simulations/[id]/apply
 */
export const POST = withAuth(
  async (request: Request, session: ExtendedSession, { params }: any) => {
    try {
      const { id } = await params;
      const { serviceId } = await request.json();
      
      if (!serviceId) {
        return Response.json({ success: false, error: 'ID Layanan harus diisi' }, { status: 400 });
      }

      await simulationService.applyToService(session as any, id, serviceId);
      return Response.json({ success: true, message: 'HPP berhasil diterapkan ke layanan' });
    } catch (error) {
      return Response.json({ success: false, error: 'Gagal menerapkan simulasi' }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);
