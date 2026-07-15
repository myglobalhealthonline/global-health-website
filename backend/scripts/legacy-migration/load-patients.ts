/**
 * Phase 1 — load the six patients_* collections -> one PatientProfile table,
 * deduped by email. Documents + notes embedded in each patient doc are handled
 * by load-documents.ts / Phase 2, NOT here.
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/load-patients.ts             # dry run
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/load-patients.ts
 *
 * LIVE-DB SAFETY — this DB already serves real patients:
 *   - Never overwrite an existing non-null value. The migration only FILLS GAPS
 *     (existing app data always wins), UNIONs list fields, and records the
 *     source legacy ids. So re-running is safe and idempotent.
 *   - Skip rows already merged/anonymized (GDPR) — never resurrect them.
 *   - PHI ids are AES-encrypted and blind-indexed with the app's own helpers;
 *     refuses to run live without the keys (would store plaintext otherwise).
 *
 * PERF: existing profiles are preloaded once into an in-memory map instead of a
 * per-patient round-trip (the DB is reached over the public Railway proxy). The
 * map is updated after each create/merge so cross-market duplicates within one
 * run dedup correctly.
 */
import "dotenv/config";
import { join } from "node:path";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, requirePhiKeys, DRY_RUN, DUMP_DIR, banner } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";
import { MARKETS, patientCollection } from "./lib/markets.js";
import { mapPatient } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";
import { provisionUser, initCsv, appendCsv } from "./lib/provisioning.js";
import { encryptPhi } from "../../src/lib/crypto/phi-crypto.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../../src/lib/blind-index.js";
import { generateGlobalHealthNumber } from "../../src/lib/global-health-number.js";

const STAGE = "patients";

/** In-memory state of a profile (preloaded from DB, then kept current). */
interface PState {
  id: string | null;
  isBlocked: boolean; // merged or anonymized
  fullName: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bloodType: string | null;
  allergies: string[];
  chronicDiseases: string[];
  familyHistory: string[];
  socialHabits: string[];
  surgeries: string[];
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  addressLine1: string | null;
  preferredPharmacy: string | null;
  originCountryCode: string | null;
  countryFolderCode: string | null;
  globalHealthNumber: string | null;
  legacyMongoIds: string[];
  legacySourceMarkets: string[];
  legacyExtra: Record<string, unknown> | null;
}

function syntheticEmail(market: string, legacyId: string): string {
  return `no-email.${market}.${legacyId}@legacy.invalid`;
}
function firstNonNull<T>(a: T | null | undefined, b: T | null): T | null {
  return a != null && a !== "" ? a : b;
}
function union(a: string[] | undefined, b: string[]): string[] {
  return [...new Set([...(a ?? []), ...b])];
}

/** Preload all existing profiles (chunked) keyed by lowercased email. */
async function preload(): Promise<Map<string, PState>> {
  const map = new Map<string, PState>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true, email: true, isMerged: true, anonymizedAt: true,
        fullName: true, phone: true, dateOfBirth: true, weightKg: true, heightM: true,
        bmi: true, bloodType: true, allergies: true, chronicDiseases: true,
        familyHistory: true, socialHabits: true, surgeries: true, nationalIdNumber: true,
        taxIdNumber: true, passportNumber: true, addressLine1: true, preferredPharmacy: true,
        originCountryCode: true, countryFolderCode: true, globalHealthNumber: true,
        legacyMongoIds: true, legacySourceMarkets: true, legacyExtra: true,
      },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      map.set(r.email.toLowerCase(), {
        id: r.id,
        isBlocked: r.isMerged || r.anonymizedAt != null,
        fullName: r.fullName, phone: r.phone, dateOfBirth: r.dateOfBirth,
        weightKg: r.weightKg, heightM: r.heightM, bmi: r.bmi, bloodType: r.bloodType,
        allergies: r.allergies, chronicDiseases: r.chronicDiseases, familyHistory: r.familyHistory,
        socialHabits: r.socialHabits, surgeries: r.surgeries,
        nationalIdNumber: r.nationalIdNumber, taxIdNumber: r.taxIdNumber, passportNumber: r.passportNumber,
        addressLine1: r.addressLine1, preferredPharmacy: r.preferredPharmacy,
        originCountryCode: r.originCountryCode, countryFolderCode: r.countryFolderCode,
        globalHealthNumber: r.globalHealthNumber,
        legacyMongoIds: r.legacyMongoIds, legacySourceMarkets: r.legacySourceMarkets,
        legacyExtra: (r.legacyExtra as Record<string, unknown> | null) ?? null,
      });
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

