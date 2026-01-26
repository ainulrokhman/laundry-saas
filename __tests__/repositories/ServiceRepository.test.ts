/**
 * Service Repository Tests
 * 
 * Tests for ServiceRepository with outlet filtering
 */

import { ServiceRepository } from '@/repositories/ServiceRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('ServiceRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new ServiceRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('outlet filtering', () => {
    it('should only return services for specified outlet', async () => {
      // Create two outlets
      const outlet1 = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const outlet2 = await prisma.outlet.create({
        data: {
          name: 'Outlet 2',
          slug: 'outlet-2',
          address: 'Address 2',
        },
      });

      // Create services for both outlets
      const service1 = await prisma.service.create({
        data: {
          outletId: outlet1.id,
          name: 'Service 1',
          type: 'KILOAN',
          price: 10000,
        },
      });

      await prisma.service.create({
        data: {
          outletId: outlet2.id,
          name: 'Service 2',
          type: 'SATUAN',
          price: 15000,
        },
      });

      // Query services for outlet1
      const services = await repo.findByOutletId(outlet1.id);

      expect(services).toHaveLength(1);
      expect(services[0].id).toBe(service1.id);
      expect(services[0].outletId).toBe(outlet1.id);
    });

    it('should throw error if outletId is missing', async () => {
      await expect(
        repo.findByOutletId('' as any)
      ).rejects.toThrow('Service operations require outletId');
    });

    it('should only find service by ID if outletId matches', async () => {
      const outlet1 = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const outlet2 = await prisma.outlet.create({
        data: {
          name: 'Outlet 2',
          slug: 'outlet-2',
          address: 'Address 2',
        },
      });

      const service1 = await prisma.service.create({
        data: {
          outletId: outlet1.id,
          name: 'Service 1',
          type: 'KILOAN',
          price: 10000,
        },
      });

      // Should find service when outletId matches
      const found = await repo.findById(outlet1.id, service1.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(service1.id);

      // Should not find service when outletId doesn't match
      const notFound = await repo.findById(outlet2.id, service1.id);
      expect(notFound).toBeNull();
    });

    it('should only return active services for outlet', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      await prisma.service.create({
        data: {
          outletId: outlet.id,
          name: 'Active Service',
          type: 'KILOAN',
          price: 10000,
          isActive: true,
        },
      });

      await prisma.service.create({
        data: {
          outletId: outlet.id,
          name: 'Inactive Service',
          type: 'SATUAN',
          price: 15000,
          isActive: false,
        },
      });

      const activeServices = await repo.findActiveByOutletId(outlet.id);

      expect(activeServices).toHaveLength(1);
      expect(activeServices[0].name).toBe('Active Service');
      expect(activeServices[0].isActive).toBe(true);
    });
  });

  describe('CRUD operations', () => {
    it('should create service with outletId', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const service = await repo.create(outlet.id, {
        name: 'New Service',
        type: 'KILOAN',
        price: 10000,
        unit: 'kg',
      });

      expect(service).toBeTruthy();
      expect(service.outletId).toBe(outlet.id);
      expect(service.name).toBe('New Service');
    });

    it('should update service only if outletId matches', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const service = await prisma.service.create({
        data: {
          outletId: outlet.id,
          name: 'Original Name',
          type: 'KILOAN',
          price: 10000,
        },
      });

      const updated = await repo.update(outlet.id, service.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should delete service only if outletId matches', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const service = await prisma.service.create({
        data: {
          outletId: outlet.id,
          name: 'Service to Delete',
          type: 'KILOAN',
          price: 10000,
        },
      });

      await repo.delete(outlet.id, service.id);

      const deleted = await prisma.service.findUnique({
        where: { id: service.id },
      });

      expect(deleted).toBeNull();
    });
  });
});
