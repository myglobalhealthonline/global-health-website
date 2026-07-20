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

test("formatDoctorForDocument applies the market honorific", () => {
  assert.equal(formatDoctorForDocument("Anna Garcia", "Dr"), "Dr Anna Garcia");
  assert.equal(formatDoctorForDocument("Anna Garcia", "Dr."), "Dr. Anna Garcia");
  assert.equal(formatDoctorForDocument("Pavel Novák", "MUDr."), "MUDr. Pavel Novák");
});

test("formatDoctorForDocument replaces an existing honorific, never doubles it", () => {
  assert.equal(formatDoctorForDocument("Dr. Anna Garcia", "Dr."), "Dr. Anna Garcia");
  assert.equal(formatDoctorForDocument("Dra. Anna Garcia", "Dr."), "Dr. Anna Garcia");
  assert.equal(formatDoctorForDocument("Prof. John Smith", "Dr"), "Dr John Smith");
});

test("formatRegistrationLine reports missing rather than borrowing another country", () => {
  const result = formatRegistrationLine(null, "PT");
  assert.equal(result.line, "not on file");
  assert.equal(result.missing, true);
  assert.equal(result.verified, false);
});

test("formatRegistrationLine localizes the missing value", () => {
  assert.equal(formatRegistrationLine(null, "PT", "não consta").line, "não consta");
  assert.equal(formatRegistrationLine(null, "CZ", "neuvedeno").line, "neuvedeno");
});

test("formatRegistrationLine defaults chamber for PT", () => {
  const result = formatRegistrationLine(
    { chamberEntity: null, registrationNumber: "48213", isVerified: true },
    "PT",
  );
  assert.equal(result.line, "OM: 48213");
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
