import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const pricingRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/pricing", async () => placeholderResponse());
};

export default pricingRoute;
