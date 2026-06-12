import assert from "node:assert";
import { describe, it } from "node:test";
import { computeSlotPrice, type PeakPricingConfig, type PeakWindow } from "./peak-pricing.service.js";
import { utcToClinicMinuteOfDay } from "../doctor-availability/timezone.js";

/** Build a config (one 18:00–22:00 window, €49 / €39, EUR) + optional overrides. */
function makeConfig(
  overrides: Partial<PeakPricingConfig> = {},
  windows: PeakWindow[] = [{ startMinute: 18 * 60, endMinute: 22 * 60 }],
): PeakPricingConfig {
  return {
    id: "cfg_test",
    serviceId: "svc_test",
    enabled: true,
    peakStartMinute: null,
    peakEndMinute: null,
    peakPriceCents: 4900,
    offPeakPriceCents: 3900,
    currencyCode: "EUR",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    windows: windows.map((w, i) => ({
      id: `w${i}`,
      pricingId: "cfg_test",
      startMinute: w.startMinute,
      endMinute: w.endMinute,
      sortOrder: i,
      createdAt: new Date(0),
    })),
    ...overrides,
  };
}

const BASE = {
  basePriceCents: 4500,
  fallbackCurrency: "EUR",
  clinicTimezone: "Europe/Dublin",
};

describe("utcToClinicMinuteOfDay", () => {
  it("reads clinic-local minute-of-day DST-correctly", () => {
    // Bucharest 19:00 local. Summer = UTC+3 → 16:00Z; winter = UTC+2 → 17:00Z.
    assert.equal(
      utcToClinicMinuteOfDay(new Date("2026-07-15T16:00:00Z"), "Europe/Bucharest"),
      19 * 60,
    );
    assert.equal(
      utcToClinicMinuteOfDay(new Date("2026-01-15T17:00:00Z"), "Europe/Bucharest"),
      19 * 60,
    );
  });

  it("treats an unknown zone as UTC", () => {
    assert.equal(
      utcToClinicMinuteOfDay(new Date("2026-07-15T09:30:00Z"), "Not/AZone"),
      9 * 60 + 30,
    );
  });
});

describe("computeSlotPrice", () => {
  it("returns STANDARD when there is no config", () => {
    const r = computeSlotPrice({
      ...BASE,
      config: null,
      slotStartUtc: new Date("2026-07-15T18:30:00Z"),
    });
    assert.deepEqual(r, {
      unitPriceCents: 4500,
      pricingType: "STANDARD",
      currencyCode: "EUR",
    });
  });

  it("returns STANDARD when the config is disabled", () => {
    const r = computeSlotPrice({
      ...BASE,
      config: makeConfig({ enabled: false }),
      slotStartUtc: new Date("2026-07-15T18:30:00Z"), // would be peak if enabled
    });
    assert.equal(r.pricingType, "STANDARD");
    assert.equal(r.unitPriceCents, 4500);
  });

  it("charges the peak price inside the window", () => {
    // Dublin summer = UTC+1, so 18:30 local = 17:30Z.
    const r = computeSlotPrice({
      ...BASE,
      config: makeConfig(),
      slotStartUtc: new Date("2026-07-15T17:30:00Z"),
    });
    assert.deepEqual(r, {
      unitPriceCents: 4900,
      pricingType: "PEAK",
      currencyCode: "EUR",
    });
  });

  it("charges the off-peak price before the window", () => {
    // 09:00 Dublin local (summer) = 08:00Z.
    const r = computeSlotPrice({
      ...BASE,
      config: makeConfig(),
      slotStartUtc: new Date("2026-07-15T08:00:00Z"),
    });
    assert.equal(r.pricingType, "OFF_PEAK");
    assert.equal(r.unitPriceCents, 3900);
  });

  it("treats the start minute as inclusive (peak)", () => {
    // 18:00 Dublin local (summer) = 17:00Z, minute 1080 === peakStartMinute.
    const r = computeSlotPrice({
      ...BASE,
      config: makeConfig(),
      slotStartUtc: new Date("2026-07-15T17:00:00Z"),
    });
    assert.equal(r.pricingType, "PEAK");
  });

  it("treats the end minute as exclusive (off-peak at 22:00)", () => {
    // 22:00 Dublin local (summer) = 21:00Z, minute 1320 === peakEndMinute.
    const r = computeSlotPrice({
      ...BASE,
      config: makeConfig(),
      slotStartUtc: new Date("2026-07-15T21:00:00Z"),
    });
    assert.equal(r.pricingType, "OFF_PEAK");
    assert.equal(r.unitPriceCents, 3900);
  });

  it("uses the config currency when peak pricing is active", () => {
    const r = computeSlotPrice({
      ...BASE,
      fallbackCurrency: "GBP",
      config: makeConfig({ currencyCode: "EUR" }),
      slotStartUtc: new Date("2026-07-15T17:30:00Z"),
    });
    assert.equal(r.currencyCode, "EUR");
  });

  it("treats a slot inside ANY of multiple windows as peak", () => {
    // Two windows: 11:00–12:00 and 16:00–17:00 (Dublin local).
    const config = makeConfig({}, [
      { startMinute: 11 * 60, endMinute: 12 * 60 },
      { startMinute: 16 * 60, endMinute: 17 * 60 },
    ]);
    // 11:30 Dublin summer = 10:30Z → inside window 1.
    const w1 = computeSlotPrice({ ...BASE, config, slotStartUtc: new Date("2026-07-15T10:30:00Z") });
    // 16:30 Dublin summer = 15:30Z → inside window 2.
    const w2 = computeSlotPrice({ ...BASE, config, slotStartUtc: new Date("2026-07-15T15:30:00Z") });
    // 14:00 Dublin summer = 13:00Z → between windows → off-peak.
    const gap = computeSlotPrice({ ...BASE, config, slotStartUtc: new Date("2026-07-15T13:00:00Z") });
    assert.equal(w1.pricingType, "PEAK");
    assert.equal(w2.pricingType, "PEAK");
    assert.equal(gap.pricingType, "OFF_PEAK");
  });

  it("returns STANDARD when enabled but there are no windows", () => {
    const r = computeSlotPrice({
      ...BASE,
      config: makeConfig({}, []),
      slotStartUtc: new Date("2026-07-15T17:30:00Z"),
    });
    assert.equal(r.pricingType, "STANDARD");
    assert.equal(r.unitPriceCents, 4500);
  });

  it("classifies the same wall-clock peak slot consistently across DST", () => {
    const config = makeConfig();
    // Bucharest 18:30 local: summer 15:30Z, winter 16:30Z — both peak.
    const summer = computeSlotPrice({
      config,
      basePriceCents: 4500,
      fallbackCurrency: "EUR",
      clinicTimezone: "Europe/Bucharest",
      slotStartUtc: new Date("2026-07-15T15:30:00Z"),
    });
    const winter = computeSlotPrice({
      config,
      basePriceCents: 4500,
      fallbackCurrency: "EUR",
      clinicTimezone: "Europe/Bucharest",
      slotStartUtc: new Date("2026-01-15T16:30:00Z"),
    });
    assert.equal(summer.pricingType, "PEAK");
    assert.equal(winter.pricingType, "PEAK");
  });
});
