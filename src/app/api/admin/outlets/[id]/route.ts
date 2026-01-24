/**
 * Admin Outlet Detail API Routes
 * 
 * Get, update, and delete specific outlet (SuperAdmin only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletDTO } from '@/dto/OutletDTO';
import { generateSlug } from '@/lib/utils';

const outletRepository = new OutletRepository();

const updateOutletSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'Nama outlet harus berupa teks',
    })
    .trim()
    .min(1, 'Nama outlet harus diisi')
    .max(255, 'Nama outlet maksimal 255 karakter')
    .optional(),
  address: z
    .string({
      invalid_type_error: 'Alamat harus berupa teks',
    })
    .trim()
    .min(1, 'Alamat harus diisi')
    .max(500, 'Alamat maksimal 500 karakter')
    .optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung')
    .min(1, 'Slug minimal 1 karakter')
    .max(255, 'Slug maksimal 255 karakter')
    .optional(),
  isPro: z.boolean().optional(),
});

/**
 * GET /api/admin/outlets/[id]
 * Get outlet by ID (SuperAdmin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      const { id } = await params;
      
      // Validate ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'ID outlet tidak valid',
          },
          { status: 400 }
        );
      }
      
      const outlet = await outletRepository.findById(id);

      if (!outlet) {
        return Response.json(
          {
            success: false,
            error: 'Outlet not found',
            message: 'Outlet tidak ditemukan',
          },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        data: OutletDTO.toResponse(outlet),
      });
    } catch (error) {
      console.error('Error fetching outlet:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch outlet',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * PUT /api/admin/outlets/[id]
 * Update outlet (SuperAdmin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      const { id } = await params;
      
      // Validate ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'ID outlet tidak valid',
          },
          { status: 400 }
        );
      }
      
      const body = await request.json();
      
      // Validate that at least one field is provided for update
      if (Object.keys(body).length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Minimal satu field harus diisi untuk update',
          },
          { status: 400 }
        );
      }
      
      const validatedData = updateOutletSchema.parse(body);

      // Check if outlet exists
      const existingOutlet = await outletRepository.findById(id);
      if (!existingOutlet) {
        return Response.json(
          {
            success: false,
            error: 'Outlet not found',
            message: 'Outlet tidak ditemukan',
          },
          { status: 404 }
        );
      }

      // Validate slug format if provided
      if (validatedData.slug) {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(validatedData.slug)) {
          return Response.json(
            {
              success: false,
              error: 'Validation error',
              message: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung',
            },
            { status: 400 }
          );
        }
      }

      // If slug is being updated, check uniqueness
      if (validatedData.slug && validatedData.slug !== existingOutlet.slug) {
        const slugExists = await outletRepository.slugExists(validatedData.slug, id);
        if (slugExists) {
          return Response.json(
            {
              success: false,
              error: 'Validation error',
              message: 'Slug sudah digunakan oleh outlet lain',
            },
            { status: 400 }
          );
        }
      }

      // Generate slug if name is updated but slug is not provided
      let updateData: any = {};
      if (validatedData.name !== undefined) {
        updateData.name = validatedData.name.trim();
      }
      if (validatedData.address !== undefined) {
        updateData.address = validatedData.address.trim();
      }
      if (validatedData.isPro !== undefined) {
        updateData.isPro = validatedData.isPro;
      }
      
      if (validatedData.name && !validatedData.slug) {
        let newSlug = generateSlug(validatedData.name);
        const slugExists = await outletRepository.slugExists(newSlug, id);
        let counter = 1;
        while (slugExists) {
          newSlug = `${generateSlug(validatedData.name)}-${counter}`;
          const exists = await outletRepository.slugExists(newSlug, id);
          if (!exists) break;
          counter++;
          
          // Prevent infinite loop
          if (counter > 100) {
            return Response.json(
              {
                success: false,
                error: 'Failed to update outlet',
                message: 'Tidak dapat menghasilkan slug unik. Silakan coba lagi.',
              },
              { status: 500 }
            );
          }
        }
        updateData.slug = newSlug;
      } else if (validatedData.slug) {
        updateData.slug = validatedData.slug;
      }

      // If no fields to update, return error
      if (Object.keys(updateData).length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Tidak ada data yang diupdate',
          },
          { status: 400 }
        );
      }

      const outlet = await outletRepository.update(id, updateData);

      return Response.json({
        success: true,
        data: OutletDTO.toResponse(outlet),
        message: 'Outlet berhasil diperbarui',
      });
    } catch (error) {
      console.error('Error updating outlet:', error);
      
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((e) => {
          const field = e.path.join('.');
          return `${field}: ${e.message}`;
        });
        
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: errorMessages.join(', '),
            errors: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          success: false,
          error: 'Failed to update outlet',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * DELETE /api/admin/outlets/[id]
 * Delete outlet (SuperAdmin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      const { id } = await params;
      
      // Validate ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return Response.json(
          {
            success: false,
            error: 'Validation error',
            message: 'ID outlet tidak valid',
          },
          { status: 400 }
        );
      }
      
      // Check if outlet exists
      const existingOutlet = await outletRepository.findById(id);
      if (!existingOutlet) {
        return Response.json(
          {
            success: false,
            error: 'Outlet not found',
            message: 'Outlet tidak ditemukan',
          },
          { status: 404 }
        );
      }

      // Check if outlet has users (prevent deletion if has users)
      if (existingOutlet.users && existingOutlet.users.length > 0) {
        return Response.json(
          {
            success: false,
            error: 'Cannot delete outlet',
            message: 'Outlet tidak dapat dihapus karena masih memiliki pengguna. Hapus semua pengguna terlebih dahulu.',
          },
          { status: 400 }
        );
      }

      await outletRepository.delete(id);

      return Response.json({
        success: true,
        message: 'Outlet berhasil dihapus',
      });
    } catch (error) {
      console.error('Error deleting outlet:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to delete outlet',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}
