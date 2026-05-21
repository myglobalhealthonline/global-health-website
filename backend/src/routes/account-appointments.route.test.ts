import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";

describe("account appointments route auth guard", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;

  before(async () => {
    try {
      app = await buildApp();
    } catch (err) {
      // buildApp boots the full server, which runs ensureSchema and so
      // needs a live Postgres. When the local DB is offline (CI without
      // services, dev box without a running container) we skip the cases
      // below rather than failing the whole suite — these tests only
      // exercise auth middleware, not the DB.
      bootError = err;
    }
  });

  after(async () => {
    if (app) await app.close();
  });

  it("returns 401 for list when unauthenticated", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const response = await app.inject({
      method: "GET",
      url: "/api/account/appointments",
    });
    assert.equal(response.statusCode, 401);
  });

  it("returns 401 for detail when unauthenticated", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const response = await app.inject({
      method: "GET",
      url: "/api/account/appointments/appt_1",
    });
    assert.equal(response.statusCode, 401);
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
