/**
 * Import contacts.csv -> PatientProfile. Profiles ONLY (no login accounts).
 * Country is derived from the PHONE dial prefix, falling back to the CSV's
 * address country; unresolved ones are left null and reported.
 *
 *   CONTACTS_CSV="c:/Users/nauma/Downloads/contacts.csv" node --import tsx scripts/legacy-migration/load-contacts.ts            # dry
 *   CONTACTS_CSV="..." DRY_RUN=false node --import tsx scripts/legacy-migration/load-contacts.ts
 *
 * LIVE-DB SAFETY: existing profiles are MERGED gap-filling only (never
 * overwrite a value the app already has); merged/anonymized rows are skipped.
 * Idempotent — keyed on email. PHI ids are encrypted + blind-indexed.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requirePhiKeys, DRY_RUN, banner } from "./lib/config.js";
import { readCsvRecords, mapContact, type Contact } from "./lib/contacts-csv.js";
import { Counter, logUnresolved } from "./lib/report.js";
import { encryptPhi } from "../../src/lib/crypto/phi-crypto.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../../src/lib/blind-index.js";
import { generateGlobalHealthNumber } from "../../src/lib/global-health-number.js";

const STAGE = "contacts";
const SOURCE = "contacts.csv";

interface P {
  id: string;
  isBlocked: boolean;
  fullName: string | null; phone: string | null; dateOfBirth: Date | null;
  addressLine1: string | null; addressCity: string | null; addressPostalCode: string | null;
  addressCountryCode: string | null; preferredPharmacy: string | null;
  taxIdNumber: string | null; nationalIdNumber: string | null;
  originCountryCode: string | null; countryFolderCode: string | null;
  legacyExtra: Record<string, unknown> | null;
}

const first = <T,>(a: T | null | undefined, b: T | null): T | null => (a != null && a !== "" ? a : b);

async function preload(): Promise<Map<string, P>> {
  const map = new Map<string, P>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take, orderBy: { id: "asc" }, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true, email: true, isMerged: true, anonymizedAt: true, fullName: true, phone: true,
        dateOfBirth: true, addressLine1: true, addressCity: true, addressPostalCode: true,
        addressCountryCode: true, preferredPharmacy: true, taxIdNumber: true,
        nationalIdNumber: true, originCountryCode: true, countryFolderCode: true, legacyExtra: true,
      },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      map.set(r.email.toLowerCase(), {
        id: r.id, isBlocked: r.isMerged || r.anonymizedAt != null,
        fullName: r.fullName, phone: r.phone, dateOfBirth: r.dateOfBirth,
        addressLine1: r.addressLine1, addressCity: r.addressCity, addressPostalCode: r.addressPostalCode,
        addressCountryCode: r.addressCountryCode, preferredPharmacy: r.preferredPharmacy,
        taxIdNumber: r.taxIdNumber, nationalIdNumber: r.nationalIdNumber,
        originCountryCode: r.originCountryCode, countryFolderCode: r.countryFolderCode,
        legacyExtra: (r.legacyExtra as Record<string, unknown> | null) ?? null,
      });
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

function extraOf(c: Contact, syntheticEmail: boolean) {
  const e: Record<string, unknown> = {};
  if (c.utente) e.numeroUtente = c.utente;
  if (c.labels) e.labels = c.labels;
  if (c.language) e.language = c.language;
  if (c.countryFromPhone) e.countrySource = "phone";
  else if (c.countryFromAddress) e.countrySource = "address";
  if (syntheticEmail) e.__syntheticEmail = true;
  return e;
}

async function main() {
  const file = process.env.CONTACTS_CSV;
  if (!file) throw new Error("CONTACTS_CSV is required");
  requirePhiKeys();
  banner(STAGE);

  const contacts = readCsvRecords(file).map(mapContact);
  const state = await preload();
  console.log(`  ${contacts.length} contacts | ${state.size} existing profiles preloaded\n`);
  const c = new Counter();
  let synthN = 0;

  for (const ct of contacts) {
    c.bump("read");
    let email = ct.email;
    let synthetic = false;
    if (!email) {
      synthN += 1;
      email = `no-email.contact.${synthN}@contacts.invalid`;
      synthetic = true;
      await logUnresolved({
        stage: STAGE, sourceColl: SOURCE, columnName: "email",
        reason: `contact has no email — placeholder ${email} (${ct.fullName ?? "no name"})`,
      });
    }
    const emailLc = email.toLowerCase();
    const country = ct.countryFromPhone ?? ct.countryFromAddress ?? null;
    if (!country) c.bump("no-country");

    const cur = state.get(emailLc);
    if (cur?.isBlocked) { c.bump("skipped-merged"); continue; }

    const extra = extraOf(ct, synthetic);
    const hasExtra = Object.keys(extra).length > 0;

    if (DRY_RUN) {
      c.bump(cur ? "would-merge" : "would-create");
      continue;
    }

    const nameForHash = first(cur?.fullName, ct.fullName);
    const phoneForHash = first(cur?.phone, ct.phone);
    const dobForHash = cur?.dateOfBirth ?? ct.dateOfBirth;
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
          fullName: ct.fullName, phone: ct.phone, dateOfBirth: ct.dateOfBirth,
          addressLine1: ct.addressLine1, addressCity: ct.addressCity,
          addressPostalCode: ct.addressPostalCode, addressCountryCode: country,
          preferredPharmacy: ct.pharmacy,
          taxIdNumber: encryptPhi(ct.taxIdNumber), nationalIdNumber: encryptPhi(ct.nationalIdNumber),
          originCountryCode: country, countryFolderCode: country,
          globalHealthNumber: ghn,
          legacyExtra: hasExtra ? { contactsCsv: extra } : undefined,
          ...blind,
        },
        select: { id: true },
      });
      state.set(emailLc, {
        id: created.id, isBlocked: false, fullName: ct.fullName, phone: ct.phone,
        dateOfBirth: ct.dateOfBirth, addressLine1: ct.addressLine1, addressCity: ct.addressCity,
        addressPostalCode: ct.addressPostalCode, addressCountryCode: country,
        preferredPharmacy: ct.pharmacy, taxIdNumber: ct.taxIdNumber, nationalIdNumber: ct.nationalIdNumber,
        originCountryCode: country, countryFolderCode: country,
        legacyExtra: hasExtra ? { contactsCsv: extra } : null,
      });
      c.bump("created");
      continue;
    }

    // MERGE — fill gaps only
    const mergedExtra = { ...(cur.legacyExtra ?? {}), ...(hasExtra ? { contactsCsv: extra } : {}) };
    await prisma.patientProfile.update({
      where: { id: cur.id },
      data: {
        fullName: first(cur.fullName, ct.fullName),
        phone: first(cur.phone, ct.phone),
        dateOfBirth: cur.dateOfBirth ?? ct.dateOfBirth,
        addressLine1: first(cur.addressLine1, ct.addressLine1),
        addressCity: first(cur.addressCity, ct.addressCity),
        addressPostalCode: first(cur.addressPostalCode, ct.addressPostalCode),
        addressCountryCode: first(cur.addressCountryCode, country),
        preferredPharmacy: first(cur.preferredPharmacy, ct.pharmacy),
        taxIdNumber: cur.taxIdNumber ?? encryptPhi(ct.taxIdNumber) ?? undefined,
        nationalIdNumber: cur.nationalIdNumber ?? encryptPhi(ct.nationalIdNumber) ?? undefined,
        originCountryCode: first(cur.originCountryCode, country),
        countryFolderCode: first(cur.countryFolderCode, country),
        legacyExtra: Object.keys(mergedExtra).length ? mergedExtra : undefined,
        ...blind,
      },
    });
    state.set(emailLc, {
      ...cur,
      fullName: first(cur.fullName, ct.fullName), phone: first(cur.phone, ct.phone),
      countryFolderCode: first(cur.countryFolderCode, country),
      originCountryCode: first(cur.originCountryCode, country),
      legacyExtra: mergedExtra,
    });
    c.bump("merged");
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
}

main().catch((e) => { console.error(`${STAGE} failed:`, e); process.exit(1); }).finally(() => prisma.$disconnect());
