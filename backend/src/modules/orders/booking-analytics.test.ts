import { strict as assert } from "node:assert";
import { it } from "node:test";
import { bookedConsultations } from "./booking-analytics.js";

it("requires a paid, fulfilled, non-cancelled consultation and emits no identifiers", () => {
  const appointment = {
    id: "private-appointment", email: "patient@example.test", status: "REQUEST_RECEIVED",
    countryCode: "ie", service: { kind: "SPECIALIST", name: "Psychiatry" },
  };
  assert.deepEqual(bookedConsultations("PENDING", [{ appointment }]), []);
  assert.deepEqual(bookedConsultations("PAID", []), []); // Paid but slot allocation failed.
  assert.deepEqual(bookedConsultations("PAID", [{ appointment: { ...appointment, status: "CANCELLED" } }]), []);
  assert.deepEqual(bookedConsultations("PAID", [{ appointment: { ...appointment, service: null } }]), []);
  assert.deepEqual(bookedConsultations("PAID", [{ appointment }]), [{ market: "ie", serviceKind: "SPECIALIST" }]);
});
