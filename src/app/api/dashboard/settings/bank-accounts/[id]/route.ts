/**
 * Bank Account Detail API Routes
 * 
 * Update and delete operations for bank accounts (Owner only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { BankAccountRepository } from '@/repositories/BankAccountRepository';
import { BankAccountDTO } from '@/dto/BankAccountDTO';

const bankAccountRepository = new BankAccountRepository();

// Validation schemas
const updateBankAccountSchema = z.object({
  bankName: z.string().min(1).max(100).optional(),
  accountName: z.string().min(1).max(255).optional(),
  accountNumber: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[0-9]+$/, 'Nomor rekening hanya boleh mengandung angka')
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/dashboard/settings/bank-accounts/[id]
 * Get bank account by ID (Owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (req: NextRequest, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json(
          {
            success: false,
            error: 'Outlet context required',
          },
          { status: 403 }
        );
      }

      const { id } = await params;
      const bankAccount = await bankAccountRepository.findById(
        session.outletId,
        id
      );

      if (!bankAccount) {
        return Response.json(
          {
            success: false,
            error: 'Bank account not found',
          },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        data: BankAccountDTO.toResponse(bankAccount),
      });
    } catch (error) {
      console.error('Error fetching bank account:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch bank account',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * PUT /api/dashboard/settings/bank-accounts/[id]
 * Update bank account (Owner only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (req: NextRequest, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json(
          {
            success: false,
            error: 'Outlet context required',
          },
          { status: 403 }
        );
      }

      const { id } = await params;
      const body = await req.json();

      // Validate request body
      const validatedData = updateBankAccountSchema.parse(body);

      // Prepare update data
      const updateData: any = {};
      if (validatedData.bankName !== undefined) {
        updateData.bankName = validatedData.bankName.trim();
      }
      if (validatedData.accountName !== undefined) {
        updateData.accountName = validatedData.accountName.trim();
      }
      if (validatedData.accountNumber !== undefined) {
        updateData.accountNumber = validatedData.accountNumber.trim();
      }
      if (validatedData.isActive !== undefined) {
        updateData.isActive = validatedData.isActive;
      }

      try {
        const bankAccount = await bankAccountRepository.update(
          session.outletId,
          id,
          updateData
        );

        return Response.json({
          success: true,
          data: BankAccountDTO.toResponse(bankAccount),
          message: 'Rekening bank berhasil diperbarui',
        });
      } catch (dbError: any) {
        if (dbError.message?.includes('not found')) {
          return Response.json(
            {
              success: false,
              error: 'Bank account not found',
              message: 'Rekening bank tidak ditemukan atau tidak memiliki akses',
            },
            { status: 404 }
          );
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error updating bank account:', error);

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

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return Response.json(
        {
          success: false,
          error: 'Failed to update bank account',
          message: errorMessage,
          ...(process.env.NODE_ENV === 'development' &&
            error instanceof Error && {
              stack: error.stack,
            }),
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * DELETE /api/dashboard/settings/bank-accounts/[id]
 * Delete bank account (Owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (req: NextRequest, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json(
          {
            success: false,
            error: 'Outlet context required',
          },
          { status: 403 }
        );
      }

      const { id } = await params;

      try {
        await bankAccountRepository.delete(session.outletId, id);

        return Response.json({
          success: true,
          message: 'Rekening bank berhasil dihapus',
        });
      } catch (dbError: any) {
        if (dbError.message?.includes('not found')) {
          return Response.json(
            {
              success: false,
              error: 'Bank account not found',
              message: 'Rekening bank tidak ditemukan atau tidak memiliki akses',
            },
            { status: 404 }
          );
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return Response.json(
        {
          success: false,
          error: 'Failed to delete bank account',
          message: errorMessage,
          ...(process.env.NODE_ENV === 'development' &&
            error instanceof Error && {
              stack: error.stack,
            }),
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * PATCH /api/dashboard/settings/bank-accounts/[id]/toggle-active
 * Toggle active status (Owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOwnerAuth(async (req: NextRequest, session: ExtendedSession) => {
    try {
      if (!session.outletId) {
        return Response.json(
          {
            success: false,
            error: 'Outlet context required',
          },
          { status: 403 }
        );
      }

      const { id } = await params;

      try {
        const bankAccount = await bankAccountRepository.toggleActive(
          session.outletId,
          id
        );

        return Response.json({
          success: true,
          data: BankAccountDTO.toResponse(bankAccount),
          message: `Rekening bank berhasil ${
            bankAccount.isActive ? 'diaktifkan' : 'dinonaktifkan'
          }`,
        });
      } catch (dbError: any) {
        if (dbError.message?.includes('not found')) {
          return Response.json(
            {
              success: false,
              error: 'Bank account not found',
              message: 'Rekening bank tidak ditemukan atau tidak memiliki akses',
            },
            { status: 404 }
          );
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error toggling bank account status:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return Response.json(
        {
          success: false,
          error: 'Failed to toggle bank account status',
          message: errorMessage,
          ...(process.env.NODE_ENV === 'development' &&
            error instanceof Error && {
              stack: error.stack,
            }),
        },
        { status: 500 }
      );
    }
  })(request);
}
