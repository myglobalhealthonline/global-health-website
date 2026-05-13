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

  it("rejects traversal and weird keys", () => {
    assert.equal(isSafeMediaKey("media/../evil"), false);
    assert.equal(isSafeMediaKey("other/uuid-name.png"), false);
  });
});
