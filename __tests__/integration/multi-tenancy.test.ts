/**
 * Multi-tenancy isolation integration tests
 * User outlet A cannot access resources (orders, services, etc.) of outlet B
 */

import { vi } from 'vitest';
import { Role } from '@/generated/prisma';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createUserData, createOrderData, createServiceData } from '../utils/factories';

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  ExtendedSession: {},
}));

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

function makeSession(params: { userId: string; role: Role; outletId: string | null }) {
  return {
    user: {
      userId: params.userId,
      role: params.role,
      outletId: params.outletId,
      phone: '6281234567890',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

describeDb('Multi-tenancy isolation', () => {
  const prisma = createTestPrismaClient();

  beforeEach(async () => {
    authMock.mockReset();
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it('user outlet A cannot get order belonging to outlet B (404)', async () => {
    const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-a' }) });
    const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-b' }) });
    const user1 = await prisma.user.create({
      data: {
        ...createUserData({ role: Role.OWNER, outletId: outlet1.id }),
        phone: '6281111111111',
        name: 'Owner A',
      },
    });
    const orderB = await prisma.order.create({
      data: createOrderData({ outletId: outlet2.id }),
    });

    authMock.mockResolvedValue(makeSession({ userId: user1.id, role: Role.OWNER, outletId: outlet1.id }) as any);

    const { GET } = await import('@/app/api/dashboard/orders/[id]/route');
    const req = new Request(`http://localhost:3000/api/dashboard/orders/${orderB.id}`, { method: 'GET' });
    const res = await GET(req as any, { params: Promise.resolve({ id: orderB.id }) } as any);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Order not found');
  });

  it('user outlet A cannot get service belonging to outlet B (404)', async () => {
    const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-a' }) });
    const outlet2 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-b' }) });
    const user1 = await prisma.user.create({
      data: {
        ...createUserData({ role: Role.OWNER, outletId: outlet1.id }),
        phone: '6281111111111',
        name: 'Owner A',
      },
    });
    const serviceB = await prisma.service.create({
      data: createServiceData({ outletId: outlet2.id, name: 'Service B' }),
    });

    authMock.mockResolvedValue(makeSession({ userId: user1.id, role: Role.OWNER, outletId: outlet1.id }) as any);

    const { GET } = await import('@/app/api/dashboard/services/[id]/route');
    const req = new Request(`http://localhost:3000/api/dashboard/services/${serviceB.id}`, { method: 'GET' });
    const res = await GET(req as any, { params: Promise.resolve({ id: serviceB.id }) } as any);

    expect(res.status).toBe(404);
  });

  it('user outlet A can get own outlet order (200)', async () => {
    const outlet1 = await prisma.outlet.create({ data: createOutletData({ slug: 'outlet-a' }) });
    const user1 = await prisma.user.create({
      data: {
        ...createUserData({ role: Role.OWNER, outletId: outlet1.id }),
        phone: '6281111111111',
        name: 'Owner A',
      },
    });
    const orderA = await prisma.order.create({
      data: createOrderData({ outletId: outlet1.id }),
    });

    authMock.mockResolvedValue(makeSession({ userId: user1.id, role: Role.OWNER, outletId: outlet1.id }) as any);

    const { GET } = await import('@/app/api/dashboard/orders/[id]/route');
    const req = new Request(`http://localhost:3000/api/dashboard/orders/${orderA.id}`, { method: 'GET' });
    const res = await GET(req as any, { params: Promise.resolve({ id: orderA.id }) } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(orderA.id);
  });
});
