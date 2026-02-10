
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletDTO } from '@/dto/OutletDTO';
import { z } from 'zod';

const outletRepository = new OutletRepository();

// Validation schema for update
const updateOutletSchema = z.object({
    name: z.string().min(3, 'Nama outlet minimal 3 karakter'),
    slug: z.string()
        .min(3, 'Slug minimal 3 karakter')
        .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan strip'),
    address: z.string().min(10, 'Alamat minimal 10 karakter'),
    phone: z.string().optional(),
});

export const PUT = withAuth(
    async (request: Request, session, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const outletId = id;
            const body = await request.json();

            // 1. Validate Input
            const validation = updateOutletSchema.safeParse(body);
            if (!validation.success) {
                return Response.json(
                    { success: false, error: validation.error.issues[0].message },
                    { status: 400 }
                );
            }

            const { name, slug, address, phone } = validation.data;

            // 2. Verify Ownership
            const existingOutlet = await outletRepository.findOwnedOutletById(session.userId, outletId);
            if (!existingOutlet) {
                return Response.json(
                    { success: false, error: 'Outlet tidak ditemukan atau Anda tidak memiliki akses' },
                    { status: 404 }
                );
            }

            // 3. Slug Consistency Check (Exclude current outlet)
            const slugExists = await outletRepository.slugExists(slug, outletId);
            if (slugExists) {
                return Response.json(
                    { success: false, error: 'URL Slug sudah digunakan outlet lain, silakan pilih yang lain' },
                    { status: 400 }
                );
            }

            // 4. Update Outlet
            const updatedOutlet = await outletRepository.update(outletId, {
                name,
                slug,
                address,
                contactPhone: phone,
            });

            return Response.json({
                success: true,
                data: OutletDTO.toResponse(updatedOutlet),
                message: 'Outlet berhasil diperbarui'
            });

        } catch (error) {
            console.error('Error updating outlet:', error);
            return Response.json(
                {
                    success: false,
                    error: 'Gagal update outlet',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
                { status: 500 }
            );
        }
    },
    { roles: [Role.OWNER], requireOutlet: false }
);
