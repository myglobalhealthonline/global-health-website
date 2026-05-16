import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  AuthConflictError,
  AuthInvalidCredentialsError,
  changeUserPassword,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  deleteOwnAccount,
  exportUserData,
  findUserByEmail,
  getSafeUserById,
  issueEmailVerificationToken,
  issuePasswordResetToken,
  loginUser,
  patchUserProfile,
  registerPatient,
} from "../modules/auth/auth.service.js";
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "../lib/email/templates.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "../validations/auth.schema.js";
import { env } from "../config/env.js";
import { authCookieOptions, signAuthToken, verifyAuthToken } from "../utils/auth-session.js";
import { errorResponse, okResponse } from "../utils/response.js";

const authRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/register", {
    // 5/hour/IP — registration is rare, but bots try.
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const body = registerBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid registration payload", body.error.flatten()));
    }
    try {
      const user = await registerPatient(body.data);
      const token = signAuthToken({ sub: user.id, role: user.role, email: user.email });
      reply.setCookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());

      // Fire-and-forget verification email. Failures don't block signup —
      // user can request a new verification link later.
      try {
        const verifyToken = await issueEmailVerificationToken(user.id);
        await sendEmailVerificationEmail({
          to: user.email,
          fullName: user.fullName,
          token: verifyToken,
        });
      } catch (emailError) {
        app.log.warn(
          { err: emailError, userId: user.id },
          "Could not issue verification email after register",
        );
      }

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

  app.post("/api/auth/login", {
    // 10 attempts per 15min per IP. Stops credential-stuffing without
    // breaking the typo-then-retry path real users hit.
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (request, reply) => {
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

  app.post("/api/auth/forgot-password", {
    // 5/hour/IP — same cap as register; we don't want to burn the
    // SendGrid quota or enumerate emails via timing.
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const body = forgotPasswordBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid forgot-password payload", body.error.flatten()));
    }
    // Never reveal whether the email exists (account-enumeration defense).
    // Always respond 200 with the same message regardless of lookup result.
    try {
      const user = await findUserByEmail(body.data.email);
      if (user && user.isActive) {
        const token = await issuePasswordResetToken(user.id);
        try {
          await sendPasswordResetEmail({
            to: user.email,
            fullName: user.fullName,
            token,
          });
        } catch (emailError) {
          app.log.warn({ err: emailError, userId: user.id }, "Password reset email failed");
        }
      }
    } catch (error) {
      // Swallow DB errors to avoid leaking signals — still respond 200.
      app.log.warn({ err: error }, "Forgot-password lookup failed");
    }
    return okResponse(
      { accepted: true },
      "If an account exists for that email, password reset instructions are on the way.",
    );
  });

  app.post("/api/auth/reset-password", {
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const body = resetPasswordBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reset-password payload", body.error.flatten()));
    }
    try {
      const ok = await consumePasswordResetToken(body.data.token, body.data.password);
      if (!ok) {
        return reply.status(400).send(errorResponse("Reset link is invalid or expired"));
      }
      return okResponse({ accepted: true }, "Password updated. You can sign in now.");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reset password"));
    }
  });

  // Verify the email-verification token sent on signup.
  const verifyEmailSchema = z.object({ token: z.string().trim().min(10).max(200) });
  app.post("/api/auth/verify-email", async (request, reply) => {
    const body = verifyEmailSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid verify-email payload", body.error.flatten()));
    }
    try {
      const ok = await consumeEmailVerificationToken(body.data.token);
      if (!ok) {
        return reply.status(400).send(errorResponse("Verification link is invalid or expired"));
      }
      return okResponse({ verified: true }, "Email verified");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not verify email"));
    }
  });

  // Authenticated password change — different from /reset-password (which
  // is for the forgot-flow). Requires the current password as a soft 2FA
  // step so a stolen cookie alone can't lock the user out.
  app.post("/api/auth/change-password", async (request, reply) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    if (!token) return reply.status(401).send(errorResponse("Not authenticated"));
    const payload = verifyAuthToken(token);
    if (!payload) return reply.status(401).send(errorResponse("Not authenticated"));

    const body = changePasswordBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid change-password payload", body.error.flatten()));
    }
    try {
      const updated = await changeUserPassword(
        payload.sub,
        body.data.currentPassword,
        body.data.newPassword,
      );
      return okResponse({ user: updated }, "Password updated");
    } catch (error) {
      if (error instanceof AuthInvalidCredentialsError) {
        return reply.status(400).send(errorResponse("Current password is incorrect"));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not change password"));
    }
  });

  // Allow logged-in users to request a fresh verification email.
  app.post("/api/auth/resend-verification", async (request, reply) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    if (!token) return reply.status(401).send(errorResponse("Not authenticated"));
    const payload = verifyAuthToken(token);
    if (!payload) return reply.status(401).send(errorResponse("Not authenticated"));
    try {
      const user = await getSafeUserById(payload.sub);
      if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
      if (user.emailVerifiedAt) {
        return okResponse({ alreadyVerified: true }, "Email is already verified");
      }
      const verifyToken = await issueEmailVerificationToken(user.id);
      await sendEmailVerificationEmail({
        to: user.email,
        fullName: user.fullName,
        token: verifyToken,
      });
      return okResponse({ accepted: true }, "Verification email sent");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not send verification email"));
    }
  });

  // GDPR: dump everything we hold about the signed-in user as JSON.
  // Always served with Content-Disposition so the browser saves it as
  // a file rather than rendering it.
  app.get("/api/auth/me/export", async (request, reply) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    if (!token) return reply.status(401).send(errorResponse("Not authenticated"));
    const payload = verifyAuthToken(token);
    if (!payload) return reply.status(401).send(errorResponse("Not authenticated"));
    try {
      const data = await exportUserData(payload.sub);
      if (!data) return reply.status(404).send(errorResponse("Account not found"));
      reply.header(
        "Content-Disposition",
        `attachment; filename="global-health-data-${payload.sub}.json"`,
      );
      reply.header("Content-Type", "application/json");
      return reply.send(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not export data"));
    }
  });

  // GDPR: soft-delete the signed-in user's account. PII is scrubbed but
  // booking history is preserved (regulatory / Stripe ledger). The
  // session cookie is cleared on success.
  app.delete("/api/auth/me", async (request, reply) => {
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    if (!token) return reply.status(401).send(errorResponse("Not authenticated"));
    const payload = verifyAuthToken(token);
    if (!payload) return reply.status(401).send(errorResponse("Not authenticated"));
    try {
      await deleteOwnAccount(payload.sub);
      reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
      return okResponse({ deleted: true }, "Account deleted");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not delete account"));
    }
  });
};

export default authRoute;
