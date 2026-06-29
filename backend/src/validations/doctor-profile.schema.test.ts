import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profilePatchBodySchema } from "./doctor-profile.schema.js";

describe("doctor profile validation", () => {
  it("accepts localized bio updates", () => {
    const result = profilePatchBodySchema.safeParse({
      translations: [
        { locale: "EN", bio: "<p>Hello</p>" },
        { locale: "PT", bio: "  <p>Ola</p>  " },
      ],
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.translations, [
        { locale: "EN", bio: "<p>Hello</p>" },
        { locale: "PT", bio: "<p>Ola</p>" },
      ]);
    }
  });

  it("rejects duplicate localized bio rows", () => {
    const result = profilePatchBodySchema.safeParse({
      translations: [
        { locale: "EN", bio: "<p>Hello</p>" },
        { locale: "EN", bio: "<p>Again</p>" },
      ],
    });

    assert.equal(result.success, false);
  });

  it("rejects an empty update payload", () => {
    assert.equal(profilePatchBodySchema.safeParse({}).success, false);
    assert.equal(
      profilePatchBodySchema.safeParse({ translations: [] }).success,
      false,
    );
  });
});
