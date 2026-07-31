import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAddressLines,
  buildPatientIdLine,
} from "./generated-documents-fields.js";

/**
 * Pure unit tests for the helpers that pick which patient ID label
 * lands on a generated PDF and how the address block is laid out.
 *
 * These don't touch Prisma — the helpers operate on a plain profile
 * snapshot — so they run in any environment, with or without a DB.
 */

describe("buildPatientIdLine", () => {
  const baseProfile = {
    nationalIdNumber: null as string | null,
    taxIdNumber: null as string | null,
    passportNumber: null as string | null,
  };

  it("returns null when no IDs are stored", () => {
    assert.equal(buildPatientIdLine("PT", baseProfile), null);
  });

  it("returns null when profile is null", () => {
    assert.equal(buildPatientIdLine("PT", null), null);
  });

  it("prefers tax ID and labels it NIF for PT", () => {
    assert.equal(
      buildPatientIdLine("PT", { ...baseProfile, taxIdNumber: "123456789" }),
      "NIF: 123456789",
    );
  });

  it("labels tax ID as CPF for BR", () => {
    assert.equal(
      buildPatientIdLine("BR", { ...baseProfile, taxIdNumber: "111.222.333-44" }),
      "CPF: 111.222.333-44",
    );
  });

  it("labels tax ID as PPS for IE", () => {
    assert.equal(
      buildPatientIdLine("IE", { ...baseProfile, taxIdNumber: "1234567T" }),
      "PPS: 1234567T",
    );
  });

  it("labels tax ID as DNI for ES", () => {
    assert.equal(
      buildPatientIdLine("ES", { ...baseProfile, taxIdNumber: "12345678Z" }),
      "DNI: 12345678Z",
    );
  });

  it("falls back to generic Tax ID label for unknown countries", () => {
    assert.equal(
      buildPatientIdLine("XX", { ...baseProfile, taxIdNumber: "ANY-VALUE" }),
      "Tax ID: ANY-VALUE",
    );
  });

  it("falls back to national ID when no tax ID is set", () => {
    assert.equal(
      buildPatientIdLine("PT", {
        ...baseProfile,
        nationalIdNumber: "CC-9999",
      }),
      "Cartão de Cidadão: CC-9999",
    );
  });

  it("falls back to national ID labeled as RG for BR", () => {
    assert.equal(
      buildPatientIdLine("BR", {
        ...baseProfile,
        nationalIdNumber: "12.345.678-9",
      }),
      "RG: 12.345.678-9",
    );
  });

  it("falls back to passport when no local IDs are set", () => {
    assert.equal(
      buildPatientIdLine("PT", {
        ...baseProfile,
        passportNumber: "EU99887766",
      }),
      "Passport: EU99887766",
    );
  });

  it("uses the issuing-country health id when one was captured", () => {
    assert.equal(
      buildPatientIdLine(
        "IE",
        { ...baseProfile, taxIdNumber: "078.065.579-62", addressCountryCode: "br" },
        "1234567T",
      ),
      "PPS: 1234567T",
    );
  });

  it("prints nothing when the chart id belongs to another country", () => {
    // Cross-border Rx: a Brazilian CPF must never be labelled "PPS".
    assert.equal(
      buildPatientIdLine("IE", {
        ...baseProfile,
        taxIdNumber: "078.065.579-62",
        addressCountryCode: "br",
      }),
      null,
    );
  });

  it("still uses the chart id when the profile country matches", () => {
    assert.equal(
      buildPatientIdLine("IE", {
        ...baseProfile,
        taxIdNumber: "1234567T",
        addressCountryCode: "ie",
      }),
      "PPS: 1234567T",
    );
  });

  it("treats SP/ES and RM/RO as the same country", () => {
    assert.equal(
      buildPatientIdLine("SP", {
        ...baseProfile,
        taxIdNumber: "12345678Z",
        addressCountryCode: "es",
      }),
      "DNI: 12345678Z",
    );
  });

  it("uses the health id even when no profile exists", () => {
    assert.equal(buildPatientIdLine("IE", null, "1234567T"), "PPS: 1234567T");
  });

  it("country code is normalized to upper-case", () => {
    assert.equal(
      buildPatientIdLine("pt", { ...baseProfile, taxIdNumber: "1" }),
      "NIF: 1",
    );
  });
});

describe("buildAddressLines", () => {
  const empty = {
    addressLine1: null as string | null,
    addressLine2: null as string | null,
    addressCity: null as string | null,
    addressPostalCode: null as string | null,
    addressCountryCode: null as string | null,
  };

  it("returns empty array when no fields are populated", () => {
    assert.deepEqual(buildAddressLines(empty), []);
  });

  it("includes line 1 only", () => {
    assert.deepEqual(
      buildAddressLines({ ...empty, addressLine1: "1 Main St" }),
      ["1 Main St"],
    );
  });

  it("includes both lines when set", () => {
    assert.deepEqual(
      buildAddressLines({
        ...empty,
        addressLine1: "1 Main St",
        addressLine2: "Apt 4B",
      }),
      ["1 Main St", "Apt 4B"],
    );
  });

  it("formats postal + city onto one line when both set", () => {
    assert.deepEqual(
      buildAddressLines({
        ...empty,
        addressLine1: "1 Main St",
        addressCity: "Lisbon",
        addressPostalCode: "1000-001",
      }),
      ["1 Main St", "1000-001 Lisbon"],
    );
  });

  it("emits city alone when postal code is missing", () => {
    assert.deepEqual(
      buildAddressLines({ ...empty, addressCity: "Lisbon" }),
      ["Lisbon"],
    );
  });

  it("emits postal code alone when city is missing", () => {
    assert.deepEqual(
      buildAddressLines({ ...empty, addressPostalCode: "1000-001" }),
      ["1000-001"],
    );
  });

  it("appends country code on its own line at the bottom", () => {
    assert.deepEqual(
      buildAddressLines({
        ...empty,
        addressLine1: "1 Main St",
        addressCity: "Lisbon",
        addressPostalCode: "1000-001",
        addressCountryCode: "PT",
      }),
      ["1 Main St", "1000-001 Lisbon", "PT"],
    );
  });
});
