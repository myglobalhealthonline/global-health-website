import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { SignJWT, exportSPKI, generateKeyPair } from "jose";
import nextConfig from "../../next.config";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { GONE_PATHS } from "@/lib/seo/gone-content";

/**
 * Batch 15b — the dotted-path proxy bypass.
 *
 * `proxy.ts` short-circuited on `PUBLIC_FILE = /\.(.*)$/` — a dot ANYWHERE in
 * the pathname, not a file extension — before role routing, before the trusted
 * `x-gh-*` request-context stamping, and before the CSP/nonce is chosen. The
 * two patient-record routes address the patient by email:
 *
 *     /admin/patients/[email]     app/(portal)/(admin)/admin/patients/[email]
 *     /doctor/patients/[email]    app/(portal)/(doctor)/doctor/patients/[email]
 *
 * and `encodeURIComponent` does not encode `.`, so every real link into them
 * carries a literal dot (`john.doe%40example.test`). Those application
 * documents were therefore served as if they were files in `/public`:
 *
 *   - no Content-Security-Policy at all, on the one route family where PHI is
 *     rendered and where the nonce/'strict-dynamic' policy is supposed to run;
 *   - no nonce, so Next could not stamp one on its own scripts;
 *   - no `x-gh-pathname` / `x-gh-locale` / `x-gh-country`, and no set-or-delete
 *     of the client-controllable `x-gh-role` / `x-gh-email`;
 *   - the edge role gate skipped.
 *
 * The layouts' own `getServerAuthUser()` checks still authorized the render, so
 * this was never an access-control hole — but the missing portal CSP is real,
 * and Batch 15's `<html lang>` rule keys off `x-gh-pathname`, so admin patient
 * pages fell outside its contract too.
 *
 * The invariants pinned here:
 *
 *  BYPASS-1  A request under /account, /admin, /doctor or /corporate that is
 *            not a subresource fetch is processed normally, however many dots
 *            it carries.
 *  BYPASS-2  Only a request the CLIENT declares to be a subresource fetch
 *            (`sec-fetch-dest: image|font|style|...`) may skip the proxy. A
 *            pathname extension never decides it, so a patient address ending
 *            `.com` or `.pt` cannot bypass anything.
 *  BYPASS-3  Dotted and dotless routes get IDENTICAL role decisions. This
 *            batch must not widen or narrow who may reach a patient record.
 *  BYPASS-4  Dotted portal documents get the portal nonce CSP; the Memed
 *            appointment exception is unchanged.
 *  BYPASS-5  Client-supplied `x-gh-*` / `x-nonce` / CSP request headers are
 *            overwritten or deleted, never trusted.
 *  BYPASS-6  Genuine static assets still load and never become login
 *            redirects.
 *
 * Every identity below is synthetic and uses the RFC 6761 reserved
 * `example.test` domain. No PHI, no real patient data, no backend, database or
 * network contact. Nothing prints a token, cookie or nonce value.
 */

/* ------------------------------------------------------------- test keypair */

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
const KEY_BEFORE = process.env.AUTH_JWT_PUBLIC_KEY;
process.env.AUTH_JWT_PUBLIC_KEY = await exportSPKI(publicKey);

// Restored rather than left set: Vitest reuses worker PROCESSES across files
// (module registries are isolated, `process.env` is not), so leaving a valid
// key behind would silently arm `resolveSession` for any later file that means
// to exercise the missing-key path. `vi.unstubAllEnvs` cannot undo a raw
// assignment, and the assignment has to happen before the import below.
afterAll(() => {
  if (KEY_BEFORE === undefined) delete process.env.AUTH_JWT_PUBLIC_KEY;
  else process.env.AUTH_JWT_PUBLIC_KEY = KEY_BEFORE;
});

// Imported AFTER the key is in the environment: `proxy.ts` caches the imported
// SPKI on first use, so the env var has to be set before the module evaluates.
const { proxy, CACHEABLE_ASSET_PATH } = await import("@/proxy");

