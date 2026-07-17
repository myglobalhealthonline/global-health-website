import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../utils/require-auth.js";
import {
  authCookieOptions,
  signAuthToken,
  verifyPending2faToken,
  trustedDeviceCookieOptions,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "../utils/auth-session.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import { env } from "../config/env.js";
import {
  initiateTwoFactor,
  confirmTwoFactor,
  verifyTwoFactorLogin,
  disableTwoFactor,
  TwoFactorNotConfiguredError,
  TwoFactorTokenInvalidError,
  TwoFactorAlreadyEnabledError,
} from "../modules/two-factor/two-factor.service.js";
import {
  issueLoginOtp,
  verifyLoginOtp,
  issueTrustedDevice,
} from "../modules/two-factor/login-otp.service.js";
import { sendLoginOtpEmail } from "../lib/email/templates.js";
import {
  getSafeUserById,
  getUserTokenVersion,
  AuthInvalidCredentialsError,
} from "../modules/auth/auth.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { prisma } from "../db/prisma.js";

const auth2faRoute: FastifyPluginAsync = async (app) => {
  // ─── Step 1: generate secret + QR URI ────────────────────────────────────

  app.post(
    "/api/auth/2fa/setup",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { sub } = request.authUser!;
      try {
        const data = await initiateTwoFactor(sub);
        return okResponse(data, "Scan the QR code in your authenticator app, then confirm with a code");
      } catch (error) {
        if (error instanceof TwoFactorAlreadyEnabledError) {
          return reply.status(409).send(errorResponse("2FA is already enabled"));
        }
        return replyWithError(reply, app.log, error, "Could not set up 2FA");
      }
    },
  );

  // ─── Step 2: confirm (enable) after scanning ──────────────────────────────

  const confirmSchema = z.object({
    token: z.string().trim().length(6).regex(/^\d{6}$/, "TOTP code must be 6 digits"),
    secret: z.string().trim().min(16),
    backupCodes: z.array(z.string().trim().min(8)).min(1).max(20),
    // S-007a: current password required to persist a new 2FA config on an
    // already-authenticated session.
    currentPassword: z.string().min(1),
  });

  app.post(
    "/api/auth/2fa/confirm",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { sub } = request.authUser!;
      const body = confirmSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid confirm payload", body.error.flatten()));
      }
      try {
        await confirmTwoFactor(
          sub,
          body.data.currentPassword,
          body.data.token,
          body.data.secret,
          body.data.backupCodes,
        );
        recordAudit({
          actorUserId: sub,
          actorRole: request.authUser!.role,
          action: "TWO_FACTOR_ENABLED" as never,
          entityType: "User",
          entityId: sub,
          metadata: {},
          request,
        }).catch(() => {});
        return okResponse({ enabled: true }, "2FA enabled");
      } catch (error) {
        if (error instanceof TwoFactorTokenInvalidError) {
          return reply.status(400).send(errorResponse("Invalid or expired TOTP code"));
        }
        if (error instanceof AuthInvalidCredentialsError) {
          return reply.status(400).send(errorResponse("Current password is incorrect"));
        }
        if (error instanceof TwoFactorAlreadyEnabledError) {
          return reply.status(409).send(errorResponse("2FA is already enabled"));
        }
        return replyWithError(reply, app.log, error, "Could not confirm 2FA");
      }
    },
  );

  // ─── Step 3: verify-login (after password check, before session cookie) ──

  const verifyLoginSchema = z.object({
    pendingToken: z.string().trim().min(20),
    token: z.string().trim().min(6).max(8),
  });

  app.post(
    "/api/auth/2fa/verify-login",
    {
      config: {
        // skipOnError: false (S-020) — TOTP/backup-code guessing must not
        // fall open just because the limiter's Redis store is unavailable.
        rateLimit:
          env.NODE_ENV === "development"
            ? { max: 200, timeWindow: "15 minutes", skipOnError: false }
            : { max: 10, timeWindow: "15 minutes", skipOnError: false },
      },
    },
    async (request, reply) => {
      const body = verifyLoginSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid 2FA payload", body.error.flatten()));
      }

      const pending = verifyPending2faToken(body.data.pendingToken);
      if (!pending) {
        return reply.status(401).send(errorResponse("2FA session expired. Please log in again."));
      }

      try {
        // Task 4: the pending token records which method this login started
        // with — TOTP (pre-existing) or EMAIL_OTP (the easy fallback).
        if (pending.method === "EMAIL_OTP") {
          const result = await verifyLoginOtp(pending.userId, body.data.token);
          if (!result.ok) {
            if (result.reason === "wrong_code") {
              return reply.status(401).send(errorResponse("Invalid code"));
            }
            return reply
              .status(401)
              .send(errorResponse("This code has expired. Request a new one."));
          }
        } else {
          const ok = await verifyTwoFactorLogin(pending.userId, body.data.token);
          if (!ok) {
            return reply.status(401).send(errorResponse("Invalid 2FA code"));
          }
        }

        const user = await getSafeUserById(pending.userId);
        if (!user || !user.isActive) {
          return reply.status(401).send(errorResponse("Account not found"));
        }

        const tokenVersion = await getUserTokenVersion(user.id);
        const sessionToken = signAuthToken({ sub: user.id, role: user.role, email: user.email, tokenVersion });
        reply.setCookie(env.AUTH_COOKIE_NAME, sessionToken, authCookieOptions());

        // Task 4: remember this device for 30 days so the next login skips
        // the second factor entirely while the cookie/row stay valid.
        const deviceToken = await issueTrustedDevice(user.id, request.headers["user-agent"]);
        reply.setCookie(TRUSTED_DEVICE_COOKIE_NAME, deviceToken, trustedDeviceCookieOptions());

        recordAudit({
          actorUserId: user.id,
          actorRole: user.role,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          metadata: { email: user.email, via: pending.method === "EMAIL_OTP" ? "email_otp" : "totp" },
          request,
        }).catch(() => {});

        return okResponse({ user }, "Logged in");
      } catch (error) {
        if (error instanceof TwoFactorNotConfiguredError) {
          return reply.status(400).send(errorResponse("2FA is not configured for this account"));
        }
        return replyWithError(reply, app.log, error, "Could not verify 2FA code");
      }
    },
  );

  // ─── Resend email-OTP code (pending-login only) ──────────────────────────

  const resendOtpSchema = z.object({
    pendingToken: z.string().trim().min(20),
  });

  app.post(
    "/api/auth/2fa/resend-otp",
    {
      // Tight cap — this sends an email per call. Independent of the
      // verify-login attempt limiter above.
      config: { rateLimit: { max: 5, timeWindow: "15 minutes", skipOnError: false } },
    },
    async (request, reply) => {
      const body = resendOtpSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }
      const pending = verifyPending2faToken(body.data.pendingToken);
      if (!pending) {
        return reply.status(401).send(errorResponse("2FA session expired. Please log in again."));
      }
      if (pending.method !== "EMAIL_OTP") {
        return reply.status(400).send(errorResponse("This login isn't using an email code"));
      }
      try {
        const user = await getSafeUserById(pending.userId);
        if (!user || !user.isActive) {
          return reply.status(401).send(errorResponse("Account not found"));
        }
        const code = await issueLoginOtp(user.id);
        await sendLoginOtpEmail({ to: user.email, fullName: user.fullName, code });
        return okResponse({ sent: true }, "A new code has been sent");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not send a new code");
      }
    },
  );

  // ─── Disable 2FA ─────────────────────────────────────────────────────────

  const disableSchema = z.object({
    currentPassword: z.string().min(1),
  });

  app.post(
    "/api/auth/2fa/disable",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { sub, role } = request.authUser!;
      const body = disableSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }
      try {
        await disableTwoFactor(sub, body.data.currentPassword);
        recordAudit({
          actorUserId: sub,
          actorRole: role,
          action: "TWO_FACTOR_DISABLED" as never,
          entityType: "User",
          entityId: sub,
          metadata: {},
          request,
        }).catch(() => {});
        return okResponse({ disabled: true }, "2FA disabled");
      } catch (error) {
        if (error instanceof TwoFactorNotConfiguredError) {
          return reply.status(400).send(errorResponse("2FA is not enabled on this account"));
        }
        if (error instanceof AuthInvalidCredentialsError) {
          return reply.status(400).send(errorResponse("Current password is incorrect"));
        }
        return replyWithError(reply, app.log, error, "Could not disable 2FA");
      }
    },
  );

  // ─── Status (is 2FA enabled?) ─────────────────────────────────────────────

  app.get(
    "/api/auth/2fa/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { sub } = request.authUser!;
      try {
        const user = await prisma.user.findUnique({
          where: { id: sub },
          select: { twoFactorEnabled: true, twoFactorEnabledAt: true },
        });
        if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
        return okResponse({
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
          twoFactorEnabledAt: user.twoFactorEnabledAt ?? null,
        });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not read 2FA status");
      }
    },
  );
};

export default auth2faRoute;
