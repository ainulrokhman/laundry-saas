/**
 * POS Services API (OWNER/STAFF, outlet scope)
 *
 * GET /api/dashboard/pos/services
 * Mengembalikan daftar layanan aktif untuk outlet aktif (dipakai di POS).
 */

import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import { ServiceRepository } from '@/repositories/ServiceRepository';
import { ServiceDTO } from '@/dto/ServiceDTO';

const serviceRepository = new ServiceRepository();

export const GET = withAuth(
  async (_request: Request, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json({ success: false, error: 'Outlet context required' }, { status: 403 });
      }

      const services = await serviceRepository.findActiveByOutletId(session.outletId);
      return Response.json({
        success: true,
        data: ServiceDTO.toResponseArray(services as any),
      });
    } catch (error) {
      console.error('Error fetching POS services:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch services',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [Role.OWNER, Role.STAFF], requireOutlet: true }
);