type SessionRole =
  | "PATIENT"
  | "ADMIN"
  | "DOCTOR"
  | "LOCAL_ADMIN"
  | "SUPER_ADMIN"
  | "CORPORATE_ADMIN";

const STAFF_EMAIL = "staff@example.test";

/** A valid session cookie for `role`. Synthetic subject, one-hour lifetime. */
function sessionCookie(role: SessionRole, email = STAFF_EMAIL) {
  return new SignJWT({ role, email })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("global-health-backend")
    .setAudience("global-health-website")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

/* -------------------------------------------------------- request builders */

const ORIGIN = "https://www.myglobalhealth.online";

/** A patient identifier as the app actually builds it: `encodeURIComponent`
 *  leaves `.` alone and turns `@` into `%40`. */
const DOTTED_PATIENT = "john.doe%40example.test";
const ADMIN_RECORD = `/admin/patients/${DOTTED_PATIENT}`;
const DOCTOR_RECORD = `/doctor/patients/${DOTTED_PATIENT}`;

type RequestOptions = {
  /** `sec-fetch-dest`. `null` for a client that sends none (curl, a bot, an
   *  older browser); omitted means a normal document navigation. */
  dest?: string | null;
  role?: SessionRole;
  /** Raw cookie value, for the unparseable-token case. */
  token?: string;
  headers?: Record<string, string>;
};

async function buildRequest(pathname: string, options: RequestOptions = {}) {
  const headers = new Headers({ host: "www.myglobalhealth.online", ...options.headers });
  const dest = options.dest === undefined ? "document" : options.dest;
  if (dest !== null) headers.set("sec-fetch-dest", dest);
  const request = new NextRequest(`${ORIGIN}${pathname}`, { headers });
  const token = options.token ?? (options.role ? await sessionCookie(options.role) : null);
  if (token) request.cookies.set(AUTH_COOKIE_NAME, token);
  return request;
}

const run = async (pathname: string, options: RequestOptions = {}) =>
  proxy(await buildRequest(pathname, options));

/* ---------------------------------------------------------- reading it back */

/** The request headers the proxy forwards downstream. `NextResponse.next({
 *  request: { headers } })` encodes them as `x-middleware-override-headers`
 *  (the name list) plus one `x-middleware-request-<name>` per value — the same
 *  wire format Next itself decodes. `null` when the proxy forwarded none, i.e.
 *  it bypassed or answered the request itself. */
function forwardedHeaders(response: NextResponse): Headers | null {
  const names = response.headers.get("x-middleware-override-headers");
  if (names === null) return null;
  const forwarded = new Headers();
  for (const name of names.split(",").map((n) => n.trim()).filter(Boolean)) {
    const value = response.headers.get(`x-middleware-request-${name}`);
    if (value !== null) forwarded.set(name, value);
  }
  return forwarded;
}

/**
 * What the proxy did with the request. "processed" is keyed off the response
 * CSP, which the proxy sets unconditionally on the same code path that does the
 * role gating and the header stamping — so its absence IS the bypass.
 */
type Outcome =
  | { kind: "redirect"; status: number; pathname: string; next: string | null }
  | { kind: "gone" }
  | { kind: "bypassed" }
  | { kind: "processed"; csp: string; forwarded: Headers };

function classify(response: NextResponse): Outcome {
  const location = response.headers.get("location");
  if (location !== null) {
    const url = new URL(location);
    return {
      kind: "redirect",
      status: response.status,
      pathname: url.pathname,
      next: url.searchParams.get("next"),
    };
  }
  if (response.status === 410) return { kind: "gone" };
  const csp = response.headers.get("content-security-policy");
  const forwarded = forwardedHeaders(response);
  if (csp === null || forwarded === null) return { kind: "bypassed" };
  return { kind: "processed", csp, forwarded };
}

const outcomeOf = async (pathname: string, options: RequestOptions = {}) =>
  classify(await run(pathname, options));

/** The role decision with the path-specific parts stripped, so a dotted and a
 *  dotless route can be compared for equality. */
function roleDecision(outcome: Outcome) {
  if (outcome.kind === "redirect") {
    return { kind: "redirect" as const, status: outcome.status, to: outcome.pathname };
  }
  return { kind: outcome.kind };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/* --------------------------- BYPASS-1: dotted documents are processed */

describe("BYPASS-1 — dotted application documents are never treated as files", () => {
  const DOTTED_DOCUMENTS: Array<[string, SessionRole, string]> = [
    [ADMIN_RECORD, "ADMIN", "an admin patient record keyed by email"],
    [DOCTOR_RECORD, "DOCTOR", "a doctor patient record keyed by email"],
    ["/admin/patients/a.b.c%40d.example.test", "ADMIN", "several dotted segments"],
    ["/admin/patients/jane%2Eroe%40example.test", "ADMIN", "a percent-encoded dot"],
    ["/admin/patients/buyer%40shop.com", "ADMIN", "an address ending in .com"],
    ["/doctor/patients/paciente%40clinica.pt", "DOCTOR", "an address ending in .pt"],
    ["/admin/records/record.v2", "ADMIN", "a non-email slug with a dot"],
    ["/account/documents/report.2026", "PATIENT", "a patient document slug with a dot"],
    ["/corporate/employees/a.b%40example.test", "CORPORATE_ADMIN", "a corporate route"],
  ];

  for (const [pathname, role, why] of DOTTED_DOCUMENTS) {
    it(`processes ${pathname} (${why})`, async () => {
      expect((await outcomeOf(pathname, { role })).kind).toBe("processed");
    });
  }

  it("stamps the real dotted pathname on x-gh-pathname", async () => {
    const outcome = await outcomeOf(ADMIN_RECORD, { role: "ADMIN" });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.forwarded.get("x-gh-pathname")).toBe(ADMIN_RECORD);
    expect(outcome.forwarded.get("x-gh-locale")).toBeTruthy();
    expect(outcome.forwarded.get("x-gh-country")).toBeTruthy();
  });

  it("keeps a dotted query string out of the equation", async () => {
    // The dot is in the search, not the path, so the pathname is clean and the
    // outcome must match the same route without the query.
    const withQuery = await outcomeOf("/account/settings?tab=a.b", { role: "PATIENT" });
    const without = await outcomeOf("/account/settings", { role: "PATIENT" });
    expect(withQuery.kind).toBe("processed");
    expect(roleDecision(withQuery)).toEqual(roleDecision(without));
  });

  const NAVIGATION_KINDS: Array<[string, RequestOptions, string]> = [
    ["a document navigation", { dest: "document" }, "a full page load"],
    ["an RSC navigation", { dest: "empty", headers: { rsc: "1" } }, "a client-side route change"],
    [
      "a router prefetch",
      { dest: "empty", headers: { rsc: "1", "next-router-prefetch": "1" } },
      "a <Link> prefetch",
    ],
    ["a client sending no sec-fetch-dest", { dest: null }, "curl or an older browser"],
  ];

  for (const [label, options, why] of NAVIGATION_KINDS) {
    it(`processes the dotted admin record on ${label} (${why})`, async () => {
      const outcome = await outcomeOf(ADMIN_RECORD, { role: "ADMIN", ...options });
      expect(outcome.kind).toBe("processed");
    });
  }

  it("still lets a Server Action through without an edge redirect", async () => {
    // A raw edge redirect is not a parseable Server Action response, so the
    // role gate is deliberately skipped for these and the action's own auth
    // check decides. Unchanged by this batch — but the request must still be
    // PROCESSED (CSP, context headers), which the dotted bypass skipped.
    const outcome = await outcomeOf(ADMIN_RECORD, {
      dest: "empty",
      headers: { "next-action": "7f3c9b" },
    });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.forwarded.get("x-gh-pathname")).toBe(ADMIN_RECORD);
  });

  it("gives a Server Action on a dotted path the dotless treatment", async () => {
    const dotted = await outcomeOf(ADMIN_RECORD, {
      dest: "empty",
      headers: { "next-action": "7f3c9b" },
    });
    const dotless = await outcomeOf("/admin/patients/plain-id", {
      dest: "empty",
      headers: { "next-action": "7f3c9b" },
    });
    expect(roleDecision(dotted)).toEqual(roleDecision(dotless));
  });
});

