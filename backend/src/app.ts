import "dotenv/config";

import path from "node:path";
import autoload from "@fastify/autoload";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { env } from "./config/env.js";
import { buildOriginGuardHook } from "./utils/origin-guard.js";
import { errorResponse } from "./utils/response.js";

export async function buildApp() {
  // bodyLimit applies to non-multipart payloads. Aligned with the
  // multipart fileSize ceiling so admin rich-text saves carrying
  // embedded base64 imagery don't 413 just under the multipart limit.
  // trustProxy: 1 trusts a single hop (the Railway edge proxy), which
  // is enough to read the real client IP from X-Forwarded-For without
  // accepting arbitrary spoofed chains.
  const app = Fastify({
    // Default logging (pino) plus redaction of auth-bearing headers so tokens
    // and session cookies never land in logs.
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
      // SEC-006: capability tokens ride in the query string (e.g. the
      // patient-upload `?token=` bearer). Header redaction above can't reach
      // the URL, so strip token-looking params from the logged req.url before
      // it lands in an access log line. Mirrors the standard Fastify req
      // serializer shape so nothing else about request logging changes.
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: (request.url ?? "").replace(
              /([?&](?:token|uploadToken|t)=)[^&#]+/gi,
              "$1[REDACTED]",
            ),
            hostname: request.hostname,
            remoteAddress: request.ip,
            remotePort: request.socket?.remotePort,
          };
        },
      },
    },
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: 1,
  });

  // Idempotent additive DDL — keeps the live DB in sync with the Prisma
  // schema for additive changes we couldn't slot into the migration
  // history cleanly. See `db/ensure-schema.ts` for the rules.
  const { ensureSchema } = await import("./db/ensure-schema.js");
  await ensureSchema({
    info: (m) => app.log.info(m),
    error: (m) => app.log.error(m),
  });

  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isLocalhostOrigin = (origin: string): boolean =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

  // Single source of truth for "is this origin allowed" — the CORS `origin`
  // callback and the S-013 Origin-guard hook below both call this instead
  // of keeping two allowlist checks that could drift apart.
  const isOriginAllowed = (origin: string): boolean => {
    // Local development tooling is always allowed.
    if (isLocalhostOrigin(origin)) return true;
    // When an allowlist is configured, enforce it in EVERY environment
    // (prod, staging, preview) — not just production. This stops an
    // internet-reachable non-prod deployment from accepting credentialed
    // cross-origin requests from arbitrary sites.
    if (allowedOrigins.length > 0) return allowedOrigins.includes(origin);
    // No allowlist configured: allow-all only in genuine local dev.
    // Any other environment (production, staging, preview) fails closed —
    // an internet-reachable non-prod deploy with no allowlist must not
    // accept credentialed cross-origin requests from arbitrary sites.
    return env.NODE_ENV === "development";
  };

  await app.register(cors, {
    origin: (origin, callback) => {
      // Same-origin / non-browser requests (no Origin header) are allowed.
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(isOriginAllowed(origin) ? null : new Error("CORS origin denied"), isOriginAllowed(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(cookie);

  // S-013: reject cross-site state-changing requests that carry the auth
  // cookie. Reuses the exact allowlist the CORS check above enforces.
  app.addHook(
    "onRequest",
    buildOriginGuardHook({
      cookieName: env.AUTH_COOKIE_NAME,
      isAllowedOrigin: isOriginAllowed,
    }),
  );
  // Security headers. Frontend serves the rendered HTML; the API only
  // returns JSON/files, so we don't need a CSP here. Helmet's defaults
  // give us X-Content-Type-Options, X-DNS-Prefetch-Control, Referrer-
  // Policy, X-Download-Options, Strict-Transport-Security (in prod),
  // and X-Frame-Options=DENY. CORP is set to cross-origin so the
  // frontend on a different Railway host can fetch media from us.
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  });
  // gzip/brotli/deflate on responses ≥ 1 KB. Public reads (doctors list,
  // services list, countries) shrink ~70% on the wire. Matters most for the
  // /portugal/pt / /ireland/en SSR fetches which can run 5+ parallel reads.
  await app.register(compress, {
    encodings: ["br", "gzip", "deflate"],
    threshold: 1024,
  });
  // S-021: several upload routes (account-profile photo/document,
  // appointment-documents, medical-documents, patient-upload,
  // doctor-payout-invoices, admin-media-upload PDFs) validate their own
  // buffered size against 10 MB and advertise that figure in their error
  // messages, but this global fileSize ceiling used to be 5 MB — a 6-9 MB
  // upload never reached those checks; @fastify/multipart's `toBuffer()`
  // throws once the stream is truncated at the limit, so it 500'd instead
  // of returning the documented 413. Raised to 10 MB so the enforced limit
  // matches what every route already documents.
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  // Global rate limiter (SF: code review 2026-07-05). Previously `global:
  // false` meant a route with no explicit `config.rateLimit` was entirely
  // unlimited — safe today only because every sensitive route happens to
  // opt in, but a new route ships unthrottled unless its author remembers
  // to add one. `global: true` applies this generous default (300/min) to
  // every route that hasn't set its own tighter override, so a forgotten
  // rate limit degrades to "loose" instead of "none".
  // Existing per-route configs (login 5/hour, etc.) are untouched — a
  // route-level `config.rateLimit` always wins over this default.
  // Optional shared store: when REDIS_URL is set, back the limiter with Redis
  // so throttling is global across replicas (P-019). Unset → in-process store
  // (unchanged single-replica behaviour). enableOfflineQueue:false +
  // skipOnError:true mean a Redis outage fails OPEN (requests allowed) rather
  // than 500ing — the limiter is best-effort protection, not a hard dependency.
  let rateLimitRedis: import("ioredis").Redis | undefined;
  if (env.REDIS_URL) {
    const { Redis } = await import("ioredis");
    const client = new Redis(env.REDIS_URL, {
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    client.on("error", (err) => app.log.warn({ err }, "rate-limit Redis error (failing open)"));
    rateLimitRedis = client;
  }
  // A `next build` prerenders ~550 public pages across ~15 worker processes
  // from ONE egress IP in well under a minute, so the 300/min default below
  // 429s most of it. Pre-P-001 that only cost a slow build; now those pages
  // are statically generated, so a rejected read BAKES an empty plan grid /
  // doctor list into a file that is then served (and crawled) until ISR
  // revalidates. The frontend marks build-phase reads with `x-gh-build`,
  // authenticated by the same shared secret the client-IP forwarding uses.
  //
  // Deliberately NOT an allowList (a full bypass): a leaked secret would then
  // grant unmetered reads. This keeps the limiter on and only raises the
  // ceiling, on an allowlist of anonymous public marketing GETs — never a
  // mutation, never /api/auth|me|account|admin|doctor|corporate|payments.
  const BUILD_READ_PREFIXES = [
    "/api/countries",
    "/api/public/countries",
    "/api/doctors",
    "/api/services",
    "/api/specialties",
    "/api/health-tests",
    "/api/assets",
    "/api/blog",
    "/api/blog-posts",
    "/api/pricing",
  ];
  const isTrustedBuildRead = (req: { method: string; url: string; headers: Record<string, unknown> }) => {
    const secret = env.PROXY_CLIENT_IP_SECRET;
    if (!secret || req.headers["x-gh-proxy-secret"] !== secret) return false;
    if (req.headers["x-gh-build"] !== "1") return false;
    if (req.method !== "GET") return false;
    const path = req.url.split("?")[0];
    return BUILD_READ_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  };

  await app.register(rateLimit, {
    global: true,
    timeWindow: "1 minute",
    // Still bounded — a runaway build gets throttled, it just isn't capped at
    // a ceiling a single build blows through in seconds.
    max: (req) => (isTrustedBuildRead(req) ? 20_000 : 300),
    skipOnError: true, // never 500 because Redis is down etc.
    // The Next.js frontend proxies browser API calls server-side, so at this
    // hop request.ip is the frontend service's egress IP for EVERY visitor —
    // one shared bucket for the whole site, which 429s under normal traffic.
    // When the frontend authenticates itself with the shared secret, key on
    // the real visitor IP it forwards. Secret mismatch/absent → request.ip,
    // so direct callers can't spoof their bucket with a forged header.
    keyGenerator: (req) => {
      const secret = env.PROXY_CLIENT_IP_SECRET;
      if (secret && req.headers["x-gh-proxy-secret"] === secret) {
        // Builds get their own bucket so a deploy can't exhaust the quota of
        // real visitors sharing the frontend's egress IP.
        if (isTrustedBuildRead(req)) return "gh-build";
        const fwd = req.headers["x-gh-client-ip"];
        if (typeof fwd === "string" && fwd.length > 0 && fwd.length <= 64) {
          return fwd;
        }
      }
      return req.ip;
    },
    ...(rateLimitRedis ? { redis: rateLimitRedis } : {}),
  });

  // Raw-body parser scoped to the Stripe webhook only — signature
  // verification requires the unmodified request bytes. Registered
  // BEFORE autoload so every route registered afterwards inherits it.
  // The parser is global; the URL gate inside it ensures only
  // /api/payments/webhook requests get the raw Buffer stashed on the
  // request object.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    function (request, body, done) {
      if (request.url?.startsWith("/api/payments/webhook")) {
        (request as typeof request & { rawBody: Buffer }).rawBody = body as Buffer;
      }
      try {
        done(null, body.length ? JSON.parse((body as Buffer).toString("utf8")) : {});
      } catch (err) {
        done(err as Error);
      }
    },
  );

  // S-014: authenticated/PHI JSON responses must never be cacheable by a
  // shared intermediary or the browser disk cache. Only fills in the
  // header when a route hasn't already set its own Cache-Control (several
  // download/document routes already set a stricter or different policy
  // and keep it). Scoped by path prefix to the account/admin/doctor/
  // corporate surfaces — the same ones the audit named — rather than every
  // route, so stable public content (services, countries, doctors list)
  // keeps its existing cache behavior.
  const NO_STORE_PATH_PREFIX = /^\/api\/(account|admin|doctor|corporate)\//;
  app.addHook("onSend", async (request, reply, payload) => {
    if (NO_STORE_PATH_PREFIX.test(request.url) && !reply.getHeader("cache-control")) {
      reply.header("Cache-Control", "private, no-store");
    }
    return payload;
  });

  // CWE-209: Fastify's default error handler puts `err.message` in the 500
  // body, and the frontend renders it. An unhandled Prisma error therefore
  // shipped the ORM name, the model + column that failed, and the absolute
  // server path (`/app/dist/routes/cart.route.js:441`) straight to the
  // browser — and Prisma validation errors embed the offending `data`
  // payload, which on this codebase means patient name/email/DOB. Swallow
  // every 5xx into a fixed string; the real error still goes to the log.
  // 4xx (validation, rate-limit, CORS) keep their own client-facing text —
  // `reply.send(err)` inside an error handler falls through to Fastify's
  // default serialization, so those response shapes are unchanged.
  app.setErrorHandler((err: FastifyError, request, reply) => {
    const status = typeof err.statusCode === "number" ? err.statusCode : 500;
    if (status < 500) return reply.send(err);
    request.log.error({ err, url: request.url }, "unhandled route error");
    return reply
      .status(500)
      .send(errorResponse("Something went wrong. Please try again."));
  });

  // Auto-register every `*.route.ts` (or `*.route.js` in dist) under
  // `src/routes/`. Skips `*.test.ts` so the schema tests can sit
  // alongside the routes without trying to register themselves.
  // Replaces ~50 hand-written imports + register calls.
  // `__dirname` is CJS-global (this package compiles to CJS via
  // tsconfig.module=NodeNext + no `"type":"module"` in package.json).
  // If we ever migrate to ESM output, swap to
  // `path.dirname(fileURLToPath(import.meta.url))`.
  await app.register(autoload, {
    dir: path.join(__dirname, "routes"),
    matchFilter: (filename) =>
      /\.route\.(?:js|ts)$/.test(filename) && !/\.test\.(?:js|ts)$/.test(filename),
  });

  return app;
}
