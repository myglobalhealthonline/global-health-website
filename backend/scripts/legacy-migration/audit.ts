/**
 * Phase 0 read-only audit. Reads the mongoexport NDJSON files under DUMP_DIR
 * and prints the numbers you must look at BEFORE loading anything. Touches no
 * database and no object storage — pure offline analysis of the export.
 *
 *   DUMP_DIR=/secure/dump node --import tsx scripts/legacy-migration/audit.ts
 *
 * What it reports (each check has bitten someone — see READ-FIRST.md):
 *   - document count per collection (your baseline)
 *   - strict:false field-superset per patients_* collection (the non-mechanical
 *     mapping input — finalize mapping.ts candidate lists against this)
 *   - Birthday values that don't parse to a real DD/MM/YYYY date
 *   - duplicate patient emails within and across markets (dedup sizing)
 *   - embedded UPLOAD…[] + medicalNotes[] array totals (target row counts)
 *   - documents with no filePath (nothing to point at)
 *   - non-bcrypt GlobalDoctors PASSWORD values (plaintext — never import)
 */
import "dotenv/config";
import { requireDumpDir, DUMP_DIR, banner } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";
import { MARKETS, patientCollection, PATIENT_COLLECTIONS } from "./lib/markets.js";
import {
  mapPatient,
  parseBirthday,
  str,
  collectDocArrays,
  NOTES_FIELD,
} from "./lib/mapping.js";

const ALL_COLLECTIONS = [
  ...PATIENT_COLLECTIONS,
  "GlobalDoctors",
  "Appointments",
  "brazil_consent_submissions",
  "reviewinvites",
];

