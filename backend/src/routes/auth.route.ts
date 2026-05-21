import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  AuthConflictError,
  AuthInvalidCredentialsError,
  changeUserPassword,
  claimGuestAppointmentsForUser,
  claimGuestOrdersForUser,
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
import { replyWithError } from "../utils/reply-error.js";
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "../validations/auth.schema.js";
import { env } from "../config/env.js";
import { authCookieOptions, signAuthToken } from "../utils/auth-session.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";

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

      // Claim any historic guest bookings made with the same email.
      const claimed = await claimGuestAppointmentsForUser(user.id, user.email);
      if (claimed > 0) {
        app.log.info({ userId: user.id, claimed }, "Linked guest appointments on register");
      }
      const claimedOrders = await claimGuestOrdersForUser(user.id, user.email);
      if (claimedOrders > 0) {
        app.log.info({ userId: user.id, claimed: claimedOrders }, "Linked guest orders on register");
      }

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
      return replyWithError(reply, app.log, error, "Unexpected authentication error");
    }
  });

  app.post("/api/auth/login", {
    // 10 attempts per 15min per IP. Stops credential-stuffing without
    // breaking the typo-then-retry path real users hit. Relaxed in dev for E2E/manual runs.
    config: {
      rateLimit:
        env.NODE_ENV === "development"
          ? { max: 200, timeWindow: "15 minutes" }
          : { max: 10, timeWindow: "15 minutes" },
    },
  }, async (request, reply) => {
    const body = loginBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid login payload", body.error.flatten()));
    }
    try {
      const user = await loginUser(body.data);
      const token = signAuthToken({ sub: user.id, role: user.role, email: user.email });
      reply.setCookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());

      // First login after a guest booking should attach the historic
      // appointment(s) to this account.
      const claimed = await claimGuestAppointmentsForUser(user.id, user.email);
      if (claimed > 0) {
        app.log.info({ userId: user.id, claimed }, "Linked guest appointments on login");
      }
      const claimedOrders = await claimGuestOrdersForUser(user.id, user.email);
      if (claimedOrders > 0) {
        app.log.info({ userId: user.id, claimed: claimedOrders }, "Linked guest orders on login");
      }

      recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        metadata: { email: user.email },
        request,
      }).catch(() => {});

      return okResponse({ user }, "Logged in");
    } catch (error) {
      if (error instanceof AuthInvalidCredentialsError) {
        // Log the attempt with actorUserId=null so admin can spot
        // credential-stuffing bursts even when no user row matched.
        recordAudit({
          actorUserId: null,
          actorRole: null,
          action: "LOGIN_FAILED",
          entityType: "User",
          entityId: body.data.email.trim().toLowerCase(),
          metadata: { email: body.data.email.trim().toLowerCase(), reason: "invalid_credentials" },
          request,
        }).catch(() => {});
        return reply.status(401).send(errorResponse(error.message));
      }
      return replyWithError(reply, app.log, error, "Unexpected authentication error");
    }
  });

  app.post("/api/auth/logout", async (request, reply) => {
    // Snapshot the session payload before clearing the cookie so the
    // audit row carries who logged out.
    const token = request.cookies[env.AUTH_COOKIE_NAME];
    let payload: ReturnType<typeof signAuthToken extends never ? never : never> | null = null;
    if (token) {
      // Lazy import to avoid coupling at module-load; verifyAuthToken
      // is already exported from auth-session.
      const { verifyAuthToken } = await import("../utils/auth-session.js");
      payload = (verifyAuthToken(token) ?? null) as typeof payload;
    }
    reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
    if (payload && typeof payload === "object" && "sub" in payload) {
      recordAudit({
        actorUserId: (payload as { sub: string }).sub,
        actorRole:
          "role" in (payload as object)
            ? ((payload as { role?: string }).role ?? null)
            : null,
        action: "LOGOUT",
        entityType: "User",
        entityId: (payload as { sub: string }).sub,
        metadata: {
          email:
            "email" in (payload as object)
              ? ((payload as { email?: string }).email ?? null)
              : null,
        },
        request,
      }).catch(() => {});
    }
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
    /** ISO date or full datetime ("2001-04-12" or "2001-04-12T00:00:00Z").
     *  Accept either, normalize to start-of-day UTC in the service.
     *
     *  Tristate is meaningful here:
     *    - missing key (undefined) → leave existing DOB untouched
     *    - explicit `null` / `""`   → clear the stored DOB
     *    - valid date string         → set the DOB
     *  Earlier this transform mapped `undefined → null`, which silently
     *  wiped DOB on every partial PATCH that touched only e.g. fullName.
     */
    dateOfBirth: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === "" || v === null) return null;
        return v;
      })
      .refine(
        (v) => v === undefined || v === null || /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v),
        "Date of birth must be a YYYY-MM-DD date",
      ),
  });

  app.patch("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.authUser!;
    const parsed = profilePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid profile payload", parsed.error.flatten()));
    }
    try {
      const user = await patchUserProfile(payload.sub, parsed.data);
      return okResponse({ user }, "Profile updated");
    } catch (error) {
      return replyWithError(reply, app.log, error, "Could not update profile");
    }
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.authUser!;
    try {
      const user = await getSafeUserById(payload.sub);
      if (!user) {
        reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
        return reply.status(401).send(errorResponse("Not authenticated"));
      }
      return okResponse({ user });
    } catch (error) {
      return replyWithError(reply, app.log, error, "Unexpected authentication error");
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
    //
    // Token issuance + email dispatch run in the background so the
    // response latency doesn't differ between "user exists" and "user
    // missing" branches (closes the timing-side-channel that would
    // otherwise leak account existence). The endpoint always responds
    // 200 with the same message.
    void (async () => {
      try {
        const user = await findUserByEmail(body.data.email);
        if (!user || !user.isActive) return;
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
      } catch (error) {
        app.log.warn({ err: error }, "Forgot-password lookup failed");
      }
    })();
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
      const result = await consumePasswordResetToken(body.data.token, body.data.password);
      if (!result.ok) {
        return reply.status(400).send(errorResponse("Reset link is invalid or expired"));
      }

      // Invite path: mint a session cookie so the frontend can route
      // the doctor straight to /doctor on success. Requires BOTH that
      // the caller asked for invite mode AND that the token itself was
      // issued as an invite (isInvite=true on the row). This blocks a
      // stolen forgot-password token from being replayed with
      // `?invite=1` to forge a session. The forgot-password flow
      // (invite undefined or false) keeps the existing "set + sign in
      // manually" semantics regardless of the token kind.
      if (body.data.invite === true && result.isInvite) {
        const user = await getSafeUserById(result.userId);
        if (user && user.isActive) {
          const sessionToken = signAuthToken({
            sub: user.id,
            role: user.role,
            email: user.email,
          });
          reply.setCookie(env.AUTH_COOKIE_NAME, sessionToken, authCookieOptions());
          return okResponse(
            { accepted: true, user },
            "Password set. Welcome aboard.",
          );
        }
      }

      return okResponse({ accepted: true }, "Password updated. You can sign in now.");
    } catch (error) {
      return replyWithError(reply, app.log, error, "Could not reset password");
    }
  });

  // Verify the email-verification token sent on signup.
  const verifyEmailSchema = z.object({ token: z.string().trim().min(10).max(200) });
  app.post(
    "/api/auth/verify-email",
    // 20/hour/IP — covers typo-then-retry without enabling token-guessing.
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
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
      return replyWithError(reply, app.log, error, "Could not verify email");
    }
  },
  );

  // Authenticated password change — different from /reset-password (which
  // is for the forgot-flow). Requires the current password as a soft 2FA
  // step so a stolen cookie alone can't lock the user out.
  app.post(
    "/api/auth/change-password",
    {
      preHandler: requireAuth,
      // 10/hour/user — defense against stolen-cookie rotation attempts.
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
    const payload = request.authUser!;

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
      return replyWithError(reply, app.log, error, "Could not change password");
    }
  });

  // Allow logged-in users to request a fresh verification email.
  app.post(
    "/api/auth/resend-verification",
    {
      preHandler: requireAuth,
      // 5/hour/user — protects the SendGrid quota.
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
    const payload = request.authUser!;
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
      return replyWithError(reply, app.log, error, "Could not send verification email");
    }
  },
  );

  // GDPR: dump everything we hold about the signed-in user as JSON.
  // Always served with Content-Disposition so the browser saves it as
  // a file rather than rendering it.
  app.get("/api/auth/me/export", { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.authUser!;
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
      return replyWithError(reply, app.log, error, "Could not export data");
    }
  });

  // GDPR: soft-delete the signed-in user's account. PII is scrubbed but
  // booking history is preserved (regulatory / Stripe ledger). The
  // session cookie is cleared on success.
  app.delete("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.authUser!;
    try {
      await deleteOwnAccount(payload.sub);
      reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
      return okResponse({ deleted: true }, "Account deleted");
    } catch (error) {
      return replyWithError(reply, app.log, error, "Could not delete account");
    }
  });
};

export default authRoute;
