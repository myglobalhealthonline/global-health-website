import type { FastifyPluginAsync } from "fastify";
import { listPublicBlogPosts } from "../modules/blog/blog.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const blogPostsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/blog-posts", async (_, reply) => {
    try {
      const posts = await listPublicBlogPosts();
      return okResponse(posts);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected public blog posts error"));
    }
  });
};

export default blogPostsRoute;