async function main() {
  requireDumpDir();
  requirePhiKeys();
  banner(STAGE);

  const c = new Counter();
  const csvPath = join(DUMP_DIR, "credentials-patients.csv");
  if (!DRY_RUN) initCsv(csvPath);
  console.log("  preloading existing profiles…");
  const state = await preload();
  console.log(`  ${state.size} existing profiles loaded.\n`);

  // Create a login for a patient profile (skips synthetic-email placeholders).
  async function provision(profileId: string, emailAddr: string, name: string, synthetic: boolean) {
    if (DRY_RUN) return;
    if (synthetic) {
      c.bump("no-account-synthetic-email");
      return;
    }
    const r = await provisionUser({
      email: emailAddr,
      fullName: name || "Patient",
      role: "PATIENT",
      linkPatientProfileId: profileId,
    });
    appendCsv(csvPath, r);
    c.bump(`acct-${r.status}`);
  }

  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) {
      console.log(`  (no ${coll} export — skipped)`);
      continue;
    }

    for await (const doc of readCollection(coll)) {
      c.bump("read");
      const legacyId = typeof doc._id === "string" ? doc._id : String(doc._id ?? "");
      if (!legacyId) {
        await logUnresolved({ stage: STAGE, sourceColl: coll, reason: "patient has no _id" });
        c.bump("skipped");
        continue;
      }

      const m = mapPatient(doc, market);
      let email = m.email;
      let emailSynthetic = false;
      if (!email) {
        email = syntheticEmail(market, legacyId);
        emailSynthetic = true;
        await logUnresolved({
          stage: STAGE, sourceColl: coll, legacyId, columnName: "email",
          reason: `no email — used placeholder ${email}`,
        });
      }
      const emailLc = email.toLowerCase();

      const extraBucket: Record<string, unknown> = { ...m.extra };
      if (m.birthdayRaw && !m.data.dateOfBirth) extraBucket.__birthdayRaw = m.birthdayRaw;
      if (emailSynthetic) extraBucket.__syntheticEmail = true;
      const hasExtra = Object.keys(extraBucket).length > 0;

      const cur = state.get(emailLc);
      if (cur?.isBlocked) {
        await logUnresolved({
          stage: STAGE, sourceColl: coll, legacyId, columnName: "email", legacyValue: emailLc,
          reason: "matches a merged/anonymized profile — skipped (GDPR)",
        });
        c.bump("skipped-merged");
        continue;
      }

      if (DRY_RUN) {
        console.log(
          `  [dry] ${market} ${legacyId} -> ${cur ? "MERGE into " + cur.id : "CREATE"} <${emailLc}> ` +
            `name=${m.data.fullName ?? "?"} dob=${m.data.dateOfBirth?.toISOString().slice(0, 10) ?? "-"} ` +
            `ids=${!!m.data.nationalIdNumber}/${!!m.data.taxIdNumber}/${!!m.data.passportNumber} ` +
            `docs=${m.docArrays.reduce((n, a) => n + a.elements.length, 0)} notes=${m.embeddedNotes.length}`,
        );
        // keep the map current so cross-market dupes show MERGE
        state.set(emailLc, mergeState(cur, m, coll, legacyId, extraBucket, hasExtra, "dry"));
        c.bump(cur ? "would-merge" : "would-create");
        continue;
      }

      const nameForHash = firstNonNull(cur?.fullName, m.data.fullName);
      const phoneForHash = firstNonNull(cur?.phone, m.data.phone);
      const dobForHash = cur?.dateOfBirth ?? m.data.dateOfBirth;
      const blind = {
        emailHash: computeEmailBlindIndex(emailLc),
        phoneHash: phoneForHash ? computePhoneBlindIndex(phoneForHash) : null,
        nameDobHash: nameForHash && dobForHash ? computeNameDobBlindIndex(nameForHash, dobForHash) : null,
      };

      if (!cur) {
        const ghn = await generateGlobalHealthNumber();
        const created = await prisma.patientProfile.create({
          data: {
            email: emailLc,
            legacyMongoIds: [legacyId],
            legacySourceMarkets: [coll],
            fullName: m.data.fullName, phone: m.data.phone, dateOfBirth: m.data.dateOfBirth,
            weightKg: m.data.weightKg, heightM: m.data.heightM, bmi: m.data.bmi,
            bloodType: m.data.bloodType, allergies: m.data.allergies,
            chronicDiseases: m.data.chronicDiseases, familyHistory: m.data.familyHistory,
            socialHabits: m.data.socialHabits, surgeries: m.data.surgeries,
            nationalIdNumber: encryptPhi(m.data.nationalIdNumber),
            taxIdNumber: encryptPhi(m.data.taxIdNumber),
            passportNumber: encryptPhi(m.data.passportNumber),
            addressLine1: m.data.addressLine1, addressCountryCode: m.data.addressCountryCode,
            preferredPharmacy: m.data.preferredPharmacy,
            originCountryCode: m.data.originCountryCode, countryFolderCode: m.data.countryFolderCode,
            globalHealthNumber: ghn,
            legacyExtra: hasExtra ? { [coll]: extraBucket } : undefined,
            ...blind,
          },
          select: { id: true },
        });
        state.set(emailLc, mergeState(undefined, m, coll, legacyId, extraBucket, hasExtra, created.id, ghn));
        c.bump("created");
        await provision(created.id, emailLc, m.data.fullName ?? "", emailSynthetic);
        continue;
      }

      const mergedExtra = {
        ...(cur.legacyExtra ?? {}),
        ...(hasExtra ? { [coll]: extraBucket } : {}),
      };
      await prisma.patientProfile.update({
        where: { id: cur.id! },
        data: {
          legacyMongoIds: union(cur.legacyMongoIds, [legacyId]),
          legacySourceMarkets: union(cur.legacySourceMarkets, [coll]),
          fullName: firstNonNull(cur.fullName, m.data.fullName),
          phone: firstNonNull(cur.phone, m.data.phone),
          dateOfBirth: cur.dateOfBirth ?? m.data.dateOfBirth,
          weightKg: cur.weightKg ?? m.data.weightKg,
          heightM: cur.heightM ?? m.data.heightM,
          bmi: cur.bmi ?? m.data.bmi,
          bloodType: firstNonNull(cur.bloodType, m.data.bloodType),
          allergies: union(cur.allergies, m.data.allergies),
          chronicDiseases: union(cur.chronicDiseases, m.data.chronicDiseases),
          familyHistory: union(cur.familyHistory, m.data.familyHistory),
          socialHabits: union(cur.socialHabits, m.data.socialHabits),
          surgeries: union(cur.surgeries, m.data.surgeries),
          nationalIdNumber: cur.nationalIdNumber ?? encryptPhi(m.data.nationalIdNumber) ?? undefined,
          taxIdNumber: cur.taxIdNumber ?? encryptPhi(m.data.taxIdNumber) ?? undefined,
          passportNumber: cur.passportNumber ?? encryptPhi(m.data.passportNumber) ?? undefined,
          addressLine1: firstNonNull(cur.addressLine1, m.data.addressLine1),
          preferredPharmacy: firstNonNull(cur.preferredPharmacy, m.data.preferredPharmacy),
          originCountryCode: firstNonNull(cur.originCountryCode, m.data.originCountryCode),
          countryFolderCode: firstNonNull(cur.countryFolderCode, m.data.countryFolderCode),
          legacyExtra: Object.keys(mergedExtra).length ? mergedExtra : undefined,
          ...blind,
        },
      });
      state.set(emailLc, mergeState(cur, m, coll, legacyId, extraBucket, hasExtra, cur.id!));
      c.bump("merged");
      await provision(cur.id!, emailLc, firstNonNull(cur.fullName, m.data.fullName) ?? "", emailSynthetic);
    }
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
  if (!DRY_RUN) console.log(`patient credentials -> ${csvPath}`);
}

