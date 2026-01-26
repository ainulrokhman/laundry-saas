/**
 * RBAC tests for Orders dashboard endpoints (OWNER/STAFF).
 *
 * Fokus:
 * - OWNER/STAFF diizinkan
 * - SUPERADMIN/unauthenticated ditolak
 * - Zod strict menolak field tambahan
 * - outletId diambil dari session (tenant-safe)
 */

const authMock = vi.hoisted(() => vi.fn());
const listOrdersMock = vi.hoisted(() =>
  vi.fn(async (_user: any) => ({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  }))
);
const createOrderMock = vi.hoisted(() =>
  vi.fn(async (_user: any) => ({
    id: 'order-1',
    trackingCode: 'ABCD1234',
    status: 'QUEUED',
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
    listOrders = listOrdersMock;
    createOrder = createOrderMock;
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

describe('API RBAC: orders (OWNER/STAFF)', () => {
  beforeEach(() => {
    authMock.mockReset();
    listOrdersMock.mockClear();
    createOrderMock.mockClear();
  });

  it('GET ditolak untuk unauthenticated (401)', async () => {
    const { GET } = await import('@/app/api/dashboard/orders/route');
    authMock.mockResolvedValueOnce(null as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/orders', { method: 'GET' }) as any);
    expect(res.status).toBe(401);
  });

  it('GET ditolak untuk SUPERADMIN tanpa outlet context (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/orders/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: null }) as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/orders', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk STAFF dan memakai outletId dari session', async () => {
    const { GET } = await import('@/app/api/dashboard/orders/route');
    const outletId = randomUUID();
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId }) as any);

    const res = await GET(new Request('http://localhost:3000/api/dashboard/orders?page=1&limit=20', { method: 'GET' }) as any);
    expect(res.status).toBe(200);
    expect(listOrdersMock).toHaveBeenCalledTimes(1);
    const sessionUser = listOrdersMock.mock.calls[0][0];
    expect(sessionUser.outletId).toBe(outletId);
  });

  it('POST menolak field tambahan (strict) (400)', async () => {
    const { POST } = await import('@/app/api/dashboard/orders/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: randomUUID() }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid: false,
        items: [{ serviceId: randomUUID(), quantity: 1 }],
        extraField: 'nope',
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('POST diizinkan untuk OWNER dan memanggil createOrder', async () => {
    const { POST } = await import('@/app/api/dashboard/orders/route');
    const outletId = randomUUID();
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid: false,
        items: [{ serviceId: randomUUID(), quantity: 1, unitPrice: 10000 }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(createOrderMock).toHaveBeenCalledTimes(1);
    const sessionUser = createOrderMock.mock.calls[0][0];
    expect(sessionUser.outletId).toBe(outletId);
  });
});

