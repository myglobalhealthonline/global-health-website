/**
 * Copies DOCX templates from monorepo Templates/ into backend/assets/docx-templates
 * so Railway (backend-only deploy) always ships the latest files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, "..");
const sources = [
  path.join(backendRoot, "..", "Templates"),
  path.join(backendRoot, "Templates"),
];
const dest = path.join(backendRoot, "assets", "docx-templates");

const source = sources.find((s) => fs.existsSync(s));
if (!source) {
  console.warn("[sync-docx-templates] No Templates folder found — skipping");
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const name of fs.readdirSync(source)) {
  if (!name.toLowerCase().endsWith(".docx")) continue;
  fs.copyFileSync(path.join(source, name), path.join(dest, name));
}
console.log(`[sync-docx-templates] Synced from ${source} → ${dest}`);
