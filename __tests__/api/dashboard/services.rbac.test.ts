/**
 * RBAC + tenant isolation tests for Service Management dashboard endpoints (OWNER-only).
 *
 * Sesuai DEVELOPMENT-PLAN Phase 2.1:
 * - OWNER boleh mengelola layanan untuk outlet aktif (scoped by session.outletId)
 * - STAFF ditolak (403)
 * - Tidak boleh cross-outlet management
 * - Zod strict: field tambahan ditolak (400)
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
import { cleanupTestDatabase, isDatabaseAvailable } from '../../utils/test-db';
import { createUserData } from '../../utils/factories';
import { randomUUID } from '../../utils/test-helpers';

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

describeDb('API RBAC: service management (OWNER-only)', () => {
  beforeEach(async () => {
    authMock.mockReset();
    await cleanupTestDatabase(prisma as any);
  });

  it('GET ditolak untuk STAFF (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/services/route');
    authMock.mockResolvedValueOnce(
      makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any
    );

    const res = await GET(
      new Request('http://localhost:3000/api/dashboard/services', { method: 'GET' }) as any
    );
    expect(res.status).toBe(403);
  });

  it('GET diizinkan untuk OWNER dan hanya menampilkan layanan outlet aktif (200)', async () => {
    const { GET } = await import('@/app/api/dashboard/services/route');

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

    const s1 = await prisma.service.create({
      data: { outletId: outlet1.id, name: 'Cuci Kiloan', type: 'KILOAN', price: 10000, isActive: true },
    });
    await prisma.service.create({
      data: { outletId: outlet2.id, name: 'Paket Express', type: 'PAKET', price: 50000, isActive: true },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet1.id }) as any);
    const res = await GET(
      new Request('http://localhost:3000/api/dashboard/services', { method: 'GET' }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const ids = (body.data as any[]).map((x) => x.id);
    expect(ids).toContain(s1.id);
    expect(ids).toHaveLength(1);
  });

  it('POST ditolak untuk STAFF (403)', async () => {
    const { POST } = await import('@/app/api/dashboard/services/route');
    authMock.mockResolvedValueOnce(
      makeSession({ userId: randomUUID(), role: Role.STAFF, outletId: randomUUID() }) as any
    );

    const req = new Request('http://localhost:3000/api/dashboard/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cuci Kiloan', type: 'KILOAN', price: 10000 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('POST menolak field tambahan (400)', async () => {
    const { POST } = await import('@/app/api/dashboard/services/route');

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
    const req = new Request('http://localhost:3000/api/dashboard/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cuci Kiloan',
        type: 'KILOAN',
        price: 10000,
        outletId: randomUUID(), // should be rejected (strict)
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain('Validation');
  });

  it('POST diizinkan untuk OWNER dan membuat layanan pada outlet aktif (201)', async () => {
    const { POST } = await import('@/app/api/dashboard/services/route');

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
    const req = new Request('http://localhost:3000/api/dashboard/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cuci Kiloan',
        type: 'KILOAN',
        price: 12000,
        unit: 'kg',
        description: 'Cuci kiloan per kilogram',
        isActive: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('KILOAN');

    const created = await prisma.service.findFirst({
      where: { outletId: outlet.id, name: 'Cuci Kiloan' },
    });
    expect(created?.outletId).toBe(outlet.id);
    expect(created?.type).toBe('KILOAN');
  });

  it('PUT /[id] ditolak jika layanan milik outlet lain (404)', async () => {
    const { PUT } = await import('@/app/api/dashboard/services/[id]/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: { id: ownerId, ...createUserData({ role: Role.OWNER, outletId: null }) },
    });
    const outlet1 = await prisma.outlet.create({
      data: { name: 'Outlet 1', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const outlet2 = await prisma.outlet.create({
      data: { name: 'Outlet 2', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const serviceOther = await prisma.service.create({
      data: { outletId: outlet2.id, name: 'Service Outlet 2', type: 'SATUAN', price: 5000, isActive: true },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet1.id }) as any);
    const req = new Request(`http://localhost:3000/api/dashboard/services/${serviceOther.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const res = await PUT(req as any, { params: Promise.resolve({ id: serviceOther.id }) });
    expect(res.status).toBe(404);
  });

  it('DELETE /[id] ditolak jika layanan milik outlet lain (404)', async () => {
    const { DELETE } = await import('@/app/api/dashboard/services/[id]/route');

    const ownerId = randomUUID();
    await prisma.user.create({
      data: { id: ownerId, ...createUserData({ role: Role.OWNER, outletId: null }) },
    });
    const outlet1 = await prisma.outlet.create({
      data: { name: 'Outlet 1', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const outlet2 = await prisma.outlet.create({
      data: { name: 'Outlet 2', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId },
    });
    const serviceOther = await prisma.service.create({
      data: { outletId: outlet2.id, name: 'Service Outlet 2', type: 'PAKET', price: 50000, isActive: true },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: ownerId, role: Role.OWNER, outletId: outlet1.id }) as any);
    const res = await DELETE(
      new Request(`http://localhost:3000/api/dashboard/services/${serviceOther.id}`, { method: 'DELETE' }) as any,
      { params: Promise.resolve({ id: serviceOther.id }) }
    );
    expect(res.status).toBe(404);
  });

  it('OWNER ditolak jika outlet aktif bukan miliknya (403)', async () => {
    const { GET } = await import('@/app/api/dashboard/services/route');

    const realOwnerId = randomUUID();
    await prisma.user.create({
      data: { id: realOwnerId, ...createUserData({ role: Role.OWNER, outletId: null }) },
    });
    const outlet = await prisma.outlet.create({
      data: { name: 'Outlet', slug: uniqueSlug('outlet'), address: 'Alamat', ownerId: realOwnerId },
    });

    authMock.mockResolvedValueOnce(makeSession({ userId: randomUUID(), role: Role.OWNER, outletId: outlet.id }) as any);
    const res = await GET(
      new Request('http://localhost:3000/api/dashboard/services', { method: 'GET' }) as any
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Access denied');
  });
});

