import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const servicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/services", async () => placeholderResponse());
};

export default servicesRoute;
