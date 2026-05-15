/**
 * Bank Accounts API Routes
 * 
 * CRUD operations for bank accounts (Owner only)
 */

import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { BankAccountRepository } from '@/repositories/BankAccountRepository';
import { BankAccountDTO } from '@/dto/BankAccountDTO';

const bankAccountRepository = new BankAccountRepository();

// Validation schemas
const createBankAccountSchema = z.object({
  bankName: z
    .string()
    .trim()
    .min(1, 'Nama bank harus diisi')
    .max(100, 'Nama bank maksimal 100 karakter'),
  accountName: z
    .string()
    .trim()
    .min(1, 'Nama pemilik rekening harus diisi')
    .max(255, 'Nama pemilik rekening maksimal 255 karakter'),
  accountNumber: z
    .string()
    .trim()
    .min(1, 'Nomor rekening harus diisi')
    .max(50, 'Nomor rekening maksimal 50 karakter')
    .regex(/^[0-9]+$/, 'Nomor rekening hanya boleh mengandung angka'),
  isActive: z.boolean().optional().default(true),
});

const updateBankAccountSchema = z.object({
  bankName: z.string().min(1).max(100).optional(),
  accountName: z.string().min(1).max(255).optional(),
  accountNumber: z.string().min(1).max(50).regex(/^[0-9]+$/).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/dashboard/settings/bank-accounts
 * Get all bank accounts for the authenticated outlet (Owner only)
 */
export const GET = withOwnerAuth(async (
  _request: Request,
  session: ExtendedSession
) => {
  try {
    let bankAccounts;
    if (session.outletId) {
      bankAccounts = await bankAccountRepository.findByOutletId(
        session.outletId
      );
    } else {
      // Global Mode: list bank accounts from all owned outlets
      bankAccounts = await bankAccountRepository.findByOwnerId(session.userId);
    }

    return Response.json({
      success: true,
      data: BankAccountDTO.toResponseArray(bankAccounts),
      isGlobalMode: !session.outletId,
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch bank accounts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}, { requireOutlet: false });

/**
 * POST /api/dashboard/settings/bank-accounts
 * Create new bank account (Owner only)
 */
export const POST = withOwnerAuth(async (
  request: Request,
  session: ExtendedSession
) => {
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

    const body = await request.json();

    // Validate request body
    const validatedData = createBankAccountSchema.parse(body);

    try {
      const bankAccount = await bankAccountRepository.create(
        session.outletId,
        {
          bankName: validatedData.bankName.trim(),
          accountName: validatedData.accountName.trim(),
          accountNumber: validatedData.accountNumber.trim(),
          isActive: validatedData.isActive ?? true,
        }
      );

      return Response.json(
        {
          success: true,
          data: BankAccountDTO.toResponse(bankAccount),
          message: 'Rekening bank berhasil ditambahkan',
        },
        { status: 201 }
      );
    } catch (dbError: any) {
      console.error('Database error creating bank account:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating bank account:', error);

    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((i) => {
        const field = i.path.join('.');
        return `${field}: ${i.message}`;
      });

      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: errorMessages.join(', '),
          errors: error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
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
        error: 'Failed to create bank account',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' &&
          error instanceof Error && {
            stack: error.stack,
          }),
      },
      { status: 500 }
    );
  }
});
