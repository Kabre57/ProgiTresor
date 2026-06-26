"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const index_1 = require("@prisma/client/index");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const globalForPrisma = globalThis;
const createPrismaClient = () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required to initialize Prisma Client.');
    }
    const pool = new pg_1.Pool({
        connectionString: databaseUrl,
        max: Number(process.env.DB_POOL_MAX ?? 20),
        idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30000),
        connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 5000),
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new index_1.PrismaClient({ adapter });
};
const prisma = globalForPrisma.prisma ?? createPrismaClient();
exports.prisma = prisma;
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
