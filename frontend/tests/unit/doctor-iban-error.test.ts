import { describe, expect, it } from "vitest";
import {
  IBAN_EXAMPLES,
  ibanError,
  ibanWarning,
} from "../../app/(portal)/(doctor)/doctor/profile/_components/form-helpers";

const strings = {
  ibanErrorLength: "length",
  ibanErrorFormat: "format",
  ibanErrorChecksum: "checksum",
} as unknown as Parameters<typeof ibanError>[1];

describe("ibanError", () => {
  it("accepts a valid IBAN, spaced or lowercase", () => {
    expect(ibanError("PT50 0002 0123 1234 5678 9015 4", strings)).toBeNull();
    expect(ibanError("ie29aibk93115212345678", strings)).toBeNull();
  });

  it("accepts a real Brazilian IBAN", () => {
    // 29 characters. A hard-coded 27-character length rule used to reject
    // every BR IBAN, so a Brazilian doctor could not save their bank details.
    expect(ibanError("BR 51 60746948 02622 0002079160 C 1", strings)).toBeNull();
    expect(ibanError("BR97 0036 0305 0000 1000 9795 493P 1", strings)).toBeNull();
  });

  it("does not measure an IBAN against its country's expected length", () => {
    // Maltese IBANs are 31 characters, Brazilian 29, Norwegian 15 — the
    // validator must not carry a per-country table that can be wrong.
    expect(ibanError("MT84 MALT 0110 0001 2345 MTLCAST001S", strings)).toBeNull();
    expect(ibanError("NO93 8601 1117 947", strings)).toBeNull();
  });

  it("does not block on failed check digits — it warns", () => {
    // Real doctor report: a Novo Banco PT IBAN entered three characters short.
    const short = "PT50007000000634495123";
    expect(ibanError(short, strings)).toBeNull();
    expect(ibanWarning(short, strings)).toBe("checksum");

    // A single mistyped digit in a real BR IBAN — the case that locked a
    // Brazilian doctor out of saving their bank details.
    const typo = "BR5160746948026220002079161C1";
    expect(ibanError(typo, strings)).toBeNull();
    expect(ibanWarning(typo, strings)).toBe("checksum");
  });

  it("does not warn on a valid IBAN", () => {
    expect(ibanWarning("BR5160746948026220002079160C1", strings)).toBeNull();
    expect(ibanWarning("PT50 0002 0123 1234 5678 9015 4", strings)).toBeNull();
    expect(ibanWarning("   ", strings)).toBeNull();
  });

  it("stays silent when a hard error is already showing", () => {
    // No point saying "check digits" about something that isn't an IBAN.
    expect(ibanWarning("PT50", strings)).toBeNull();
    expect(ibanWarning("P150007000000634495123", strings)).toBeNull();
  });

  it("checks the IBAN itself, not the market it is saved under", () => {
    // Portuguese account on an Irish market profile — perfectly legitimate.
    expect(ibanError("PT50000201231234567890154", strings)).toBeNull();
  });

  it("still flags the ISO bounds and the overall shape", () => {
    expect(ibanError("PT50", strings)).toBe("length");
    expect(ibanError(`PT50${"1".repeat(31)}`, strings)).toBe("length");
    expect(ibanError("P150007000000634495123", strings)).toBe("format");
  });

  it("treats blank as no error", () => {
    expect(ibanError("   ", strings)).toBeNull();
  });

  it("every built-in placeholder is itself a valid IBAN", () => {
    // The BR placeholder was once a malformed 27-character string, and because
    // the length table was derived from these examples it took a whole country
    // down with it. Placeholders are shown to doctors as the thing to copy —
    // they must be real.
    for (const [code, example] of Object.entries(IBAN_EXAMPLES)) {
      expect(ibanError(example.iban, strings), `${code} example`).toBeNull();
    }
  });
});
