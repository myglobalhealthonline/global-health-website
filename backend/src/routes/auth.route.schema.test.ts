import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profilePatchSchema } from "./auth.route.js";

describe("profilePatchSchema (preferredLocale)", () => {
  it("accepts a valid uppercase LocaleCode", () => {
    const result = profilePatchSchema.safeParse({ preferredLocale: "PT" });
    assert.equal(result.success, true);
  });

  it("accepts null to clear the preference", () => {
    const result = profilePatchSchema.safeParse({ preferredLocale: null });
    assert.equal(result.success, true);
  });

  it("omits cleanly when absent (leaves stored value untouched)", () => {
    const result = profilePatchSchema.safeParse({ fullName: "Jane Doe" });
    assert.equal(result.success, true);
    assert.equal(result.success && result.data.preferredLocale, undefined);
  });

  it("rejects a lowercase or unsupported locale code", () => {
    assert.equal(profilePatchSchema.safeParse({ preferredLocale: "pt" }).success, false);
    assert.equal(profilePatchSchema.safeParse({ preferredLocale: "XX" }).success, false);
  });
});
