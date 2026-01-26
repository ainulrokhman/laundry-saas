/**
 * RBAC tests for POS services endpoint (OWNER/STAFF).
 */

const authMock = vi.hoisted(() => vi.fn());
const findActiveByOutletIdMock = vi.hoisted(() =>
  vi.fn(async (_outletId: string) => [
    {
      id: 'svc-1',
      outletId: _outletId,
      name: 'Cuci Kiloan',
      type: 'KILOAN',
      price: 10000,
      unit: 'kg',
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ])
);

vi.mock('@/lib/auth', () => {
  return {
    auth: authMock,
    ExtendedSession: {},
  };
});

vi.mock('@/repositories/ServiceRepository', () => {
  class ServiceRepository {
    findActiveByOutletId = findActiveByOutletIdMock;
  }
  return { ServiceRepository };
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

describe('API RBAC: POS services (OWNER/STAFF)', () => {
  beforeEach(() => {
    authMock.mockReset();
    findActiveByOutletIdMock.mockClear();
  });

  it('GET ditolak untuk unauthenticated (401)', async () => {
    const { GET } = await import('@/app/api/dashboard/pos/services/route');
    authMock.mockResolvedValueOnce(null as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/pos/services', { method: 'GET' }) as any);
    expect(res.status).toBe(401);
  });

  it('GET ditolak untuk SUPERADMIN tanpa outletId (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/pos/services/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: null }) as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/pos/services', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk STAFF dan memanggil repo dengan outletId session (200)', async () => {
    const { GET } = await import('@/app/api/dashboard/pos/services/route');
    const outletId = randomUUID();
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId }) as any);

    const res = await GET(new Request('http://localhost:3000/api/dashboard/pos/services', { method: 'GET' }) as any);
    expect(res.status).toBe(200);
    expect(findActiveByOutletIdMock).toHaveBeenCalledWith(outletId);
  });
});

