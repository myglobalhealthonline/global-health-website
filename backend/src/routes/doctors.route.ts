import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const doctorsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctors", async () => placeholderResponse());
};

export default doctorsRoute;