/* ------------------------------ BYPASS-2: what may actually bypass */

describe("BYPASS-2 — only a declared subresource fetch may skip the proxy", () => {
  const ASSET_DESTS = ["image", "font", "style", "audio", "video", "track"];

  for (const dest of ASSET_DESTS) {
    it(`bypasses a sec-fetch-dest: ${dest} request`, async () => {
      expect((await outcomeOf("/images/hero/homepage-hero-ai.svg", { dest })).kind).toBe(
        "bypassed",
      );
    });
  }

  const NON_ASSET_DESTS = ["document", "iframe", "frame", "empty", "object", "embed", "worker"];

  for (const dest of NON_ASSET_DESTS) {
    it(`does NOT bypass a sec-fetch-dest: ${dest} request`, async () => {
      expect((await outcomeOf("/images/hero/homepage-hero-ai.svg", { dest })).kind).toBe(
        "processed",
      );
    });
  }

  it("does not bypass a dotted admin document that merely LOOKS like a file", async () => {
    // The whole defect: an extension-shaped tail on an application route. A
    // final-segment-only regex would still let every one of these through.
    for (const pathname of [
      "/admin/patients/user%40mail.com",
      "/admin/patients/user%40mail.png",
      "/admin/patients/user%40mail.svg",
      "/doctor/patients/user%40mail.txt",
      "/admin/patients/user%40mail.ico",
    ]) {
      expect((await outcomeOf(pathname, { role: "SUPER_ADMIN" })).kind, pathname).toBe("processed");
    }
  });

  it("keeps the framework and API exclusions", async () => {
    for (const pathname of ["/_next/static/chunks/main.js", "/_next/image", "/favicon.ico"]) {
      expect((await outcomeOf(pathname, { dest: "empty" })).kind, pathname).toBe("bypassed");
    }
    // /api/** is proxied to the backend and must never collect a frontend CSP
    // or a role redirect.
    expect((await outcomeOf("/api/auth/me", { dest: "empty" })).kind).toBe("bypassed");
  });
});

