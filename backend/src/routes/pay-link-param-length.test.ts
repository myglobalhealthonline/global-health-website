import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";

/**
 * Regression guard for the 2026-08-27 dead-pay-link incident.
 *
 * Pay links moved from a raw order id to a signed RS256 capability carried in
 * a PATH segment (`/pay/:token` → `/api/public/orders/pay/:token`). The token
 * is ~700 characters; Fastify caps a single path parameter at 100 by default
 * and answers 414 FST_ERR_MAX_PARAM_LENGTH *before* the route handler runs.
 * Every WhatsApp/email pay link therefore resolved to `/pay-status?state=unknown`
 * and no patient could pay. The route tests never caught it because they build
 * the app inside a try/catch that skips the whole suite without a database.
 *
 * This test needs no database: it signs a real capability and asserts the
 * server option is wide enough to route it.
 */

const CAPABILITY_ROUTE = "/api/public/orders/pay/:token";

async function routeToken(token: string, maxParamLength?: number): Promise<number> {
  const app = Fastify(
    maxParamLength === undefined ? {} : { routerOptions: { maxParamLength } },
  );
  app.get<{ Params: { token: string } }>(CAPABILITY_ROUTE, async (request) => ({
    token: request.params.token,
  }));
  try {
    const res = await app.inject({ method: "GET", url: `/api/public/orders/pay/${token}` });
    return res.statusCode;
  } finally {
    await app.close();
  }
}

describe("public capability path parameters", () => {
  it("routes a real order-pay capability instead of 414-ing on its length", async () => {
    const { signPublicCapability } = await import("../utils/public-capability.js");
    const { MAX_PARAM_LENGTH } = await import("../app.js");

    const token = signPublicCapability(
      { sub: "cap-regression-order", purpose: "order-pay", nonce: "n".repeat(24) },
      "30d",
    );

    assert.ok(
      token.length > 100,
      "a capability token must exceed Fastify's default 100-char param cap — otherwise this guard proves nothing",
    );
    assert.ok(
      token.length < MAX_PARAM_LENGTH,
      `capability token (${token.length} chars) must fit MAX_PARAM_LENGTH (${MAX_PARAM_LENGTH})`,
    );

    assert.equal(await routeToken(token, MAX_PARAM_LENGTH), 200);
  });

  it("still 414s under Fastify's default cap — the bug this guards against", async () => {
    assert.equal(await routeToken("t".repeat(700)), 414);
  });
});
