/**
 * HPP Simulation API Route
 */

import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { CogsSimulationService } from '@/services/CogsSimulationService';
import { Role } from '@/generated/prisma';

const simulationService = new CogsSimulationService();

const simulationSchema = z.object({
  name: z.string().trim().min(2, 'Nama simulasi minimal 2 karakter'),
  description: z.string().trim().optional(),
  items: z.array(z.object({
    name: z.string().trim().min(1, 'Nama komponen harus diisi'),
    cost: z.number().min(0, 'Harga tidak boleh negatif'),
    usage: z.number().min(0, 'Penggunaan tidak boleh negatif'),
  })).min(1, 'Minimal satu komponen biaya'),
});

export const GET = withAuth(
  async (_request: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json({ success: false, error: 'Silakan pilih outlet terlebih dahulu' }, { status: 400 });
      }

      const result = await simulationService.listSimulations(session as any);
      return Response.json({ success: true, data: result });
    } catch (_error) {
      return Response.json({ success: false, error: 'Gagal mengambil simulasi' }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);

export const POST = withAuth(
  async (request: Request, session: ExtendedSession) => {
    try {
      const body = await request.json();
      const validated = simulationSchema.parse(body);

      const result = await simulationService.createSimulation(session as any, validated);
      return Response.json({ success: true, data: result, message: 'Simulasi berhasil disimpan' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ success: false, error: 'Validasi gagal', message: error.issues[0].message }, { status: 400 });
      }
      return Response.json({ success: false, error: 'Gagal menyimpan simulasi' }, { status: 500 });
    }
  },
  { roles: [Role.OWNER], requireOutlet: true }
);
