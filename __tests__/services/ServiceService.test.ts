/**
 * Service Service Tests
 * 
 * Tests for ServiceService business logic with multi-tenancy
 */

import { ServiceService } from '@/services/ServiceService';
import { ServiceRepository } from '@/repositories/ServiceRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { SessionUser } from '@/lib/session';
import { Role } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('ServiceService', () => {
  const prisma = createTestPrismaClient();
  const serviceRepo = new ServiceRepository();
  const serviceService = new ServiceService(serviceRepo);

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  const createMockUser = (role: Role, outletId: string | null): SessionUser => ({
    userId: 'user-1',
    outletId,
    role,
    phone: '6281234567890',
  });

  describe('getServices (multi-tenancy critical)', () => {
    it('should return services only for user outlet (data isolation)', async () => {
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
          name: 'Service 1',
          type: 'KILOAN',
          price: 10000,
        },
      });

      const user = createMockUser(Role.OWNER, outlet.id);
      const services = await serviceService.getServices(user);

      expect(services).toHaveLength(1);
      expect(services[0].outletId).toBe(outlet.id);
    });

    it('should throw error if user has no outletId (security)', async () => {
      const user = createMockUser(Role.OWNER, null);

      await expect(
        serviceService.getServices(user)
      ).rejects.toThrow('ServiceService requires outletId for multi-tenancy isolation');
    });
  });

  describe('createService (authorization)', () => {
    it('should create service for Owner with correct outletId', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const user = createMockUser(Role.OWNER, outlet.id);
      const service = await serviceService.createService(user, {
        name: 'New Service',
        type: 'KILOAN',
        price: 10000,
      });

      expect(service.outletId).toBe(outlet.id);
    });

    it('should reject Staff from creating service (authorization)', async () => {
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Outlet 1',
          slug: 'outlet-1',
          address: 'Address 1',
        },
      });

      const user = createMockUser(Role.STAFF, outlet.id);

      await expect(
        serviceService.createService(user, {
          name: 'New Service',
          type: 'KILOAN',
          price: 10000,
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should reject SuperAdmin without outletId (tenant isolation)', async () => {
      const user = createMockUser(Role.SUPERADMIN, null);

      await expect(
        serviceService.createService(user, {
          name: 'New Service',
          type: 'KILOAN',
          price: 10000,
        })
      ).rejects.toThrow('ServiceService requires outletId for multi-tenancy isolation');
    });
  });

  // Removed redundant update/delete tests - multi-tenancy isolation is tested in repository layer

  describe('multi-tenancy isolation', () => {
    it('should only return services from user outlet', async () => {
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

      await prisma.service.create({
        data: {
          outletId: outlet1.id,
          name: 'Service Outlet 1',
          type: 'KILOAN',
          price: 10000,
        },
      });

      await prisma.service.create({
        data: {
          outletId: outlet2.id,
          name: 'Service Outlet 2',
          type: 'KILOAN',
          price: 10000,
        },
      });

      const user = createMockUser(Role.OWNER, outlet1.id);
      const services = await serviceService.getServices(user);

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Service Outlet 1');
    });
  });
});