/* ------------------------------- BYPASS-3: dotted/dotless parity */

describe("BYPASS-3 — dotted routes get exactly the dotless role decision", () => {
  const PAIRS: Array<[string, string]> = [
    [ADMIN_RECORD, "/admin/patients/plain-id"],
    [DOCTOR_RECORD, "/doctor/patients/plain-id"],
    ["/account/documents/report.2026", "/account/documents/report-2026"],
  ];

  const ROLES: Array<[string, RequestOptions]> = [
    ["an authorized ADMIN", { role: "ADMIN" }],
    ["an authorized SUPER_ADMIN", { role: "SUPER_ADMIN" }],
    ["a LOCAL_ADMIN", { role: "LOCAL_ADMIN" }],
    ["an authorized DOCTOR", { role: "DOCTOR" }],
    ["a PATIENT", { role: "PATIENT" }],
    ["a CORPORATE_ADMIN", { role: "CORPORATE_ADMIN" }],
    ["an unauthenticated visitor", {}],
    ["a visitor with an unparseable cookie", { token: "not-a-jwt" }],
  ];

  for (const [dotted, dotless] of PAIRS) {
    for (const [who, options] of ROLES) {
      it(`${who} on ${dotted} matches ${dotless}`, async () => {
        const a = await outcomeOf(dotted, options);
        const b = await outcomeOf(dotless, options);
        expect(roleDecision(a)).toEqual(roleDecision(b));
      });
    }
  }

  it("still lets ADMIN, SUPER_ADMIN and LOCAL_ADMIN reach the dotted admin record", async () => {
    // Positive control. A previous authorization change locked staff OUT of
    // legitimate patient data; this batch must not repeat that.
    for (const role of ["ADMIN", "SUPER_ADMIN", "LOCAL_ADMIN"] as const) {
      expect((await outcomeOf(ADMIN_RECORD, { role })).kind, role).toBe("processed");
    }
  });

  it("still lets DOCTOR, SUPER_ADMIN and LOCAL_ADMIN reach the dotted doctor record", async () => {
    for (const role of ["DOCTOR", "SUPER_ADMIN", "LOCAL_ADMIN"] as const) {
      expect((await outcomeOf(DOCTOR_RECORD, { role })).kind, role).toBe("processed");
    }
  });

  it("sends an unauthenticated visitor to /login carrying the dotted path", async () => {
    expect(await outcomeOf(ADMIN_RECORD)).toMatchObject({
      kind: "redirect",
      pathname: "/login",
      next: ADMIN_RECORD,
    });
  });

  it("bounces a PATIENT off the dotted admin record to /account", async () => {
    expect(await outcomeOf(ADMIN_RECORD, { role: "PATIENT" })).toMatchObject({
      kind: "redirect",
      pathname: "/account",
    });
  });

  it("bounces an ADMIN off the dotted doctor record to /admin", async () => {
    expect(await outcomeOf(DOCTOR_RECORD, { role: "ADMIN" })).toMatchObject({
      kind: "redirect",
      pathname: "/admin",
    });
  });

  it("bounces a DOCTOR off the dotted account route to /doctor", async () => {
    expect(await outcomeOf("/account/documents/report.2026", { role: "DOCTOR" })).toMatchObject({
      kind: "redirect",
      pathname: "/doctor",
    });
  });

  it("fails CLOSED in production when the verification key is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    vi.stubEnv("AUTH_JWT_PUBLIC_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const { proxy: freshProxy } = await import("@/proxy");
    const dotted = classify(await freshProxy(await buildRequest(ADMIN_RECORD, { role: "ADMIN" })));
    const dotless = classify(
      await freshProxy(await buildRequest("/admin/patients/plain-id", { role: "ADMIN" })),
    );
    expect(dotted).toMatchObject({ kind: "redirect", pathname: "/login" });
    expect(roleDecision(dotted)).toEqual(roleDecision(dotless));
  });
});

