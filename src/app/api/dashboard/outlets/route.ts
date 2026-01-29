/**
 * Dashboard Outlets API (OWNER)
 *
 * GET /api/dashboard/outlets
 * - Mengembalikan daftar outlet yang dimiliki OWNER (untuk outlet switcher)
 * - Tidak membutuhkan outlet context aktif (karena dipakai untuk memilih outlet)
 */

import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletDTO } from '@/dto/OutletDTO';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const outletRepository = new OutletRepository();

// Validation schema
const createOutletSchema = z.object({
  name: z.string().min(3, 'Nama outlet minimal 3 karakter'),
  slug: z.string()
    .min(3, 'Slug minimal 3 karakter')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  phone: z.string().optional(),
});

export const GET = withAuth(
  async (_request: Request, session) => {
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

export const POST = withAuth(
  async (request: Request, session) => {
    try {
      const body = await request.json();

      // 1. Validate Input
      const validation = createOutletSchema.safeParse(body);
      if (!validation.success) {
        return Response.json(
          { success: false, error: validation.error.issues[0].message },
          { status: 400 }
        );
      }

      const { name, slug, address, phone } = validation.data;

      // 2. Slug Consistency Check
      const slugExists = await outletRepository.slugExists(slug);
      if (slugExists) {
        return Response.json(
          { success: false, error: 'URL Slug sudah digunakan, silakan pilih yang lain' },
          { status: 400 }
        );
      }

      // 3. Subscription Quota Check
      // Fetch User with Package info and current outlet count
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          package: true,
          _count: {
            select: { ownedOutlets: true }
          }
        }
      });

      if (!user) {
        return Response.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      // Default limits if no package (e.g., allow 1 for trial or block)
      // Determining policy: For now, if no package, allow max 1 (Trial)
      const maxOutlets = user.package?.maxOutlets ?? 1;
      const currentOutlets = user._count.ownedOutlets;

      if (currentOutlets >= maxOutlets) {
        return Response.json(
          {
            success: false,
            error: `Batas maksimum outlet tercapai (${maxOutlets}). Upgrade paket Anda untuk menambah outlet.`
          },
          { status: 403 }
        );
      }

      // 4. Create Outlet using Repository
      // Note: Data passed to repo needs to match Prisma.OutletCreateInput
      // which includes 'owner' relation connect
      const newOutlet = await outletRepository.create({
        name,
        slug,
        address,
        contactPhone: phone,
        owner: {
          connect: { id: session.userId }
        }
      });

      return Response.json({
        success: true,
        data: OutletDTO.toResponse(newOutlet),
        message: 'Outlet berhasil dibuat'
      });

    } catch (error) {
      console.error('Error creating outlet:', error);
      return Response.json(
        {
          success: false,
          error: 'Gagal membuat outlet',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [Role.OWNER], requireOutlet: false }
);

