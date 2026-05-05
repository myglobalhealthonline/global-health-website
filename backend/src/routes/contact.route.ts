import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const contactRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/contact", async () => placeholderResponse());
};

export default contactRoute;
