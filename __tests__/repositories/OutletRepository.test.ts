/**
 * Outlet Repository Tests
 * 
 * Tests for OutletRepository CRUD operations.
 * Note: Outlets don't require outletId filtering (they are the tenant root).
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { OutletRepository } from '@/repositories/OutletRepository';
import { createTestPrismaClient, cleanupTestDatabase } from '../utils/test-db';
import { createOutletData } from '../utils/factories';

describe('OutletRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new OutletRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('CRUD operations', () => {
    it('should create new outlet', async () => {
      const outletData = createOutletData({
        name: 'Test Outlet',
        slug: 'test-outlet',
        address: 'Test Address',
      });

      const outlet = await repo.create(outletData);

      expect(outlet).toBeTruthy();
      expect(outlet.name).toBe('Test Outlet');
      expect(outlet.slug).toBe('test-outlet');
      expect(outlet.address).toBe('Test Address');
      expect(outlet.isPro).toBe(false);
    });

    it('should find outlet by ID', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData(),
      });

      const found = await repo.findById(outlet.id);

      expect(found).toBeTruthy();
      expect(found?.id).toBe(outlet.id);
      expect(found?.name).toBe(outlet.name);
    });

    it('should find outlet by slug', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'unique-slug' }),
      });

      const found = await repo.findBySlug('unique-slug');

      expect(found).toBeTruthy();
      expect(found?.id).toBe(outlet.id);
      expect(found?.slug).toBe('unique-slug');
    });

    it('should return null if outlet not found by ID', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should return null if outlet not found by slug', async () => {
      const found = await repo.findBySlug('non-existent-slug');
      expect(found).toBeNull();
    });

    it('should find all outlets', async () => {
      const outlet1 = await prisma.outlet.create({
        data: createOutletData({ slug: 'outlet-1' }),
      });
      const outlet2 = await prisma.outlet.create({
        data: createOutletData({ slug: 'outlet-2' }),
      });

      const outlets = await repo.findAll();

      expect(outlets.length).toBeGreaterThanOrEqual(2);
      expect(outlets.some((o) => o.id === outlet1.id)).toBe(true);
      expect(outlets.some((o) => o.id === outlet2.id)).toBe(true);
    });

    it('should update outlet', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData(),
      });

      const updated = await repo.update(outlet.id, {
        name: 'Updated Name',
        address: 'Updated Address',
        isPro: true,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.address).toBe('Updated Address');
      expect(updated.isPro).toBe(true);
    });

    it('should delete outlet', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData(),
      });

      await repo.delete(outlet.id);

      const deleted = await prisma.outlet.findUnique({
        where: { id: outlet.id },
      });

      expect(deleted).toBeNull();
    });

    it('should check if slug exists', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'existing-slug' }),
      });

      const exists = await repo.slugExists('existing-slug');
      expect(exists).toBe(true);

      const notExists = await repo.slugExists('non-existing-slug');
      expect(notExists).toBe(false);
    });

    it('should check slug exists excluding specific ID', async () => {
      const outlet1 = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-slug' }),
      });
      const outlet2 = await prisma.outlet.create({
        data: createOutletData({ slug: 'another-slug' }),
      });

      // Should return false when excluding the outlet with that slug
      const exists = await repo.slugExists('test-slug', outlet1.id);
      expect(exists).toBe(false);

      // Should return true when checking another outlet's slug
      const existsOther = await repo.slugExists('another-slug', outlet1.id);
      expect(existsOther).toBe(true);
    });

    it('should include related data when finding by ID', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData(),
      });

      const user = await prisma.user.create({
        data: {
          phone: '6281234567890',
          name: 'Test User',
          pin: '$2a$10$dummy',
          role: 'OWNER',
          outletId: outlet.id,
        },
      });

      const found = await repo.findById(outlet.id);

      expect(found).toBeTruthy();
      expect(found?.users).toBeDefined();
      expect(found?.users?.some((u) => u.id === user.id)).toBe(true);
    });
  });
});
