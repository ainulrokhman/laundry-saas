/**
 * RBAC tests for Admin Users API (SUPERADMIN only)
 */

import { vi } from 'vitest';
import { Role } from '@/generated/prisma';
import { randomUUID } from '../../utils/test-helpers';

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  ExtendedSession: {},
}));

const findAllMock = vi.hoisted(() =>
  vi.fn(async () => ({ data: [], total: 0, page: 1, limit: 50 }))
);

vi.mock('@/repositories/UserRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findAll: findAllMock,
    findById: vi.fn(),
    findByPhone: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  })),
}));

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

describe('API RBAC: admin users (SUPERADMIN only)', () => {
  beforeEach(() => {
    authMock.mockReset();
    findAllMock.mockClear();
  });

  it('GET ditolak untuk unauthenticated (401)', async () => {
    authMock.mockResolvedValueOnce(null as any);
    const { GET } = await import('@/app/api/admin/users/route');
    const res = await GET(new Request('http://localhost:3000/api/admin/users', { method: 'GET' }) as any);
    expect(res.status).toBe(401);
  });

  it('GET ditolak untuk OWNER (403)', async () => {
    authMock.mockResolvedValueOnce(
      makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: randomUUID() }) as any
    );
    const { GET } = await import('@/app/api/admin/users/route');
    const res = await GET(new Request('http://localhost:3000/api/admin/users', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk SUPERADMIN (200)', async () => {
    authMock.mockResolvedValueOnce(
      makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: null }) as any
    );
    const { GET } = await import('@/app/api/admin/users/route');
    const res = await GET(new Request('http://localhost:3000/api/admin/users', { method: 'GET' }) as any);
    expect(res.status).toBe(200);
    expect(findAllMock).toHaveBeenCalled();
  });
});
