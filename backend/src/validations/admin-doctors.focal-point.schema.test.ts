import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { focalPointSchema, zoomSchema } from "./admin-doctors.schema.js";

describe("doctor photo focal-point schema", () => {
  it("focalPointSchema rejects out-of-range values", () => {
    assert.equal(focalPointSchema.safeParse(-1).success, false);
    assert.equal(focalPointSchema.safeParse(101).success, false);
  });

  it("focalPointSchema accepts boundary values", () => {
    assert.equal(focalPointSchema.safeParse(0).success, true);
    assert.equal(focalPointSchema.safeParse(100).success, true);
  });

  it("zoomSchema rejects out-of-range values", () => {
    assert.equal(zoomSchema.safeParse(0.5).success, false);
    assert.equal(zoomSchema.safeParse(5).success, false);
  });

  it("zoomSchema accepts boundary values", () => {
    assert.equal(zoomSchema.safeParse(1).success, true);
    assert.equal(zoomSchema.safeParse(3).success, true);
  });
});
