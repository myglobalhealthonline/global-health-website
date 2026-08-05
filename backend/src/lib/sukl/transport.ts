import https from "node:https";
import tls from "node:tls";
import { URL } from "node:url";

import { loadSuklPfx } from "./certificate.js";
import {
  isSuklServiceConfigured,
  suklServiceUrl,
  suklTimeoutMs,
  SUKL_SERVICE_ENV_VARS,
  SUKL_SERVICE_LABELS,
  type SuklService,
} from "./config.js";
import { SuklError, SuklNotConfiguredError } from "./errors.js";

/**
 * Mutual-TLS transport for SÚKL.
 *
 * Uses `node:https` rather than global `fetch`, unlike every other client in
 * this backend. `fetch` cannot present a client certificate without importing
 * `undici` to build a dispatcher, and `undici` is not a dependency here; a raw
 * `https.request` does it with none. The shape fits too — SÚKL services take a
 * SOAP POST of an XML body, not JSON.
 *
 * `rejectUnauthorized` is never disabled. If SÚKL's test chain is not in Node's
 * trust store the fix is to supply their CA through `ca`, not to stop verifying.
 *
 * What this file deliberately does NOT do: build a SOAP envelope. The operation
 * names, namespaces and message shapes come from SÚKL's WSDL/XSD, which we do
 * not have — see docs/sukl/INTERFACE_INVENTORY.md. `suklPost` takes an already
 * serialised body so the payload layer can be added later without touching the
 * transport.
 *
 * `suklRequest` takes every input explicitly and `suklPost` is the thin
 * env-driven wrapper. That split exists because `config/env.ts` exports a frozen
 * snapshot: without it, none of this could be tested against a local TLS server.
 *
 * Never logged, never returned, never attached to a thrown error: the password,
 * the PFX bytes, the private key, or a response body that may carry patient or
 * health data. Callers get the status and a categorised code; bodies are handed
 * to a parser, not to a logger.
 */

export interface SuklResponse {
  httpStatus: number;
  /** Raw response text. Treat as potentially PHI-bearing — do not log. */
  body: string;
  contentType: string | null;
  /** Correlation identifier, if SÚKL returns one. Safe to log. */
  correlationId: string | null;
  durationMs: number;
}

/** Headers SÚKL is known to echo for tracing. Extend once their docs confirm. */
const CORRELATION_HEADERS = ["x-correlation-id", "x-request-id"];

/**
 * Maps a Node socket/TLS error to our taxonomy. The driver message is kept only
 * on `cause`; the message we surface is written here, not copied from OpenSSL.
 */
function categoriseNetworkError(cause: unknown): SuklError {
  const code =
    typeof cause === "object" && cause !== null && "code" in cause
      ? String((cause as { code: unknown }).code)
      : "";

  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new SuklError("SUKL_TIMEOUT", "request", "SÚKL did not respond in time.", { cause });
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    // Observed 2026-08-04: some resolvers refuse or SERVFAIL the sukl.cz zone
    // outright while answering everything else, so "host not found" here is
    // more often a resolver problem than a wrong hostname.
    return new SuklError(
      "SUKL_SERVICE_UNAVAILABLE",
      "request",
      "The SÚKL hostname could not be resolved. Verify the service URL, then check the " +
        "resolver — sukl.cz is known to fail on some DNS servers that resolve everything else.",
      { cause },
    );
  }
  // ETIMEDOUT is deliberately NOT here — it is caught above as SUKL_TIMEOUT,
  // which is the honest classification for a connect that never completed.
  if (code === "ECONNREFUSED" || code === "EHOSTUNREACH" || code === "ENETUNREACH") {
    return new SuklError(
      "SUKL_SERVICE_UNAVAILABLE",
      "request",
      "The SÚKL test endpoint resolved but could not be reached. SÚKL restricts test access, " +
        "so confirm this deployment's outbound IP is permitted — and that egress to the " +
        "Czech eRecept network is not blocked.",
      { cause },
    );
  }
  if (code.startsWith("ERR_TLS") || code === "EPROTO" || code.startsWith("ERR_SSL")) {
    return new SuklError(
      "SUKL_TLS_HANDSHAKE_FAILED",
      "handshake",
      "The TLS handshake with SÚKL failed — the server rejected our certificate, or its " +
        "chain is not trusted by this runtime.",
      { cause },
    );
  }
  if (code === "ECONNRESET" || code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
      code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "SELF_SIGNED_CERT_IN_CHAIN" ||
      code === "CERT_HAS_EXPIRED") {
    // A reset during the handshake is the usual symptom of a client certificate
    // the peer will not accept; the verification codes mean the reverse — we
    // could not verify THEIR certificate. Both are handshake-stage failures.
    return new SuklError(
      "SUKL_TLS_HANDSHAKE_FAILED",
      "handshake",
      "The TLS handshake with SÚKL failed — either our client certificate was not accepted, " +
        "or their server certificate could not be verified by this runtime.",
      { cause },
    );
  }
  return new SuklError(
    "SUKL_SERVICE_UNAVAILABLE",
    "request",
    "The SÚKL request failed before a response was received.",
    { cause },
  );
}