/** Compute the post-write in-memory state (fill-gaps + union), for dedup within a run. */
function mergeState(
  cur: PState | undefined,
  m: ReturnType<typeof mapPatient>,
  coll: string,
  legacyId: string,
  extraBucket: Record<string, unknown>,
  hasExtra: boolean,
  id: string,
  ghn?: string,
): PState {
  const d = m.data;
  return {
    id: id === "dry" ? (cur?.id ?? null) : id,
    isBlocked: false,
    fullName: firstNonNull(cur?.fullName, d.fullName),
    phone: firstNonNull(cur?.phone, d.phone),
    dateOfBirth: cur?.dateOfBirth ?? d.dateOfBirth,
    weightKg: cur?.weightKg ?? d.weightKg,
    heightM: cur?.heightM ?? d.heightM,
    bmi: cur?.bmi ?? d.bmi,
    bloodType: firstNonNull(cur?.bloodType, d.bloodType),
    allergies: union(cur?.allergies, d.allergies),
    chronicDiseases: union(cur?.chronicDiseases, d.chronicDiseases),
    familyHistory: union(cur?.familyHistory, d.familyHistory),
    socialHabits: union(cur?.socialHabits, d.socialHabits),
    surgeries: union(cur?.surgeries, d.surgeries),
    nationalIdNumber: cur?.nationalIdNumber ?? d.nationalIdNumber,
    taxIdNumber: cur?.taxIdNumber ?? d.taxIdNumber,
    passportNumber: cur?.passportNumber ?? d.passportNumber,
    addressLine1: firstNonNull(cur?.addressLine1, d.addressLine1),
    preferredPharmacy: firstNonNull(cur?.preferredPharmacy, d.preferredPharmacy),
    originCountryCode: firstNonNull(cur?.originCountryCode, d.originCountryCode),
    countryFolderCode: firstNonNull(cur?.countryFolderCode, d.countryFolderCode),
    globalHealthNumber: cur?.globalHealthNumber ?? ghn ?? null,
    legacyMongoIds: union(cur?.legacyMongoIds, [legacyId]),
    legacySourceMarkets: union(cur?.legacySourceMarkets, [coll]),
    legacyExtra: {
      ...(cur?.legacyExtra ?? {}),
      ...(hasExtra ? { [coll]: extraBucket } : {}),
    },
  };
}

main()
  .catch((err) => {
    console.error(`${STAGE} failed:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
