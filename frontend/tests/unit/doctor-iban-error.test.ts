import { describe, expect, it } from "vitest";
import { ibanError } from "../../app/(portal)/(doctor)/doctor/profile/_components/form-helpers";

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

  it("rejects a mistyped IBAN that passes the shape check", () => {
    // Real doctor report: PT IBAN with three digits dropped — right shape,
    // wrong check digits. Used to pass the client and 400 on the API.
    expect(ibanError("PT50007000000634495123", strings)).toBe("checksum");
  });

  it("still flags length and format", () => {
    expect(ibanError("PT50", strings)).toBe("length");
    expect(ibanError("P150007000000634495123", strings)).toBe("format");
  });

  it("treats blank as no error", () => {
    expect(ibanError("   ", strings)).toBeNull();
  });
});
