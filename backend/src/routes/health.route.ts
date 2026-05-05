import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { classifyDatabaseConnectivityError } from "../modules/shared/db-errors.js";

const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async (request, reply) => {
    const q = request.query as { db?: string };
    const includeDb = q.db === "1" || q.db === "true";

    if (!includeDb) {
      return { ok: true, message: "Backend is running." };
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        message: "Backend is running.",
        database: { connected: true },
      };
    } catch (error) {
      const code = classifyDatabaseConnectivityError(error);
      return reply.status(503).send({
        ok: false,
        message: "Database connection failed.",
        database: { connected: false, code },
      });
    }
  });
};

export default healthRoute;
