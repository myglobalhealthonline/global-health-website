/**
 * Patch Ireland's CountryLegalProfile (/ireland/*\/legal) per the July 2026
 * SEO audit trust-signal findings (docs/audits/seo/site-audit-2026-07/):
 *
 *   1. "Legal-entity / address discrepancy" — the page's visible
 *      "Registered address" showed only the Dublin branch address with no
 *      mention that Global Guest s.r.o. is a Czech entity headquartered in
 *      Prague (the Prague address + IČO only exist in the sitewide
 *      MedicalOrganization JSON-LD, frontend/lib/seo/structured-data.ts —
 *      invisible to a human reader). Prepends one clarifying sentence to
 *      `legalAddress` naming the HQ + branch relationship and both
 *      registration numbers; the existing Dublin address text is otherwise
 *      untouched.
 *   2. "No named Data Protection Officer" — dpoName/dpoEmail were null for
 *      Ireland despite the page already having a "Data protection" section
 *      that renders them automatically once set (see
 *      frontend/app/(site)/[country]/[lang]/legal/page.tsx CompanySection).
 *      Romania and Czechia's CountryLegalProfile rows already carry this
 *      DPO ("Dr. Ahmed Maklad" / "MUDr Ahmed Maklad", dpo@myglobalhealth.online)
 *      — same real person, whose canonical Doctor.fullName in this DB is
 *      "Dr Ahmed Maklad" (slug dr-ahmed-maklad, IMC-registered, countryId
 *      = Ireland). Uses that exact spelling here.
 *
 * legalAddress/legalCompanyName/companyRegistrationNumber/dpoName/dpoEmail
 * have no per-locale override table (unlike regulatorName etc., which live
 * in CountryLegalProfileTrustTranslation) — so this single write is what
 * every locale variant (/ireland/en|pt|es|cs|ro|de/legal) renders. That
 * matches how the field already behaved before this patch (Dublin address
 * was already English-only on every locale) — not a new regression, but
 * flagged here since the new sentence is EN prose, not just a proper noun.
 *
 * Run:
 *   node --env-file=.env --import tsx scripts/patch-ireland-legal-hq-dpo.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-ireland-legal-hq-dpo.ts --apply    # write
 *
 * SAFE BY DESIGN: the write only fires if the current DB value still
 * exactly matches the value queried at investigation time (2026-07-24);
 * re-running after --apply is a no-op.
 */
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const APPLY = process.argv.includes("--apply");

const CURRENT_LEGAL_ADDRESS = "6-9 Trinity Street, Dublin 2, D02EY47";
const NEW_LEGAL_ADDRESS =
  "Global Guest s.r.o. is headquartered in Prague, Czech Republic " +
  "(Czech company registration IČO 19071680), with branch operations in " +
  "Portugal and Ireland (Irish company registration CRO 910267). " +
  "Irish branch registered address: 6-9 Trinity Street, Dublin 2, D02EY47";

const DPO_NAME = "Dr Ahmed Maklad";
const DPO_EMAIL = "dpo@myglobalhealth.online";

async function main() {
  const country = await prisma.country.findFirst({
    where: { code: COUNTRY_CODE },
    select: { id: true, name: true, legalProfile: { select: { id: true, legalAddress: true, dpoName: true, dpoEmail: true } } },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  if (!country.legalProfile) throw new Error(`Country ${COUNTRY_CODE} has no CountryLegalProfile row`);
  const p = country.legalProfile;

  const data: { legalAddress?: string; dpoName?: string; dpoEmail?: string } = {};

  if (p.legalAddress === CURRENT_LEGAL_ADDRESS) {
    data.legalAddress = NEW_LEGAL_ADDRESS;
    console.log(`legalAddress:\n  from: ${JSON.stringify(p.legalAddress)}\n  to:   ${JSON.stringify(NEW_LEGAL_ADDRESS)}`);
  } else if (p.legalAddress === NEW_LEGAL_ADDRESS) {
    console.log("legalAddress: already patched — no-op.");
  } else {
    console.warn(`legalAddress: current DB value doesn't match the expected pre-patch text — SKIPPING to avoid clobbering an unrelated edit.\n  current: ${JSON.stringify(p.legalAddress)}`);
  }

  if (p.dpoName === null && p.dpoEmail === null) {
    data.dpoName = DPO_NAME;
    data.dpoEmail = DPO_EMAIL;
    console.log(`dpoName: ∅ -> ${JSON.stringify(DPO_NAME)}`);
    console.log(`dpoEmail: ∅ -> ${JSON.stringify(DPO_EMAIL)}`);
  } else if (p.dpoName === DPO_NAME && p.dpoEmail === DPO_EMAIL) {
    console.log("dpoName/dpoEmail: already patched — no-op.");
  } else {
    console.warn(`dpoName/dpoEmail: not null and don't match the expected patch values — SKIPPING.\n  current dpoName: ${JSON.stringify(p.dpoName)}\n  current dpoEmail: ${JSON.stringify(p.dpoEmail)}`);
  }

  if (Object.keys(data).length === 0) {
    console.log("\nNothing to write.");
    await prisma.$disconnect();
    return;
  }

  if (APPLY) {
    await prisma.countryLegalProfile.update({ where: { id: p.id }, data });
    console.log(`\nAPPLIED: ${Object.keys(data).length} field(s) written for Ireland's CountryLegalProfile.`);
  } else {
    console.log(`\nDRY-RUN: ${Object.keys(data).length} field(s) would be written. Pass --apply to persist.`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
