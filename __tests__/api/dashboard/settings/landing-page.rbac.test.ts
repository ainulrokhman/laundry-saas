/**
 * RBAC tests for Landing Page settings dashboard endpoints (OWNER-only).
 *
 * - STAFF ditolak (403)
 * - OWNER diizinkan jika outlet aktif miliknya (200)
 * - OWNER ditolak jika outlet aktif bukan miliknya (403)
 * - Validasi input (400)
 */

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => {
  return {
    auth: authMock,
    ExtendedSession: {},
  };
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

describeDb('API RBAC: landing page settings (OWNER-only)', () => {
  beforeEach(async () => {
    authMock.mockReset();
    await cleanupTestDatabase(prisma as any);
  });

  it('GET ditolak untuk STAFF (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/landing-page/route');
    authMock.mockResolvedValueOnce(makeSession({ userId: 'staff-1', role: Role.STAFF, outletId: 'outlet-1' }) as any);

    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/landing-page', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk OWNER jika outlet aktif miliknya (200)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/landing-page/route');

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
    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/landing-page', { method: 'GET' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe(outlet.slug);
  });

  it('GET: OWNER ditolak jika outlet aktif bukan miliknya (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/landing-page/route');

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
    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/landing-page', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Access denied');
  });

  it('PUT diizinkan untuk OWNER dan menyimpan data (200)', async () => {
    const { PUT } = await import('@/app/api/dashboard/settings/landing-page/route');

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
    const req = new Request('http://localhost:3000/api/dashboard/settings/landing-page', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Deskripsi outlet',
        contactPhone: '6281234567890',
      }),
    });

    const res = await PUT(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.description).toBe('Deskripsi outlet');
    expect(body.data.contactPhone).toBe('6281234567890');
  });

  it('PUT: validasi contactPhone (400)', async () => {
    const { PUT } = await import('@/app/api/dashboard/settings/landing-page/route');

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
    const req = new Request('http://localhost:3000/api/dashboard/settings/landing-page', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactPhone: 'abc',
      }),
    });

    const res = await PUT(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain('Validation');
  });
});