/** Exposed for transport.test.ts, which asserts the code→taxonomy mapping. */
export const categoriseNetworkErrorForTest = categoriseNetworkError;

export interface SuklRequestOptions {
  baseUrl: string;
  path: string;
  body: string;
  pfx: Buffer;
  passphrase: string;
  /** Extra trust anchors. Needed if SÚKL's chain is not in Node's store. */
  ca?: Array<Buffer | string>;
  timeoutMs: number;
  /** SOAPAction header value. Comes from the WSDL — never invent one. */
  soapAction?: string;
  contentType?: string;
}

/**
 * POSTs a body over mutual TLS with an explicitly supplied identity.
 *
 * Resolves for any HTTP status — a SOAP fault arrives as a 500 with a body the
 * caller must parse. Rejects only when no response was obtained (handshake,
 * DNS, timeout) or when the peer rejected our certificate at the HTTP layer.
 */
export async function suklRequest(options: SuklRequestOptions): Promise<SuklResponse> {
  const base = options.baseUrl.replace(/\/+$/, "");
  const url = new URL(
    options.path.startsWith("/") ? `${base}${options.path}` : `${base}/${options.path}`,
  );
  const timeout = options.timeoutMs;
  const startedAt = Date.now();

  return new Promise<SuklResponse>((resolve, reject) => {
    let settled = false;
    const fail = (e: SuklError) => {
      if (settled) return;
      settled = true;
      reject(e);
    };
    const succeed = (r: SuklResponse) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    const request = https.request(
      {
        method: "POST",
        host: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        servername: url.hostname,
        pfx: options.pfx,
        passphrase: options.passphrase,
        ...(options.ca ? { ca: options.ca } : {}),
        minVersion: "TLSv1.2",
        // Explicit for the avoidance of doubt: certificate verification stays on.
        rejectUnauthorized: true,
        timeout,
        headers: {
          "content-type": options.contentType ?? "text/xml; charset=utf-8",
          "content-length": Buffer.byteLength(options.body).toString(),
          accept: "text/xml, application/soap+xml",
          ...(options.soapAction ? { soapaction: `"${options.soapAction}"` } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (c: Buffer) => chunks.push(c));
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          const durationMs = Date.now() - startedAt;

          if (status === 401 || status === 403) {
            fail(
              new SuklError(
                "SUKL_AUTHENTICATION_FAILED",
                "response",
                "SÚKL accepted the TLS connection but rejected our identity — the workplace " +
                  "certificate may not be registered for this service.",
                { httpStatus: status },
              ),
            );
            return;
          }

          const correlationId =
            CORRELATION_HEADERS.map((h) => response.headers[h]).find(
              (v) => typeof v === "string" && v.length > 0,
            ) ?? null;

          succeed({
            httpStatus: status,
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: (response.headers["content-type"] as string | undefined) ?? null,
            correlationId: typeof correlationId === "string" ? correlationId : null,
            durationMs,
          });
        });
        response.on("error", (cause) => fail(categoriseNetworkError(cause)));
      },
    );

    request.on("timeout", () => {
      // `destroy()` triggers a follow-up 'error'; the `settled` guard absorbs it.
      request.destroy();
      fail(new SuklError("SUKL_TIMEOUT", "request", `SÚKL did not respond within ${timeout}ms.`));
    });
    request.on("error", (cause) => fail(categoriseNetworkError(cause)));

    request.end(options.body);
  });
}

