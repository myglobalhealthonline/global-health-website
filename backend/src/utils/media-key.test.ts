import assert from "node:assert";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { isSafeMediaKey, sanitizeOriginalFilename } from "./media-key.js";

describe("media key helpers", () => {
  it("sanitizes filenames", () => {
    assert.equal(sanitizeOriginalFilename("  foo bar!.PNG  "), "foo-bar-.PNG");
  });

  it("accepts keys we generate", () => {
    const key = `media/${randomUUID()}-${sanitizeOriginalFilename("x.png")}`;
    assert.equal(isSafeMediaKey(key), true);
  });

  it("accepts scoped per-actor keys (doctors/<id>/<uuid>-name)", () => {
    const doctorId = "cmp9n5dpq0000foju1qv98wm3"; // cuid shape
    const key = `media/doctors/${doctorId}/${randomUUID()}-${sanitizeOriginalFilename("photo.png")}`;
    assert.equal(isSafeMediaKey(key), true);
  });

  it("rejects traversal and weird keys", () => {
    assert.equal(isSafeMediaKey("media/../evil"), false);
    assert.equal(isSafeMediaKey("other/uuid-name.png"), false);
    // Scope must be lowercase letters only, no traversal.
    assert.equal(isSafeMediaKey("media/../doctors/abc/uuid-x.png"), false);
    // Three nested levels disallowed.
    assert.equal(
      isSafeMediaKey(`media/doctors/abc/extra/${randomUUID()}-x.png`),
      false,
    );
  });
});
