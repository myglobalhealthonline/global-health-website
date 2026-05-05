import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const assetsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/assets", async () => placeholderResponse());
};

export default assetsRoute;
