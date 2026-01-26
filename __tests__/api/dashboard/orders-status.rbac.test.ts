/**
 * RBAC tests for Orders status endpoint (OWNER/STAFF).
 *
 * Fokus:
 * - OWNER/STAFF diizinkan
 * - SUPERADMIN/unauthenticated ditolak
 * - Zod strict menolak field tambahan
 * - outletId diambil dari session (tenant-safe)
 */

const authMock = vi.hoisted(() => vi.fn());
const setOrderStatusMock = vi.hoisted(() =>
  vi.fn(async (_user: any) => ({
    id: 'order-1',
    trackingCode: 'ABCD1234',
    status: 'READY',
    paymentStatus: 'UNPAID',
    paymentMethod: null,
    paidAt: null,
    paymentNote: null,
    totalAmount: 0,
    outletId: 'outlet-1',
    customerName: null,
    customerPhone: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null,
  }))
);

vi.mock('@/lib/auth', () => {
  return {
    auth: authMock,
    ExtendedSession: {},
  };
});

vi.mock('@/services/OrderService', () => {
  class OrderService {
    setOrderStatus = setOrderStatusMock;
  }
  return { OrderService };
});

import { Role } from '@/generated/prisma';
import { randomUUID } from '../../utils/test-helpers';

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

describe('API RBAC: orders status (OWNER/STAFF)', () => {
  beforeEach(() => {
    authMock.mockReset();
    setOrderStatusMock.mockClear();
  });

  it('PATCH ditolak untuk unauthenticated (401)', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/status/route');
    authMock.mockResolvedValueOnce(null as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders/1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id: randomUUID() }) } as any);
    expect(res.status).toBe(401);
  });

  it('PATCH ditolak untuk SUPERADMIN (403)', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/status/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: randomUUID() }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders/1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id: randomUUID() }) } as any);
    expect(res.status).toBe(403);
  });

  it('PATCH menolak field tambahan (strict) (400)', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/status/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders/1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY', extraField: 'nope' }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id: randomUUID() }) } as any);
    expect(res.status).toBe(400);
  });

  it('PATCH diizinkan untuk STAFF dan memakai outletId dari session', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/status/route');
    const outletId = randomUUID();
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId }) as any);

    const id = randomUUID();
    const req = new Request('http://localhost:3000/api/dashboard/orders/1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBe(200);
    expect(setOrderStatusMock).toHaveBeenCalledTimes(1);
    const sessionUser = setOrderStatusMock.mock.calls[0][0];
    expect(sessionUser.outletId).toBe(outletId);
    expect(setOrderStatusMock.mock.calls[0][1]).toBe(id);
    expect(setOrderStatusMock.mock.calls[0][2]).toBe('READY');
  });
});

