import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7: la URL se pasa via adaptador, no en schema.prisma
// Usamos un Proxy para diferir la creación hasta el primer uso real.
// Esto evita errores durante el build cuando DATABASE_URL no está definida.

function buildClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurada");
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

const g = globalThis as typeof globalThis & { _prisma?: PrismaClient };

// Proxy: crea el cliente real solo en la primera query
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!g._prisma) {
      g._prisma = buildClient();
    }
    const value = (g._prisma as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(g._prisma) : value;
  },
});
