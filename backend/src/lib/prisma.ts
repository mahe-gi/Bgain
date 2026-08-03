import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import { env, getEffectiveDatabaseUrl } from "../config/env.js";

const dbUrl = getEffectiveDatabaseUrl();
const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    adapter
  });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
