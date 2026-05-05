import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const countriesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries", async () => placeholderResponse());
};

export default countriesRoute;
