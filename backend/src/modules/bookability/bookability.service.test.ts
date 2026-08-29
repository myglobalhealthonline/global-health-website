import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BookingPauseValidationError,
  validateBookingPauseInput,
} from "./bookability.service.js";

describe("validateBookingPauseInput", () => {
  it("accepts an indefinite pause and trims its internal reason", () => {
    assert.deepEqual(
      validateBookingPauseInput({
        bookingPausedFrom: new Date("2026-09-01T00:00:00.000Z"),
        bookingPausedUntil: null,
        bookingPauseReason: "  annual leave  ",
      }),
      {
        bookingPausedFrom: new Date("2026-09-01T00:00:00.000Z"),
        bookingPausedUntil: null,
        bookingPauseReason: "annual leave",
      },
    );
  });

  it("normalizes every dependent field to null when clearing a pause", () => {
    assert.deepEqual(
      validateBookingPauseInput({
        bookingPausedFrom: null,
        bookingPausedUntil: new Date("2026-09-20T00:00:00.000Z"),
        bookingPauseReason: "must not survive",
      }),
      {
        bookingPausedFrom: null,
        bookingPausedUntil: null,
        bookingPauseReason: null,
      },
    );
  });

  it("rejects a finite pause whose end is not after its start", () => {
    assert.throws(
      () =>
        validateBookingPauseInput({
          bookingPausedFrom: new Date("2026-09-20T00:00:00.000Z"),
          bookingPausedUntil: new Date("2026-09-20T00:00:00.000Z"),
        }),
      BookingPauseValidationError,
    );
  });
});
