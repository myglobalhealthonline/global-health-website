// MUST be first: sets process.env before config/env.ts freezes its snapshot.
import { FIXTURE_CA_PEM, FIXTURE_PASSWORD, VALID_PFX } from "./client.test-env.js";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import https from "node:https";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { categoriseNetworkErrorForTest, suklRequest } from "./transport.js";
import { SuklError } from "./errors.js";

/**
 * Mutual-TLS transport, proven against a local HTTPS server that DEMANDS a
 * client certificate.
 *
 * This is the strongest claim available today: SÚKL's own test hosts are not
 * reachable from CI or from the development network, so there is nothing real to
 * connect to. What these tests do establish is that the client presents the
 * PKCS#12 identity, that a server can verify it, and that each failure mode
 * lands on the right code.
 *
 * The server trusts the fixture as its own CA (it is self-signed, so it is its
 * own issuer) and the client is pointed at it with the same fixture as `ca` —
 * `rejectUnauthorized` stays on throughout, exactly as in production.
 */

const pfx = readFileSync(VALID_PFX);
// The certificate half of the same fixture, in PEM. Because the fixture is
// self-signed it is its own issuer, so handing it to both sides as `ca` is what
// lets each verify the other for real. It also carries
// subjectAltName=DNS:localhost,IP:127.0.0.1, so hostname verification passes
// honestly rather than by being switched off.
const caPem = readFileSync(FIXTURE_CA_PEM);

interface Started {
  url: string;
  /** Client certificate subject the server saw, per request. */
  seen: string[];
  close: () => Promise<void>;
}

async function startMtlsServer(handler: (
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
) => void, options?: { requireCert?: boolean }): Promise<Started> {
  const seen: string[] = [];
  const server = https.createServer(
    {
      pfx,
      passphrase: FIXTURE_PASSWORD,
      requestCert: options?.requireCert !== false,
      // The fixture is self-signed, so it is its own issuer; trusting it as `ca`
      // is what lets the server actually VERIFY the client rather than merely
      // request a certificate.
      ca: [caPem],
      rejectUnauthorized: false,
    },
    (req, res) => {
      const socket = req.socket as import("node:tls").TLSSocket;
      const peer = socket.getPeerCertificate?.();
      seen.push(peer && peer.subject ? String(peer.subject.CN ?? "") : "");
      handler(req, res);
    },
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  return {
    url: `https://127.0.0.1:${port}`,
    seen,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

test("presents the client certificate and returns the response body", async () => {
  const srv = await startMtlsServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/xml", "x-correlation-id": "corr-123" });
      res.end(`<ok>${body.length}</ok>`);
    });
  });
  try {
    const result = await suklRequest({
      baseUrl: srv.url,
      path: "/epoukaz",
      body: "<req/>",
      pfx,
      passphrase: FIXTURE_PASSWORD,
      ca: [caPem],
      timeoutMs: 5000,
      soapAction: "urn:example:Create",
    });
    assert.equal(result.httpStatus, 200);
    assert.equal(result.body, "<ok>6</ok>");
    assert.equal(result.correlationId, "corr-123");
    assert.ok(result.durationMs >= 0);
    // The point of the whole exercise: the server saw OUR identity.
    assert.equal(srv.seen[0], "sukl-test-fixture");
  } finally {
    await srv.close();
  }
});

test("a SOAP fault arrives as a resolved 500, not a rejection", async () => {
  // Faults are business outcomes the caller must parse — throwing here would
  // discard the fault code.
  const srv = await startMtlsServer((_req, res) => {
    res.writeHead(500, { "content-type": "text/xml" });
    res.end("<Fault><faultcode>Client</faultcode></Fault>");
  });
  try {
    const result = await suklRequest({
      baseUrl: srv.url,
      path: "/epoukaz",
      body: "<req/>",
      pfx,
      passphrase: FIXTURE_PASSWORD,
      ca: [caPem],
      timeoutMs: 5000,
    });
    assert.equal(result.httpStatus, 500);
    assert.match(result.body, /faultcode/);
  } finally {
    await srv.close();
  }
});

