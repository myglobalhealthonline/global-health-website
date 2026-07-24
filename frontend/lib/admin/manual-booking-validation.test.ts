import { describe, expect, it } from "vitest";
import {
  combinePhone,
  hasErrors,
  parseDiscountPercent,
  validateManualBooking,
  type ManualBookingValues,
} from "./manual-booking-validation";

/** A fully-valid ONLINE set of values. Tests override one field at a time. */
function validValues(overrides: Partial<ManualBookingValues> = {}): ManualBookingValues {
  return {
    fullName: "Walk In",
    email: "walk-in@example.com",
    phone: "+353 871234567",
    serviceId: "svc_1",
    doctorId: "doc_1",
    timeSlotId: "slot_1",
    consultationMode: "ONLINE",
    clinicId: "",
    locationAddress: "",
    ...overrides,
  };
}

describe("combinePhone", () => {
  it("joins a dial code and national number into +<code> <number>", () => {
    expect(combinePhone("353", "871234567")).toBe("+353 871234567");
  });

  it("tolerates a leading + on the dial code", () => {
    expect(combinePhone("+353", "871234567")).toBe("+353 871234567");
  });

  it("returns empty string when there is no national number", () => {
    expect(combinePhone("353", "   ")).toBe("");
  });
});

describe("parseDiscountPercent", () => {
  it("treats blank / missing as no discount", () => {
    for (const raw of ["", "   ", null, undefined]) {
      expect(parseDiscountPercent(raw)).toEqual({ value: null, error: null });
    }
  });

  it("normalises an explicit 0 to no discount", () => {
    expect(parseDiscountPercent("0")).toEqual({ value: null, error: null });
  });

  it("accepts whole percents up to a full comp", () => {
    expect(parseDiscountPercent("20").value).toBe(20);
    expect(parseDiscountPercent(" 100 ").value).toBe(100);
  });

  it("rejects out-of-range, fractional, and non-numeric input", () => {
    for (const raw of ["-5", "101", "12.5", "abc", "20%"]) {
      const result = parseDiscountPercent(raw);
      expect(result.value).toBeNull();
      expect(result.error).toBeTruthy();
    }
  });
});

describe("validateManualBooking", () => {
  it("passes a complete, valid payload", () => {
    expect(hasErrors(validateManualBooking(validValues()))).toBe(false);
  });

  it("flags a missing / too-short name", () => {
    expect(validateManualBooking(validValues({ fullName: "" })).fullName).toBeDefined();
    expect(validateManualBooking(validValues({ fullName: "X" })).fullName).toBeDefined();
  });

  it("flags a missing or malformed email", () => {
    expect(validateManualBooking(validValues({ email: "" })).email).toBeDefined();
    expect(validateManualBooking(validValues({ email: "not-an-email" })).email).toBeDefined();
  });

  it("requires a phone with a country code", () => {
    expect(validateManualBooking(validValues({ phone: "" })).phone).toBeDefined();
    // No leading + (country code) → distinct guidance.
    expect(validateManualBooking(validValues({ phone: "871234567" })).phone).toBeDefined();
    // Dial code only, no national number.
    expect(validateManualBooking(validValues({ phone: "+353" })).phone).toBeDefined();
    // Too short.
    expect(validateManualBooking(validValues({ phone: "+353 12" })).phone).toBeDefined();
  });

  it("accepts valid international formats across markets", () => {
    for (const phone of [
      "+353 871234567",
      "+420777123456",
      "+351 912345678",
      "+34 612345678",
      "+40 712345678",
      "+356 79123456",
      "+55 11912345678",
    ]) {
      expect(
        validateManualBooking(validValues({ phone })).phone,
        `expected ${phone} to be valid`,
      ).toBeUndefined();
    }
  });

  it("requires service, doctor, and time slot", () => {
    expect(validateManualBooking(validValues({ serviceId: "" })).serviceId).toBeDefined();
    expect(validateManualBooking(validValues({ doctorId: "" })).doctorId).toBeDefined();
    expect(validateManualBooking(validValues({ timeSlotId: "" })).timeSlotId).toBeDefined();
  });

  it("requires a venue for IN_PERSON and rejects both clinic + address", () => {
    const noVenue = validateManualBooking(
      validValues({ consultationMode: "IN_PERSON" }),
    );
    expect(noVenue.venue).toBeDefined();

    const clinicOnly = validateManualBooking(
      validValues({ consultationMode: "IN_PERSON", clinicId: "clinic_1" }),
    );
    expect(clinicOnly.venue).toBeUndefined();

    const both = validateManualBooking(
      validValues({
        consultationMode: "IN_PERSON",
        clinicId: "clinic_1",
        locationAddress: "123 Main St",
      }),
    );
    expect(both.venue).toBeDefined();
  });

  it("ignores clinic/address fields for ONLINE bookings", () => {
    const v = validateManualBooking(
      validValues({ consultationMode: "ONLINE", clinicId: "", locationAddress: "" }),
    );
    expect(v.venue).toBeUndefined();
  });
});
