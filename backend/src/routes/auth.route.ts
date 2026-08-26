import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { LocaleCode } from "@prisma/client";
import { promoteAppointmentConsents } from "../modules/consents/promote-appointment-consents.js";
import {
  AuthInvalidCredentialsError,
  cancelAccountDeletion,
  changeUserPassword,
  claimGuestAppointmentsForUser,
  claimGuestOrdersForUser,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  exportUserData,
  findUserByEmail,
  getSafeUserById,
  getUserTokenVersion,
  issueEmailVerificationToken,
  issuePasswordResetToken,
  loginUser,
  patchUserProfile,
  registerPatient,
  requestAccountDeletion,
  signOutAllDevices,
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
import {
  authCookieOptions,
  signAuthToken,
  signPending2faToken,
  trustedDeviceCookieOptions,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "../utils/auth-session.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { issueLoginOtp, isTrustedDevice } from "../modules/two-factor/login-otp.service.js";
import { sendLoginOtpEmail } from "../lib/email/templates.js";
import { alertSuspiciousLogin } from "../modules/security-alerts/security-alert.service.js";
import { prisma } from "../db/prisma.js";

export function clearRevokedSessionCookies(
  reply: {
    clearCookie: (name: string, options: ReturnType<typeof authCookieOptions>) => unknown;
  },
): void {
  reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
  reply.clearCookie(TRUSTED_DEVICE_COOKIE_NAME, trustedDeviceCookieOptions());
}

/** Exported for unit testing (see auth.route.schema.test.ts). Kept at
 *  module scope — was previously local to `authRoute`, which made the
 *  validation logic untestable without booting the full Fastify app. */
export const profilePatchSchema = z.object({
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
  /** UI language explicit choice (LanguageSwitcher, authenticated only).
   *  Uppercase LocaleCode to match the Prisma enum + every other
   *  locale-bearing request field in this backend (see country-scoped
   *  routes' `?locale=` convention). Null clears it. */
  preferredLocale: z.nativeEnum(LocaleCode).nullable().optional(),
});

/**
 * Best-effort brute-force detector for the failed-login path. Counts
 * LOGIN_FAILED audit rows in the last 15 minutes matching either the
 * attempted email or the request IP; fires a MEDIUM SecurityAlert via
 * alertSuspiciousLogin once the count hits the threshold.
 *
 * alertSuspiciousLogin already dedupes (same userId/reason/IP/day), so
 * no separate dedupe check is done here. Never throws — callers must
 * still treat this as fire-and-forget.
 */
async function checkSuspiciousLogin(email: string, ip: string | null): Promise<void> {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const count = await prisma.auditLog.count({
    where: {
      action: "LOGIN_FAILED",
      createdAt: { gte: since },
      OR: [
        { metadata: { path: ["email"], equals: email } },
        ...(ip ? [{ ipAddress: ip }] : []),
      ],
    },
  });
  if (count < 5) return;

  const user = await findUserByEmail(email);
  await alertSuspiciousLogin({
    userId: user?.id ?? "unknown",
    email,
    ipAddress: ip ?? "unknown",
    reason: "repeated_failed_logins",
    details: { failedAttempts: count, windowMinutes: 15 },
  });
}

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
      const result = await registerPatient(body.data);

      // S-024: an already-registered email must not surface via a distinct
      // status/response shape — same 200 envelope, no session, no PII of
      // the existing account. registerPatient already fired a best-effort
      // notice email to the real owner.
      if (result.kind === "exists") {
        return okResponse({ user: null }, "Account created");
      }

      const { user } = result;
      const token = signAuthToken({ sub: user.id, role: user.role, email: user.email, tokenVersion: 0 });
      reply.setCookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());

      // Guest appointments/orders matching this email are claimed only after
      // email ownership is proven — see consumeEmailVerificationToken (S-002).
      // Claiming here, before verification, would let an attacker register a
      // victim's email and immediately inherit the victim's bookings/orders.

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
      return replyWithError(reply, app.log, error, "Unexpected authentication error");
    }
  });

  app.post("/api/auth/login", {
    // 10 attempts per 15min per IP. Stops credential-stuffing without
    // breaking the typo-then-retry path real users hit. Relaxed in dev for E2E/manual runs.
    // skipOnError: false — unlike the global default, a limiter-store
    // outage must not silently let credential-stuffing through unthrottled.
    config: {
      rateLimit:
        env.NODE_ENV === "development"
          ? { max: 200, timeWindow: "15 minutes", skipOnError: false }
          : { max: 10, timeWindow: "15 minutes", skipOnError: false },
    },
  }, async (request, reply) => {
    const body = loginBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid login payload", body.error.flatten()));
    }
    try {
      const result = await loginUser(body.data);
      const { user } = result;

      // 2FA gate — password correct but a second factor is still required,
      // either because the account enrolled TOTP or because its role opted
      // into REQUIRE_2FA_FOR_ROLES (Task 4: phi-access-recovery-plan-2026-07-17).
      // A valid 30-day trusted-device cookie skips this entirely.
      const needs2fa = result.twoFactorEnabled || env.REQUIRE_2FA_FOR_ROLES.has(user.role);
      if (needs2fa) {
        const trustedToken = request.cookies[TRUSTED_DEVICE_COOKIE_NAME];
        const trusted = await isTrustedDevice(user.id, trustedToken);
        if (!trusted) {
          if (result.twoFactorEnabled) {
            // Enrolled TOTP — unchanged pre-Task-4 path.
            const pendingToken = signPending2faToken(user.id, "TOTP");
            return okResponse({ needs2fa: true, pendingToken, method: "TOTP" }, "2FA required");
          }
          // Privileged role, no TOTP enrolled — easy fallback: email a
          // 6-digit code instead of hard-blocking the login.
          let code: string;
          try {
            code = await issueLoginOtp(user.id);
            await sendLoginOtpEmail({ to: user.email, fullName: user.fullName, code });
          } catch (emailError) {
            app.log.error({ err: emailError, userId: user.id }, "Could not send login OTP email");
            return reply
              .status(503)
              .send(errorResponse("Could not send a sign-in code right now. Please try again shortly."));
          }
          const pendingToken = signPending2faToken(user.id, "EMAIL_OTP");
          return okResponse({ needs2fa: true, pendingToken, method: "EMAIL_OTP" }, "2FA required");
        }
        // Trusted device — fall through to a normal full-session login below.
      }

      const token = signAuthToken({
        sub: user.id,
        role: user.role,
        email: user.email,
        tokenVersion: result.tokenVersion,
      });
      reply.setCookie(env.AUTH_COOKIE_NAME, token, authCookieOptions());

      // First login after a guest booking should attach the historic
      // appointment(s) to this account — but only once email ownership is
      // proven. An unverified account (e.g. registered with someone else's
      // email) must never claim records on login either, or S-002's fix at
      // registration is trivially bypassed by logging in with the
      // attacker's own known password.
      if (user.emailVerifiedAt) {
        const claimed = await claimGuestAppointmentsForUser(user.id, user.email);
        if (claimed > 0) {
          app.log.info({ userId: user.id, claimed }, "Linked guest appointments on login");
        }
        promoteAppointmentConsents(user.id, user.email).catch((err) => {
          app.log.warn({ err, userId: user.id }, "Could not promote booking-time medical-access consents");
        });
        const claimedOrders = await claimGuestOrdersForUser(user.id, user.email);
        if (claimedOrders > 0) {
          app.log.info({ userId: user.id, claimed: claimedOrders }, "Linked guest orders on login");
        }
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
          // Leave entityId blank so admin filters by entityId don't conflate
          // attacker-supplied emails with real User.id values. The attempted
          // email still lives on metadata.email for forensics.
          entityId: "",
          metadata: { email: body.data.email.trim().toLowerCase(), reason: "invalid_credentials" },
          request,
        }).catch(() => {});

        // Fire-and-forget brute-force check — never blocks or breaks the
        // 401 response below.
        checkSuspiciousLogin(body.data.email.trim().toLowerCase(), request.ip ?? null).catch(
          (alertError) => {
            app.log.warn({ err: alertError }, "Could not run suspicious-login check");
          },
        );

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
      // nosemgrep: gh-route-raw-token-verify -- logout needs no prior authz gate (clearing your own cookie is always allowed); this only snapshots the actor id for the audit row before the session is torn down.
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
    // SendGrid quota or enumerate emails via timing. skipOnError: false —
    // a limiter-store outage must not let this fall open.
    config: { rateLimit: { max: 5, timeWindow: "1 hour", skipOnError: false } },
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
    // skipOnError: false (S-020) — this consumes the reset token, so a
    // limiter-store outage must not let token-guessing through unthrottled.
    config: { rateLimit: { max: 10, timeWindow: "1 hour", skipOnError: false } },
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
          // 2FA gate — same rule as /api/auth/login. Without it this path
          // minted a full session for REQUIRE_2FA_FOR_ROLES accounts, and
          // the portal then 403'd ("2FA required") with no code ever
          // emailed — the doctor's first login appeared broken.
          const twoFa = await prisma.user.findUnique({
            where: { id: user.id },
            select: { twoFactorEnabled: true },
          });
          const needs2fa =
            Boolean(twoFa?.twoFactorEnabled) || env.REQUIRE_2FA_FOR_ROLES.has(user.role);
          const trusted =
            needs2fa &&
            (await isTrustedDevice(user.id, request.cookies[TRUSTED_DEVICE_COOKIE_NAME]));
          if (needs2fa && !trusted) {
            if (twoFa?.twoFactorEnabled) {
              const pendingToken = signPending2faToken(user.id, "TOTP");
              return okResponse(
                { accepted: true, needs2fa: true, pendingToken, method: "TOTP" },
                "Password set. Enter your authenticator code to sign in.",
              );
            }
            try {
              const code = await issueLoginOtp(user.id);
              await sendLoginOtpEmail({ to: user.email, fullName: user.fullName, code });
            } catch (emailError) {
              app.log.error(
                { err: emailError, userId: user.id },
                "Could not send login OTP email after invite password set",
              );
              // Password IS set at this point — degrade to the manual
              // sign-in path instead of failing the whole request.
              return okResponse({ accepted: true }, "Password set. You can sign in now.");
            }
            const pendingToken = signPending2faToken(user.id, "EMAIL_OTP");
            return okResponse(
              { accepted: true, needs2fa: true, pendingToken, method: "EMAIL_OTP" },
              "Password set. Enter the code we emailed you to sign in.",
            );
          }
          const tokenVersion = await getUserTokenVersion(user.id);
          const sessionToken = signAuthToken({
            sub: user.id,
            role: user.role,
            email: user.email,
            tokenVersion,
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
      const result = await consumeEmailVerificationToken(body.data.token);
      if (!result) {
        return reply.status(400).send(errorResponse("Verification link is invalid or expired"));
      }
      if (result.claimedAppointments > 0 || result.claimedOrders > 0) {
        app.log.info(
          { userId: result.userId, claimedAppointments: result.claimedAppointments, claimedOrders: result.claimedOrders },
          "Linked guest appointments/orders on verified email",
        );
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
      // changeUserPassword bumps tokenVersion, so the session used for this
      // request is intentionally stale. Remove both local credentials now;
      // other devices are rejected by requireAuth on their next request.
      clearRevokedSessionCookies(reply);
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

  // GDPR: schedule the signed-in user's account for deletion after a 30-day
  // grace period. The account stays fully functional until then — no PII
  // is scrubbed yet and the session is NOT cleared, so the patient can keep
  // using the account or cancel the request from /account/security.
  app.delete("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.authUser!;
    try {
      const result = await requestAccountDeletion(payload.sub);
      return okResponse(result, "Account deletion scheduled. You have 30 days to cancel.");
    } catch (error) {
      return replyWithError(reply, app.log, error, "Could not schedule account deletion");
    }
  });

  // Cancel a pending grace-period deletion.
  app.post(
    "/api/auth/me/cancel-deletion",
    { preHandler: requireAuth },
    async (request, reply) => {
      const payload = request.authUser!;
      try {
        await cancelAccountDeletion(payload.sub);
        return okResponse({ cancelled: true }, "Account deletion cancelled");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not cancel account deletion");
      }
    },
  );

  // Sign out of all devices: bumps tokenVersion so every previously-issued
  // JWT (including this one) fails the tokenVersion check on its next
  // request, then clears this request's own cookie so the caller is logged
  // out immediately too, consistent with "all devices".
  app.post(
    "/api/account/security/sign-out-all",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const payload = request.authUser!;
      if (payload.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }
      try {
        await signOutAllDevices(payload.sub);
        reply.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions());
        reply.clearCookie(TRUSTED_DEVICE_COOKIE_NAME, trustedDeviceCookieOptions());
        return okResponse({ signedOut: true }, "Signed out of all devices");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not sign out of all devices");
      }
    },
  );
};

export default authRoute;
