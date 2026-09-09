import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, beforeEach, it, mock } from "node:test";
import Fastify from "fastify";

const secret = "test-only-birthday-unsubscribe-secret";
const patient = { id: "patient-1", email: "Current@example.test", anonymizedAt: null as Date | null, mergedIntoPatientId: null as string | null };
const profiles = new Map<string, typeof patient>();
let offer: { patient: typeof patient | null; coupon: { personalEmail: string | null } } | null;
let consent: boolean | undefined;
let writes: unknown[];
let audits: unknown[];
let newsletterQueries: unknown[];
let reads: number;
let transactions: number;
let conflicts: number;
const newsletter = new Map<string, Date | null>();
let service: typeof import("./birthday-unsubscribe.js");
let route: typeof import("../../routes/marketing-unsubscribe.route.js")["default"];

before(async () => {
  mock.module("../../config/env.js", { namedExports: { env: { AUTH_JWT_SECRET: secret } } });
  mock.module("../../lib/email/send-email.js", { namedExports: { absoluteSiteUrl: (path: string) => `https://example.test${path}` } });
  mock.module("../../db/prisma.js", { namedExports: { prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>, options: unknown) => {
      transactions++;
      assert.deepEqual(options, { isolationLevel: "Serializable" });
      if (conflicts-- > 0) throw { code: "P2034" };
      return fn({
        birthdayOffer: { findUnique: async () => { reads++; return offer; } },
        patientProfile: { findUnique: async (args: { where: { id: string } }) => profiles.get(args.where.id) ?? null },
        patientConsent: {
          findFirst: async (args: { orderBy: unknown }) => {
            assert.deepEqual(args.orderBy, [{ createdAt: "desc" }, { consentValue: "asc" }]);
            return consent === undefined ? null : { consentValue: consent };
          },
          create: async (args: { data: { consentValue: boolean } }) => { writes.push(args); consent = args.data.consentValue; },
        },
        auditLog: { create: async (args: unknown) => { audits.push(args); } },
        newsletterSubscriber: { updateMany: async (args: { where: { OR: { email: { equals: string } }[]; unsubscribedAt: null }; data: { unsubscribedAt: Date } }) => {
          newsletterQueries.push(args);
          assert.equal(args.where.unsubscribedAt, null);
          for (const item of args.where.OR) {
            const email = item.email.equals;
            if (newsletter.has(email) && newsletter.get(email) === null) newsletter.set(email, args.data.unsubscribedAt);
          }
        } },
      });
    },
  } } });
  service = await import("./birthday-unsubscribe.js");
  route = (await import("../../routes/marketing-unsubscribe.route.js")).default as unknown as typeof route;
});

beforeEach(() => {
  offer = { patient: { ...patient }, coupon: { personalEmail: "Original@example.test" } };
  consent = true; writes = []; audits = []; newsletterQueries = []; reads = 0; transactions = 0; conflicts = 0;
  newsletter.clear();
  profiles.clear();
  newsletter.set("current@example.test", null); newsletter.set("original@example.test", null);
  newsletter.set("other@example.test", null);
});

function token() { return new URL(service.birthdayUnsubscribeUrl("offer-1")).searchParams.get("token")!; }

it("signs only offer ID, rejects tampering, other purposes and oversized tokens without DB access", async () => {
  const valid = token();
  assert.equal(new URL(service.birthdayUnsubscribeUrl("offer-1")).pathname, "/unsubscribe");
  for (const lang of ["EN", "PT", "ES", "CS", "RO", "DE"] as const) {
    assert.equal(new URL(service.birthdayUnsubscribeUrl("offer-1", lang)).searchParams.get("lang"), lang.toLowerCase());
  }
  assert.equal(valid, `offer-1.${createHmac("sha256", secret).update("birthday-unsubscribe\0offer-1").digest("base64url")}`);
  for (const invalid of [valid.replace("offer-1", "offer-2"), `${valid.slice(0, -1)}!`, "", "x".repeat(173), "offer-1.short", `${valid}.extra`, `offer-1.${createHmac("sha256", secret).update("another-purpose\0offer-1").digest("base64url")}`]) {
    assert.equal(await service.unsubscribeBirthdayMarketing(invalid), false);
  }
  assert.equal(transactions, 0);
});

