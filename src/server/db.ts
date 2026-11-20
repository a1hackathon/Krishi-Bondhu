// Shared Prisma client. One instance per process, reused across hot reloads in development.
// Only server modules import this; UI components and domain code must not depend on it directly.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { setDefaultResultOrder } from "node:dns";
import { isIP } from "node:net";

function createClient(): PrismaClient {
  // Some local/VPC networks cannot route IPv6 to managed Postgres. Keep IPv4 first
  // while retaining IPv6 fallback so pooled database URLs connect reliably.
  setDefaultResultOrder("ipv4first");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const url = new URL(connectionString);
  const schema = url.searchParams.get("schema") ?? undefined;
  const ipOverride = process.env.DATABASE_IP_OVERRIDE;
  if (ipOverride && !isIP(ipOverride)) {
    throw new Error("DATABASE_IP_OVERRIDE must be an IP address.");
  }

  // Some restricted networks time out on Node's default hostname address choice,
  // even when libpq or an explicitly selected address can reach the same endpoint.
  // Keep the provider hostname for TLS certificate validation when overriding DNS.
  const adapterConfig = ipOverride
    ? {
        host: ipOverride,
        port: url.port ? Number(url.port) : 5432,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: decodeURIComponent(url.pathname.slice(1)),
        options: url.searchParams.get("options") ?? undefined,
        application_name: url.searchParams.get("application_name") ?? undefined,
        ssl: { rejectUnauthorized: true, servername: url.hostname },
      }
    : connectionString;
  return new PrismaClient({ adapter: new PrismaPg(adapterConfig, schema ? { schema } : undefined) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
