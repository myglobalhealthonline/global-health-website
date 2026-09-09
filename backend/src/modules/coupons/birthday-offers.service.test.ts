import assert from "node:assert/strict";
import { before, beforeEach, it, mock } from "node:test";
import type { BirthdaySettings } from "./birthday-rules.js";

// All persistence and delivery boundaries are replaced before loading the service.
const NOW = new Date("2026-09-09T12:00:00Z");
const MAX_ATTEMPTS = 8;
function patientFixture() {
  return {
    id: "patient-1", email: "patient@example.com", fullName: "Test Patient",
    dateOfBirth: new Date("1990-09-09T00:00:00Z"), currentCountryCode: "ie",
    countryFolderCode: "ie", isMerged: false, anonymizedAt: null as Date | null,
    user: { email: "patient@example.com", dateOfBirth: new Date("1990-09-09T00:00:00Z"),
      preferredLocale: "EN", isActive: true, deletionScheduledAt: null as Date | null, role: "PATIENT" },
    consents: [{ consentValue: true }], deletionRequests: [] as { id: string }[],
    appointments: [{ patientTimezone: "Europe/Dublin" }],
  };
}
function countryFixture() {
  return { code: "ie", slug: "ireland", defaultLocale: "EN", isActive: true,
    commissionReceiptEnabled: false, enabledFeatures: ["general-consultations"],
    bookingSetting: { timezone: "Europe/Dublin" }, countryLocales: [{ locale: "EN" }],
    services: [{ id: "gp-service" }] };
}
function offerFixture() {
  return { id: "offer-1", couponId: "coupon-1", year: 2026, countryCode: "ie",
    timezone: "Europe/Dublin", status: "PENDING", attemptedAt: null as Date | null,
    coupon: { code: "BIRTHDAY-TEST", personalEmail: "patient@example.com", active: true,
      discountPercent: 20, redeemedCount: 0, validFrom: new Date("2026-09-08T23:00:00Z"),
      validUntil: new Date("2026-10-08T22:59:59.999Z") } };
}
let patient = patientFixture();
let country = countryFixture();
let offer = offerFixture();
let settings: BirthdaySettings | null;
let suppressed: boolean;
let duplicate: boolean;
let configured: boolean;
let failOutbox: boolean;
let fault: "settings" | "render" | "finish" | null;
let provider: () => Promise<unknown>;
let pages: number;
let transactions: number;
let reads: Record<string, any>[];
let writes: { table: string; args: any; transaction: boolean }[];
let messages: any[];
let committed: string[];
let service: typeof import("./birthday-offers.service.js");

function write(table: string, args: any, transaction = false) {
  writes.push({ table, args, transaction });
}
const prisma = {
  country: { findMany: async () => [country], findFirst: async () => country },
  patientProfile: { findMany: async (args: any) => {
    reads.push(args);
    return pages++ === 0 ? [patient] : [];
  } },
  newsletterSubscriber: {
    findMany: async () => suppressed ? [{ email: patient.email.toUpperCase() }] : [],
    findFirst: async () => suppressed ? { id: "subscription-1" } : null,
  },
  birthdayOffer: {
    findFirst: async (args: any) => { reads.push(args); return duplicate ? { id: offer.id } : null; },
    findUnique: async () => ({ ...offer, patient }),
    update: async (args: any) => { write("offer.update", args); Object.assign(offer, args.data); return offer; },
    updateMany: async (args: any) => {
      write("offer.claim", args);
      assert.deepEqual(args.where, { id: offer.id, status: "PENDING" });
      if (offer.status !== "PENDING") return { count: 0 };
      Object.assign(offer, args.data);
      return { count: 1 };
    },
  },
  $transaction: async (run: (tx: any) => Promise<unknown>) => {
    transactions++;
    const pending: string[] = [];
    const result = await run({
      birthdayOffer: {
        create: async (args: any) => { write("offer.create", args, true); pending.push("coupon+offer"); return { id: offer.id }; },
        update: async (args: any) => {
          if (fault === "finish") { fault = null; throw new Error("private persistence details"); }
          write("offer.update", args, true); Object.assign(offer, args.data);
        },
      },
      outbox: { create: async (args: any) => {
        write("outbox.create", args, true);
        if (failOutbox) throw new Error("outbox unavailable");
        pending.push("outbox");
      } },
      couponRecipient: { updateMany: async (args: any) => { write("recipient.update", args, true); return { count: 1 }; } },
    });
    committed.push(...pending);
    return result;
  },
};

before(async () => {
  mock.module("../../db/prisma.js", { namedExports: { prisma } });
  mock.module("../settings/settings.service.js", { namedExports: { getSetting: async (key: string) => {
    if (fault === "settings") throw new Error("private database details");
    assert.equal(key, "coupons.birthday"); return settings;
  } } });
  mock.module("../outbox/outbox.js", { namedExports: { OUTBOX_MAX_ATTEMPTS: MAX_ATTEMPTS } });
  mock.module("../audit/audit.service.js", { namedExports: { toAuditLogData: (data: unknown) => data } });
  mock.module("./birthday-unsubscribe.js", { namedExports: { birthdayUnsubscribeUrl: () => "https://example.com/unsubscribe?token=test" } });
  mock.module("../../lib/email/send-email.js", { namedExports: {
    absoluteSiteUrl: (path: string) => {
      if (fault === "render") throw new Error("private rendering details");
      return `https://example.com${path}`;
    },
    isEmailConfigured: () => configured,
    sendEmail: async (message: unknown) => { messages.push(message); return provider(); },
  } });
  service = await import("./birthday-offers.service.js");
});

