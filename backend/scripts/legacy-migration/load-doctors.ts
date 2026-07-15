/**
 * Phase 1 — load GlobalDoctors -> Doctor (+ a login User with a temp password
 * and a set-password link). ONLY doctors actually referenced by the data are
 * provisioned: they authored an appointment, a medical note, or a document.
 * Unreferenced directory-only doctors are skipped (no profile, no account).
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/load-doctors.ts             # dry run
 *   DUMP_DIR=... DRY_RUN=false SITE_URL=https://prod node --import tsx scripts/legacy-migration/load-doctors.ts
 *
 * Passwords: NEW accounts get a temp password + invite link (written to
 * <DUMP_DIR>/credentials-doctors.csv). EXISTING real accounts are left
 * untouched (password unchanged). Legacy PASSWORD values are never imported.
 * Idempotent: Doctor upserts on legacyMongoId; DoctorCountry on (doctorId,countryId).
 */
import "dotenv/config";
import { join } from "node:path";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, DUMP_DIR, banner } from "./lib/config.js";
import { readCollection, hasCollection, type SourceDoc } from "./lib/source.js";
import { MARKETS, patientCollection, isMarket, marketToCountryCode } from "./lib/markets.js";
import { mapDoctor, collectDocArrays } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";
import { provisionUser, initCsv, appendCsv, type ProvisionResult } from "./lib/provisioning.js";

const SOURCE = "GlobalDoctors";
const STAGE = "doctors";

const NAME_TO_CODE: Record<string, string> = {
  "czech republic": "cz",
  czechia: "cz",
  czehia: "cz",
  eire: "ie",
  "republic of ireland": "ie",
  roamnia: "ro",
};

function s(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

const countryIdCache = new Map<string, string | null>();
async function resolveCountryId(source: string | null): Promise<string | null> {
  if (!source) return null;
  const lc = source.split(",")[0].trim().toLowerCase();
  if (!lc) return null;
  let code: string | null = null;
  if (isMarket(lc)) code = marketToCountryCode(lc);
  else if (lc.length === 2) code = lc;
  else code = NAME_TO_CODE[lc] ?? null;
  if (!code) return null;
  if (countryIdCache.has(code)) return countryIdCache.get(code) ?? null;
  const row = await prisma.country.findUnique({ where: { code }, select: { id: true } });
  countryIdCache.set(code, row?.id ?? null);
  return row?.id ?? null;
}

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "doctor"
  );
}