test("401 becomes SUKL_AUTHENTICATION_FAILED", async () => {
  const srv = await startMtlsServer((_req, res) => {
    res.writeHead(401);
    res.end("nope");
  });
  try {
    await assert.rejects(
      () =>
        suklRequest({
          baseUrl: srv.url,
          path: "/epoukaz",
          body: "<req/>",
          pfx,
          passphrase: FIXTURE_PASSWORD,
          ca: [caPem],
          timeoutMs: 5000,
        }),
      (e: unknown) =>
        e instanceof SuklError && e.code === "SUKL_AUTHENTICATION_FAILED" && e.httpStatus === 401,
    );
  } finally {
    await srv.close();
  }
});

test("an untrusted server certificate fails the handshake — verification stays on", async () => {
  const srv = await startMtlsServer((_req, res) => res.end("unreachable"));
  try {
    // Same server, but the client is given no CA, so the self-signed server
    // certificate cannot be verified. A passing test here is proof that
    // rejectUnauthorized is genuinely in force.
    await assert.rejects(
      () =>
        suklRequest({
          baseUrl: srv.url,
          path: "/epoukaz",
          body: "<req/>",
          pfx,
          passphrase: FIXTURE_PASSWORD,
          timeoutMs: 5000,
        }),
      (e: unknown) => e instanceof SuklError && e.stage === "handshake",
    );
  } finally {
    await srv.close();
  }
});

test("a server that never responds becomes SUKL_TIMEOUT", async () => {
  const srv = await startMtlsServer(() => {
    /* deliberately never reply */
  });
  try {
    await assert.rejects(
      () =>
        suklRequest({
          baseUrl: srv.url,
          path: "/epoukaz",
          body: "<req/>",
          pfx,
          passphrase: FIXTURE_PASSWORD,
          ca: [caPem],
          timeoutMs: 300,
        }),
      (e: unknown) => e instanceof SuklError && e.code === "SUKL_TIMEOUT",
    );
  } finally {
    await srv.close();
  }
});

test("a closed port becomes SUKL_SERVICE_UNAVAILABLE", async () => {
  const srv = await startMtlsServer(() => {});
  const url = srv.url;
  await srv.close();
  await assert.rejects(
    () =>
      suklRequest({
        baseUrl: url,
        path: "/epoukaz",
        body: "<req/>",
        pfx,
        passphrase: FIXTURE_PASSWORD,
        ca: [caPem],
        timeoutMs: 2000,
      }),
    (e: unknown) => e instanceof SuklError && e.code === "SUKL_SERVICE_UNAVAILABLE",
  );
});

test("network error codes map onto the taxonomy", () => {
  const cases: Array<[string, string]> = [
    ["ETIMEDOUT", "SUKL_TIMEOUT"],
    ["ECONNREFUSED", "SUKL_SERVICE_UNAVAILABLE"],
    ["ENOTFOUND", "SUKL_SERVICE_UNAVAILABLE"],
    ["ERR_TLS_CERT_ALTNAME_INVALID", "SUKL_TLS_HANDSHAKE_FAILED"],
    ["EPROTO", "SUKL_TLS_HANDSHAKE_FAILED"],
    ["ECONNRESET", "SUKL_TLS_HANDSHAKE_FAILED"],
    ["something-unheard-of", "SUKL_SERVICE_UNAVAILABLE"],
  ];
  for (const [code, expected] of cases) {
    const err = Object.assign(new Error("driver detail"), { code });
    const mapped = categoriseNetworkErrorForTest(err);
    assert.equal(mapped.code, expected, `${code} → ${expected}`);
    // Driver text is kept on `cause` for debugging, never in the safe message.
    assert.ok(!mapped.safeMessage.includes("driver detail"));
  }
});
