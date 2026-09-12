import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidCnp,
  isValidCpf,
  isValidDniNie,
  isValidNif,
  isValidPpsn,
  isValidRodneCislo,
} from "./fiscal-check-digits.js";

/**
 * The check-digit validators behind the backfill audit.
 *
 * These exist so the audit means something: a validator nobody has tested can
 * report "98/98 valid" while accepting anything. Each positive case below is a
 * value whose check digit is verifiable independently of this code —
 * `999999990` is the NIF Portugal itself uses for "consumidor final",
 * `111.444.777-35` and `12345678Z` are the textbook CPF and DNI examples, and
 * `1234567T` is the PPSN this repo already used as its Irish fixture.
 *
 * The cross-country block is the important one: it is what lets the audit
 * detect a number filed under the wrong market, which is the whole failure this
 * work exists to prevent.
 */

describe("fiscal-number check digits", () => {
  it("accepts real Portuguese NIFs", () => {
    assert.equal(isValidNif("123456789"), true);
    // The Portuguese "consumidor final" placeholder — a genuine valid NIF.
    assert.equal(isValidNif("999999990"), true);
  });

  it("rejects a NIF with a broken check digit", () => {
    assert.equal(isValidNif("123456788"), false);
    assert.equal(isValidNif("999999991"), false);
  });

  it("accepts real Brazilian CPFs, punctuated or not", () => {
    assert.equal(isValidCpf("111.444.777-35"), true);
    assert.equal(isValidCpf("11144477735"), true);
  });

  it("rejects a CPF with a broken check digit, and repeated-digit strings", () => {
    assert.equal(isValidCpf("111.444.777-36"), false);
    // Passes the arithmetic, is never a real CPF.
    assert.equal(isValidCpf("11111111111"), false);
  });

  it("accepts real Irish PPSNs", () => {
    assert.equal(isValidPpsn("1234567T"), true);
    assert.equal(isValidPpsn("1234567t"), true);
  });

  it("rejects a PPSN with the wrong check letter", () => {
    assert.equal(isValidPpsn("1234567A"), false);
    assert.equal(isValidPpsn("1234567"), false);
  });

  it("accepts Spanish DNI and NIE", () => {
    assert.equal(isValidDniNie("12345678Z"), true);
    assert.equal(isValidDniNie("X1234567L"), true);
  });

  it("rejects a DNI with the wrong letter", () => {
    assert.equal(isValidDniNie("12345678A"), false);
  });

  it("rejects obvious non-values for CZ and RO", () => {
    // No rows exist for these markets today; the validators are here so the
    // audit does not silently pass whatever lands there later.
    assert.equal(isValidRodneCislo("not a number"), false);
    assert.equal(isValidRodneCislo("991399/1234"), false); // month 13
    assert.equal(isValidCnp("123"), false);
    assert.equal(isValidCnp("1234567890123"), false);
  });

  it("does not accept one country's number as another's", () => {
    // This is what makes the audit capable of catching a misfiled row: the
    // Brazilian CPF that was printing as an Irish PPS fails every other
    // market's check.
    const cpf = "11144477735";
    assert.equal(isValidCpf(cpf), true);
    assert.equal(isValidPpsn(cpf), false);
    assert.equal(isValidNif(cpf), false);
    assert.equal(isValidDniNie(cpf), false);

    const ppsn = "1234567T";
    assert.equal(isValidPpsn(ppsn), true);
    assert.equal(isValidCpf(ppsn), false);
    assert.equal(isValidNif(ppsn), false);

    const nif = "123456789";
    assert.equal(isValidNif(nif), true);
    assert.equal(isValidPpsn(nif), false);
    assert.equal(isValidCpf(nif), false);
  });
});
