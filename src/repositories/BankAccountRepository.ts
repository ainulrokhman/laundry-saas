/**
 * Bank Account Repository
 * 
 * Data access layer for BankAccount model.
 * All queries include outletId filter for multi-tenancy isolation.
 */

import { prisma } from '@/lib/prisma';
import { BankAccount, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

export class BankAccountRepository extends BaseRepository {
  /**
   * Find bank account by ID (with outletId filter)
   */
  async findById(outletId: string, id: string): Promise<BankAccount | null> {
    this.ensureOutletId(outletId, 'BankAccount');
    return prisma.bankAccount.findFirst({
      where: this.combineFilters(outletId, { id }),
    });
  }

  /**
   * Find all bank accounts for an outlet
   */
  async findByOutletId(outletId: string): Promise<BankAccount[]> {
    this.ensureOutletId(outletId, 'BankAccount');
    return prisma.bankAccount.findMany({
      where: this.getOutletFilter(outletId),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active bank accounts for an outlet
   */
  async findActiveByOutletId(outletId: string): Promise<BankAccount[]> {
    this.ensureOutletId(outletId, 'BankAccount');
    return prisma.bankAccount.findMany({
      where: this.combineFilters(outletId, { isActive: true }),
      orderBy: { bankName: 'asc' },
    });
  }

  /**
   * Create new bank account
   */
  async create(
    outletId: string,
    data: Omit<Prisma.BankAccountCreateInput, 'outlet'>
  ): Promise<BankAccount> {
    this.ensureOutletId(outletId, 'BankAccount');
    return prisma.bankAccount.create({
      data: {
        ...data,
        outlet: {
          connect: { id: outletId },
        },
      },
    });
  }

  /**
   * Update bank account
   */
  async update(
    outletId: string,
    id: string,
    data: Prisma.BankAccountUpdateInput
  ): Promise<BankAccount> {
    this.ensureOutletId(outletId, 'BankAccount');
    // Verify outletId matches before update
    const bankAccount = await this.findById(outletId, id);
    if (!bankAccount) {
      throw new Error('Bank account not found or access denied');
    }
    return prisma.bankAccount.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete bank account
   */
  async delete(outletId: string, id: string): Promise<BankAccount> {
    this.ensureOutletId(outletId, 'BankAccount');
    // Verify outletId matches before delete
    const bankAccount = await this.findById(outletId, id);
    if (!bankAccount) {
      throw new Error('Bank account not found or access denied');
    }
    return prisma.bankAccount.delete({
      where: { id },
    });
  }

  /**
   * Toggle active status
   */
  async toggleActive(outletId: string, id: string): Promise<BankAccount> {
    this.ensureOutletId(outletId, 'BankAccount');
    const bankAccount = await this.findById(outletId, id);
    if (!bankAccount) {
      throw new Error('Bank account not found or access denied');
    }
    return prisma.bankAccount.update({
      where: { id },
      data: { isActive: !bankAccount.isActive },
    });
  }
}
