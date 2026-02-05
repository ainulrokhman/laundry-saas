/**
 * Transaction Repository Tests
 * Outlet filtering, findByOutletId, getTotalRevenue, countByOutletId
 */

import { TransactionRepository } from '@/repositories/TransactionRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createTransactionData } from '../utils/factories';
import { TransType, PaymentStatus } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('TransactionRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new TransactionRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('outlet filtering', () => {
    it('should only return transactions for specified outlet', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });

      const tx1 = await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 50000,
          status: PaymentStatus.SETTLEMENT,
          outletId: outlet1.id,
        },
      });
      await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 30000,
          status: PaymentStatus.SETTLEMENT,
          outletId: outlet2.id,
        },
      });

      const list = await repo.findByOutletId(outlet1.id);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(tx1.id);
      expect(list[0].outletId).toBe(outlet1.id);
    });

    it('should findById only when outletId matches', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });

      const tx = await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 50000,
          status: PaymentStatus.PENDING,
          outletId: outlet1.id,
        },
      });

      const found = await repo.findById(outlet1.id, tx.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(tx.id);

      const notFound = await repo.findById(outlet2.id, tx.id);
      expect(notFound).toBeNull();
    });
  });

  describe('getTotalRevenue', () => {
    it('should sum amount for outlet and status', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 50000,
          status: PaymentStatus.SETTLEMENT,
          outletId: outlet.id,
        },
      });
      await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 30000,
          status: PaymentStatus.SETTLEMENT,
          outletId: outlet.id,
        },
      });
      await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 10000,
          status: PaymentStatus.PENDING,
          outletId: outlet.id,
        },
      });

      const revenue = await repo.getTotalRevenue(outlet.id, { status: PaymentStatus.SETTLEMENT });
      expect(revenue).toBe(80000);
    });
  });

  describe('countByOutletId', () => {
    it('should count transactions for outlet', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 50000,
          status: PaymentStatus.PENDING,
          outletId: outlet.id,
        },
      });
      await prisma.transaction.create({
        data: {
          type: TransType.LAUNDRY_ORDER,
          amount: 30000,
          status: PaymentStatus.PENDING,
          outletId: outlet.id,
        },
      });

      const count = await repo.countByOutletId(outlet.id);
      expect(count).toBe(2);
    });
  });
});
