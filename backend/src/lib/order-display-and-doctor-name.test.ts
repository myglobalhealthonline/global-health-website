import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDoctorForDocument,
  formatDoctorForPatientNotification,
  stripDoctorHonorific,
} from "./doctor-name.js";
import {
  defaultChamberEntityForCountry,
  formatRegistrationLine,
} from "./doctor-registration-display.js";
import { formatOrderDisplayId } from "../modules/automation/automation-catalog.js";

test("formatOrderDisplayId prefers orderNumber", () => {
  assert.equal(
    formatOrderDisplayId({ id: "clxyz123abc45678", orderNumber: "ORD-000042" }),
    "ORD-000042",
  );
  assert.equal(formatOrderDisplayId("clxyz123abc45678"), "ABC45678");
});

test("stripDoctorHonorific removes common prefixes", () => {
  assert.equal(stripDoctorHonorific("Dr. Anna Garcia"), "Anna Garcia");
  assert.equal(stripDoctorHonorific("Prof. John Smith"), "John Smith");
});

test("formatDoctorForPatientNotification omits title and honorific", () => {
  assert.equal(
    formatDoctorForPatientNotification("Dr. Anna Garcia", "GP"),
    "Anna Garcia",
  );
});

test("formatDoctorForDocument strips honorific", () => {
  assert.equal(formatDoctorForDocument("Dr. Anna Garcia"), "Anna Garcia");
});

test("formatRegistrationLine defaults chamber for IE", () => {
  const result = formatRegistrationLine(
    { chamberEntity: null, registrationNumber: "523449", isVerified: true },
    "IE",
  );
  assert.equal(result.line, "IMC: 523449");
  assert.equal(result.missing, false);
});

test("defaultChamberEntityForCountry", () => {
  assert.equal(defaultChamberEntityForCountry("ie"), "IMC");
  assert.equal(defaultChamberEntityForCountry("pt"), "OM");
});
