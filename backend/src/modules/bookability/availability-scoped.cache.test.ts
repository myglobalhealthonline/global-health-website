import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const now = new Date();
const slot = {
  id: "slot-1", startAt: new Date(now.getTime() + 2 * 3600_000).toISOString(),
  endAt: new Date(now.getTime() + 2.5 * 3600_000).toISOString(),
};
function fixture(code: string) {
  return {
    id: `service-${code}`, slug: `consult-${code}`, code, durationMinutes: 30,
    basePriceCents: 5000, currencyCode: "EUR", bookingPausedFrom: null, bookingPausedUntil: null,
    country: { currency: { code: "EUR" }, bookingSetting: { bookingEnabled: true } },
    assignedDoctors: [{ doctor: {
      id: `doctor-${code}`, slug: `doctor-${code}`, languages: [code === "ie" ? "en" : "pt"],
      bookingPausedFrom: null, bookingPausedUntil: null,
    } }],
  };
}
let services: ReturnType<typeof fixture>[];
let slots: Record<string, typeof slot[]>;
let lookups: Record<string, number>;
let pauseLookup: (() => Promise<void>) | undefined;
let pauseSlots: { id: string; wait: () => Promise<void> } | undefined;
let api: typeof import("./bookability.service.js");
let gp: typeof import("../gp-booking/gp-assignment.service.js");
let aggregate: typeof import("../service-booking/service-availability.service.js");
let invalidate: (typeof import("../doctor-availability/availability-cache-bus.js"))["invalidateAvailabilityCaches"];
function count(key: string) { lookups[key] = (lookups[key] ?? 0) + 1; }
function deferred() {
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  const wait = async () => { entered(); await new Promise<void>((resolve) => { release = resolve; }); };
  return { ready, wait, release: () => release() };
}

before(async () => {
  mock.module("../../db/prisma.js", { namedExports: { prisma: {
    country: { findFirst: async () => ({ bookingSetting: { timezone: "UTC" } }) },
    service: {
      findFirst: async ({ where }: { where: { id?: string; slug?: string; country: { code: string } } }) => {
        count(`service:${where.country.code}`);
        const value = services.find((s) => s.code === where.country.code && (where.id ? s.id === where.id : s.slug === where.slug)) ?? null;
        if (pauseLookup) { const wait = pauseLookup; pauseLookup = undefined; await wait(); }
        return value;
      },
      findUnique: async ({ where }: { where: { id: string } }) => services.find((s) => s.id === where.id),
      findMany: async ({ where }: { where: { id?: string; country: { code: string }; assignedDoctors: { some: { doctorId: string } } } }) => {
        count(`doctor-services:${where.assignedDoctors.some.doctorId}`);
        return services.filter((s) => s.code === where.country.code && (!where.id || s.id === where.id)
          && s.assignedDoctors.some((a) => a.doctor.id === where.assignedDoctors.some.doctorId));
      },
    },
    doctor: { findMany: async ({ where }: { where: { assignedServices: { some: { serviceId: string } } } }) => {
      const id = where.assignedServices.some.serviceId;
      count(`pool:${id}`);
      return services.find((s) => s.id === id)?.assignedDoctors.map((a) => a.doctor) ?? [];
    } },
  } } });
  mock.module("../doctor-availability/doctor-availability.service.js", { namedExports: {
    releaseExpiredHeldSlotsForDoctors: async () => {},
    listOpenSlotsForDoctorAndService: async (id: string) => {
      count(`slots:${id}`);
      const value = [...(slots[id] ?? [])];
      if (pauseSlots?.id === id) { const wait = pauseSlots.wait; pauseSlots = undefined; await wait(); }
      return value;
    },
  } });
  mock.module("../pricing/peak-pricing.service.js", { namedExports: {
    getServicePeakConfig: async () => null,
    computeSlotPrice: () => ({ unitPriceCents: 5000, pricingType: "STANDARD", currencyCode: "EUR" }),
  } });
  mock.module("../gp-booking/gp-config.service.js", { namedExports: {
    resolveGpSameDayService: async (code: string) => {
      count(`gp:${code}`);
      return services.find((s) => s.code === code) ?? null;
    },
    getGpPriorityDoctorId: async () => null,
    claimNextRotationCursor: async () => 0,
  } });
  api = await import("./bookability.service.js");
  gp = await import("../gp-booking/gp-assignment.service.js");
  aggregate = await import("../service-booking/service-availability.service.js");
  ({ invalidateAvailabilityCaches: invalidate } = await import("../doctor-availability/availability-cache-bus.js"));
});
beforeEach(() => {
  services = [fixture("ie"), fixture("pt")]; slots = {}; lookups = {};
  pauseLookup = undefined; pauseSlots = undefined; invalidate();
});
const readAggregate = (code = "ie") => aggregate.getServiceAggregatedAvailability(code, `consult-${code}`, 2);
const readSummary = (code = "ie") => api.getServiceBookability({ countryCode: code, serviceSlug: `consult-${code}`, now });
const readGp = (code = "ie") => gp.getGpAvailability({ countryCode: code, languageCode: code === "ie" ? "en" : "pt", days: 2 });

