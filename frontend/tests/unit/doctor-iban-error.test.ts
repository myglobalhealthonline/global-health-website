import { describe, expect, it } from "vitest";
import { ibanError } from "../../app/(portal)/(doctor)/doctor/profile/_components/form-helpers";

const strings = {
  ibanErrorLength: "length",
  ibanErrorFormat: "format",
  ibanErrorChecksum: "checksum",
  ibanErrorCountryLength: "A {code} IBAN is {expected} characters — you entered {actual}",
} as unknown as Parameters<typeof ibanError>[1];

describe("ibanError", () => {
  it("accepts a valid IBAN, spaced or lowercase", () => {
    expect(ibanError("PT50 0002 0123 1234 5678 9015 4", strings)).toBeNull();
    expect(ibanError("ie29aibk93115212345678", strings)).toBeNull();
  });

  it("names the missing characters when the country length is known", () => {
    // Real doctor report: a Novo Banco PT IBAN entered three characters short.
    // Right shape, wrong length — used to pass the client and 400 on the API.
    expect(ibanError("PT50007000000634495123", strings)).toBe(
      "A PT IBAN is 25 characters — you entered 22",
    );
  });

  it("falls back to the checksum message for right-length typos", () => {
    // Correct 25-char PT shape, one digit swapped.
    expect(ibanError("PT50000201231234567890155", strings)).toBe("checksum");
  });

  it("checks the IBAN's own country, not the market it is saved under", () => {
    // Portuguese account, Irish market profile — must not be measured as IE.
    expect(ibanError("PT50000201231234567890154", strings)).toBeNull();
  });

  it("still flags length and format", () => {
    expect(ibanError("PT50", strings)).toBe("length");
    expect(ibanError("P150007000000634495123", strings)).toBe("format");
  });

  it("treats blank as no error", () => {
    expect(ibanError("   ", strings)).toBeNull();
  });
});
