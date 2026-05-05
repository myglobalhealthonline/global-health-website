import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const newsletterRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/newsletter", async () => placeholderResponse());
};

export default newsletterRoute;
