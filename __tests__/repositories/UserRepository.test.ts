/**
 * User Repository Tests
 * findAll (filters, pagination), findById, findByPhone, create, update, resetPin, countActiveSuperAdmins
 */

import { UserRepository } from '@/repositories/UserRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createUserData } from '../utils/factories';
import { Role } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('UserRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new UserRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('findAll', () => {
    it('should filter by role and outletId', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      await prisma.user.create({
        data: {
          ...createUserData({ role: Role.OWNER, outletId: outlet.id }),
          phone: '6281111111111',
          name: 'Owner A',
        },
      });
      await prisma.user.create({
        data: {
          ...createUserData({ role: Role.STAFF, outletId: outlet.id }),
          phone: '6282222222222',
          name: 'Staff B',
        },
      });

      const owners = await repo.findAll({ role: Role.OWNER, outletId: outlet.id });
      expect(owners.data).toHaveLength(1);
      expect(owners.data[0].role).toBe(Role.OWNER);

      const all = await repo.findAll({ outletId: outlet.id });
      expect(all.data).toHaveLength(2);
    });

    it('should paginate', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      for (let i = 0; i < 5; i++) {
        await prisma.user.create({
          data: {
            ...createUserData({ outletId: outlet.id }),
            phone: `628111111111${i}`,
            name: `User ${i}`,
          },
        });
      }

      const page1 = await repo.findAll({ outletId: outlet.id }, { page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(2);
    });
  });

  describe('findById and findByPhone', () => {
    it('should find user by id and by phone', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const user = await prisma.user.create({
        data: {
          ...createUserData({ outletId: outlet.id }),
          phone: '6281234567890',
          name: 'Test User',
        },
      });

      const byId = await repo.findById(user.id);
      expect(byId).toBeTruthy();
      expect(byId?.phone).toBe('6281234567890');

      const byPhone = await repo.findByPhone('6281234567890');
      expect(byPhone).toBeTruthy();
      expect(byPhone?.id).toBe(user.id);
    });
  });

  describe('create', () => {
    it('should create user with pin hash', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const created = await repo.create({
        phone: '6289999999999',
        name: 'New User',
        role: Role.STAFF,
        outletId: outlet.id,
        pinHash: '$2a$10$dummy.hash',
      });

      expect(created.phone).toBe('6289999999999');
      expect(created.role).toBe(Role.STAFF);
      expect(created.outletId).toBe(outlet.id);
      expect(created.isPinSet).toBe(true);
    });
  });

  describe('update and setActive', () => {
    it('should update user and setActive', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const user = await prisma.user.create({
        data: {
          ...createUserData({ outletId: outlet.id }),
          phone: '6281111111111',
          name: 'Original',
        },
      });

      await repo.update(user.id, { name: 'Updated Name' });
      const found = await repo.findById(user.id);
      expect(found?.name).toBe('Updated Name');

      await repo.setActive(user.id, false);
      const after = await repo.findById(user.id);
      expect(after?.isActive).toBe(false);
    });
  });

  describe('resetPin', () => {
    it('should update pin and reset lockout', async () => {
      const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-1' }) });
      const user = await prisma.user.create({
        data: {
          ...createUserData({ outletId: outlet.id }),
          phone: '6281111111111',
          name: 'User',
        },
      });

      const updated = await repo.resetPin(user.id, '$2a$10$new.hash');
      expect(updated.pin).toBe('$2a$10$new.hash');
      expect(updated.isPinSet).toBe(true);
    });
  });

  describe('countActiveSuperAdmins', () => {
    it('should count active SUPERADMIN users', async () => {
      await prisma.user.create({
        data: {
          ...createUserData({ role: Role.SUPERADMIN, outletId: null }),
          phone: '6281111111111',
          name: 'Admin 1',
        },
      });
      await prisma.user.create({
        data: {
          ...createUserData({ role: Role.SUPERADMIN, outletId: null }),
          phone: '6282222222222',
          name: 'Admin 2',
          isActive: false,
        },
      });

      const count = await repo.countActiveSuperAdmins();
      expect(count).toBe(1);
    });

    it('should exclude user when excludeUserId provided', async () => {
      const admin = await prisma.user.create({
        data: {
          ...createUserData({ role: Role.SUPERADMIN, outletId: null }),
          phone: '6281111111111',
          name: 'Admin 1',
        },
      });

      const count = await repo.countActiveSuperAdmins(admin.id);
      expect(count).toBe(0);
    });
  });
});
