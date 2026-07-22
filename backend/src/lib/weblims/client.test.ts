// MUST be first — see the module's own comment.
import "./client.test-env.js";

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  createNewRequestToken,
  createRequestListToken,
  getAccessToken,
  getMethods,
  isWeblimsConfigured,
  resetWeblimsTokenCache,
  weblimsShowUrl,
} from "./client.js";

/**
 * The WebLIMS client's non-obvious behaviours:
 *   - the access token is cached against the server's ABSOLUTE `expires_at`,
 *     not our clock plus `expires_in` (their docs call this out as the
 *     clock-skew defence), and re-issued once inside the safety margin;
 *   - `methods/{token}` answers 204 while the operator has the form open but
 *     has not saved, and 404 once the token expires. Neither is an error —
 *     both mean "nothing ordered yet", and the caller has to be able to tell
 *     them apart from a transport failure;
 *   - form tokens never reach an error message.
 *
 * The unconfigured branch is not exercised here: `config/env.ts` freezes its
 * snapshot at load, so it cannot be toggled mid-file. It is covered where it
 * matters — the admin route maps `WeblimsNotConfiguredError` to a 503.
 */

const realFetch = globalThis.fetch;

type FetchCall = { url: string; init: RequestInit | undefined };
let calls: FetchCall[] = [];
let responder: (url: string) => Response;

const PATIENT = {
  patientId: "8503141234",
  surname: "Novák",
  birthDate: "1985-03-14T00:00:00.000Z",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** An OAuth response valid for an hour. */
function authOk(): Response {
  return json({
    access_token: "tok",
    token_type: "Bearer",
    expires_in: 3600,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
}

function isTokenUrl(url: string) {
  return url.endsWith("/api/OAuth/token");
}

function tokenCallCount() {
  return calls.filter((c) => isTokenUrl(c.url)).length;
}

beforeEach(() => {
  resetWeblimsTokenCache();
  calls = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return responder(url);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("the configured gate reads the three WebLIMS vars", () => {
  assert.equal(isWeblimsConfigured(), true);
});

test("the OAuth request is form-encoded, client_credentials, scope=remote", async () => {
  responder = () => authOk();
  await getAccessToken();

  const call = calls[0]!;
  const headers = call.init?.headers as Record<string, string>;
  assert.match(headers["Content-Type"]!, /x-www-form-urlencoded/);
  const body = String(call.init?.body);
  assert.match(body, /grant_type=client_credentials/);
  assert.match(body, /scope=remote/);
});

test("the access token is reused while its absolute expiry is far off", async () => {
  responder = (url) =>
    isTokenUrl(url)
      ? authOk()
      : json({ token: "form-1", expires_in: 300, expires_at: new Date().toISOString() });

  await createNewRequestToken({ patient: PATIENT });
  await createNewRequestToken({ patient: PATIENT });

  assert.equal(tokenCallCount(), 1, "the second call must reuse the cached token");
});

test("a token already inside the safety margin is re-issued", async () => {
  responder = (url) =>
    isTokenUrl(url)
      ? json({
          access_token: "tok-short",
          token_type: "Bearer",
          expires_in: 10,
          // Well inside the 60s safety margin.
          expires_at: new Date(Date.now() + 10_000).toISOString(),
        })
      : json({ token: "form-1", expires_in: 300, expires_at: new Date().toISOString() });

  await createRequestListToken("8503141234");
  await createRequestListToken("8503141234");

  assert.equal(tokenCallCount(), 2, "a near-expiry token must not be reused");
});

test("expires_at wins over expires_in, so a skewed clock cannot extend a token", async () => {
  responder = (url) =>
    isTokenUrl(url)
      ? json({
          access_token: "tok",
          // Claims an hour, but the absolute time says it is nearly dead.
          expires_in: 3600,
          expires_at: new Date(Date.now() + 5_000).toISOString(),
        })
      : json({ token: "form-1", expires_in: 300, expires_at: new Date().toISOString() });

  await createRequestListToken("8503141234");
  await createRequestListToken("8503141234");

  assert.equal(tokenCallCount(), 2);
});

test("the form token response is parsed into a token and an absolute expiry", async () => {
  const expiresAt = new Date(Date.now() + 300_000);
  responder = (url) =>
    isTokenUrl(url)
      ? authOk()
      : json({ token: "form-abc", expires_in: 300, expires_at: expiresAt.toISOString() });

  const result = await createNewRequestToken({ patient: PATIENT });
  assert.equal(result.token, "form-abc");
  assert.equal(result.expiresInSeconds, 300);
  assert.equal(result.expiresAt.toISOString(), expiresAt.toISOString());
});

test("methods returns null for 204 (nothing saved) and 404 (expired token)", async () => {
  for (const status of [204, 404]) {
    resetWeblimsTokenCache();
    responder = (url) => (isTokenUrl(url) ? authOk() : new Response(null, { status }));
    assert.equal(await getMethods("form-1"), null, `status ${status}`);
  }
});

test("methods unwraps a JSON string body", async () => {
  responder = (url) => (isTokenUrl(url) ? authOk() : json("Glykémie, Kreatinin"));
  assert.equal(await getMethods("form-1"), "Glykémie, Kreatinin");
});

test("methods passes a text/plain body through unchanged", async () => {
  responder = (url) =>
    isTokenUrl(url)
      ? authOk()
      : new Response("Glykémie, Kreatinin", { headers: { "content-type": "text/plain" } });
  assert.equal(await getMethods("form-1"), "Glykémie, Kreatinin");
});

test("a non-2xx surfaces the status but never the form token", async () => {
  responder = (url) => (isTokenUrl(url) ? authOk() : new Response("boom", { status: 500 }));

  await assert.rejects(
    () => getMethods("super-secret-token"),
    (err: Error) => {
      assert.match(err.message, /500/);
      assert.ok(
        !err.message.includes("super-secret-token"),
        "the form token must be redacted out of the error",
      );
      return true;
    },
  );
});

test("a 401 drops the cached token so the next call re-authenticates", async () => {
  let remoteStatus = 401;
  responder = (url) =>
    isTokenUrl(url) ? authOk() : new Response("nope", { status: remoteStatus });

  await assert.rejects(() => getMethods("form-1"));
  assert.equal(tokenCallCount(), 1);

  remoteStatus = 200;
  responder = (url) => (isTokenUrl(url) ? authOk() : json("Glykémie"));
  await getMethods("form-1");
  assert.equal(tokenCallCount(), 2, "the revoked token must not be replayed");
});

test("the show URL is built from the configured base and escapes the token", () => {
  assert.equal(
    weblimsShowUrl("abc/123"),
    "https://weblims.example.cz/api/Remote/show/abc%2F123",
  );
});
