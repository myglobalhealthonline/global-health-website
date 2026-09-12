/**
 * Backfill PatientCountryTaxId from the legacy single `PatientProfile.taxIdNumber`
 * column.
 *
 * Until the per-country table existed, every patient's fiscal number went into
 * one column with no record of which country it belonged to. Recovering that
 * country is the whole job, and the obvious source — `addressCountryCode` — is
 * NOT trustworthy for it:
 *
 *   - it is where the patient LIVES, not the market the number came from. The
 *     live data holds Irish-address patients whose stored number is an 11-digit
 *     Brazilian CPF. Filing those as Irish is precisely the defect this table
 *     was introduced to end — it would print "PPS: 068.001.344-06".
 *   - it is free text: PORTUGAL, IRLANDA, IR, PO and one postal code all appear.
 *
 * So the number itself is the primary evidence. Each country's fiscal id has a
 * distinct shape (PT NIF 9 digits, BR CPF 11, IE PPS 7 digits + 1-2 letters, ES
 * DNI/NIE, CZ rodné číslo, RO CNP), and a value is filed only against a country
 * whose format it actually matches:
 *
 *   - shape matches the address country  → file there (the ordinary case)
 *   - shape matches exactly ONE other country → file THERE, and report it
 *   - shape matches nothing, or more than one → skip and report
 *
 * The skipped rows are real: the column also holds names, two-letter scraps and
 * truncated numbers that were never valid fiscal ids. Filing those would put
 * garbage on a prescription, so they are listed for a human instead.
 *
 * Never overwrites an existing row. Safe to re-run.
 *
 *   DRY RUN (default):
 *     DOTENV_CONFIG_PATH=.env node -r dotenv/config --import tsx \
 *       scripts/backfill-patient-country-tax-ids.ts
 *   APPLY: same command with --apply
 *
 * Needs the real PHI_ENCRYPTION_KEY — a .env carrying the unresolved
 * `${{...}}` Railway template makes phi-crypto throw by design.
 */

import { prisma } from "../src/db/prisma.js";
import { decryptPhi } from "../src/lib/crypto/phi-crypto.js";
import { recordPatientCountryTaxIdIfAbsent } from "../src/modules/patient-profile/patient-country-tax-ids.js";

const APPLY = process.argv.includes("--apply");

/** Free-text country spellings present in the live column. */
const COUNTRY_FIXUPS: Record<string, string> = {
  PORTUGAL: "PT", PO: "PT", POR: "PT", PRT: "PT",
  IRELAND: "IE", IRLANDA: "IE", IRLANDE: "IE", IR: "IE", EIRE: "IE", IRL: "IE",
  BRAZIL: "BR", BRASIL: "BR", BRA: "BR",
  SPAIN: "ES", ESPANA: "ES", "ESPAÑA": "ES", SP: "ES", ESP: "ES",
  CZECHIA: "CZ", "CZECH REPUBLIC": "CZ", CESKO: "CZ", CZE: "CZ",
  ROMANIA: "RO", ROMANIA_RM: "RO", RM: "RO", ROU: "RO",
};
const MARKETS = ["PT", "BR", "IE", "ES", "CZ", "RO"] as const;
type Market = (typeof MARKETS)[number];

function normalizeCountry(raw: string | null | undefined): Market | null {
  const v = raw?.trim().toUpperCase();
  if (!v) return null;
  const fixed = COUNTRY_FIXUPS[v] ?? v;
  return (MARKETS as readonly string[]).includes(fixed) ? (fixed as Market) : null;
}

/**
 * Does this value have the shape of that country's fiscal id?
 *
 * Deliberately strict. A false positive here files a real number under the
 * wrong country, which is worse than leaving it for a human: the document then
 * carries a confident, wrong, officially-labelled identifier.
 */
