/**
 * Normalize Asset.path values stored as absolute URLs
 * (https://<any-host>/api/media/...) to relative "/api/media/..." — the form
 * doctor photos already use and the only form the frontend's
 * resolveTrustedAssetUrl reliably renders after a backend domain change.
 *
 *   node --env-file=.env --import tsx scripts/normalize-asset-media-paths.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/normalize-asset-media-paths.ts --apply    # write
 *
 * Idempotent: relative paths are never matched, so re-running is a no-op.
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

async function main() {
  const assets = await prisma.asset.findMany({
    where: { path: { startsWith: "http" } },
    select: { id: true, path: true, key: true },
  });

  let changed = 0;
  for (const asset of assets) {
    let url: URL;
    try {
      url = new URL(asset.path);
    } catch {
      console.log(`SKIP (unparseable): ${asset.id} ${asset.path}`);
      continue;
    }
    if (!url.pathname.startsWith("/api/media/")) {
      console.log(`SKIP (not /api/media): ${asset.id} ${asset.path}`);
      continue;
    }
    const next = url.pathname;
    console.log(`${APPLY ? "UPDATE" : "would update"} ${asset.id} [${asset.key}]\n  ${asset.path}\n  -> ${next}`);
    if (APPLY) {
      await prisma.asset.update({ where: { id: asset.id }, data: { path: next } });
    }
    changed += 1;
  }

  console.log(`\n${APPLY ? "Updated" : "Would update"} ${changed} of ${assets.length} absolute-path assets.`);
  if (!APPLY) console.log("Dry-run only — pass --apply to write.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
