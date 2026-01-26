/**
 * Outlet Context API (OWNER)
 *
 * POST /api/dashboard/outlet-context
 * - Validasi server-side bahwa outlet yang dipilih milik OWNER
 * - Tidak mengandalkan outletId dari client sebagai "source of truth"
 *   (token/session akan diupdate lewat NextAuth session update yang juga divalidasi di server)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { OutletRepository } from '@/repositories/OutletRepository';

const schema = z.object({
  outletId: z.string().uuid('Outlet tidak valid'),
});

const outletRepository = new OutletRepository();

export const POST = withAuth(
  async (request: NextRequest, session) => {
    try {
      const body: unknown = await request.json();
      const { outletId } = schema.parse(body);

      const outlet = await outletRepository.findOwnedOutletById(session.userId, outletId);
      if (!outlet) {
        return Response.json(
          {
            success: false,
            error: 'Access denied',
            message: 'Outlet tidak termasuk dalam kepemilikan Anda',
          },
          { status: 403 }
        );
      }

      return Response.json({
        success: true,
        message: 'Outlet tervalidasi. Silakan lanjutkan untuk mengubah outlet aktif.',
        data: { outletId },
      });
    } catch (error) {
      console.error('Error validating outlet context:', error);

      if (error instanceof z.ZodError) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: error.issues.map((i) => i.message).join(', '),
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          success: false,
          error: 'Failed to validate outlet',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [Role.OWNER], requireOutlet: false }
);

