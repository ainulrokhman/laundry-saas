/**
 * RBAC tests for route proxy guards.
 *
 * Tujuan: memastikan aturan akses sesuai dokumen role (OWNER/STAFF/SUPERADMIN).
 * - SUPERADMIN: hanya admin panel (withAdminAuth), tidak boleh outlet dashboard
 * - OWNER: boleh akses resource tenant, tapi outlet aktif harus milik sendiri (withOwnerAuth)
 * - STAFF: boleh akses dashboard stats/recent-orders, tapi tidak boleh fitur OWNER-only
 */

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => {
  return {
    auth: authMock,
    // Route proxy mengimpor ExtendedSession sebagai named export; sediakan placeholder agar import tidak gagal.
    ExtendedSession: {},
  };
});

import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, withAuth, withOwnerAuth } from '@/lib/proxy/route-proxy';
import { cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createUserData } from '../utils/factories';
import { randomUUID } from '../utils/test-helpers';

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

function makeRequest() {
  return new Request('http://localhost:3000/api/test', { method: 'GET' });
}

function uniqueSlug(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

describeDb('Route Proxy RBAC (sesuai docs/roles)', () => {
  beforeEach(async () => {
    authMock.mockReset();
    await cleanupTestDatabase(prisma as any);
  });

  it('withAdminAuth: SUPERADMIN boleh, OWNER/STAFF ditolak', async () => {
    const handler = withAdminAuth(async () => Response.json({ ok: true }));

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: null }) as any);
    const resOk = await handler(makeRequest());
    expect(resOk.status).toBe(200);

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: randomUUID() }) as any);
    const resOwner = await handler(makeRequest());
    expect(resOwner.status).toBe(403);
    await expect(resOwner.json()).resolves.toMatchObject({ error: 'Insufficient permissions' });

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any);
    const resStaff = await handler(makeRequest());
    expect(resStaff.status).toBe(403);
    await expect(resStaff.json()).resolves.toMatchObject({ error: 'Insufficient permissions' });
  });

  it('withAuth (dashboard): OWNER/STAFF dengan outletId boleh, SUPERADMIN ditolak', async () => {
    const dashboardGuard = withAuth(async () => Response.json({ ok: true }), {
      roles: [Role.OWNER, Role.STAFF],
      requireOutlet: true,
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: randomUUID() }) as any);
    const ownerRes = await dashboardGuard(makeRequest());
    expect(ownerRes.status).toBe(200);

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any);
    const staffRes = await dashboardGuard(makeRequest());
    expect(staffRes.status).toBe(200);

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.SUPERADMIN, outletId: null }) as any);
    const saRes = await dashboardGuard(makeRequest());
    expect(saRes.status).toBe(403);
    const saBody = await saRes.json();
    expect(String(saBody.error)).toContain('SuperAdmin');
  });

  it('withAuth: OWNER/STAFF tanpa outletId ditolak (tenant isolation)', async () => {
    const guard = withAuth(async () => Response.json({ ok: true }), {
      roles: [Role.OWNER, Role.STAFF],
      requireOutlet: true,
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: null }) as any);
    const res = await guard(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Outlet context required');
  });

  it('withOwnerAuth: STAFF ditolak', async () => {
    const handler = withOwnerAuth(async () => Response.json({ ok: true }));
    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any);
    const res = await handler(makeRequest());
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'Insufficient permissions' });
  });

  it('withOwnerAuth: OWNER ditolak jika outlet aktif bukan miliknya', async () => {
    const handler = withOwnerAuth(async () => Response.json({ ok: true }));

    const realOwnerId = randomUUID();
    await prisma.user.create({
      data: {
        id: realOwnerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });

    const outlet = await prisma.outlet.create({
      data: {
        name: 'Outlet',
        slug: uniqueSlug('outlet'),
        address: 'Alamat',
        ownerId: realOwnerId,
      },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: outlet.id }) as any);
    const res = await handler(makeRequest());
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'Access denied' });
  });

  it('withOwnerAuth: OWNER lolos jika outlet aktif miliknya', async () => {
    const handler = withOwnerAuth(async () => Response.json({ ok: true }));

    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });

    const outlet = await prisma.outlet.create({
      data: {
        name: 'Outlet',
        slug: uniqueSlug('outlet'),
        address: 'Alamat',
        ownerId,
      },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet.id }) as any);
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });
});

