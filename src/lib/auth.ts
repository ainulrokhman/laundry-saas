/**
 * NextAuth.js v5 Configuration
 * 
 * This file contains the NextAuth configuration for PIN-based authentication.
 * Session includes outletId for multi-tenancy support.
 */

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma';

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
 * NextAuth configuration
 * 
 * Uses credentials provider for PIN-based login.
 * Session includes outletId for multi-tenancy isolation.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.pin) {
          return null;
        }

        // Find user by phone
        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
          include: { outlet: true },
        });

        if (!user || !user.pin) {
          return null;
        }

        // Verify PIN
        const isValidPin = await bcrypt.compare(credentials.pin, user.pin);

        if (!isValidPin) {
          return null;
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Account is inactive');
        }

        // Update lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

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
  },
  secret: process.env.NEXTAUTH_SECRET,
};
