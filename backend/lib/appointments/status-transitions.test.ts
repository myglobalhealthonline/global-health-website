import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertValidStatusTransition,
  getAllowedNextStatuses,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "./status-transitions.js";

describe("appointment status transitions", () => {
  it("allows PENDING -> CONFIRMED", () => {
    assert.doesNotThrow(() => assertValidStatusTransition("PENDING", "CONFIRMED"));
  });

  it("allows PENDING -> CANCELLED", () => {
    assert.doesNotThrow(() => assertValidStatusTransition("PENDING", "CANCELLED"));
  });

  it("allows CONFIRMED -> COMPLETED", () => {
    assert.doesNotThrow(() => assertValidStatusTransition("CONFIRMED", "COMPLETED"));
  });

  it("rejects COMPLETED -> CONFIRMED", () => {
    assert.throws(
      () => assertValidStatusTransition("COMPLETED", "CONFIRMED"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("rejects CANCELLED -> PENDING", () => {
    assert.throws(
      () => assertValidStatusTransition("CANCELLED", "PENDING"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("rejects CONFIRMED -> PENDING", () => {
    assert.throws(
      () => assertValidStatusTransition("CONFIRMED", "PENDING"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("returns expected next statuses for PENDING", () => {
    assert.deepEqual(getAllowedNextStatuses("PENDING"), ["CONFIRMED", "CANCELLED"]);
  });

  it("returns no next statuses for terminal states", () => {
    assert.deepEqual(getAllowedNextStatuses("CANCELLED"), []);
    assert.deepEqual(getAllowedNextStatuses("COMPLETED"), []);
  });

  it("rejects unknown stored status", () => {
    assert.throws(
      () => assertValidStatusTransition("WEIRD", "CONFIRMED"),
      UnrecognizedAppointmentStatusError,
    );
  });
});
