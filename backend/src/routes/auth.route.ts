import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  AuthConflictError,
  AuthInvalidCredentialsError,
  getSafeUserById,
  loginUser,
  patchUserProfile,
  registerPatient,
} from "../modules/auth/auth.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "../validations/auth.schema.js";
import { env } from "../config/env.js";
import { authCookieOptions, signAuthToken, verifyAuthToken } from "../utils/auth-session.js";
import { errorResponse, okResponse } from "../utils/response.js";

const authRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/register", async (request, reply) => {
    const body = registerBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid registration payload", body.error.flatten()));
    }
    try {
      const user = await registerPatient(body.data);
      const token = signAuthToken({ sub: user.id, role: user.role, email: user.email });
      reply.setCookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());
      return okResponse({ user }, "Account created");
    } catch (error) {
      if (error instanceof AuthConflictError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = loginBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid login payload", body.error.flatten()));
    }
    try {
      const user = await loginUser(body.data);
      const token = signAuthToken({ sub: user.id, role: user.role, email: user.email });
      reply.setCookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());
      return okResponse({ user }, "Logged in");
    } catch (error) {
      if (error instanceof AuthInvalidCredentialsError) {
        return reply.status(401).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
    return okResponse({ loggedOut: true }, "Logged out");
  });

  const profilePatchSchema = z.object({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional()
      .transform((v) => (v === "" ? null : v)),
  });

  app.patch("/api/auth/me", async (request, reply) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    if (!token) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    const payload = verifyAuthToken(token);
    if (!payload) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    const parsed = profilePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid profile payload", parsed.error.flatten()));
    }
    try {
      const user = await patchUserProfile(payload.sub, parsed.data);
      return okResponse({ user }, "Profile updated");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update profile"));
    }
  });

  app.get("/api/auth/me", async (request, reply) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    if (!token) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    const payload = verifyAuthToken(token);
    if (!payload) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    try {
      const user = await getSafeUserById(payload.sub);
      if (!user) {
        reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
        return reply.status(401).send(errorResponse("Not authenticated"));
      }
      return okResponse({ user });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
  });

  app.post("/api/auth/forgot-password", async (request) => {
    const body = forgotPasswordBodySchema.safeParse(request.body);
    if (!body.success) {
      return errorResponse("Invalid forgot-password payload", body.error.flatten());
    }
    // Placeholder-safe: no user enumeration, no email sender integration in this phase.
    return okResponse(
      { accepted: true },
      "If an account exists for that email, password reset instructions will be sent when email delivery is configured.",
    );
  });

  app.post("/api/auth/reset-password", async (request) => {
    const body = resetPasswordBodySchema.safeParse(request.body);
    if (!body.success) {
      return errorResponse("Invalid reset-password payload", body.error.flatten());
    }
    // Placeholder-safe: reset token issuance/consumption flow follows in email-integrated milestone.
    return okResponse(
      { accepted: true },
      "Password reset is not fully enabled yet. Please contact support if you need immediate access.",
    );
  });
};

export default authRoute;
