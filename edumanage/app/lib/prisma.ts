import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pool?: Pool;
};

function poolSize(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

export function getPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForPrisma.prisma) {
    const pool = globalForPrisma.pool ?? new Pool({
      connectionString,
      max: poolSize("DB_POOL_MAX", 20, 1, 100),
      min: poolSize("DB_POOL_MIN", 2, 0, 20),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      maxUses: poolSize("DB_POOL_MAX_USES", 7500, 0, 100_000),
    });
    globalForPrisma.pool = pool;
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }

  return globalForPrisma.prisma;
}
