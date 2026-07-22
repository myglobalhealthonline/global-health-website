import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWeblimsPatientParams,
  LabPatientDataIncompleteError,
  LabPatientIdentifierMissingError,
  normalizePriority,
  resolvePatientIdentifier,
  type LabPatientSource,
} from "./weblims-payload.js";

/**
 * The Synlab field mapping is where this integration is most likely to break
 * quietly — a wrong `patientId` reaches a real laboratory attached to a real
 * person. These cover the rules that are ours to get right; the ones that are
 * still open with Synlab are marked in weblims-payload.ts.
 */

function source(over: Partial<LabPatientSource> = {}): LabPatientSource {
  return {
    fullName: "Karel Novák",
    dateOfBirth: new Date("1985-03-14T00:00:00.000Z"),
    nationalIdNumber: "8503141234",
    insurancePolicyNumber: null,
    ...over,
  };
}

test("a Czech birth number is used as patientId and is not flagged as travel", () => {
  const id = resolvePatientIdentifier(source());
  assert.deepEqual(id, { patientId: "8503141234", isTravel: false });
});

test("a patient with no birth number falls back to the insurance policy number", () => {
  const id = resolvePatientIdentifier(
    source({ nationalIdNumber: null, insurancePolicyNumber: "TRV-99881" }),
  );
  assert.deepEqual(id, { patientId: "TRV-99881", isTravel: true });
});

test("a patient with neither identifier is refused rather than sent anonymously", () => {
  assert.throws(
    () => resolvePatientIdentifier(source({ nationalIdNumber: null, insurancePolicyNumber: null })),
    LabPatientIdentifierMissingError,
  );
});

test("blank identifiers are treated as absent, not as a valid patientId", () => {
  assert.throws(
    () => resolvePatientIdentifier(source({ nationalIdNumber: "   ", insurancePolicyNumber: "" })),
    LabPatientIdentifierMissingError,
  );
});

test("the patient payload splits the name and sends an ISO birthDate", () => {
  const patient = buildWeblimsPatientParams(source());
  assert.equal(patient.patientId, "8503141234");
  assert.equal(patient.name, "Karel");
  assert.equal(patient.surname, "Novák");
  assert.equal(patient.birthDate, "1985-03-14T00:00:00.000Z");
  // We do not record patient sex anywhere, and their OpenAPI does not require it.
  assert.equal(patient.sex, "U");
});

test("a multi-word family name stays whole in surname", () => {
  const patient = buildWeblimsPatientParams(source({ fullName: "Maria da Silva Santos" }));
  assert.equal(patient.name, "Maria");
  assert.equal(patient.surname, "da Silva Santos");
});

test("a single-word name still produces a surname, since surname is required", () => {
  const patient = buildWeblimsPatientParams(source({ fullName: "Prince" }));
  assert.equal(patient.surname, "Prince");
  assert.equal(patient.name, undefined);
});

test("a missing name or date of birth is refused before the request is sent", () => {
  assert.throws(
    () => buildWeblimsPatientParams(source({ fullName: null })),
    LabPatientDataIncompleteError,
  );
  assert.throws(
    () => buildWeblimsPatientParams(source({ dateOfBirth: null })),
    LabPatientDataIncompleteError,
  );
});

test("priority degrades to routine rather than escalating on unknown input", () => {
  assert.equal(normalizePriority("Statim"), "Statim");
  assert.equal(normalizePriority("vital"), "Vital");
  assert.equal(normalizePriority("urgent"), "Rutina");
  assert.equal(normalizePriority(null), "Rutina");
  assert.equal(normalizePriority(undefined), "Rutina");
});
