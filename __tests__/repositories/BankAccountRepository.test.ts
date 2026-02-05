/**
 * BankAccount Repository Tests
 * Outlet filtering and CRUD
 */

import { BankAccountRepository } from '@/repositories/BankAccountRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createBankAccountData } from '../utils/factories';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('BankAccountRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new BankAccountRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('outlet filtering', () => {
    it('should only return bank accounts for specified outlet', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });

      await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet1.id }),
          bankName: 'BCA',
          accountName: 'A',
          accountNumber: '111',
          isActive: true,
        },
      });
      await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet2.id }),
          bankName: 'BRI',
          accountName: 'B',
          accountNumber: '222',
          isActive: true,
        },
      });

      const list = await repo.findByOutletId(outlet1.id);
      expect(list).toHaveLength(1);
      expect(list[0].outletId).toBe(outlet1.id);
      expect(list[0].bankName).toBe('BCA');
    });

    it('should find by id only when outletId matches', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });

      const bank = await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet1.id }),
          bankName: 'BCA',
          accountName: 'A',
          accountNumber: '111',
          isActive: true,
        },
      });

      const found = await repo.findById(outlet1.id, bank.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(bank.id);

      const notFound = await repo.findById(outlet2.id, bank.id);
      expect(notFound).toBeNull();
    });
  });

  describe('findActiveByOutletId', () => {
    it('should return only active bank accounts', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet.id }),
          bankName: 'BCA',
          accountName: 'A',
          accountNumber: '111',
          isActive: true,
        },
      });
      await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet.id }),
          bankName: 'BRI',
          accountName: 'B',
          accountNumber: '222',
          isActive: false,
        },
      });

      const active = await repo.findActiveByOutletId(outlet.id);
      expect(active).toHaveLength(1);
      expect(active[0].isActive).toBe(true);
    });
  });

  describe('create', () => {
    it('should create bank account for outlet', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const created = await repo.create(outlet.id, {
        bankName: 'BCA',
        accountName: 'Rekening Utama',
        accountNumber: '1234567890',
        isActive: true,
      });

      expect(created.outletId).toBe(outlet.id);
      expect(created.bankName).toBe('BCA');
      expect(created.accountNumber).toBe('1234567890');
    });
  });

  describe('update and delete', () => {
    it('should update only when outletId matches', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const bank = await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet.id }),
          bankName: 'BCA',
          accountName: 'A',
          accountNumber: '111',
          isActive: true,
        },
      });

      const updated = await repo.update(outlet.id, bank.id, { accountName: 'Updated Name' });
      expect(updated.accountName).toBe('Updated Name');
    });

    it('should throw when update with wrong outletId', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });
      const bank = await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet1.id }),
          bankName: 'BCA',
          accountName: 'A',
          accountNumber: '111',
          isActive: true,
        },
      });

      await expect(repo.update(outlet2.id, bank.id, { accountName: 'X' })).rejects.toThrow(
        'Bank account not found or access denied'
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle isActive', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const bank = await prisma.bankAccount.create({
        data: {
          ...createBankAccountData({ outletId: outlet.id }),
          bankName: 'BCA',
          accountName: 'A',
          accountNumber: '111',
          isActive: true,
        },
      });

      const toggled = await repo.toggleActive(outlet.id, bank.id);
      expect(toggled.isActive).toBe(false);
    });
  });
});
