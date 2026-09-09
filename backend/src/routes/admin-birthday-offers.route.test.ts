import assert from "node:assert/strict";
import { after, before, beforeEach, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

let role = "";
let reads = 0;
let saves: unknown[] = [];
let renders = 0;
let app: FastifyInstance;

before(async () => {
  mock.module("../utils/admin-auth.js", { namedExports: {
    verifyGlobalAdminAccess: async () => ["ADMIN", "SUPER_ADMIN"].includes(role)
      ? { ok: true } : { ok: false, status: role ? 403 : 401, message: "Denied" },
    resolveAdminSessionActor: async () => ({ userId: "admin-1", role }),
  } });
  mock.module("../modules/coupons/birthday-offers.service.js", { namedExports: {
    getBirthdayDashboard: async () => { reads++; return { settings: { enabled: false, discountPercent: null, validityDays: 30 } }; },
    saveBirthdaySettings: async (settings: unknown, actor: unknown) => { saves.push({ settings, actor }); return settings; },
  } });
  mock.module("../modules/coupons/birthday-email.js", { namedExports: {
    renderBirthdayEmail: (input: unknown) => { renders++; return { subject: "Preview", html: "<p>Preview</p>", text: "Preview", input }; },
  } });
  mock.module("../lib/email/send-email.js", { namedExports: { absoluteSiteUrl: (path: string) => `https://example.test${path}` } });
  const route = (await import("./admin-birthday-offers.route.js")).default as unknown as FastifyPluginAsync;
  app = Fastify();
  await app.register(route);
  await app.ready();
});
after(async () => { await app?.close(); });
beforeEach(() => { role = "ADMIN"; reads = 0; saves = []; renders = 0; });

it("gates settings, mutation and preview before any data access", async () => {
  for (role of ["", "LOCAL_ADMIN", "PATIENT", "DOCTOR", "CORPORATE_ADMIN"]) {
    for (const method of ["GET", "PUT", "POST"] as const) {
      const response = await app.inject({ method, url: `/api/admin/coupons/birthday${method === "POST" ? "/preview" : ""}`,
        ...(method === "GET" ? {} : { payload: { enabled: true, discountPercent: 20, validityDays: 30 } }),
      });
      assert.equal(response.statusCode, role ? 403 : 401);
    }
  }
  assert.deepEqual([reads, saves.length, renders], [0, 0, 0]);
});

it("allows global admins to read and save validated settings with their audit identity", async () => {
  for (role of ["ADMIN", "SUPER_ADMIN"]) {
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/coupons/birthday" })).statusCode, 200);
    const settings = { enabled: true, discountPercent: 15, validityDays: 30 };
    const response = await app.inject({ method: "PUT", url: "/api/admin/coupons/birthday", payload: settings });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(saves.at(-1), { settings, actor: { userId: "admin-1", role } });
  }
});

it("rejects malformed values and missing discount before enabling", async () => {
  for (const payload of [
    { enabled: true, discountPercent: null, validityDays: 30 },
    { enabled: true, discountPercent: 101, validityDays: 30 },
    { enabled: "true", discountPercent: 20, validityDays: 30 },
    { enabled: true, discountPercent: 20, validityDays: 0 },
    { enabled: true, discountPercent: 20, validityDays: 30, scope: "ANY" },
  ]) {
    assert.equal((await app.inject({ method: "PUT", url: "/api/admin/coupons/birthday", payload })).statusCode, 400);
  }
  assert.equal(saves.length, 0);
});

it("previews unsaved offers without writing or sending and rejects unsupported locale", async () => {
  const payload = { discountPercent: 25, validityDays: 14, locale: "PT" };
  const response = await app.inject({ method: "POST", url: "/api/admin/coupons/birthday/preview", payload });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.input.code, "PREVIEW-ONLY");
  assert.equal(response.json().data.input.discountPercent, 25);
  assert.deepEqual([saves.length, reads, renders], [0, 0, 1]);
  assert.equal((await app.inject({ method: "POST", url: "/api/admin/coupons/birthday/preview", payload: { ...payload, locale: "XX" } })).statusCode, 400);
});