const FORMATS: Record<Market, (raw: string) => boolean> = {
  // NIF — exactly 9 digits.
  PT: (v) => /^\d{9}$/.test(v),
  // CPF — 11 digits, with or without the 000.000.000-00 punctuation.
  BR: (v) => /^\d{11}$/.test(v) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v),
  // PPS — 7 digits then 1 or 2 letters.
  IE: (v) => /^\d{7}[A-Za-z]{1,2}$/.test(v),
  // DNI (8 digits + letter) or NIE (letter + 7 digits + letter).
  ES: (v) => /^\d{8}[A-Za-z]$/.test(v) || /^[XYZxyz]\d{7}[A-Za-z]$/.test(v),
  // Rodné číslo — YYMMDD/XXX(X) with the slash, or 10 consecutive digits.
  //
  // The slash is REQUIRED in the 9-digit form. Allowing it to be optional made
  // `\d{6}\d{3}` match, which is also exactly a Portuguese NIF — so every real
  // 9-digit NIF looked ambiguous between PT and CZ and got skipped. 10 digits is
  // safe to accept bare: PT is 9 and BR is 11, so nothing else collides.
  CZ: (v) => /^\d{6}\/\d{3,4}$/.test(v) || /^\d{10}$/.test(v),
  // CNP — 13 digits.
  RO: (v) => /^\d{13}$/.test(v),
};

const clean = (v: string) => v.trim().replace(/\s+/g, "");

function matchingMarkets(value: string): Market[] {
  const v = clean(value);
  return MARKETS.filter((m) => FORMATS[m](v));
}

/** Structural signature for the report — never the value itself. */
const signature = (v: string) =>
  v.trim().replace(/[A-Za-z]/g, "X").replace(/[0-9]/g, "9").replace(/\s+/g, "_");

async function main(): Promise<void> {
  const profiles = await prisma.patientProfile.findMany({
    where: { taxIdNumber: { not: null }, anonymizedAt: null },
    select: { id: true, email: true, taxIdNumber: true, addressCountryCode: true },
  });

  let filedAtAddressCountry = 0;
  let alreadyHad = 0;
  let undecryptable = 0;
  const filedElsewhere: { email: string; addressCountry: string | null; filedAs: Market }[] = [];
  const unusable: { email: string; addressCountry: string | null; shape: string }[] = [];

  for (const profile of profiles) {
    let value: string | null = null;
    try {
      value = decryptPhi(profile.taxIdNumber);
    } catch {
      undecryptable += 1;
      continue;
    }
    if (!value?.trim()) continue;

    const addressCountry = normalizeCountry(profile.addressCountryCode);
    const matches = matchingMarkets(value);

    let target: Market | null = null;
    let movedFromAddress = false;
    if (addressCountry && matches.includes(addressCountry)) {
      target = addressCountry;
    } else if (matches.length === 1) {
      // The number's own format is better evidence than a free-text address
      // field — this is the Irish-address / Brazilian-CPF case.
      target = matches[0];
      movedFromAddress = true;
    }

    if (!target) {
      unusable.push({
        email: profile.email,
        addressCountry,
        shape: signature(value),
      });
      continue;
    }

    const existing = await prisma.patientCountryTaxId.findUnique({
      where: {
        patientProfileId_countryCode: { patientProfileId: profile.id, countryCode: target },
      },
      select: { id: true },
    });
    if (existing) {
      alreadyHad += 1;
      continue;
    }

    if (APPLY) {
      await recordPatientCountryTaxIdIfAbsent(profile.id, target, value);
    }
    if (movedFromAddress) {
      filedElsewhere.push({ email: profile.email, addressCountry, filedAs: target });
    } else {
      filedAtAddressCountry += 1;
    }
  }

  console.log(`${APPLY ? "APPLIED" : "DRY RUN"} — profiles with a stored tax id: ${profiles.length}`);
  console.log(`  filed under their address country:        ${filedAtAddressCountry}`);
  console.log(`  filed under the country the FORMAT proves: ${filedElsewhere.length}`);
  console.log(`  already had a row:                        ${alreadyHad}`);
  console.log(`  undecryptable:                            ${undecryptable}`);
  console.log(`  no recognisable fiscal id — left alone:   ${unusable.length}`);

  if (filedElsewhere.length > 0) {
    console.log("\n  Filed against the format's country, NOT the address on file:");
    for (const row of filedElsewhere) {
      console.log(`    ${row.email} — address ${row.addressCountry ?? "unset"} → filed as ${row.filedAs}`);
    }
  }
  if (unusable.length > 0) {
    console.log("\n  Needs a human (value does not match any market's fiscal format):");
    for (const row of unusable) {
      console.log(
        `    ${row.email} — address ${row.addressCountry ?? "unset"}, shape ${row.shape}`,
      );
    }
  }
  if (!APPLY) console.log("\nNothing written. Re-run with --apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