it("withdraws marketing and both newsletter emails atomically; repeat requests are idempotent", async () => {
  assert.equal(await service.unsubscribeBirthdayMarketing(token()), true);
  assert.deepEqual(writes, [{ data: { patientProfileId: "patient-1", consentType: "MARKETING", consentValue: false, source: "EMAIL_UNSUBSCRIBE" } }]);
  assert.equal(audits.length, 1);
  assert.equal((audits[0] as { data: { action: string } }).data.action, "CONSENT_UPDATED");
  assert.ok(newsletter.get("current@example.test") instanceof Date);
  assert.ok(newsletter.get("original@example.test") instanceof Date);
  assert.equal(newsletter.get("other@example.test"), null);
  const timestamp = newsletter.get("original@example.test");
  assert.equal(await service.unsubscribeBirthdayMarketing(token()), true);
  assert.equal(writes.length, 1); assert.equal(audits.length, 1);
  assert.equal(newsletter.get("original@example.test"), timestamp);
  assert.equal(JSON.stringify(audits).includes("@"), false);
});

it("safely succeeds for missing offer, missing profile or erased profile without writes", async () => {
  for (const missing of [null, { patient: null, coupon: { personalEmail: "original@example.test" } }, { patient: { ...patient, anonymizedAt: new Date() }, coupon: { personalEmail: null } }]) {
    offer = missing;
    assert.equal(await service.unsubscribeBirthdayMarketing(token()), true);
  }
  assert.equal(writes.length + audits.length + newsletterQueries.length, 0);
});

it("handles no prior consent and absent newsletter rows, retries transaction conflicts", async () => {
  consent = undefined; newsletter.clear(); conflicts = 1;
  assert.equal(await service.unsubscribeBirthdayMarketing(token()), true);
  assert.equal(transactions, 2); assert.equal(writes.length, 1); assert.equal(newsletter.size, 0);
});

it("withdraws the canonical merged profile and suppresses original and canonical newsletters", async () => {
  offer!.patient!.mergedIntoPatientId = "canonical";
  profiles.set("canonical", { ...patient, id: "canonical", email: "canonical@example.test" });
  newsletter.set("canonical@example.test", null);
  assert.equal(await service.unsubscribeBirthdayMarketing(token()), true);
  assert.equal((writes[0] as { data: { patientProfileId: string } }).data.patientProfileId, "canonical");
  for (const email of ["original@example.test", "current@example.test", "canonical@example.test"]) assert.ok(newsletter.get(email) instanceof Date);
});

it("rejects cyclic merge chains without writes", async () => {
  offer!.patient!.mergedIntoPatientId = patient.id;
  profiles.set(patient.id, offer!.patient!);
  await assert.rejects(service.unsubscribeBirthdayMarketing(token()), /Unable to resolve/);
  assert.equal(writes.length + newsletterQueries.length, 0);
});

it("public route mutates only on POST and bounds tokens", async () => {
  const app = Fastify();
  await app.register(route);
  try {
    assert.equal((await app.inject({ method: "GET", url: `/api/marketing/unsubscribe?token=${token()}` })).statusCode, 404);
    assert.equal(reads, 0);
    assert.equal((await app.inject({ method: "POST", url: "/api/marketing/unsubscribe", payload: { token: "x".repeat(173) } })).statusCode, 400);
    assert.equal(reads, 0);
    const response = await app.inject({ method: "POST", url: "/api/marketing/unsubscribe", payload: { token: token() } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data, { unsubscribed: true });
  } finally { await app.close(); }
});
