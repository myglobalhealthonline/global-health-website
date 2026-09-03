/**
 * Publishes the eleven clinically approved Portugal doctor snippet trims.
 *
 *   node --env-file=.env --import tsx scripts/publish-portugal-snippet-trims.ts          # dry run all 11
 *   node --env-file=.env --import tsx scripts/publish-portugal-snippet-trims.ts --apply  # publish
 *
 * Approval: Dr Tiago Miguel Figueira, OM 77986, 2026-09-03 — recorded in
 * `seo/portugal/raw/clinical-approval-2026-09-03-snippet-trims.md`.
 *
 * For each record this runs the guarded writer's own dry run, reads the source
 * fingerprint and confirmation token it prints, and only then re-invokes it
 * with `--apply`. Nothing is hardcoded that the gate itself does not derive, so
 * a drifted record fails rather than being forced through. Records are done one
 * at a time and the run stops on the first failure.
 */
import { execFileSync } from "node:child_process";

const SLUGS = [
  "dr-ana-leal-neto",
  "dr-egas-moura",
  "dr-joana-branco-maia",
  "dr-joao-de-oliveira-e-silva",
  "dr-lucas-alvarenga-berto",
  "dr-margarida-andrade",
  "dr-pedro-santos",
  "dr-ruben-pereira",
  "dr-rui-diogo-rodrigues",
  "dra-ana-varges-gomes",
  "dra-nadia-cavaco",
] as const;

const REVIEWER_DOCTOR_ID = "cmp5r0if3002kssjug743x0p6";
const REVIEWED_AT = "2026-09-03";
const APPLY = process.argv.includes("--apply");
const WRITER = "scripts/patch-portugal-seo-metadata.ts";

function run(args: string[]): string {
  return execFileSync(
    process.execPath,
    ["--env-file=.env", "--import", "tsx", WRITER, ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

const field = (text: string, label: string): string => {
  const value = text.match(new RegExp(`${label}:\\s*(\\S+)`))?.[1];
  if (!value) throw new Error(`writer dry run did not report "${label}"`);
  return value;
};

let published = 0;
for (const slug of SLUGS) {
  const only = `--only=doctor:${slug}`;
  const dry = run([only]);
  const sourceSha = field(dry, "source sha256");
  const approvedSha = field(dry, "approval sha256");
  const confirmation = field(dry, "confirmation");
  const database = field(dry, "database target");

  console.log(`\n=== ${slug}`);
  console.log(`  source   ${sourceSha}`);
  console.log(`  approval ${approvedSha}`);
  if (!APPLY) {
    console.log("  DRY RUN — not applied");
    continue;
  }
  run([
    only,
    "--apply",
    `--source-sha256=${sourceSha}`,
    `--approved-sha256=${approvedSha}`,
    `--reviewer-doctor-id=${REVIEWER_DOCTOR_ID}`,
    `--reviewed-at=${REVIEWED_AT}`,
    `--confirm=${confirmation}`,
    `--confirm-database=${database}`,
  ]);
  published += 1;
  console.log("  APPLIED and verified in-transaction");
}

console.log(
  APPLY
    ? `\n${published} of ${SLUGS.length} records published.`
    : `\nDry run complete for ${SLUGS.length} records. Re-run with --apply to publish.`,
);
