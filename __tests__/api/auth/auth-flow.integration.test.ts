/**
 * Auth flow integration tests
 * Unauthenticated access rejected; OTP verify validation
 */

import { vi } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: authMock,
  ExtendedSession: {},
}));

describe('Auth flow integration', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  describe('dashboard requires auth', () => {
    it('GET /api/dashboard/stats returns 401 when unauthenticated', async () => {
      authMock.mockResolvedValueOnce(null as any);

      const { GET } = await import('@/app/api/dashboard/stats/route');
      const res = await GET(new Request('http://localhost:3000/api/dashboard/stats', { method: 'GET' }) as any);

      expect(res.status).toBe(401);
    });

  });

  describe('OTP verify validation', () => {
    it('POST /api/auth/otp/verify returns 400 for invalid payload (missing phone)', async () => {
      const { POST } = await import('@/app/api/auth/otp/verify/route');
      const res = await POST(
        new Request('http://localhost:3000/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '123456' }),
        }) as any
      );

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/otp/verify returns 400 for invalid code length', async () => {
      const { POST } = await import('@/app/api/auth/otp/verify/route');
      const res = await POST(
        new Request('http://localhost:3000/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '6281234567890', code: '12345', type: 'REGISTER' }),
        }) as any
      );

      expect(res.status).toBe(400);
    });
  });
});