async function uniqueSlug(base: string, countryId: string, legacyMongoId: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 200; i += 1) {
    // NB: check by (countryId, slug) WITHOUT a `NOT legacyMongoId` filter — that
    // filter is NULL-unsafe in SQL and would hide existing NATIVE doctors (whose
    // legacyMongoId IS NULL), letting a slug collide on insert. A clash that is
    // our own row (same legacyMongoId, on re-run) is fine.
    const clash = await prisma.doctor.findFirst({
      where: { countryId, slug },
      select: { legacyMongoId: true },
    });
    if (!clash || clash.legacyMongoId === legacyMongoId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${legacyMongoId.slice(-6)}`;
}

async function upsertDoctorCountries(
  doctorId: string,
  registrations: Record<string, unknown>,
): Promise<number> {
  let n = 0;
  for (const [market, raw] of Object.entries(registrations)) {
    if (!raw || typeof raw !== "object") continue;
    const reg = raw as Record<string, unknown>;
    const countryId = await resolveCountryId(market);
    if (!countryId) continue;
    const registrationNumber = s(reg.registrationNumber);
    const chamberEntity = s(reg.chamberEntity);
    if (!registrationNumber && !chamberEntity) continue;
    if (DRY_RUN) {
      n += 1;
      continue;
    }
    await prisma.doctorCountry.upsert({
      where: { doctorId_countryId: { doctorId, countryId } },
      update: { registrationNumber, chamberEntity, isVerified: reg.isRegistered === true },
      create: {
        doctorId,
        countryId,
        registrationNumber,
        chamberEntity,
        isVerified: reg.isRegistered === true,
      },
    });
    n += 1;
  }
  return n;
}

/** Doctors referenced by real data: appointment doctorId, note createdBy, doc uploadedBy. */
async function collectReferencedDoctorIds(): Promise<Set<string>> {
  const set = new Set<string>();
  if (hasCollection("Appointments")) {
    for await (const doc of readCollection("Appointments")) {
      const id = s(doc.doctorId);
      if (id) set.add(id);
    }
  }
  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) continue;
    for await (const doc of readCollection(coll)) {
      const notes = Array.isArray(doc.medicalNotes) ? (doc.medicalNotes as SourceDoc[]) : [];
      for (const n of notes) {
        const id = s(n.createdBy);
        if (id) set.add(id);
      }
      for (const arr of collectDocArrays(doc)) {
        for (const el of arr.elements) {
          const id = s(el.uploadedBy);
          if (id) set.add(id);
        }
      }
    }
  }
  return set;
}

async function main() {
  requireDumpDir();
  banner(STAGE);
  if (!hasCollection(SOURCE)) {
    console.log(`No ${SOURCE} export — nothing to do.`);
    return;
  }

  console.log("  computing referenced-doctor set…");
  const referenced = await collectReferencedDoctorIds();
  console.log(`  ${referenced.size} doctors are referenced by data.\n`);

  const csvPath = join(DUMP_DIR, "credentials-doctors.csv");
  if (!DRY_RUN) initCsv(csvPath);
  const creds: ProvisionResult[] = [];
  const c = new Counter();

  for await (const doc of readCollection(SOURCE)) {
    c.bump("read");
    const m = mapDoctor(doc);
    if (!m.legacyMongoId || !m.fullName) {
      c.bump("skipped-invalid");
      continue;
    }
    if (!referenced.has(m.legacyMongoId)) {
      c.bump("skipped-unreferenced");
      continue;
    }

    const countryId = await resolveCountryId(m.sourceCountry);
    if (!countryId) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId: m.legacyMongoId,
        columnName: "countryId",
        legacyValue: m.sourceCountry,
        reason: "source country did not resolve — referenced doctor NOT created",
      });
      c.bump("skipped-no-country");
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  [dry] doctor "${m.fullName}" country=${m.sourceCountry}->${countryId} ` +
          `regs=${Object.keys(m.registrations).length} login=${m.email ?? "(no email)"}`,
      );
      c.bump("would-write");
      continue;
    }

    const slug = await uniqueSlug(slugify(m.fullName), countryId, m.legacyMongoId);
    const doctor = await prisma.doctor.upsert({
      where: { legacyMongoId: m.legacyMongoId },
      update: {
        fullName: m.fullName,
        title: m.title,
        countryId,
        canCreateManualAppointments: m.canCreateManualAppointments,
      },
      create: {
        legacyMongoId: m.legacyMongoId,
        fullName: m.fullName,
        title: m.title,
        countryId,
        slug,
        canCreateManualAppointments: m.canCreateManualAppointments,
      },
      select: { id: true },
    });
    c.bump("doctor-upserted");
    c.bump("doctor-country-rows", await upsertDoctorCountries(doctor.id, m.registrations));

    if (!m.email) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId: m.legacyMongoId,
        columnName: "User.email",
        reason: "doctor has no email — Doctor created but no login account",
      });
      c.bump("no-login");
      continue;
    }

    const r = await provisionUser({
      email: m.email,
      fullName: m.fullName,
      role: "DOCTOR",
      doctorId: doctor.id,
    });
    creds.push(r);
    appendCsv(csvPath, r);
    c.bump(`login-${r.status}`);
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
  if (!DRY_RUN) {
    console.log(`credentials -> ${csvPath}`);
    const created = creds.filter((r) => r.status === "created");
    const existing = creds.filter((r) => r.status === "existing-unchanged");
    console.log(`\nDOCTOR LOGINS (${created.length} new, ${existing.length} existing):\n`);
    for (const r of created) {
      console.log(`  ${r.fullName}\t${r.email}\t${r.tempPassword}\t${r.link}`);
    }
    for (const r of existing) {
      console.log(`  ${r.fullName}\t${r.email}\t(existing — password unchanged)`);
    }
  }
}

main()
  .catch((err) => {
    console.error(`${STAGE} failed:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
