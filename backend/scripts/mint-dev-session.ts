/**
 * Mint a session cookie for an existing dev user, without ever handling their
 * password.
 *
 * Why this exists: driving the admin/patient/doctor portals from a browser
 * automation tool (Playwright, an agent's browser pane) needs an authenticated
 * session, and typing a password into a login form is something an agent
 * should refuse — even one it can read from `.env.dev`. The alternative this
 * script gives instead: sign the exact same RS256 JWT `signAuthToken` issues
 * on a real login, for a user who already exists in the target database, and
 * hand back the cookie so a test harness can call
 * `context.addCookies([...])` directly. No password is read, no login form is
 * touched, and the token this produces is byte-for-byte what `/api/auth/login`
 * would have minted for the same user.
 *
 * SAFETY — this is not a login bypass for anywhere but a local database:
 *
 *   - refuses outright unless `DATABASE_URL`'s host is on the same allowlist
 *     `scripts/guard-db-target.mjs` uses for mutating Prisma commands
 *     (localhost / 127.0.0.1 / DB_GUARD_ALLOWED_HOSTS) — a session for a
 *     production account is not a smaller ask than a production migration;
 *   - requires the user to ALREADY EXIST and be `isActive` — it signs a
 *     session for a real row, it does not create one;
 *   - never prints or logs the private key, only the resulting cookie.
 *
 * Usage:
 *   node --env-file=.env.dev --import tsx scripts/mint-dev-session.ts <email> [--json]
 *
 * Plain output is `NAME=VALUE`, ready for a `Cookie` header. `--json` prints
 * the shape Playwright's `addCookies` wants:
 *   [{ name, value, domain, path, httpOnly, secure, sameSite }]
 */
import "dotenv/config";
import { URL } from "node:url";
import { prisma } from "../src/db/prisma.js";
import { authCookieOptions, signAuthToken } from "../src/utils/auth-session.js";

const DEFAULT_ALLOWED = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres-test"]);

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

function assertDevDatabase(databaseUrl: string | undefined): void {
  const host = hostOf(databaseUrl ?? "");
  if (!databaseUrl || !host) {
    throw new Error("DATABASE_URL is missing or unparseable — nothing to mint a session against.");
  }
  const extra = (process.env.DB_GUARD_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (DEFAULT_ALLOWED.has(host) || extra.includes(host)) return;
  if (process.env.DB_GUARD_ALLOW_HOST === host) {
    console.warn(`[mint-dev-session] minting against ${host} — allowed by DB_GUARD_ALLOW_HOST.`);
    return;
  }
  throw new Error(
    [
      "",
      `  Refusing to mint a session against ${host}.`,
      "",
      "  This script signs a real, usable auth cookie for an existing account —",
      "  that is not a smaller thing to hand to a non-dev database than a",
      "  migration is, and guard-db-target.mjs refuses those the same way.",
      "",
      "  Run it against the dev database instead:",
      "      node --env-file=.env.dev --import tsx scripts/mint-dev-session.ts <email>",
      "",
      `  If you really mean ${host}, name it:`,
      `      DB_GUARD_ALLOW_HOST=${host} node --import tsx scripts/mint-dev-session.ts <email>`,
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const [email, ...rest] = process.argv.slice(2);
  const asJson = rest.includes("--json");
  if (!email) {
    console.error("Usage: mint-dev-session.ts <email> [--json]");
    process.exitCode = 1;
    return;
  }

  assertDevDatabase(process.env.DATABASE_URL);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user) throw new Error(`No user with email ${email} in this database.`);
    if (!user.isActive) throw new Error(`${email} exists but is not active.`);

    const token = signAuthToken({
      sub: user.id,
      role: user.role as
        | "PATIENT"
        | "ADMIN"
        | "DOCTOR"
        | "LOCAL_ADMIN"
        | "SUPER_ADMIN"
        | "CORPORATE_ADMIN",
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    const cookieName = process.env.AUTH_COOKIE_NAME ?? "gh_auth";
    if (asJson) {
      const opts = authCookieOptions();
      const domain = new URL(process.env.PUBLIC_SITE_URL ?? "http://localhost:3000").hostname;
      console.log(
        JSON.stringify(
          [
            {
              name: cookieName,
              value: token,
              domain: opts.secure ? domain : "localhost",
              path: opts.path,
              httpOnly: opts.httpOnly,
              secure: opts.secure,
              sameSite: "Lax",
            },
          ],
          null,
          2,
        ),
      );
    } else {
      console.log(`${cookieName}=${token}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
