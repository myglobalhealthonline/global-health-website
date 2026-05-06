import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";

describe("account appointments route auth guard", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildApp();
  });

  after(async () => {
    await app.close();
  });

  it("returns 401 for list when unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/account/appointments",
    });
    assert.equal(response.statusCode, 401);
  });

  it("returns 401 for detail when unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/account/appointments/appt_1",
    });
    assert.equal(response.statusCode, 401);
  });
});

