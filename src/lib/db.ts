// Shared Prisma client (Prisma ORM 7 + pg driver adapter).
// ONE instance across the app. Pattern: keep the client on globalThis during dev
// hot-reload so we do not open a new connection pool on every file change.

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Driver adapter is REQUIRED by Prisma 7 for Postgres.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;