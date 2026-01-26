/**
 * RBAC tests for Bank Accounts dashboard endpoints (OWNER-only).
 *
 * Sesuai docs/roles/STAFF.md:
 * - STAFF tidak boleh mengelola pengaturan sensitif outlet (bank accounts).
 */

const authMock = vi.hoisted(() => vi.fn());
const findByOutletIdMock = vi.hoisted(() => vi.fn(async () => []));
const createMock = vi.hoisted(
  () =>
    vi.fn(async (_outletId: string) => ({
      id: 'bank-1',
      outletId: _outletId,
      bankName: 'BCA',
      accountName: 'Test',
      accountNumber: '123456',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
);

vi.mock('@/lib/auth', () => {
  return {
    auth: authMock,
    ExtendedSession: {},
  };
});

vi.mock('@/repositories/BankAccountRepository', () => {
  class BankAccountRepository {
    findByOutletId = findByOutletIdMock;
    create = createMock;
  }
  return { BankAccountRepository };
});

import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { cleanupTestDatabase, isDatabaseAvailable } from '../../../utils/test-db';
import { createUserData } from '../../../utils/factories';
import { randomUUID } from '../../../utils/test-helpers';

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

function uniqueSlug(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

describeDb('API RBAC: bank accounts (OWNER-only)', () => {
  beforeEach(async () => {
    authMock.mockReset();
    findByOutletIdMock.mockClear();
    createMock.mockClear();
    await cleanupTestDatabase(prisma as any);
  });

  it('GET ditolak untuk STAFF (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/bank-accounts/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: 'staff-1', role: Role.STAFF, outletId: 'outlet-1' }) as any);

    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/bank-accounts', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk OWNER jika outlet aktif miliknya (200)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/bank-accounts/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });
    const outlet = await prisma.outlet.create({
      data: { name: 'Outlet', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet.id }) as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/bank-accounts', { method: 'GET' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(findByOutletIdMock).toHaveBeenCalledWith(outlet.id);
  });

  it('POST ditolak untuk STAFF (403)', async () => {
    const { POST } = await import('@/app/api/dashboard/settings/bank-accounts/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: 'staff-1', role: Role.STAFF, outletId: 'outlet-1' }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/settings/bank-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName: 'BCA',
        accountName: 'Test',
        accountNumber: '123456',
        isActive: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('POST diizinkan untuk OWNER jika outlet aktif miliknya (201)', async () => {
    const { POST } = await import('@/app/api/dashboard/settings/bank-accounts/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });
    const outlet = await prisma.outlet.create({
      data: { name: 'Outlet', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet.id }) as any);

    const req = new Request('http://localhost:3000/api/dashboard/settings/bank-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName: 'BCA',
        accountName: 'Test',
        accountNumber: '123456',
        isActive: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(createMock).toHaveBeenCalled();
  });

  it('OWNER ditolak jika outlet aktif bukan miliknya (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/bank-accounts/route');

    const realOwnerId = randomUUID();
    await prisma.user.create({
      data: {
        id: realOwnerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });
    const outlet = await prisma.outlet.create({
      data: { name: 'Outlet', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId: realOwnerId },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: outlet.id }) as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/bank-accounts', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Access denied');
  });
});

