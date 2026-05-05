import type { FastifyPluginAsync } from "fastify";
import { placeholderResponse } from "../utils/response.js";

const appointmentsRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/appointments", async () => placeholderResponse());
};

export default appointmentsRoute;
