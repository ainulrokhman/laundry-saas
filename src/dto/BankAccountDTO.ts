/**
 * Bank Account DTO
 * 
 * Data Transfer Objects for bank account responses.
 * Ensures sensitive data is scrubbed before sending to client.
 */

import { BankAccount } from '@/generated/prisma';

export interface BankAccountWithRelations extends BankAccount {
  outlet?: {
    id: string;
    name: string;
    slug: string;
  };
}

export class BankAccountDTO {
  /**
   * Transform bank account to response format
   * Scrubs sensitive data and only includes necessary fields
   */
  static toResponse(bankAccount: BankAccountWithRelations) {
    return {
      id: bankAccount.id,
      bankName: bankAccount.bankName,
      accountName: bankAccount.accountName,
      accountNumber: bankAccount.accountNumber,
      isActive: bankAccount.isActive,
      createdAt: bankAccount.createdAt.toISOString(),
      updatedAt: bankAccount.updatedAt.toISOString(),
      // Include outlet info if available (minimal)
      ...(bankAccount.outlet && {
        outlet: {
          id: bankAccount.outlet.id,
          name: bankAccount.outlet.name,
          slug: bankAccount.outlet.slug,
        },
      }),
    };
  }

  /**
   * Transform bank account to public response format (for public outlet page)
   * Only includes active bank accounts and minimal data
   */
  static toPublicResponse(bankAccount: BankAccountWithRelations) {
    // Only return active bank accounts for public
    if (!bankAccount.isActive) {
      return null;
    }

    return {
      id: bankAccount.id,
      bankName: bankAccount.bankName,
      accountName: bankAccount.accountName,
      accountNumber: bankAccount.accountNumber,
      // Never include: outletId, createdAt, updatedAt for public
    };
  }

  /**
   * Transform array of bank accounts to response format
   */
  static toResponseArray(bankAccounts: BankAccountWithRelations[]) {
    return bankAccounts.map((bankAccount) => this.toResponse(bankAccount));
  }

  /**
   * Transform array of bank accounts to public response format
   * Filters out inactive bank accounts
   */
  static toPublicResponseArray(bankAccounts: BankAccountWithRelations[]) {
    return bankAccounts
      .map((bankAccount) => this.toPublicResponse(bankAccount))
      .filter((bankAccount) => bankAccount !== null);
  }
}
