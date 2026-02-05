/**
 * Customer Repository Tests
 * Outlet filtering, findAll, findById, create, update, delete
 */

import { CustomerRepository } from '@/repositories/CustomerRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createCustomerData } from '../utils/factories';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('CustomerRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new CustomerRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('outlet filtering', () => {
    it('should only return customers for specified outlet', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });

      await prisma.customer.create({
        data: createCustomerData({ outletId: outlet1.id, name: 'Customer A', phone: '6281111111111' }),
      });
      await prisma.customer.create({
        data: createCustomerData({ outletId: outlet2.id, name: 'Customer B', phone: '6282222222222' }),
      });

      const { customers } = await repo.findAll({ outletId: outlet1.id });
      expect(customers).toHaveLength(1);
      expect(customers[0].name).toBe('Customer A');
      expect(customers[0].outletId).toBe(outlet1.id);
    });

    it('should findById only when outletId matches', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });

      const cust = await prisma.customer.create({
        data: createCustomerData({ outletId: outlet1.id, name: 'Customer A', phone: '6281111111111' }),
      });

      const found = await repo.findById(outlet1.id, cust.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(cust.id);

      const notFound = await repo.findById(outlet2.id, cust.id);
      expect(notFound).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should paginate and search', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      await prisma.customer.create({
        data: createCustomerData({ outletId: outlet.id, name: 'Alpha', phone: '6281111111111' }),
      });
      await prisma.customer.create({
        data: createCustomerData({ outletId: outlet.id, name: 'Beta', phone: '6282222222222' }),
      });
      await prisma.customer.create({
        data: createCustomerData({ outletId: outlet.id, name: 'Gamma', phone: '6283333333333' }),
      });

      const page1 = await repo.findAll({ outletId: outlet.id, page: 1, limit: 2 });
      expect(page1.customers).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      const search = await repo.findAll({ outletId: outlet.id, search: 'Beta' });
      expect(search.customers).toHaveLength(1);
      expect(search.customers[0].name).toBe('Beta');
    });
  });

  describe('create and update', () => {
    it('should create and update customer', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const created = await repo.create({
        outletId: outlet.id,
        name: 'Budi',
        phone: '6281234567890',
        email: 'budi@test.com',
      });
      expect(created.name).toBe('Budi');
      expect(created.outletId).toBe(outlet.id);

      await repo.update(outlet.id, created.id, { name: 'Budi Updated' });
      const updated = await repo.findById(outlet.id, created.id);
      expect(updated?.name).toBe('Budi Updated');
    });
  });

  describe('verifyOwnership', () => {
    it('should return true when customer belongs to outlet', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const cust = await prisma.customer.create({
        data: createCustomerData({ outletId: outlet.id, name: 'A', phone: '6281111111111' }),
      });
      const ok = await repo.verifyOwnership(outlet.id, cust.id);
      expect(ok).toBe(true);
    });

    it('should return false when customer belongs to other outlet', async () => {
      const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-2' }) });
      const cust = await prisma.customer.create({
        data: createCustomerData({ outletId: outlet1.id, name: 'A', phone: '6281111111111' }),
      });
      const ok = await repo.verifyOwnership(outlet2.id, cust.id);
      expect(ok).toBe(false);
    });
  });
});
