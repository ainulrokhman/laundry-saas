/**
 * Public tracking API tests: /api/public/outlet/[slug]/track/[code]
 */

import { prisma } from '@/lib/prisma';
import { cleanupTestDatabase, isDatabaseAvailable } from '../../utils/test-db';
import { randomUUID } from '../../utils/test-helpers';
import { OrderStatus, PaymentStatus } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

function uniqueSlug(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

describeDb('Public API: outlet tracking', () => {
  beforeEach(async () => {
    await cleanupTestDatabase(prisma as any);
  });

  it('200: berhasil melacak order pada outlet yang benar', async () => {
    const { GET } = await import('@/app/api/public/outlet/[slug]/track/[code]/route');

    const slug = uniqueSlug('outlet');
    const outlet = await prisma.outlet.create({
      data: {
        name: 'Outlet A',
        slug,
        address: 'Alamat',
        ownerId: null,
      },
    });

    await prisma.order.create({
      data: {
        trackingCode: 'AB12CD34',
        status: OrderStatus.WASHING,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount: 15000,
        customerName: 'Budi',
        outlet: { connect: { id: outlet.id } },
      },
    });

    const req = new Request(`http://localhost:3000/api/public/outlet/${slug}/track/ab12cd34`, {
      method: 'GET',
      headers: { 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await GET(req as any, { params: Promise.resolve({ slug, code: 'ab12cd34' }) } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.trackingCode).toBe('AB12CD34');
    expect(body.data.status).toBe('WASHING');
    expect(body.data.outletName).toBe('Outlet A');
  });

  it('404: order tidak ditemukan', async () => {
    const { GET } = await import('@/app/api/public/outlet/[slug]/track/[code]/route');

    const slug = uniqueSlug('outlet');
    const outlet = await prisma.outlet.create({
      data: {
        name: 'Outlet A',
        slug,
        address: 'Alamat',
        ownerId: null,
      },
    });

    // ensure outlet exists; order does not
    expect(outlet.id).toBeTruthy();

    const req = new Request(`http://localhost:3000/api/public/outlet/${slug}/track/ZZZZZZ`, {
      method: 'GET',
      headers: { 'x-forwarded-for': '2.2.2.2' },
    });
    const res = await GET(req as any, { params: Promise.resolve({ slug, code: 'ZZZZZZ' }) } as any);
    expect(res.status).toBe(404);
  });

  it('400: format tracking code tidak valid', async () => {
    const { GET } = await import('@/app/api/public/outlet/[slug]/track/[code]/route');

    const slug = uniqueSlug('outlet');
    await prisma.outlet.create({
      data: {
        name: 'Outlet A',
        slug,
        address: 'Alamat',
        ownerId: null,
      },
    });

    const req = new Request(`http://localhost:3000/api/public/outlet/${slug}/track/!!!`, {
      method: 'GET',
      headers: { 'x-forwarded-for': '3.3.3.3' },
    });
    const res = await GET(req as any, { params: Promise.resolve({ slug, code: '!!!' }) } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('429: rate limit terlampaui', async () => {
    const { GET } = await import('@/app/api/public/outlet/[slug]/track/[code]/route');

    const slug = uniqueSlug('outlet');
    await prisma.outlet.create({
      data: {
        name: 'Outlet A',
        slug,
        address: 'Alamat',
        ownerId: null,
      },
    });

    const ip = `9.9.9.${Math.floor(Math.random() * 200) + 1}`;
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const req = new Request(`http://localhost:3000/api/public/outlet/${slug}/track/${randomUUID().slice(0, 8)}`, {
        method: 'GET',
        headers: { 'x-forwarded-for': ip },
      });
      const res = await GET(req as any, { params: Promise.resolve({ slug, code: randomUUID().slice(0, 8) }) } as any);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