beforeEach(() => {
  patient = patientFixture(); country = countryFixture(); offer = offerFixture();
  settings = { enabled: true, discountPercent: 20, validityDays: 30 };
  suppressed = duplicate = failOutbox = false; configured = true;
  fault = null;
  provider = async () => ({ ok: true, mode: "smtp" });
  pages = transactions = 0; reads = []; writes = []; messages = []; committed = [];
});

it("missing settings disables scanning and delivery by default", async () => {
  settings = null;
  assert.deepEqual(await service.getBirthdaySettings(), { enabled: false, discountPercent: null, validityDays: 30 });
  assert.deepEqual(await service.enqueueBirthdayOffers(NOW), { scanned: 0, eligible: 0, created: 0 });
  assert.equal(reads.length, 0);
  assert.equal(transactions, 0);
  assert.deepEqual(writes, []);
});

const exclusions: [string, () => void][] = [
  ["latest marketing withdrawal", () => { patient.consents = [{ consentValue: false }]; }],
  ["missing marketing consent", () => { patient.consents = []; }],
  ["newsletter suppression", () => { suppressed = true; }],
  ["anonymized profile", () => { patient.anonymizedAt = NOW; }],
  ["merged profile", () => { patient.isMerged = true; }],
  ["deletion request", () => { patient.deletionRequests = [{ id: "deletion-1" }]; }],
  ["scheduled account deletion", () => { patient.user.deletionScheduledAt = NOW; }],
  ["inactive user", () => { patient.user.isActive = false; }],
  ["different user email", () => { patient.user.email = "other@example.com"; }],
  ["conflicting DOB", () => { patient.user.dateOfBirth = new Date("1990-09-10T00:00:00Z"); }],
  ["commission country", () => { country.commissionReceiptEnabled = true; }],
  ["unknown country", () => { patient.currentCountryCode = "xx"; }],
  ["annual duplicate", () => { duplicate = true; }],
];
for (const [name, exclude] of exclusions) {
  it(`enqueue skips ${name} without writes`, async () => {
    exclude();
    assert.deepEqual(await service.enqueueBirthdayOffers(NOW), { scanned: 1, eligible: 0, created: 0 });
    assert.deepEqual(writes, []);
    assert.equal(transactions, 0);
    assert.equal(messages.length, 0);
  });
}

it("dry run reports eligibility but makes zero writes or deliveries", async () => {
  assert.deepEqual(await service.enqueueBirthdayOffers(NOW, true), { scanned: 1, eligible: 1, created: 0 });
  assert.equal(transactions, 0); assert.deepEqual(writes, []); assert.deepEqual(messages, []);
  const select = reads[0].select;
  assert.deepEqual(select.consents, { where: { consentType: "MARKETING" },
    orderBy: [{ createdAt: "desc" }, { consentValue: "asc" }], take: 1, select: { consentValue: true } });
  const annualRead = reads.find((read) => read.where?.OR);
  assert.ok(annualRead, "expected an annual duplicate lookup");
  const annual = annualRead.where.OR;
  assert.deepEqual(annual[0], { patientProfileId: patient.id, year: 2026 });
  assert.match(annual[1].annualAddressKey, /^[a-f0-9]{64}$/);
});

it("atomically enqueues an annual personal single-use GP coupon and its outbox intent", async () => {
  assert.equal((await service.enqueueBirthdayOffers(NOW)).created, 1);
  assert.equal(transactions, 1);
  assert.deepEqual(committed, ["coupon+offer", "outbox"]);
  assert.ok(writes.every((entry) => entry.transaction));
  const data = writes[0].args.data;
  assert.deepEqual(data.patient, { connect: { id: patient.id } }); assert.equal(data.year, 2026);
  const coupon = data.coupon.create;
  assert.equal(coupon.kind, "PERSONAL"); assert.equal(coupon.scope, "GENERAL_CONSULTATION");
  assert.equal(coupon.maxRedemptions, 1); assert.equal(coupon.discountPercent, 20);
  assert.equal(coupon.personalEmail, patient.email); assert.ok(coupon.code.length > 0);
  assert.deepEqual(coupon.recipients.create, { email: patient.email, fullName: patient.fullName, patientProfileId: patient.id });
  assert.equal(coupon.validFrom.toISOString(), "2026-09-08T23:00:00.000Z");
  assert.equal(coupon.validUntil.toISOString(), "2026-10-08T22:59:59.999Z");
  assert.deepEqual(writes[1].args.data, { kind: "birthday_coupon_email", idempotencyKey: "birthday_coupon_email:offer-1", payload: { offerId: offer.id } });
  assert.deepEqual(messages, []);
});