/* ----------------------------------- BYPASS-4: CSP and the nonce */

describe("BYPASS-4 — dotted portal documents get the portal nonce CSP", () => {
  it("gives the dotted admin record the nonce/strict-dynamic policy", async () => {
    const outcome = await outcomeOf(ADMIN_RECORD, { role: "ADMIN" });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.csp).toContain("'strict-dynamic'");
    expect(outcome.csp).toMatch(/script-src 'nonce-[^']+'/);
    // Next reads the nonce off the REQUEST header to stamp its own scripts.
    const nonce = outcome.forwarded.get("x-nonce");
    expect(nonce).toBeTruthy();
    expect(outcome.csp).toContain(`'nonce-${nonce}'`);
    expect(outcome.forwarded.get("content-security-policy")).toBe(outcome.csp);
  });

  it("gives the dotted doctor record the nonce policy too", async () => {
    const outcome = await outcomeOf(DOCTOR_RECORD, { role: "DOCTOR" });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.csp).toMatch(/script-src 'nonce-[^']+'/);
    expect(outcome.forwarded.get("x-nonce")).toBeTruthy();
  });

  it("mints a fresh nonce per request", async () => {
    const first = await outcomeOf(ADMIN_RECORD, { role: "ADMIN" });
    const second = await outcomeOf(ADMIN_RECORD, { role: "ADMIN" });
    if (first.kind !== "processed" || second.kind !== "processed") {
      throw new Error("expected both requests to be processed");
    }
    expect(first.forwarded.get("x-nonce")).not.toBe(second.forwarded.get("x-nonce"));
  });

  it("leaves the Memed appointment exception exactly as it was", async () => {
    // /doctor/appointments/** deliberately drops the nonce so 'unsafe-inline'
    // takes effect for the Memed widget's own inline script. Not this batch's
    // business — pinned so the change cannot disturb it.
    const outcome = await outcomeOf("/doctor/appointments/appt-1", { role: "DOCTOR" });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.csp).toContain("https://integrations.memed.com.br");
    expect(outcome.csp).not.toContain("nonce-");
    expect(outcome.forwarded.get("x-nonce")).toBeNull();
  });

  it("gives a dotted PUBLIC document the public policy, not the portal one", async () => {
    const outcome = await outcomeOf("/blog/why-a.b-matters");
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.csp).toContain("'unsafe-inline'");
    expect(outcome.csp).not.toContain("nonce-");
  });
});

