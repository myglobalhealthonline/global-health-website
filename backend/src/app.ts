import "dotenv/config";

import path from "node:path";
import autoload from "@fastify/autoload";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { env } from "./config/env.js";

export async function buildApp() {
  // bodyLimit applies to non-multipart payloads. Aligned with the
  // multipart fileSize ceiling so admin rich-text saves carrying
  // embedded base64 imagery don't 413 just under the multipart limit.
  // trustProxy: 1 trusts a single hop (the Railway edge proxy), which
  // is enough to read the real client IP from X-Forwarded-For without
  // accepting arbitrary spoofed chains.
  const app = Fastify({
    logger: true,
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
  const isProd = env.NODE_ENV === "production";

  const isLocalhostOrigin = (origin: string): boolean =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

  await app.register(cors, {
    origin: (origin, callback) => {
      // Same-origin / non-browser requests (no Origin header) are allowed.
      if (!origin) {
        callback(null, true);
        return;
      }
      // Local development tooling is always allowed.
      if (isLocalhostOrigin(origin)) {
        callback(null, true);
        return;
      }
      // When an allowlist is configured, enforce it in EVERY environment
      // (prod, staging, preview) — not just production. This stops an
      // internet-reachable non-prod deployment from accepting credentialed
      // cross-origin requests from arbitrary sites.
      if (allowedOrigins.length > 0) {
        callback(null, allowedOrigins.includes(origin));
        return;
      }
      // No allowlist configured: allow in local dev, deny in production.
      if (isProd) {
        callback(new Error("CORS origin denied"), false);
        return;
      }
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(cookie);
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
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
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
  await app.register(rateLimit, {
    global: true,
    timeWindow: "1 minute",
    max: 300,
    skipOnError: true, // never 500 because Redis is down etc.
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
