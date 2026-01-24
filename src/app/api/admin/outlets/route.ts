/**
 * Admin Outlets API Routes
 * 
 * CRUD operations for outlets (SuperAdmin only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletDTO } from '@/dto/OutletDTO';
import { generateSlug } from '@/lib/utils';

const outletRepository = new OutletRepository();

// Validation schemas
const createOutletSchema = z.object({
  name: z
    .string({
      required_error: 'Nama outlet harus diisi',
      invalid_type_error: 'Nama outlet harus berupa teks',
    })
    .trim()
    .min(1, 'Nama outlet harus diisi')
    .max(255, 'Nama outlet maksimal 255 karakter'),
  address: z
    .string({
      required_error: 'Alamat harus diisi',
      invalid_type_error: 'Alamat harus berupa teks',
    })
    .trim()
    .min(1, 'Alamat harus diisi')
    .max(500, 'Alamat maksimal 500 karakter'),
  slug: z
    .union([
      z.string().trim().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  isPro: z.boolean().optional().default(false),
});

const updateOutletSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().min(1).max(500).optional(),
  slug: z.string().optional(),
  isPro: z.boolean().optional(),
});

/**
 * GET /api/admin/outlets
 * Get all outlets (SuperAdmin only)
 * Query params: checkSlug? - Check if slug exists (returns { exists: boolean })
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const checkSlug = searchParams.get('checkSlug');
    const excludeId = searchParams.get('excludeId');

    // If checking slug availability
    if (checkSlug) {
      const slugExists = await outletRepository.slugExists(
        checkSlug,
        excludeId || undefined
      );
      return Response.json({
        success: true,
        exists: slugExists,
        available: !slugExists,
      });
    }

    // Otherwise, return all outlets
    const outlets = await outletRepository.findAll();
    
    return Response.json({
      success: true,
      data: OutletDTO.toResponseArray(outlets),
    });
  } catch (error) {
    console.error('Error fetching outlets:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch outlets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/outlets
 * Create new outlet (SuperAdmin only)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createOutletSchema.parse(body);

    // Generate slug if not provided or empty
    let slug: string;
    if (validatedData.slug && validatedData.slug.trim().length > 0) {
      // Use provided slug
      slug = validatedData.slug.trim();
    } else {
      // Generate slug from name
      slug = generateSlug(validatedData.name);
      
      // If generated slug is empty (e.g., name is too short or invalid), use a fallback
      if (!slug || slug.length === 0) {
        slug = `outlet-${Date.now()}`;
      }
    }
    
    // Ensure slug is unique
    let slugExists = await outletRepository.slugExists(slug);
    let counter = 1;
    const baseSlug = slug;
    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      slugExists = await outletRepository.slugExists(slug);
      counter++;
      
      // Prevent infinite loop
      if (counter > 100) {
        return Response.json(
          {
            success: false,
            error: 'Failed to create outlet',
            message: 'Tidak dapat menghasilkan slug unik. Silakan coba lagi.',
          },
          { status: 500 }
        );
      }
    }

    // Ensure slug is not empty after generation
    if (!slug || slug.trim().length === 0) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Tidak dapat menghasilkan slug dari nama outlet. Nama outlet terlalu pendek atau tidak valid.',
        },
        { status: 400 }
      );
    }

    try {
      const outlet = await outletRepository.create({
        name: validatedData.name.trim(),
        address: validatedData.address.trim(),
        slug,
        isPro: validatedData.isPro || false,
      });

      return Response.json({
        success: true,
        data: OutletDTO.toResponse(outlet),
        message: 'Outlet berhasil dibuat',
      }, { status: 201 });
    } catch (dbError: any) {
      // Handle database errors (e.g., unique constraint violations)
      console.error('Database error creating outlet:', dbError);
      
      if (dbError.code === 'P2002') {
        // Prisma unique constraint error
        const target = dbError.meta?.target || [];
        if (target.includes('slug')) {
          return Response.json(
            {
              success: false,
              error: 'Validation error',
              message: 'Slug sudah digunakan oleh outlet lain. Silakan gunakan slug yang berbeda.',
            },
            { status: 400 }
          );
        }
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error creating outlet:', error);
    
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

    // More detailed error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    return Response.json(
      {
        success: false,
        error: 'Failed to create outlet',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
          stack: error.stack,
        }),
      },
      { status: 500 }
    );
  }
});
