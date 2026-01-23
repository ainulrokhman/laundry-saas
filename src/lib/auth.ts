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
          include: { outlet: true },
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
          outletId: user.outletId,
          role: user.role,
          phone: user.phone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.outletId = (user as any).outletId;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).userId = token.userId;
        (session.user as any).outletId = token.outletId;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
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

