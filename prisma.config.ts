/**
 * Prisma Configuration File
 * 
 * This file replaces the deprecated package.json#prisma configuration.
 * Used for configuring Prisma seed and other settings.
 * 
 * For Prisma 6.x, seed must be placed inside the migrations object.
 * 
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */

import path from "path";

export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
};
