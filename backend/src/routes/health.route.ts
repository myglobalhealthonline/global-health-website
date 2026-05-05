import type { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ ok: true, message: "Backend is running." }));
};

export default healthRoute;
