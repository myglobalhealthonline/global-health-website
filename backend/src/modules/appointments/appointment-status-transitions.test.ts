import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertValidStatusTransition,
  getAllowedNextStatuses,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "./appointment-status-transitions.js";

describe("appointment status transitions", () => {
  it("allows REQUEST_RECEIVED -> UNDER_REVIEW", () => {
    assert.doesNotThrow(() => assertValidStatusTransition("REQUEST_RECEIVED", "UNDER_REVIEW"));
  });

  it("allows CONTACTED -> COMPLETED", () => {
    assert.doesNotThrow(() => assertValidStatusTransition("CONTACTED", "COMPLETED"));
  });

  it("rejects COMPLETED -> UNDER_REVIEW", () => {
    assert.throws(
      () => assertValidStatusTransition("COMPLETED", "UNDER_REVIEW"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("rejects CANCELLED -> REQUEST_RECEIVED", () => {
    assert.throws(
      () => assertValidStatusTransition("CANCELLED", "REQUEST_RECEIVED"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("rejects CONTACTED -> REQUEST_RECEIVED", () => {
    assert.throws(
      () => assertValidStatusTransition("CONTACTED", "REQUEST_RECEIVED"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("rejects UNDER_REVIEW -> REQUEST_RECEIVED", () => {
    assert.throws(
      () => assertValidStatusTransition("UNDER_REVIEW", "REQUEST_RECEIVED"),
      InvalidAppointmentStatusTransitionError,
    );
  });

  it("returns expected next statuses for UNDER_REVIEW", () => {
    assert.deepEqual(getAllowedNextStatuses("UNDER_REVIEW"), ["CONTACTED", "CANCELLED"]);
  });

  it("returns no next statuses for terminal states", () => {
    assert.deepEqual(getAllowedNextStatuses("CANCELLED"), []);
    assert.deepEqual(getAllowedNextStatuses("COMPLETED"), []);
  });

  it("rejects unknown stored status", () => {
    assert.throws(() => assertValidStatusTransition("WEIRD", "CONTACTED"), UnrecognizedAppointmentStatusError);
  });
});
