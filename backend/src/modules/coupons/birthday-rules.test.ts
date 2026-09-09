import assert from "node:assert/strict";
import { it } from "node:test";
import { birthdaySettingsSchema, birthdayTimezone, birthdayWindow, DEFAULT_BIRTHDAY_SETTINGS } from "./birthday-rules.js";

it("requires an explicit valid discount to enable, with no automatically funded default", () => {
  assert.equal(birthdaySettingsSchema.safeParse(DEFAULT_BIRTHDAY_SETTINGS).success, true);
  for (const discountPercent of [null, 0, 101, 10.5, "20"]) {
    assert.equal(birthdaySettingsSchema.safeParse({ enabled: true, discountPercent, validityDays: 30 }).success, false);
  }
  assert.equal(birthdaySettingsSchema.safeParse({ enabled: true, discountPercent: 20, validityDays: 30 }).success, true);
  for (const validityDays of [0, 366, 1.5]) {
    assert.equal(birthdaySettingsSchema.safeParse({ ...DEFAULT_BIRTHDAY_SETTINGS, validityDays }).success, false);
  }
});

it("uses local birthday and 9am boundaries without shifting the stored DOB", () => {
  const dob = new Date("1990-09-09T00:00:00Z");
  assert.equal(birthdayWindow(dob, new Date("2026-09-09T11:59:59Z"), "America/Sao_Paulo", 30), null);
  assert.ok(birthdayWindow(dob, new Date("2026-09-09T12:00:00Z"), "America/Sao_Paulo", 30));
  assert.ok(birthdayWindow(dob, new Date("2026-09-10T01:00:00Z"), "America/Sao_Paulo", 30));
  assert.equal(birthdayWindow(dob, new Date("2026-09-10T03:00:00Z"), "America/Sao_Paulo", 30), null);
  assert.equal(birthdayWindow(new Date("2027-09-09"), new Date("2026-09-09T12:00:00Z"), "UTC", 30), null);
});

it("observes February 29 on February 28 only in non-leap years", () => {
  const dob = new Date("2000-02-29T00:00:00Z");
  assert.ok(birthdayWindow(dob, new Date("2027-02-28T12:00:00Z"), "UTC", 30));
  assert.equal(birthdayWindow(dob, new Date("2028-02-28T12:00:00Z"), "UTC", 30), null);
  assert.equal(birthdayWindow(dob, new Date("2027-03-01T12:00:00Z"), "UTC", 30), null);
  assert.equal(birthdayWindow(dob, new Date("2028-02-29T12:00:00Z"), "UTC", 30)?.year, 2028);
});

it("expires at the end of the final local calendar day, including daylight saving", () => {
  const window = birthdayWindow(new Date("1990-10-20"), new Date("2026-10-20T12:00:00Z"), "Europe/Dublin", 30)!;
  assert.equal(window.validFrom.toISOString(), "2026-10-19T23:00:00.000Z");
  assert.equal(window.validUntil.toISOString(), "2026-11-18T23:59:59.999Z");
});

it("validates timezone snapshots and falls back only to a known country timezone", () => {
  assert.equal(birthdayTimezone("America/Sao_Paulo", "Europe/Dublin"), "America/Sao_Paulo");
  assert.equal(birthdayTimezone("Invalid/Zone", "Europe/Dublin"), "Europe/Dublin");
  assert.equal(birthdayTimezone(null, "UTC"), "UTC");
  assert.equal(birthdayTimezone("Invalid/Zone", null), null);
});
