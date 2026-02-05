/**
 * Input validation security tests
 * Zod boundary, invalid enum, injection-like patterns
 */

import { vi } from 'vitest';
import { Role } from '@/generated/prisma';
import { randomUUID } from '../utils/test-helpers';

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  ExtendedSession: {},
}));

const createOrderMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'order-1',
    trackingCode: 'ABC',
    status: 'QUEUED',
    paymentStatus: 'UNPAID',
    totalAmount: 0,
    outletId: 'outlet-1',
  }))
);

vi.mock('@/services/OrderService', () => ({
  OrderService: vi.fn().mockImplementation(() => ({
    createOrder: createOrderMock,
  })),
}));

function makeSession(params: { userId: string; role: Role; outletId: string }) {
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

describe('Input validation (API)', () => {
  beforeEach(() => {
    authMock.mockReset();
    createOrderMock.mockClear();
    authMock.mockResolvedValue(
      makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: randomUUID() }) as any
    );
  });

  it('POST /api/dashboard/orders rejects invalid payment status enum (400)', async () => {
    const { POST } = await import('@/app/api/dashboard/orders/route');
    const res = await POST(
      new Request('http://localhost:3000/api/dashboard/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid: false,
          items: [{ serviceId: randomUUID(), quantity: 1, unitPrice: 10000 }],
          paymentStatus: 'INVALID_STATUS',
        }),
      }) as any
    );
    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('POST /api/dashboard/orders rejects negative quantity (400)', async () => {
    const { POST } = await import('@/app/api/dashboard/orders/route');
    const res = await POST(
      new Request('http://localhost:3000/api/dashboard/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid: false,
          items: [{ serviceId: randomUUID(), quantity: -1, unitPrice: 10000 }],
        }),
      }) as any
    );
    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('POST /api/dashboard/orders rejects non-UUID serviceId (400)', async () => {
    const { POST } = await import('@/app/api/dashboard/orders/route');
    const res = await POST(
      new Request('http://localhost:3000/api/dashboard/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid: false,
          items: [{ serviceId: 'not-a-uuid', quantity: 1, unitPrice: 10000 }],
        }),
      }) as any
    );
    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });
});
