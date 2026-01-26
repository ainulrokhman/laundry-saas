/**
 * Dashboard Outlets API (OWNER)
 *
 * GET /api/dashboard/outlets
 * - Mengembalikan daftar outlet yang dimiliki OWNER (untuk outlet switcher)
 * - Tidak membutuhkan outlet context aktif (karena dipakai untuk memilih outlet)
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletDTO } from '@/dto/OutletDTO';

const outletRepository = new OutletRepository();

export const GET = withAuth(
  async (_request: NextRequest, session) => {
    try {
      const outlets = await outletRepository.findByOwnerId(session.userId);

      return Response.json({
        success: true,
        data: OutletDTO.toResponseArray(outlets),
      });
    } catch (error) {
      console.error('Error fetching owner outlets:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch outlets',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [Role.OWNER], requireOutlet: false }
);

