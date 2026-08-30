import { randomUUID } from "node:crypto";
import { monitorEventLoopDelay } from "node:perf_hooks";
import type { FastifyInstance } from "fastify";
import { pool } from "../../db/prisma.js";
import { instrumentPool } from "./instrument-pool.js";
import {
  runWithPerfContext,
  currentPerfContext,
  serverTimingHeader,
  type PerfContext,
} from "./request-context.js";

/**
 * Request-level performance instrumentation (perf plan docs/plans/new.md
 * phase 1). One sanitized log line and one `Server-Timing` header per request:
 *
 *   { msg: "perf", requestId, route, method, statusCode, totalMs, dbMs,
 *     dbQueries, bytes, eventLoopLagMs, rssMb }
 *
 * Cardinality is bounded by construction — `route` is Fastify's route
 * TEMPLATE (`/api/countries/:countryCode/doctor-cards`), never the resolved
 * URL, so record ids, slugs and query values cannot become label values. No
 * body, header, cookie or query string is read.
 *
 * This whole feature is one `app.register(perfPlugin)` in app.ts: removing
 * that line disables it without touching anything else.
 */

const MAX_REQUEST_ID_LENGTH = 64;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]+$/;

/** An inbound id is echoed only if it is short and opaque-looking; anything
 *  else is replaced, so a caller cannot smuggle data into the logs. */
function resolveRequestId(header: unknown): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    SAFE_REQUEST_ID.test(value)
  ) {
    return value;
  }
  return randomUUID();
}

/** Sampled continuously; read per request. Cheap enough to leave running. */
const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelay.enable();

export function registerPerfInstrumentation(app: FastifyInstance): void {
  instrumentPool(pool);

  app.addHook("onRequest", (request, reply, done) => {
    const context: PerfContext = {
      requestId: resolveRequestId(request.headers["x-request-id"]),
      dbQueries: 0,
      dbMs: 0,
      phases: new Map(),
    };
    reply.header("x-request-id", context.requestId);
    // Everything downstream of this hook — handlers, services, pool calls —
    // runs inside the store, which is what makes per-request DB counting work.
    runWithPerfContext(context, done);
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const context = currentPerfContext();
    if (context) {
      reply.header("Server-Timing", serverTimingHeader(context, reply.elapsedTime));
    }
    return payload;
  });

  app.addHook("onResponse", async (request, reply) => {
    const context = currentPerfContext();
    const rawBytes = reply.getHeader("content-length");
    const bytes = Number(Array.isArray(rawBytes) ? rawBytes[0] : rawBytes);
    request.log.info(
      {
        requestId: context?.requestId,
        // Route TEMPLATE, not request.url — this is the cardinality guard.
        route: request.routeOptions?.url ?? "unmatched",
        method: request.method,
        statusCode: reply.statusCode,
        totalMs: Number(reply.elapsedTime.toFixed(1)),
        dbMs: context ? Number(context.dbMs.toFixed(1)) : undefined,
        dbQueries: context?.dbQueries,
        phases: context && context.phases.size > 0
          ? Object.fromEntries(
              [...context.phases].map(([name, ms]) => [name, Number(ms.toFixed(1))]),
            )
          : undefined,
        bytes: Number.isFinite(bytes) ? bytes : undefined,
        eventLoopLagMs: Number((eventLoopDelay.mean / 1e6).toFixed(1)),
        rssMb: Math.round(process.memoryUsage.rss() / 1024 / 1024),
      },
      "perf",
    );
  });
}
