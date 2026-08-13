import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PUBLIC_READ_PREFIXES,
  isTrustedBuildRead,
  isTrustedSsrPublicRead,
  type TrustableRequest,
} from "./rate-limit-trust.js";

// Pure predicate coverage — no DB access, safe under the live-DB test guard.

const SECRET = "test-proxy-secret-0123456789abcdef";

function req(over: Partial<TrustableRequest> & { headers?: Record<string, unknown> } = {}): TrustableRequest {
  return {
    method: "GET",
    url: "/api/countries/ie/services?kind=GENERAL&locale=EN",
    headers: { "x-gh-proxy-secret": SECRET, "x-gh-ssr": "1", ...over.headers },
    ...(over.method ? { method: over.method } : {}),
    ...(over.url ? { url: over.url } : {}),
  };
}

describe("isTrustedSsrPublicRead — what qualifies", () => {
  it("accepts correct secret + GET + allowlisted public path", () => {
    assert.equal(isTrustedSsrPublicRead(req(), SECRET), true);
  });

  it("accepts every prefix on the public allowlist, bare and sub-path", () => {
    for (const prefix of PUBLIC_READ_PREFIXES) {
      assert.equal(isTrustedSsrPublicRead(req({ url: prefix }), SECRET), true, prefix);
      assert.equal(
        isTrustedSsrPublicRead(req({ url: `${prefix}/anything?x=1` }), SECRET),
        true,
        `${prefix}/…`,
      );
    }
  });
});

describe("isTrustedSsrPublicRead — what does NOT qualify", () => {
  it("rejects a wrong secret", () => {
    assert.equal(
      isTrustedSsrPublicRead(req({ headers: { "x-gh-proxy-secret": "wrong" } }), SECRET),
      false,
    );
  });

  it("rejects a missing secret header", () => {
    assert.equal(
      isTrustedSsrPublicRead(req({ headers: { "x-gh-proxy-secret": undefined } }), SECRET),
      false,
    );
  });

  it("rejects when the server has no secret configured (cannot be spoofed into existence)", () => {
    assert.equal(isTrustedSsrPublicRead(req(), undefined), false);
    assert.equal(isTrustedSsrPublicRead(req(), ""), false);
  });

  it("rejects when the x-gh-ssr marker is absent", () => {
    assert.equal(isTrustedSsrPublicRead(req({ headers: { "x-gh-ssr": undefined } }), SECRET), false);
  });

  it("rejects every mutation verb, even on an allowlisted path", () => {
    for (const method of ["POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"]) {
      assert.equal(isTrustedSsrPublicRead(req({ method }), SECRET), false, method);
    }
  });

  it("rejects private, authenticated and money endpoints", () => {
    const forbidden = [
      "/api/admin",
      "/api/admin/doctors",
      "/api/auth",
      "/api/auth/login",
      "/api/payments",
      "/api/payments/webhook",
      "/api/me",
      "/api/me/subscription",
      "/api/account",
      "/api/account/profile",
      "/api/doctor",
      "/api/doctor/consultations",
      "/api/corporate",
      "/api/corporate/invites",
      "/api/cart",
      "/api/orders",
      "/api/prescriptions",
      "/api/consultations",
      "/api/medical-documents",
    ];
    for (const url of forbidden) {
      assert.equal(isTrustedSsrPublicRead(req({ url }), SECRET), false, url);
    }
  });

  it("rejects a non-allowlisted path that merely shares a prefix string", () => {
    // "/api/doctors" must not open "/api/doctor/…", and no partial-word match.
    assert.equal(isTrustedSsrPublicRead(req({ url: "/api/doctor/patients" }), SECRET), false);
    assert.equal(isTrustedSsrPublicRead(req({ url: "/api/countries-private" }), SECRET), false);
    assert.equal(isTrustedSsrPublicRead(req({ url: "/api/assetsx" }), SECRET), false);
    assert.equal(isTrustedSsrPublicRead(req({ url: "/api/blogger" }), SECRET), false);
  });

  it("rejects an arbitrary unlisted endpoint", () => {
    assert.equal(isTrustedSsrPublicRead(req({ url: "/api/internal-messages" }), SECRET), false);
    assert.equal(isTrustedSsrPublicRead(req({ url: "/ready" }), SECRET), false);
  });
});

describe("build and SSR classes stay separate", () => {
  const buildHeaders = { "x-gh-proxy-secret": SECRET, "x-gh-build": "1" };

  it("build reads still classify as build", () => {
    assert.equal(isTrustedBuildRead(req({ headers: buildHeaders }), SECRET), true);
  });

  it("an SSR read is never a build read", () => {
    assert.equal(isTrustedBuildRead(req(), SECRET), false);
  });

  it("a build read is never an SSR read, even with both markers set", () => {
    const both = { ...buildHeaders, "x-gh-ssr": "1" };
    assert.equal(isTrustedBuildRead(req({ headers: both }), SECRET), true);
    assert.equal(
      isTrustedSsrPublicRead(req({ headers: both }), SECRET),
      false,
      "x-gh-build must win, so SSR can never be relabelled into the build ceiling",
    );
  });

  it("build reads obey the same method + path + secret gates", () => {
    assert.equal(isTrustedBuildRead(req({ headers: buildHeaders, method: "POST" }), SECRET), false);
    assert.equal(
      isTrustedBuildRead(req({ headers: buildHeaders, url: "/api/admin/users" }), SECRET),
      false,
    );
    assert.equal(
      isTrustedBuildRead(req({ headers: { ...buildHeaders, "x-gh-proxy-secret": "wrong" } }), SECRET),
      false,
    );
  });
});

describe("proxied visitor requests are unaffected", () => {
  it("a route-handler request forwarding x-gh-client-ip is neither build nor SSR", () => {
    const visitor = req({
      url: "/api/me/subscription",
      headers: { "x-gh-proxy-secret": SECRET, "x-gh-client-ip": "203.0.113.9", "x-gh-ssr": undefined },
    });
    assert.equal(isTrustedBuildRead(visitor, SECRET), false);
    assert.equal(isTrustedSsrPublicRead(visitor, SECRET), false);
  });

  it("a forwarded visitor IP on a PUBLIC path is still not an SSR read without the marker", () => {
    const visitor = req({
      headers: { "x-gh-proxy-secret": SECRET, "x-gh-client-ip": "203.0.113.9", "x-gh-ssr": undefined },
    });
    assert.equal(isTrustedSsrPublicRead(visitor, SECRET), false);
  });
});