it("propagates outbox insertion failure without committing the coupon transaction", async () => {
  failOutbox = true;
  await assert.rejects(service.enqueueBirthdayOffers(NOW), /outbox unavailable/);
  assert.equal(transactions, 1); assert.deepEqual(committed, []); assert.deepEqual(messages, []);
});

for (const [name, change] of [
  ["withdrawn consent", () => { patient.consents = [{ consentValue: false }]; }],
  ["disabled settings", () => { settings!.enabled = false; }],
  ["newsletter suppression", () => { suppressed = true; }],
  ["stale birthday", () => { patient.dateOfBirth = patient.user.dateOfBirth = new Date("1990-09-08T00:00:00Z"); }],
] satisfies [string, () => void][]) {
  it(`dispatch rechecks ${name}`, async () => {
    change();
    await service.dispatchBirthdayOffer({ offerId: offer.id }, 1, NOW);
    assert.equal(offer.status, "SKIPPED"); assert.deepEqual(messages, []);
    assert.ok(!writes.some((entry) => entry.table === "offer.claim"));
  });
}

it("successful delivery is durably claimed and sent only once", async () => {
  provider = async () => { assert.equal(offer.status, "SENDING"); return { ok: true, mode: "smtp" }; };
  await service.dispatchBirthdayOffer({ offerId: offer.id }, 1, NOW);
  await service.dispatchBirthdayOffer({ offerId: offer.id }, 2, NOW);
  assert.equal(offer.status, "SENT"); assert.equal(messages.length, 1);
  assert.equal(messages[0].to, patient.email);
  const recipient = writes.find((entry) => entry.table === "recipient.update")!;
  assert.equal(recipient.args.data.status, "SENT"); assert.ok(recipient.transaction);
  assert.equal(recipient.args.where.couponId, offer.couponId);
});

it("confirmed rejection retries the same coupon, then succeeds", async () => {
  provider = async () => ({ ok: false, notAccepted: true });
  await assert.rejects(service.dispatchBirthdayOffer({ offerId: offer.id }, 1, NOW));
  assert.equal(offer.status, "PENDING");
  provider = async () => ({ ok: true, mode: "smtp" });
  await service.dispatchBirthdayOffer({ offerId: offer.id }, 2, NOW);
  assert.equal(offer.status, "SENT"); assert.equal(messages.length, 2);
  assert.deepEqual(messages[0], messages[1]);
  assert.ok(!writes.some((entry) => entry.table === "offer.create"));
});

for (const [name, outcome] of [
  ["uncertain result", async () => ({ ok: false })],
  ["provider throw", async () => { throw new Error("connection lost after DATA"); }],
] satisfies [string, () => Promise<unknown>][]) {
  it(`${name} becomes UNKNOWN and is never resent`, async () => {
    provider = outcome;
    await service.dispatchBirthdayOffer({ offerId: offer.id }, 1, NOW);
    await service.dispatchBirthdayOffer({ offerId: offer.id }, 2, NOW);
    assert.equal(offer.status, "UNKNOWN"); assert.equal(messages.length, 1);
  });
}

it("stale SENDING becomes UNKNOWN without another provider call", async () => {
  offer.status = "SENDING"; offer.attemptedAt = new Date(NOW.getTime() - 5 * 60_000);
  await service.dispatchBirthdayOffer({ offerId: offer.id }, 2, NOW);
  await service.dispatchBirthdayOffer({ offerId: offer.id }, 3, NOW);
  assert.equal(offer.status, "UNKNOWN"); assert.deepEqual(messages, []);
});

for (const failure of ["settings", "render", "finish"] as const) {
  it(`final-attempt ${failure} failure is sanitized and terminal without resend`, async () => {
    fault = failure;
    await assert.rejects(service.dispatchBirthdayOffer({ offerId: offer.id }, MAX_ATTEMPTS, NOW), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /private .* details/);
      return true;
    });
    assert.equal(offer.status, failure === "finish" ? "UNKNOWN" : "FAILED");
    assert.equal(messages.length, failure === "finish" ? 1 : 0);
    fault = null;
    await service.dispatchBirthdayOffer({ offerId: offer.id }, MAX_ATTEMPTS + 1, NOW);
    assert.equal(messages.length, failure === "finish" ? 1 : 0);
  });
}

for (const [name, setup] of [
  ["confirmed rejection", () => { provider = async () => ({ ok: false, notAccepted: true }); }],
  ["unconfigured provider", () => { configured = false; }],
] satisfies [string, () => void][]) {
  it(`final retry fails permanently for ${name}`, async () => {
    setup();
    await assert.rejects(service.dispatchBirthdayOffer({ offerId: offer.id }, MAX_ATTEMPTS, NOW));
    assert.equal(offer.status, "FAILED");
    const calls = messages.length;
    await service.dispatchBirthdayOffer({ offerId: offer.id }, MAX_ATTEMPTS + 1, NOW);
    assert.equal(messages.length, calls);
    assert.equal(writes.find((entry) => entry.table === "recipient.update")!.args.data.status, "FAILED");
  });
}
