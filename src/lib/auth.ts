/**
 * NextAuth.js Configuration
 * Implements role-based access control with outlet context
 * Following security best practices from .cursorrules
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { userRepository } from "@/repositories/UserRepository";
import { Role } from "@/types/enums/Role";
import type { SessionUser, ExtendedSession, JWTPayload } from "@/types/auth";

/**
 * NextAuth configuration
 * Uses credentials provider for email/password authentication
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Find user by email
        const user = await userRepository.findByEmail(credentials.email);

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Return user data (password excluded)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          outletId: user.outletId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    /**
     * JWT callback - called when JWT is created/updated
     * Stores user data and outlet context in token
     */
    async jwt({ token, user }) {
      if (user) {
        const sessionUser = user as SessionUser;
        token.id = sessionUser.id;
        token.email = sessionUser.email;
        token.name = sessionUser.name;
        token.role = sessionUser.role;
        token.outletId = sessionUser.outletId;
      }
      return token;
    },
    /**
     * Session callback - called whenever session is checked
     * Returns session with outlet context for multi-tenancy
     */
    async session({ session, token }) {
      const payload = token as unknown as JWTPayload;

      return {
        ...session,
        user: {
          ...session.user,
          id: payload.id,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          outletId: payload.outletId,
        },
        outletId: payload.outletId,
        role: payload.role,
      } as ExtendedSession;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
