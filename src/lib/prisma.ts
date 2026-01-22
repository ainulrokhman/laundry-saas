/**
 * Prisma Client Singleton
 * 
 * This file creates a singleton instance of PrismaClient to be used throughout the application.
 * In development, the instance is preserved across hot reloads.
 * 
 * Usage:
 *   import prisma from "@/lib/prisma";
 *   const users = await prisma.user.findMany();
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
