import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountAppointmentIdParamSchema,
  accountAppointmentsQuerySchema,
} from "./account-appointments.schema.js";

describe("account appointments validation", () => {
  it("accepts required id param", () => {
    const parsed = accountAppointmentIdParamSchema.safeParse({ id: "appt_123" });
    assert.equal(parsed.success, true);
  });

  it("rejects empty id param", () => {
    const parsed = accountAppointmentIdParamSchema.safeParse({ id: " " });
    assert.equal(parsed.success, false);
  });

  it("accepts optional userId query", () => {
    assert.equal(accountAppointmentsQuerySchema.safeParse({}).success, true);
    assert.equal(accountAppointmentsQuerySchema.safeParse({ userId: "user_123" }).success, true);
  });
});