describe("scoped aggregate cache dependencies", () => {
  it("refreshes zero-slot doctors in service, GP, live languages and summaries while retaining another country", async () => {
    const read = async (code: string) => Promise.all([readAggregate(code), readGp(code), gp.getGpLanguages(code), readSummary(code)]);
    const empty = await read("ie");
    const unrelated = await read("pt");
    assert.equal(empty[0].slots.length, 0);
    assert.equal(empty[1].slots.length, 0);
    assert.deepEqual(empty[2].bookableLanguages, []);
    assert.equal(empty[3].state, "UNAVAILABLE");
    const beforePt = lookups["slots:doctor-pt"];
    slots["doctor-ie"] = [slot];
    invalidate({ doctorIds: ["doctor-ie"] });
    const fresh = await read("ie");
    assert.equal(fresh[0].slots.length, 1);
    assert.equal(fresh[1].slots.length, 1);
    assert.deepEqual(fresh[2].bookableLanguages, ["en"]);
    assert.equal(fresh[3].state, "BOOKABLE");
    const warm = await read("pt");
    warm.forEach((value, index) => assert.strictEqual(value, unrelated[index]));
    assert.equal(lookups["slots:doctor-pt"], beforePt);
  });

  it("matches resolved IDs for slug calls and targets country invalidations", async () => {
    await Promise.all([readAggregate(), readSummary(), readGp(), gp.getGpLanguages("ie")]);
    const pt = await Promise.all([readAggregate("pt"), readSummary("pt"), readGp("pt"), gp.getGpLanguages("pt")]);
    slots["doctor-ie"] = [slot];
    invalidate({ serviceIds: ["service-ie"] });
    assert.equal((await readAggregate()).slots.length, 1);
    assert.equal((await readSummary()).state, "BOOKABLE");
    assert.equal((await readGp()).slots.length, 1);
    assert.deepEqual((await gp.getGpLanguages("ie")).bookableLanguages, ["en"]);
    const warm = await Promise.all([readAggregate("pt"), readSummary("pt"), readGp("pt"), gp.getGpLanguages("pt")]);
    warm.forEach((value, index) => assert.strictEqual(value, pt[index]));
    slots["doctor-ie"] = [];
    invalidate({ countryCodes: [" IE "] });
    assert.equal((await readAggregate()).slots.length, 0);
    assert.equal((await readSummary()).state, "UNAVAILABLE");
    assert.equal((await readGp()).slots.length, 0);
    assert.deepEqual((await gp.getGpLanguages("ie")).bookableLanguages, []);
  });

  for (const [name, read] of [["service", readAggregate], ["summary", readSummary], ["GP", readGp], ["languages", (code = "ie") => gp.getGpLanguages(code)]] as const) {
    it(`keeps unrelated ${name} in-flight work and retries a changed doctor before returning`, async () => {
      const gate = deferred();
      pauseSlots = { id: "doctor-pt", wait: gate.wait };
      const pending = read("pt");
      await gate.ready;
      invalidate({ doctorIds: ["doctor-ie"] });
      gate.release();
      await pending;
      assert.equal(lookups["slots:doctor-pt"], 1);
      const changed = deferred();
      pauseSlots = { id: "doctor-ie", wait: changed.wait };
      const stale = read("ie");
      await changed.ready;
      slots["doctor-ie"] = [slot];
      invalidate({ doctorIds: ["doctor-ie"] });
      changed.release();
      const value = await stale;
      assert.equal(lookups["slots:doctor-ie"], 2);
      if ("slots" in value) assert.equal(value.slots.length, 1);
      else if ("bookableLanguages" in value) assert.deepEqual(value.bookableLanguages, ["en"]);
      else assert.equal(value.state, "BOOKABLE");
    });
  }

  it("retries unknown service/doctor dependencies and does not restore late metadata", async () => {
    const gate = deferred(); pauseLookup = gate.wait;
    const pending = readSummary();
    await gate.ready;
    slots["doctor-ie"] = [slot];
    invalidate({ serviceIds: ["service-ie"] });
    gate.release();
    assert.equal((await pending).state, "BOOKABLE");
    assert.equal(lookups["service:ie"], 2);
    const warm = await readSummary();
    invalidate({ doctorIds: ["doctor-pt"] });
    assert.strictEqual(await readSummary(), warm);
  });

  it("keeps request dependencies for negatives and full-flush admits new membership", async () => {
    services = [];
    assert.equal((await readAggregate()).found, false);
    assert.equal((await readSummary()).state, "UNAVAILABLE");
    assert.equal((await readGp()).service, null);
    assert.equal((await gp.getGpLanguages("ie")).configured, false);
    services = [fixture("ie")]; slots["doctor-ie"] = [slot];
    invalidate({ serviceIds: ["consult-ie"] });
    assert.equal((await readAggregate()).found, true);
    assert.equal((await readSummary()).state, "BOOKABLE");
    invalidate({ countryCodes: ["ie"] });
    assert.equal((await readGp()).slots.length, 1);
    assert.deepEqual((await gp.getGpLanguages("ie")).bookableLanguages, ["en"]);
    services[0].assignedDoctors = []; invalidate();
    assert.equal((await readSummary()).state, "UNAVAILABLE");
    assert.equal((await readAggregate()).slots.length, 0);
    assert.equal((await readGp()).slots.length, 0);
    assert.deepEqual((await gp.getGpLanguages("ie")).bookableLanguages, []);
    services = [fixture("ie")]; invalidate();
    assert.equal((await readSummary()).state, "BOOKABLE");
    assert.equal((await readAggregate()).slots.length, 1);
    assert.equal((await readGp()).slots.length, 1);
    assert.deepEqual((await gp.getGpLanguages("ie")).bookableLanguages, ["en"]);
  });

  it("tracks all resolved services and the requested doctor in doctor summaries", async () => {
    const args = { countryCode: "ie", doctorId: "doctor-ie", now };
    assert.equal((await api.getDoctorBookability(args)).state, "UNAVAILABLE");
    slots["doctor-ie"] = [slot];
    invalidate({ serviceIds: ["service-ie"] });
    assert.equal((await api.getDoctorBookability(args)).state, "BOOKABLE");
    const warm = await api.getDoctorBookability(args);
    invalidate({ doctorIds: ["doctor-pt"] });
    assert.strictEqual(await api.getDoctorBookability(args), warm);
    slots["doctor-ie"] = [];
    invalidate({ doctorIds: ["doctor-ie"] });
    assert.equal((await api.getDoctorBookability(args)).state, "UNAVAILABLE");
  });
});
