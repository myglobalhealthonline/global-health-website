import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DuplicatePatientError } from "./manual-booking.service.js";
import type { PatientIdentityMatch } from "../patient-profile/patient-identity-match.js";

/**
 * The message is the whole point of this error: it is what an admin reads at
 * the moment they would otherwise create a second chart, so it has to name the
 * existing record, its address, and why we think it is the same person.
 *
 * Fixtures are the real 2026-08-19 incident — GH-2026-001488 was created
 * alongside GH-2026-001483 for one patient whose phone and name+date of birth
 * matched exactly, because the typed address belonged to nobody at that moment.
 */
describe("DuplicatePatientError", () => {
  const sara: PatientIdentityMatch = {
    patientProfileId: "cmsx9l4yy001i01s8dwtkv9uq",
    globalHealthNumber: "GH-2026-001483",
    fullName: "Sara Passos do Nascimento",
    email: "pn.sarah@gmail.com",
    matchReasons: ["phone", "name_dob"],
  };

  it("names the existing record and the address to book under instead", () => {
    const error = new DuplicatePatientError([sara]);

    assert.match(error.message, /GH-2026-001483/);
    assert.match(error.message, /pn\.sarah@gmail\.com/);
    assert.equal(error.name, "DuplicatePatientError");
    assert.deepEqual(error.matches, [sara]);
  });

  it("says which identifiers matched, so the admin can judge the collision", () => {
    assert.match(
      new DuplicatePatientError([sara]).message,
      /same phone and name\+date of birth/,
    );
    assert.match(
      new DuplicatePatientError([{ ...sara, matchReasons: ["phone"] }]).message,
      /same phone number/,
    );
    assert.match(
      new DuplicatePatientError([{ ...sara, matchReasons: ["name_dob"] }]).message,
      /same name and date of birth/,
    );
  });

  it("offers the override rather than reading as a dead end", () => {
    assert.match(
      new DuplicatePatientError([sara]).message,
      /confirm you want a separate record/i,
    );
  });

  it("lists every collision when more than one record matches", () => {
    const other: PatientIdentityMatch = {
      patientProfileId: "other-profile",
      globalHealthNumber: "GH-2026-001488",
      fullName: "Sara Passos do Nascimento",
      email: "sarah.pn@gmail.com",
      matchReasons: ["phone"],
    };
    const message = new DuplicatePatientError([sara, other]).message;

    assert.match(message, /GH-2026-001483/);
    assert.match(message, /GH-2026-001488/);
  });

  it("survives a match with no Global Health Number rather than printing null", () => {
    const message = new DuplicatePatientError([
      { ...sara, globalHealthNumber: null },
    ]).message;

    assert.match(message, /no GHN/);
    assert.doesNotMatch(message, /null/);
  });
});