async function main() {
  requireDumpDir();
  banner("audit (read-only)");

  // 1. counts
  console.log("── document counts ─────────────────────────────");
  const counts: Record<string, number> = {};
  for (const coll of ALL_COLLECTIONS) {
    if (!hasCollection(coll)) {
      console.log(`  ${coll.padEnd(28)} (no export file — skipped)`);
      continue;
    }
    let n = 0;
    for await (const _ of readCollection(coll)) n += 1;
    counts[coll] = n;
    console.log(`  ${coll.padEnd(28)} ${n}`);
  }
  const patientTotal = PATIENT_COLLECTIONS.reduce((a, c) => a + (counts[c] ?? 0), 0);
  console.log(`  ${"patients (all markets)".padEnd(28)} ${patientTotal}`);

  // 2. field superset + quality, per market
  console.log("\n── patient field superset + quality (per market) ─");
  const emailSeen = new Map<string, string[]>(); // email -> [markets]
  let uploadTotal = 0;
  let uploadNoKey = 0;
  let notesTotal = 0;
  let birthdayBad = 0;

  const COV_FIELDS = [
    "fullName", "phone", "dateOfBirth", "weightKg", "heightM", "bmi", "bloodType",
    "allergies", "chronicDiseases", "familyHistory", "socialHabits", "surgeries",
    "nationalIdNumber", "taxIdNumber", "passportNumber", "addressLine1", "preferredPharmacy",
  ] as const;

  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) continue;
    const keyFreq = new Map<string, number>();
    const cov = new Map<string, number>();
    let emailCov = 0;
    let extraKeysTotal = 0;
    let rows = 0;

    for await (const doc of readCollection(coll)) {
      rows += 1;
      for (const k of Object.keys(doc)) keyFreq.set(k, (keyFreq.get(k) ?? 0) + 1);

      const m = mapPatient(doc, market);
      if (m.email) emailCov += 1;
      extraKeysTotal += Object.keys(m.extra).length;
      for (const f of COV_FIELDS) {
        const v = (m.data as Record<string, unknown>)[f];
        const has = Array.isArray(v) ? v.length > 0 : v != null && v !== "";
        if (has) cov.set(f, (cov.get(f) ?? 0) + 1);
      }
      // dedup sizing
      if (m.email) {
        const key = m.email.toLowerCase();
        const arr = emailSeen.get(key) ?? [];
        arr.push(market);
        emailSeen.set(key, arr);
      }
      // birthday quality
      if (m.birthdayRaw && !parseBirthday(m.birthdayRaw)) birthdayBad += 1;
      // embedded document arrays (structural — any array with filePath elements)
      for (const arr of collectDocArrays(doc)) uploadTotal += arr.elements.length;
      // no-key scan: array elements that look like docs but lack a filePath
      for (const v of Object.values(doc)) {
        if (!Array.isArray(v)) continue;
        const looksDoc = v.some(
          (e) => e && typeof e === "object" && ("filePath" in (e as object) || "fileName" in (e as object)),
        );
        if (!looksDoc) continue;
        uploadNoKey += v.filter(
          (e) => e && typeof e === "object" && !str((e as Record<string, unknown>).filePath),
        ).length;
      }
      const notes = Array.isArray(doc[NOTES_FIELD]) ? (doc[NOTES_FIELD] as unknown[]) : [];
      notesTotal += notes.length;
    }

    console.log(`\n  ${coll}  (${rows} docs) — MAPPING COVERAGE (target field populated %):`);
    const pctOf = (n: number) => (rows ? Math.round((n / rows) * 100) : 0);
    console.log(`      ${String(pctOf(emailCov)).padStart(3)}%  email`);
    for (const f of COV_FIELDS) {
      console.log(`      ${String(pctOf(cov.get(f) ?? 0)).padStart(3)}%  ${f}`);
    }
    console.log(`      avg unmapped keys -> legacyExtra: ${(extraKeysTotal / (rows || 1)).toFixed(1)}`);
    if (process.env.SHOW_KEYS === "1") {
      console.log(`    keys seen:`);
      for (const [k, cnt] of [...keyFreq.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${String(cnt).padStart(6)}  ${String(pctOf(cnt)).padStart(3)}%  ${k}`);
      }
    }
  }

  // 3. duplicates
  const dupSameMarket: string[] = [];
  const dupCrossMarket: string[] = [];
  for (const [email, markets] of emailSeen) {
    if (markets.length < 2) continue;
    const distinct = new Set(markets);
    if (distinct.size > 1) dupCrossMarket.push(`${email} (${[...distinct].join(", ")})`);
    else dupSameMarket.push(`${email} x${markets.length} in ${markets[0]}`);
  }

  console.log("\n── dedup sizing ────────────────────────────────");
  console.log(`  distinct emails:                 ${emailSeen.size}`);
  console.log(`  duplicate email WITHIN a market: ${dupSameMarket.length}`);
  console.log(`  same email ACROSS markets:       ${dupCrossMarket.length}`);
  for (const d of dupCrossMarket.slice(0, 25)) console.log(`      ${d}`);
  if (dupCrossMarket.length > 25) console.log(`      … and ${dupCrossMarket.length - 25} more`);

  // 4. embedded arrays + birthdays
  console.log("\n── embedded children + data quality ────────────");
  console.log(`  UPLOAD…[] elements total:        ${uploadTotal}  -> patient_documents target`);
  console.log(`     of which with NO filePath:    ${uploadNoKey}  (cannot be imported)`);
  console.log(`  medicalNotes[] elements total:   ${notesTotal}  -> Phase 2 (needs appointment)`);
  console.log(`  Birthday values that don't parse:${birthdayBad}  (load raw; dateOfBirth left null)`);

  // 5. doctor password hygiene
  if (hasCollection("GlobalDoctors")) {
    let doctors = 0;
    let plaintext = 0;
    let noEmail = 0;
    for await (const doc of readCollection("GlobalDoctors")) {
      doctors += 1;
      const pwd = str(doc.PASSWORD ?? doc.password);
      if (pwd && !/^\$2[aby]\$/.test(pwd)) plaintext += 1;
      if (!str(doc.Email ?? doc.email)) noEmail += 1;
    }
    console.log("\n── doctors ─────────────────────────────────────");
    console.log(`  GlobalDoctors:                   ${doctors}`);
    console.log(`  non-bcrypt PASSWORD (plaintext): ${plaintext}  (never import — force reset)`);
    console.log(`  doctors with no email:           ${noEmail}  (no login can be created)`);
  }

  // 6. key superset for the flat collections (finalize their mappers)
  for (const coll of ["Appointments", "reviewinvites", "brazil_consent_submissions"]) {
    if (!hasCollection(coll)) continue;
    const keyFreq = new Map<string, number>();
    let rows = 0;
    for await (const doc of readCollection(coll)) {
      rows += 1;
      for (const k of Object.keys(doc)) keyFreq.set(k, (keyFreq.get(k) ?? 0) + 1);
    }
    console.log(`\n── ${coll} keys (${rows} docs) ─────────────────`);
    for (const [k, cnt] of [...keyFreq.entries()].sort((a, b) => b[1] - a[1])) {
      const pct = rows ? Math.round((cnt / rows) * 100) : 0;
      console.log(`      ${String(cnt).padStart(6)}  ${String(pct).padStart(3)}%  ${k}`);
    }
  }

  console.log(
    "\nNOTE: object-existence (does every filePath exist in storage?) is NOT checked here — " +
      "it is verified with a HEAD during the file sync + document load (Phase 1).",
  );
  console.log(`\nAudit complete. Source: ${DUMP_DIR}\n`);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
