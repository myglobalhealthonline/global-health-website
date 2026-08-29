import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingPauseBodySchema } from "./booking-pause.schema.js";

describe("booking pause validation", () => {
  it("accepts a finite pause and converts UTC instants to Dates", () => {
    const result = bookingPauseBodySchema.safeParse({
      from: "2026-09-01T08:00:00.000Z",
      until: "2026-09-08T08:00:00.000Z",
      reasonCode: "LEAVE",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.from.toISOString(), "2026-09-01T08:00:00.000Z");
      assert.equal(result.data.until?.toISOString(), "2026-09-08T08:00:00.000Z");
    }
  });

  it("accepts an indefinite pause", () => {
    const result = bookingPauseBodySchema.safeParse({
      from: "2026-09-01T08:00:00Z",
      until: null,
      reasonCode: "TEMPORARY_UNAVAILABLE",
    });
    assert.equal(result.success, true);
  });

  it("rejects a pause whose end is not after its start", () => {
    assert.equal(
      bookingPauseBodySchema.safeParse({
        from: "2026-09-08T08:00:00Z",
        until: "2026-09-01T08:00:00Z",
        reasonCode: "LEAVE",
      }).success,
      false,
    );
  });

  it("rejects local datetimes without an explicit UTC offset", () => {
    assert.equal(
      bookingPauseBodySchema.safeParse({
        from: "2026-09-01T08:00:00",
        until: null,
        reasonCode: "OTHER",
      }).success,
      false,
    );
  });

  it("rejects arbitrary public-facing free text as the reason", () => {
    assert.equal(
      bookingPauseBodySchema.safeParse({
        from: "2026-09-01T08:00:00Z",
        until: null,
        reasonCode: "Doctor is sick with a private diagnosis",
      }).success,
      false,
    );
  });
});
