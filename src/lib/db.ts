// Shared Prisma client (Prisma ORM 7 + pg driver adapter).
// ONE instance across the app. Pattern: keep the client on globalThis during dev
// hot-reload so we do not open a new connection pool on every file change.

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Driver adapter is REQUIRED by Prisma 7 for Postgres.
  // Fail fast if DATABASE_URL is unset/empty: pg's connection-string parser treats
  // an empty string as "absent" and silently falls back to libpq defaults
  // (localhost:5432, OS user, no password) — the wrong store. Fail, don't gamble.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required — copy .env.example to .env first");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;