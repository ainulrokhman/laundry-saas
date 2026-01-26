/**
 * RBAC + tenant isolation tests for Staff Management dashboard endpoints (OWNER-only).
 *
 * Sesuai DEVELOPMENT-PLAN Priority 3 & docs/roles:
 * - OWNER boleh mengelola STAFF untuk outlet aktif (scoped by session.outletId)
 * - STAFF ditolak (403)
 * - Tidak boleh role escalation / cross-outlet management
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

describeDb('API RBAC: staff management (OWNER-only)', () => {
  beforeEach(async () => {
    authMock.mockReset();
    await cleanupTestDatabase(prisma as any);
  });

  it('GET ditolak untuk STAFF (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/staff/route');
    authMock.mockResolvedValueOnce(
      makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any
    );

    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/staff', { method: 'GET' }) as any);
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk OWNER dan hanya menampilkan staff outlet aktif (200)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/staff/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });
    const outlet1 = await prisma.outlet.create({
      data: { name: 'Outlet 1', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const outlet2 = await prisma.outlet.create({
      data: { name: 'Outlet 2', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });

    const staff1Id = randomUUID();
    const staff2Id = randomUUID();
    await prisma.user.create({
      data: {
        id: staff1Id,
        ...createUserData({ role: Role.STAFF, outletId: outlet1.id, phone: '6281111111111' }),
      },
    });
    await prisma.user.create({
      data: {
        id: staff2Id,
        ...createUserData({ role: Role.STAFF, outletId: outlet2.id, phone: '6282222222222' }),
      },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet1.id }) as any);
    const res = await GET(new Request('http://localhost:3000/api/dashboard/settings/staff', { method: 'GET' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const ids = (body.data as any[]).map((u) => u.id);
    expect(ids).toContain(staff1Id);
    expect(ids).not.toContain(staff2Id);
  });

  it('POST ditolak untuk STAFF (403)', async () => {
    const { POST } = await import('@/app/api/dashboard/settings/staff/route');
    authMock.mockResolvedValueOnce(
      makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any
    );

    const req = new Request('http://localhost:3000/api/dashboard/settings/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '6281234567890', name: 'Staff 1', pin: '1234' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('POST menolak field tambahan (role escalation) (400)', async () => {
    const { POST } = await import('@/app/api/dashboard/settings/staff/route');

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
    const req = new Request('http://localhost:3000/api/dashboard/settings/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '6283333333333',
        name: 'Staff 1',
        pin: '1234',
        role: Role.OWNER,
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain('Validation');
  });

  it('POST diizinkan untuk OWNER dan membuat STAFF pada outlet aktif (201)', async () => {
    const { POST } = await import('@/app/api/dashboard/settings/staff/route');

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
    const req = new Request('http://localhost:3000/api/dashboard/settings/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '081234567890',
        name: 'Staff Baru',
        pin: '1234',
        isActive: true,
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('STAFF');
    expect(body.data.outletId).toBe(outlet.id);

    const created = await prisma.user.findUnique({ where: { phone: '6281234567890' } });
    expect(created?.role).toBe(Role.STAFF);
    expect(created?.outletId).toBe(outlet.id);
  });

  it('GET /[id] ditolak jika staff milik outlet lain (404)', async () => {
    const { GET } = await import('@/app/api/dashboard/settings/staff/[id]/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });
    const outlet1 = await prisma.outlet.create({
      data: { name: 'Outlet 1', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const outlet2 = await prisma.outlet.create({
      data: { name: 'Outlet 2', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });

    const staffOtherId = randomUUID();
    await prisma.user.create({
      data: {
        id: staffOtherId,
        ...createUserData({ role: Role.STAFF, outletId: outlet2.id, phone: '6284444444444' }),
      },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet1.id }) as any);
    const res = await GET(
      new Request(`http://localhost:3000/api/dashboard/settings/staff/${staffOtherId}`, { method: 'GET' }) as any,
      { params: Promise.resolve({ id: staffOtherId }) }
    );
    expect(res.status).toBe(404);
  });

  it('PUT /[id] menolak field tambahan (role/outletId) (400)', async () => {
    const { PUT } = await import('@/app/api/dashboard/settings/staff/[id]/route');

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

    const staffId = randomUUID();
    await prisma.user.create({
      data: {
        id: staffId,
        ...createUserData({ role: Role.STAFF, outletId: outlet.id, phone: '6285555555555' }),
      },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet.id }) as any);

    const req = new Request(`http://localhost:3000/api/dashboard/settings/staff/${staffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: Role.OWNER }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ id: staffId }) });
    expect(res.status).toBe(400);
  });

  it('PUT /[id] ditolak jika staff milik outlet lain (404)', async () => {
    const { PUT } = await import('@/app/api/dashboard/settings/staff/[id]/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: {
        id: ownerId,
        ...createUserData({ role: Role.OWNER, outletId: null }),
      },
    });
    const outlet1 = await prisma.outlet.create({
      data: { name: 'Outlet 1', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const outlet2 = await prisma.outlet.create({
      data: { name: 'Outlet 2', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });

    const staffOtherId = randomUUID();
    await prisma.user.create({
      data: {
        id: staffOtherId,
        ...createUserData({ role: Role.STAFF, outletId: outlet2.id, phone: '6286666666666' }),
      },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet1.id }) as any);

    const req = new Request(`http://localhost:3000/api/dashboard/settings/staff/${staffOtherId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ id: staffOtherId }) });
    expect(res.status).toBe(404);
  });
});

