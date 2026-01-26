/**
 * Public Tracking API (by outlet slug + tracking code)
 *
 * GET /api/public/outlet/[slug]/track/[code]
 * - Tenant-safe: slug -> outletId, lalu query order by (outletId, trackingCode)
 * - Minimal response (privacy): gunakan OrderDTO.toPublicResponse
 * - Rate limit untuk mencegah brute force
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OrderRepository } from '@/repositories/OrderRepository';
import { OrderDTO } from '@/dto/OrderDTO';
import { checkRateLimit, recordAttempt } from '@/lib/security/rate-limiter';

const outletRepository = new OutletRepository();
const orderRepository = new OrderRepository();

const paramsSchema = z.object({
  slug: z.string().trim().min(1),
  code: z
    .string()
    .trim()
    .min(6, 'Tracking code minimal 6 karakter')
    .max(12, 'Tracking code maksimal 12 karakter')
    .regex(/^[a-z0-9]+$/i, 'Tracking code hanya boleh berisi huruf dan angka'),
});

const TRACK_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 10 * 60 * 1000, // 10 menit
};

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; code: string }> }
) {
  try {
    const { slug, code } = paramsSchema.parse(await params);
    const normalizedCode = code.toUpperCase();

    const ip = getClientIp(request);
    const identifier = `public-track:${ip}:${slug}`;
    const rl = checkRateLimit(identifier, TRACK_RATE_LIMIT);
    if (!rl.allowed) {
      return Response.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
          data: {
            remaining: rl.remaining,
            resetAt: rl.resetAt.toISOString(),
          },
        },
        { status: 429 }
      );
    }
    recordAttempt(identifier, TRACK_RATE_LIMIT);

    const outlet = await outletRepository.findPublicBySlug(slug);
    if (!outlet) {
      return Response.json(
        { success: false, error: 'Outlet not found', message: 'Outlet tidak ditemukan' },
        { status: 404 }
      );
    }

    const order = await orderRepository.findByTrackingCodeForPublic(outlet.id, normalizedCode);
    if (!order) {
      return Response.json(
        {
          success: false,
          error: 'Order not found',
          message: 'Order dengan tracking code tersebut tidak ditemukan.',
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: OrderDTO.toPublicResponse(order as any),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: error.issues.map((i) => i.message).join(', '),
          errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    console.error('Error tracking order:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to track order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

