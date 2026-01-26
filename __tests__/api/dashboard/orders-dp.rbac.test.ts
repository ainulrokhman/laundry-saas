/**
 * RBAC tests for Orders DP endpoint (OWNER/STAFF).
 *
 * Fokus:
 * - OWNER/STAFF diizinkan
 * - SUPERADMIN/unauthenticated ditolak
 * - Zod strict menolak field tambahan
 * - outletId diambil dari session (tenant-safe)
 */

const authMock = vi.hoisted(() => vi.fn());
const setDownPaymentMock = vi.hoisted(() => vi.fn(async () => ({})));
const findByIdForInvoiceMock = vi.hoisted(() =>
  vi.fn(async (_outletId: string, _id: string) => ({
    id: 'order-1',
    trackingCode: 'ABCD1234',
    status: 'QUEUED',
    paymentStatus: 'PENDING',
    paymentMethod: null,
    paidAt: null,
    paymentNote: null,
    totalAmount: 50000,
    dpAmount: 20000,
    dpPaidAt: new Date('2026-01-01T00:00:00.000Z'),
    dpNote: 'DP tunai',
    outletId: 'outlet-1',
    customerName: 'Budi',
    customerPhone: '6281234567890',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null,
    outlet: {
      id: 'outlet-1',
      name: 'Laundry Kita',
      slug: 'laundry-kita',
      address: 'Jalan Mawar No. 1',
      contactPhone: '6281111111111',
    },
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        serviceId: null,
        serviceName: 'Cuci Kiloan',
        serviceType: 'KILOAN',
        serviceUnit: 'kg',
        quantity: 2,
        unitPrice: 25000,
        subtotal: 50000,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
  }))
);

const invoiceToResponseMock = vi.hoisted(() => vi.fn(() => ({ ok: true })));

vi.mock('@/lib/auth', () => {
  return {
    auth: authMock,
    ExtendedSession: {},
  };
});

vi.mock('@/services/OrderService', () => {
  class OrderService {
    setDownPayment = setDownPaymentMock;
  }
  return { OrderService };
});

vi.mock('@/repositories/OrderRepository', () => {
  class OrderRepository {
    findByIdForInvoice = findByIdForInvoiceMock;
  }
  return { OrderRepository };
});

vi.mock('@/dto/InvoiceDTO', () => {
  return {
    InvoiceDTO: {
      toResponse: invoiceToResponseMock,
    },
  };
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

describe('API RBAC: orders DP (OWNER/STAFF)', () => {
  beforeEach(() => {
    authMock.mockReset();
    setDownPaymentMock.mockClear();
    findByIdForInvoiceMock.mockClear();
    invoiceToResponseMock.mockClear();
  });

  it('PATCH ditolak untuk unauthenticated (401)', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/dp/route');
    authMock.mockResolvedValueOnce(null as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders/1/dp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dpAmount: 10000 }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id: randomUUID() }) } as any);
    expect(res.status).toBe(401);
  });

  it('PATCH ditolak untuk SUPERADMIN (403)', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/dp/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: randomUUID() }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders/1/dp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dpAmount: 10000 }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id: randomUUID() }) } as any);
    expect(res.status).toBe(403);
  });

  it('PATCH menolak field tambahan (strict) (400)', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/dp/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/orders/1/dp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dpAmount: 10000, extraField: 'nope' }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id: randomUUID() }) } as any);
    expect(res.status).toBe(400);
  });

  it('PATCH diizinkan untuk STAFF dan memakai outletId dari session', async () => {
    const { PATCH } = await import('@/app/api/dashboard/orders/[id]/dp/route');
    const outletId = randomUUID();
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId }) as any);

    const id = randomUUID();
    const req = new Request('http://localhost:3000/api/dashboard/orders/1/dp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dpAmount: 10000, dpNote: 'DP tunai' }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBe(200);
    expect(setDownPaymentMock).toHaveBeenCalledTimes(1);
    const sessionUser = setDownPaymentMock.mock.calls[0][0];
    expect(sessionUser.outletId).toBe(outletId);
    expect(setDownPaymentMock.mock.calls[0][1]).toBe(id);
    expect(setDownPaymentMock.mock.calls[0][2]).toMatchObject({ dpAmount: 10000 });

    expect(findByIdForInvoiceMock).toHaveBeenCalledTimes(1);
    expect(findByIdForInvoiceMock.mock.calls[0][0]).toBe(outletId);
    expect(findByIdForInvoiceMock.mock.calls[0][1]).toBe(id);
    expect(invoiceToResponseMock).toHaveBeenCalledTimes(1);
  });
});