/* ------------------------------- BYPASS-5: no trusting the client */

describe("BYPASS-5 — client-supplied context headers are never trusted", () => {
  const SPOOFED = {
    "x-gh-pathname": "/account",
    "x-gh-locale": "cs",
    "x-gh-country": "CZ",
    "x-gh-role": "SUPER_ADMIN",
    "x-gh-email": "attacker@example.test",
    "x-nonce": "attacker-nonce",
    "content-security-policy": "default-src *",
  };

  it("overwrites every spoofed header on the dotted admin record", async () => {
    const outcome = await outcomeOf(ADMIN_RECORD, { role: "ADMIN", headers: SPOOFED });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    const { forwarded, csp } = outcome;
    expect(forwarded.get("x-gh-pathname")).toBe(ADMIN_RECORD);
    expect(forwarded.get("x-gh-role")).toBe("ADMIN");
    expect(forwarded.get("x-gh-email")).toBe(STAFF_EMAIL);
    expect(forwarded.get("x-nonce")).not.toBe("attacker-nonce");
    expect(forwarded.get("content-security-policy")).not.toBe("default-src *");
    expect(csp).not.toBe("default-src *");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("DELETES a spoofed role and email when there is no session", async () => {
    const outcome = await outcomeOf("/blog/a.b", { headers: SPOOFED });
    expect(outcome.kind).toBe("processed");
    if (outcome.kind !== "processed") return;
    expect(outcome.forwarded.get("x-gh-role")).toBeNull();
    expect(outcome.forwarded.get("x-gh-email")).toBeNull();
  });

  it("cannot be talked out of the role gate by other fetch-metadata headers", async () => {
    // `sec-fetch-dest` is browser-set and forbidden to script, but the
    // surrounding metadata must not matter either: a request that says
    // "document" is gated regardless of mode/site.
    const outcome = await outcomeOf(ADMIN_RECORD, {
      dest: "document",
      headers: { "sec-fetch-mode": "no-cors", "sec-fetch-site": "cross-site" },
    });
    expect(outcome).toMatchObject({ kind: "redirect", pathname: "/login" });
  });
});

describe("BYPASS-5b — the SKIP path scrubs them too", () => {
  // `Sec-Fetch-Dest` is browser-set and forbidden to script, but a non-browser
  // client can put any value on it, so "only assets take the skip path" is a
  // browser-context guarantee and not a server-side one. The scrub therefore
  // cannot be conditional on it.
  const SPOOFED_ON_SKIP = {
    "x-gh-pathname": "/account",
    "x-gh-role": "SUPER_ADMIN",
    "x-gh-email": "attacker@example.test",
    "x-nonce": "attacker-nonce",
    "content-security-policy": "default-src *",
  };

  const SKIP_PATHS: Array<[string, RequestOptions]> = [
    ["/images/hero/homepage-hero-ai.svg", { dest: "image" }],
    [ADMIN_RECORD, { dest: "image" }],
    ["/admin/patients/plain-id", { dest: "image" }],
    ["/_next/static/chunks/main.js", { dest: "script" }],
    ["/api/auth/me", { dest: "empty" }],
    ["/favicon.ico", { dest: "image" }],
  ];

  for (const [pathname, options] of SKIP_PATHS) {
    it(`drops every client-supplied trusted header on ${pathname}`, async () => {
      const response = await run(pathname, { ...options, headers: SPOOFED_ON_SKIP });
      expect(classify(response).kind, pathname).toBe("bypassed");
      const forwarded = forwardedHeaders(response);
      // A scrub happened, so the proxy forwarded a rewritten header set.
      expect(forwarded, pathname).not.toBeNull();
      for (const name of Object.keys(SPOOFED_ON_SKIP)) {
        expect(forwarded?.get(name), `${pathname} / ${name}`).toBeNull();
      }
    });
  }

  it("forwards nothing at all when the client sent no trusted header", async () => {
    // The common case must stay allocation-free: a plain `next()`, no rewritten
    // header set. Asserted so the scrub cannot quietly become unconditional.
    const response = await run("/images/hero/homepage-hero-ai.svg", { dest: "image" });
    expect(forwardedHeaders(response)).toBeNull();
  });

  it("leaves the client's ordinary headers alone", async () => {
    const response = await run("/images/hero/homepage-hero-ai.svg", {
      dest: "image",
      headers: { "x-gh-role": "SUPER_ADMIN", "accept-language": "cs-CZ" },
    });
    const forwarded = forwardedHeaders(response);
    expect(forwarded?.get("x-gh-role")).toBeNull();
    expect(forwarded?.get("accept-language")).toBe("cs-CZ");
  });
});

/* ------------------- BYPASS-7: no Set-Cookie on a cacheable asset */

describe("BYPASS-7 — cookies never land on a shared-cacheable asset response", () => {
  /** `next.config.ts` stamps `public, max-age=3600, must-revalidate` on these
   *  extensions with no `private` and no `Vary: Cookie`. Before Batch 15b they
   *  all carried a dot and returned early, so the cookie writes at the end of
   *  `proxy()` never met one; a metadata-less client now reaches them. */
  const CACHEABLE_ASSETS = [
    "/images/hero/homepage-hero-ai.svg",
    "/images/hero/ireland-hero-photo.png",
    "/images/hero/country-entry-clinic-hero-2560.webp",
    "/images/hero/country-entry-clinic-hero-2560.avif",
    "/logos/global-health-light.png",
    "/favicon.png",
  ];

  for (const pathname of CACHEABLE_ASSETS) {
    it(`${pathname} carries no Set-Cookie for an anonymous metadata-less client`, async () => {
      // Anonymous is the strict case: the auth hint is DELETED for a null
      // role, and a delete is still a Set-Cookie on the wire.
      const response = await run(pathname, { dest: null });
      expect(response.headers.get("set-cookie"), pathname).toBeNull();
    });

    it(`${pathname} carries no Set-Cookie for a signed-in metadata-less client`, async () => {
      const response = await run(pathname, { dest: null, role: "PATIENT" });
      expect(response.headers.get("set-cookie"), pathname).toBeNull();
    });
  }

  it("still writes the locale cookie on a real localized document", async () => {
    // The guard must not disarm the feature it sits next to.
    const response = await run("/ireland/cs/doctors", { dest: "document" });
    expect(response.headers.get("set-cookie")).toContain("gh_locale=cs");
  });

  it("still writes the auth hint on a real portal document", async () => {
    const response = await run("/account", { dest: "document", role: "PATIENT" });
    expect(response.headers.get("set-cookie")).toContain("gh-auth-hint=1");
  });

  it("still clears the auth hint on an anonymous document", async () => {
    const response = await run("/blog/a-post", { dest: "document" });
    expect(response.headers.get("set-cookie")).toContain("gh-auth-hint=");
  });

  it("covers exactly the extensions next.config.ts marks shared-cacheable", async () => {
    // Two files that have to agree. `next.config.ts` owns the Cache-Control;
    // `proxy.ts` owns the cookie suppression. If someone adds `.gif` to one and
    // not the other, a Set-Cookie starts riding a cacheable response again.
    const rules = (await nextConfig.headers!()) as Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
    const assetRule = rules.find(
      (rule) =>
        /^\/:all\*\(/.test(rule.source) &&
        rule.headers.some(
          (header) =>
            header.key.toLowerCase() === "cache-control" && header.value.includes("public"),
        ),
    );
    expect(assetRule, "the extension-based public cache rule").toBeTruthy();
    const extensions = assetRule!.source.match(/\(([^)]+)\)/)?.[1]?.split("|") ?? [];
    expect(extensions.length).toBeGreaterThan(0);
    for (const extension of extensions) {
      expect(CACHEABLE_ASSET_PATH.test(`/a/b.${extension}`), extension).toBe(true);
    }
    // ...and nothing else. An application route must never be silently opted
    // out of the cookie writes.
    for (const pathname of ["/account", "/admin/patients/plain-id", "/blog/a.b", "/x.html"]) {
      expect(CACHEABLE_ASSET_PATH.test(pathname), pathname).toBe(false);
    }
  });
});

/* ------------------------------- BYPASS-6: real assets still work */

describe("BYPASS-6 — genuine static assets still load", () => {
  const REAL_ASSETS = [
    "/images/hero/homepage-hero-ai.svg",
    "/images/hero/country-entry-clinic-hero-2560.avif",
    "/images/hero/country-entry-clinic-hero-2560.webp",
    "/images/hero/ireland-hero-photo.png",
    "/icons/services/general-consultation.svg",
    "/logos/global-health-light.png",
    "/social/og-background.webp",
    "/favicon.png",
  ];

  for (const pathname of REAL_ASSETS) {
    it(`${pathname} is never a login redirect`, async () => {
      for (const dest of ["image", null] as const) {
        const outcome = await outcomeOf(pathname, { dest });
        expect(outcome.kind, `${pathname} (${dest ?? "no sec-fetch-dest"})`).not.toBe("redirect");
      }
    });
  }

  it("serves the admin section previews to a signed-in admin", async () => {
    // A real asset that happens to live under the protected /admin prefix.
    const outcome = await outcomeOf("/admin/section-previews/hero.png", {
      dest: "image",
      role: "ADMIN",
    });
    expect(outcome.kind).toBe("bypassed");
  });

  it("serves the search-engine verification files with no session", async () => {
    for (const pathname of [
      "/seznam-wmt-64L1OxrH9UKBDcNPGZkrAVLQzlujCPZo.txt",
      "/2b7f7c129e4df9753043da11ba9e32ff.txt",
    ]) {
      // Verification bots send no sec-fetch-dest, so these are processed
      // rather than bypassed. What matters is that they are never redirected.
      expect((await outcomeOf(pathname, { dest: null })).kind, pathname).not.toBe("redirect");
    }
  });
});

/* ------------------------------ unchanged proxy responsibilities */

describe("the rest of the proxy is untouched", () => {
  it("still answers a removed entity with 410 Gone", async () => {
    const gonePath = [...GONE_PATHS][0];
    expect(gonePath).toBeTruthy();
    expect((await outcomeOf(gonePath!)).kind).toBe("gone");
  });

  it("still collapses a bare country trailing slash in one hop", async () => {
    const outcome = await outcomeOf("/ireland/");
    expect(outcome.kind).toBe("redirect");
    if (outcome.kind !== "redirect") return;
    expect(outcome.status).toBe(308);
    expect(outcome.pathname).toMatch(/^\/ireland\/[a-z]{2}$/);
  });

  it("still strips a trailing slash from a dotted path", async () => {
    expect(await outcomeOf("/blog/a.b/")).toMatchObject({
      kind: "redirect",
      status: 308,
      pathname: "/blog/a.b",
    });
  });
});