export interface SuklPostOptions {
  soapAction?: string;
  contentType?: string;
  /** Overrides the env timeout for a single call. */
  timeoutMs?: number;
}

function notConfigured(service: SuklService): SuklNotConfiguredError {
  return new SuklNotConfiguredError(
    `${SUKL_SERVICE_LABELS[service]} is not configured — set ${SUKL_SERVICE_ENV_VARS[service]}.`,
  );
}

/**
 * Env-driven wrapper: posts to one of the SÚKL ePoukaz services.
 *
 * `path` is NOT optional and NOT guessed. It must be the path from the
 * `soap:address` of the operation's binding in the current ePoukaz v19 WSDL;
 * the env var supplies only the host. Passing a path we invented would produce
 * a 404 that looks like a business failure.
 */
export async function suklPost(
  service: SuklService,
  path: string,
  body: string,
  options: SuklPostOptions = {},
): Promise<SuklResponse> {
  if (!isSuklServiceConfigured(service)) throw notConfigured(service);
  const { pfx, passphrase } = loadSuklPfx();
  return suklRequest({
    baseUrl: suklServiceUrl(service)!,
    path,
    body,
    pfx,
    passphrase,
    timeoutMs: options.timeoutMs ?? suklTimeoutMs(),
    ...(options.soapAction ? { soapAction: options.soapAction } : {}),
    ...(options.contentType ? { contentType: options.contentType } : {}),
  });
}

export interface SuklHandshakeResult {
  durationMs: number;
  /** Issuer of the certificate SÚKL presented. Useful, and not sensitive. */
  peerIssuer: string;
}

/**
 * Proves the mTLS channel without sending a business payload.
 *
 * Deliberately NOT an official SÚKL "ping" — no such operation is known to us
 * until their documentation arrives. This opens a TLS connection to the given
 * host, confirms the handshake with our client certificate, and closes it. That
 * is the whole claim it makes.
 */
export async function suklHandshake(input: {
  baseUrl: string;
  pfx: Buffer;
  passphrase: string;
  ca?: Array<Buffer | string>;
  timeoutMs: number;
}): Promise<SuklHandshakeResult> {
  const url = new URL(input.baseUrl);
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = tls.connect(
      {
        host: url.hostname,
        port: Number(url.port || 443),
        servername: url.hostname,
        pfx: input.pfx,
        passphrase: input.passphrase,
        ...(input.ca ? { ca: input.ca } : {}),
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      },
      () => {
        const peer = socket.getPeerCertificate();
        const issuer = peer?.issuer
          ? Object.entries(peer.issuer)
              .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("+") : String(v)}`)
              .join(", ")
          : "";
        socket.destroy();
        if (settled) return;
        settled = true;
        resolve({ durationMs: Date.now() - startedAt, peerIssuer: issuer });
      },
    );
    socket.setTimeout(input.timeoutMs, () => {
      socket.destroy();
      if (settled) return;
      settled = true;
      reject(
        new SuklError(
          "SUKL_TIMEOUT",
          "handshake",
          `The TLS handshake with SÚKL did not complete within ${input.timeoutMs}ms.`,
        ),
      );
    });
    socket.once("error", (cause) => {
      if (settled) return;
      settled = true;
      reject(categoriseNetworkError(cause));
    });
  });
}

/** Env-driven wrapper around `suklHandshake`, for one service. */
export async function suklHandshakeProbe(service: SuklService): Promise<SuklHandshakeResult> {
  if (!isSuklServiceConfigured(service)) throw notConfigured(service);
  const { pfx, passphrase } = loadSuklPfx();
  return suklHandshake({
    baseUrl: suklServiceUrl(service)!,
    pfx,
    passphrase,
    timeoutMs: suklTimeoutMs(),
  });
}
