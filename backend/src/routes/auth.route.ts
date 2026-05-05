import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const authRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/login", async () => placeholderResponse());
  app.post("/api/auth/register", async () => placeholderResponse());
};

export default authRoute;
