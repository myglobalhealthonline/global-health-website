/**
 * Migration run configuration. Reads from the environment (backend/.env is
 * loaded by `import "dotenv/config"` at each script's top; DUMP_DIR / DRY_RUN
 * can also be passed inline, e.g. `DRY_RUN=false DUMP_DIR=... node --import tsx ...`).
 */
import { existsSync } from "node:fs";

function bool(name: string, def: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === "") return def;
  return v === "true" || v === "1" || v === "yes";
}

/** Where the mongoexport NDJSON files live. Required for any load/audit. */
export const DUMP_DIR = process.env.DUMP_DIR?.trim() ?? "";

/**
 * Dry run: transform + validate + log, write NOTHING to Postgres or storage.
 * Defaults to TRUE so a bare run against the live DB can never mutate it.
 * Set DRY_RUN=false explicitly to actually write.
 */
export const DRY_RUN = bool("DRY_RUN", true);

/** Assert DUMP_DIR is set and exists — call at the top of every script. */
export function requireDumpDir(): void {
  if (!DUMP_DIR) {
    throw new Error(
      "DUMP_DIR is not set. Point it at the folder holding the mongoexport " +
        "NDJSON files (see scripts/legacy-migration/README.md).",
    );
  }
  if (!existsSync(DUMP_DIR)) {
    throw new Error(`DUMP_DIR does not exist: ${DUMP_DIR}`);
  }
}

/**
 * Before writing patient PHI, both encryption keys MUST be configured — the
 * app's crypto helpers are no-ops without them and would silently persist
 * PLAINTEXT national/tax/passport ids into a system whose reads expect the
 * `phi:v1:` envelope. Refuse rather than corrupt the security model.
 * Skipped in DRY_RUN (nothing is written).
 */
export function requirePhiKeys(): void {
  if (DRY_RUN) return;
  const phi = process.env.PHI_ENCRYPTION_KEY?.trim();
  const blind = process.env.BLIND_INDEX_KEY?.trim();
  const missing: string[] = [];
  if (!phi) missing.push("PHI_ENCRYPTION_KEY");
  if (!blind || blind.length < 32) missing.push("BLIND_INDEX_KEY (>=32 chars)");
  if (missing.length) {
    throw new Error(
      `Refusing to write patient PHI without: ${missing.join(", ")}. ` +
        `These must match the live app's keys, or IDs would be stored plaintext ` +
        `and blind-index dedup would be disabled.`,
    );
  }
}

/** One-line banner so every run states its mode up front. */
export function banner(stage: string): void {
  const mode = DRY_RUN ? "DRY RUN (no writes)" : "LIVE WRITE";
  console.log(
    `\n=== legacy-migration :: ${stage} === [${mode}]  DUMP_DIR=${DUMP_DIR || "(unset)"}\n`,
  );
}
