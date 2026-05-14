import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
function createClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
    }
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
}
export const prisma = globalThis.__ghPrisma ?? createClient();
if (process.env.NODE_ENV !== "production")
    globalThis.__ghPrisma = prisma;
//# sourceMappingURL=index.js.map