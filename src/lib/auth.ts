/**
 * NextAuth.js v5 Configuration
 * 
 * This file contains the NextAuth configuration for PIN-based authentication.
 * Session includes outletId for multi-tenancy support.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma';
import { normalizePhoneNumber } from './utils';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts } from './security/account-lockout';
import { checkRateLimit, recordAttempt } from './security/rate-limiter';
import { securityLogService } from '../services/security/SecurityLogService';

/**
 * Extended session type with outletId
 */
export interface ExtendedSession {
  userId: string;
  outletId: string | null;
  role: Role;
  phone: string;
}

function isValidUuid(id: string | null | undefined): id is string {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Rate limiting configuration for login
 */
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * NextAuth configuration
 * 
 * Uses credentials provider for PIN-based login.
 * Session includes outletId for multi-tenancy isolation.
 * Includes rate limiting and account lockout protection.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.pin) {
          await securityLogService.logLoginAttempt(
            credentials?.phone as string || 'unknown',
            false,
            undefined,
            'Missing credentials'
          );
          return null;
        }

        // Normalize phone number for database lookup (without +)
        const normalizedPhone = normalizePhoneNumber(credentials.phone as string);

        // Check rate limit by phone number
        const rateLimitResult = checkRateLimit(normalizedPhone, LOGIN_RATE_LIMIT);
        if (!rateLimitResult.allowed) {
          await securityLogService.logEvent({
            phone: normalizedPhone,
            eventType: 'RATE_LIMIT_EXCEEDED' as any,
            success: false,
            metadata: {
              remaining: rateLimitResult.remaining,
              resetAt: rateLimitResult.resetAt.toISOString(),
            },
          });
          throw new Error(
            `Terlalu banyak percobaan login. Silakan coba lagi setelah ${rateLimitResult.resetAt.toLocaleString('id-ID')}`
          );
        }

        // Find user by phone
        const user = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
          include: {
            outlet: {
              select: { id: true, ownerId: true, name: true, slug: true }
            },
            ownedOutlets: {
              select: { id: true, name: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        if (!user || !user.pin) {
          recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
          await securityLogService.logLoginAttempt(
            normalizedPhone,
            false,
            undefined,
            'User not found or PIN not set'
          );
          return null;
        }

        // Check if account is locked
        const accountLocked = await isAccountLocked(user.id);
        if (accountLocked) {
          recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
          await securityLogService.logAccountLocked(
            normalizedPhone,
            user.id,
            'Account is locked due to multiple failed attempts'
          );
          throw new Error('Akun Anda terkunci karena terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti.');
        }

        // Verify PIN
        const isValidPin = await bcrypt.compare(credentials.pin as string, user.pin);

        if (!isValidPin) {
          // Record failed attempt
          recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
          const shouldLock = await recordFailedAttempt(user.id);

          await securityLogService.logLoginAttempt(
            normalizedPhone,
            false,
            user.id,
            'Invalid PIN',
            { shouldLock }
          );

          if (shouldLock) {
            await securityLogService.logAccountLocked(
              normalizedPhone,
              user.id,
              'Maximum failed attempts reached'
            );
            throw new Error('Akun Anda terkunci karena terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti.');
          }

          return null;
        }

        // Check if user is active
        if (!user.isActive) {
          recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
          await securityLogService.logLoginAttempt(
            normalizedPhone,
            false,
            user.id,
            'Account is inactive'
          );
          throw new Error('Account is inactive');
        }

        // Multi-outlet OWNER foundation:
        // - Kepemilikan outlet via Outlet.ownerId
        // - user.outletId dipakai sebagai "outlet aktif" (session.outletId)
        if (user.role === Role.OWNER) {
          const ownedIds = user.ownedOutlets?.map((o) => o.id) ?? [];

          // Auto-migrasi dari desain lama: OWNER lama punya user.outletId (single outlet).
          // Jika outlet tersebut belum memiliki ownerId, set ownerId = user.id.
          if (isValidUuid(user.outletId)) {
            const outlet = await prisma.outlet.findUnique({
              where: { id: user.outletId },
              select: { id: true, ownerId: true },
            });
            if (outlet && !outlet.ownerId) {
              await prisma.outlet.update({
                where: { id: outlet.id },
                data: { ownerId: user.id },
              });
            }
          }

          // Pastikan outlet aktif valid:
          // - Jika user.outletId kosong / tidak dimiliki, pilih outlet pertama yang dimiliki (jika ada) dan persist.
          let nextActiveOutletId: string | null = isValidUuid(user.outletId) ? user.outletId : null;
          if (nextActiveOutletId) {
            const owns = await prisma.outlet.count({
              where: { id: nextActiveOutletId, ownerId: user.id },
            });
            if (owns <= 0) {
              nextActiveOutletId = null;
            }
          }

          if (!nextActiveOutletId) {
            // Re-fetch owned outlets from DB (authoritative)
            const firstOwned = await prisma.outlet.findFirst({
              where: { ownerId: user.id },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            });
            if (firstOwned) {
              nextActiveOutletId = firstOwned.id;
              await prisma.user.update({
                where: { id: user.id },
                data: { outletId: nextActiveOutletId },
              });
            }
          }

          // If OWNER has no owned outlets, usually we force them to create one.
          // But with Global Dashboard, we can allow login without an active outlet.
          // if (!nextActiveOutletId) {
          //   throw new Error('Akun OWNER Anda belum memiliki outlet. Silakan hubungi admin untuk mengaitkan outlet.');
          // }

          // Mutate return payload outletId to ensure session uses active outlet (or null for global).
          (user as any).outletId = nextActiveOutletId;
        }

        if (user.role === Role.STAFF) {
          if (!isValidUuid(user.outletId)) {
            throw new Error('Akun STAFF wajib memiliki outlet. Silakan hubungi admin.');
          }
        }

        // Successful login - reset failed attempts and clear rate limit
        await resetFailedAttempts(user.id);
        // Note: We don't clear rate limit on success to prevent enumeration attacks

        // Update lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await securityLogService.logLoginAttempt(
          normalizedPhone,
          true,
          user.id
        );

        return {
          id: user.id,
          name: user.name,
          outletId: user.outletId,
          role: user.role,
          phone: user.phone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.outletId = (user as any).outletId;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.name = (user as any).name;
      }

      // Allow outlet context switching for OWNER via useSession().update({ outletId })
      if (trigger === 'update' && session) {
        // requestedOutletId can be string (UUID), empty string (""), or null.
        // Undefined means it wasn't passed in the update payload.
        const requestedOutletId = (session as any).outletId;

        // Check if outletId property exists in the update payload
        if (requestedOutletId !== undefined) {
          const role = token.role as Role | undefined;
          const userId = token.userId as string | undefined;

          if (!role || !userId) {
            throw new Error('Session tidak valid');
          }

          if (role === Role.OWNER) {
            // Case 1: Switching to Global Mode (empty or null)
            if (!requestedOutletId) {
              await prisma.user.update({
                where: { id: userId },
                data: { outletId: null },
              });
              token.outletId = null;
            }
            // Case 2: Switching to Specific Outlet
            else {
              if (!isValidUuid(requestedOutletId)) {
                throw new Error('Outlet ID tidak valid');
              }

              const owns = await prisma.outlet.count({
                where: { id: requestedOutletId, ownerId: userId },
              });
              if (owns <= 0) {
                throw new Error('Outlet tidak termasuk dalam kepemilikan Anda');
              }

              // Persist active outlet
              await prisma.user.update({
                where: { id: userId },
                data: { outletId: requestedOutletId },
              });
              token.outletId = requestedOutletId;
            }
          } else if (role === Role.STAFF) {
            // STAFF cannot switch context
            if (requestedOutletId !== token.outletId) {
              throw new Error('STAFF tidak dapat mengganti outlet');
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).userId = token.userId;
        (session.user as any).outletId = token.outletId;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).name = (token as any).name;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Only secure in production (HTTPS)
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});

