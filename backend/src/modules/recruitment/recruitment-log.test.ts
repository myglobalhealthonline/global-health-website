import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recruitmentErrorCode, recruitmentOperationalError } from "./recruitment-log.js";

describe("recruitment operational error metadata", () => {
  it("safely handles nullish and primitive throws without reading properties", () => {
    assert.equal(recruitmentErrorCode(null), undefined);
    assert.equal(recruitmentErrorCode(undefined), undefined);
    assert.deepEqual(recruitmentOperationalError(null), { errorType: "object" });
    assert.deepEqual(recruitmentOperationalError(undefined), { errorType: "undefined" });
    assert.deepEqual(recruitmentOperationalError("failure"), { errorType: "string" });
  });

  it("keeps only safe type/code metadata and never the error message", () => {
    const error = Object.assign(new Error("candidate@example.com"), { code: "P2002" });
    assert.deepEqual(recruitmentOperationalError(error), {
      errorType: "Error",
      errorCode: "P2002",
    });
  });
});
