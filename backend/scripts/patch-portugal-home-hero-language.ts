/**
 * Patch the verified English CTA on Portugal's published pt-PT HOME page.
 *
 *   node --env-file=.env --import tsx scripts/patch-portugal-home-hero-language.ts
 *   node --env-file=.env --import tsx scripts/patch-portugal-home-hero-language.ts \
 *     --apply --confirm=PT-HOME-CTA-2026-08-31 --confirm-host=<database-host>
 *
 * The first command is read-only. The second writes only when the database
 * host and reviewed Portugal content snapshot both match.
 */
import { runPortugalHomeCtaPatch } from "../src/content/portugal-home-cta-patch.js";
import { disconnectDb, prisma } from "../src/db/prisma.js";

const confirmation = process.argv
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);
const confirmationHost = process.argv
  .find((argument) => argument.startsWith("--confirm-host="))
  ?.slice("--confirm-host=".length);

runPortugalHomeCtaPatch(prisma, {
  apply: process.argv.includes("--apply"),
  confirmation,
  confirmationHost,
  databaseUrl: process.env.DATABASE_URL,
  write: (message) => process.stdout.write(message),
})
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
