import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * Route-table regression for the card projections (perf plan
 * docs/plans/new.md §7.1 risk table): `/doctor-cards` must stay a distinct
 * static child of `/api/countries/:countryCode/`, never shadowed by — or
 * shadowing — the `doctors/:slug` detail route. Skips when buildApp cannot
 * start (no local Postgres).
 */
describe("card projection route table", () => {
  let app: FastifyInstance | null = null;

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      app = await buildApp();
    } catch {
      app = null;
    }
  });

  after(async () => {
    await app?.close();
  });

  it("registers the projections alongside the untouched legacy routes", () => {
    if (!app) return;
    for (const url of [
      "/api/countries/:countryCode/doctors",
      "/api/countries/:countryCode/doctors/:slug",
      "/api/countries/:countryCode/services",
      "/api/countries/:countryCode/doctor-cards",
      "/api/countries/:countryCode/service-cards",
    ]) {
      assert.equal(app.hasRoute({ method: "GET", url }), true, `${url} is not registered`);
    }
  });

  it("resolves doctor-cards to its own handler, not the :slug detail route", () => {
    if (!app) return;
    const matched = app.findRoute({ method: "GET", url: "/api/countries/ie/doctor-cards" });
    assert.ok(matched, "doctor-cards did not resolve");
    // Only the country segment is parametric. A `slug` param here would mean
    // the request fell through to the doctor-detail route.
    assert.deepEqual({ ...matched.params }, { countryCode: "ie" });
  });
});
