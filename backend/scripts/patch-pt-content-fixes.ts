/**
 * Two DB content corrections + one CZ trust-copy quote fix (user-approved
 * exact texts, July 2026):
 *
 *   1. Portugal `CountryLegalProfile.nonEmergencyHealthLine` has the wrong
 *      SNS 24 number ("1414" instead of "808 24 24 24"). Single row, not
 *      per-locale (no CountryDisclaimerTranslation-style override exists for
 *      this column), so one update covers every locale.
 *   2. Czechia `CountryLegalProfile.providerRegistrationLabel` has a stray
 *      trailing `"` character baked into the stored string.
 *
 *   NOTE — a third requested fix (the "fotografado ... Ordem dos Médicos"
 *   paragraph rendered on /portugal/pt) is NOT in this script: it does not
 *   exist anywhere in the database. Full DB scan (all 1019 text/varchar/json/
 *   jsonb columns, every table, case-insensitive "%fotografad%") found zero
 *   rows. That paragraph is hardcoded in frontend source:
 *     frontend/components/sections/VerifiedProfessionals.tsx, PT_PT_COPY.body
 *     (~line 209), selected for country=PT + locale=pt via the isPtPt branch
 *     in VerifiedProfessionals(). Fixing it requires a source edit, not a DB
 *     patch script. Flagging back to the orchestrator rather than guessing.
 *
 *   node --env-file=.env --import tsx scripts/patch-pt-content-fixes.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-pt-content-fixes.ts --apply    # write
 *
 * Idempotent: each update only fires when the stored value still equals the
 * known BEFORE text, so re-running after --apply finds nothing left to do.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const PT_HEALTH_LINE_BEFORE = "SNS 24: 1414";
const PT_HEALTH_LINE_AFTER = "SNS 24: 808 24 24 24";

const CZ_LABEL_BEFORE =
  'Registrováno v Národním registru poskytovatelů zdravotních služeb (NRPZS)"';
const CZ_LABEL_AFTER =
  "Registrováno v Národním registru poskytovatelů zdravotních služeb (NRPZS)";

type Fix = {
  table: string;
  id: string;
  locale: string;
  before: string;
  after: string;
  apply: (tx: Prisma.TransactionClient) => Promise<void>;
};

async function main() {
  const fixes: Fix[] = [];

  const pt = await prisma.country.findUnique({ where: { code: "pt" }, select: { id: true } });
  if (!pt) throw new Error("Country pt not found");
  const ptLegal = await prisma.countryLegalProfile.findUnique({ where: { countryId: pt.id } });
  if (ptLegal?.nonEmergencyHealthLine === PT_HEALTH_LINE_BEFORE) {
    fixes.push({
      table: "CountryLegalProfile",
      id: ptLegal.id,
      locale: "(all — column is not per-locale)",
      before: PT_HEALTH_LINE_BEFORE,
      after: PT_HEALTH_LINE_AFTER,
      apply: async (tx) => {
        await tx.countryLegalProfile.update({
          where: { id: ptLegal.id },
          data: { nonEmergencyHealthLine: PT_HEALTH_LINE_AFTER },
        });
      },
    });
  } else if (ptLegal) {
    console.log(
      `SKIP: CountryLegalProfile ${ptLegal.id} nonEmergencyHealthLine is already ${JSON.stringify(ptLegal.nonEmergencyHealthLine)} (not the expected before-value) — no change.`
    );
  }

  const cz = await prisma.country.findUnique({ where: { code: "cz" }, select: { id: true } });
  if (!cz) throw new Error("Country cz not found");
  const czLegal = await prisma.countryLegalProfile.findUnique({ where: { countryId: cz.id } });
  if (czLegal?.providerRegistrationLabel === CZ_LABEL_BEFORE) {
    fixes.push({
      table: "CountryLegalProfile",
      id: czLegal.id,
      locale: "(all — column is not per-locale)",
      before: CZ_LABEL_BEFORE,
      after: CZ_LABEL_AFTER,
      apply: async (tx) => {
        await tx.countryLegalProfile.update({
          where: { id: czLegal.id },
          data: { providerRegistrationLabel: CZ_LABEL_AFTER },
        });
      },
    });
  } else if (czLegal) {
    console.log(
      `SKIP: CountryLegalProfile ${czLegal.id} providerRegistrationLabel is already ${JSON.stringify(czLegal.providerRegistrationLabel)} (not the expected before-value) — no change.`
    );
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${fixes.length} change(s) found:\n`);
  for (const f of fixes) {
    console.log(`table:  ${f.table}`);
    console.log(`id:     ${f.id}`);
    console.log(`locale: ${f.locale}`);
    console.log(`BEFORE: ${JSON.stringify(f.before)}`);
    console.log(`AFTER:  ${JSON.stringify(f.after)}`);
    console.log("");
  }

  console.log(
    'NOT INCLUDED: the "fotografado / Ordem dos Médicos" paragraph fix — not found anywhere ' +
      "in the database (full 1019-column scan, zero matches). It's hardcoded in " +
      "frontend/components/sections/VerifiedProfessionals.tsx (PT_PT_COPY.body, ~line 209). " +
      "Needs a source edit, not a DB patch — flagging back rather than updating source from this script.\n"
  );

  if (!APPLY) {
    console.log("Dry run only — pass --apply to write.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const f of fixes) {
      await f.apply(tx);
    }
  });
  console.log(`Applied ${fixes.length} change(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
