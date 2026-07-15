/**
 * Unresolved-reference logging + per-run counters.
 *
 * `logUnresolved` records anything the loader could not resolve (a broken
 * patient link, a missing doctor author, a document whose object is absent)
 * into the MigrationUnresolved table so it can be read and accepted before
 * cutover — never silently dropped. In DRY_RUN it only warns to the console.
 */
import { prisma } from "../../../src/db/prisma.js";
import { DRY_RUN } from "./config.js";

export interface Unresolved {
  stage: string;
  sourceColl: string;
  legacyId?: string | null;
  targetModel?: string | null;
  columnName?: string | null;
  /** Raw legacy value that failed to resolve. NEVER put decrypted PHI here. */
  legacyValue?: string | null;
  reason: string;
}

export async function logUnresolved(u: Unresolved): Promise<void> {
  console.warn(
    `  [unresolved] ${u.stage} ${u.sourceColl}${u.legacyId ? `#${u.legacyId}` : ""}` +
      ` ${u.columnName ?? ""} -> ${u.reason}`,
  );
  if (DRY_RUN) return;
  await prisma.migrationUnresolved.create({
    data: {
      stage: u.stage,
      sourceColl: u.sourceColl,
      legacyId: u.legacyId ?? null,
      targetModel: u.targetModel ?? null,
      columnName: u.columnName ?? null,
      legacyValue: u.legacyValue ?? null,
      reason: u.reason,
    },
  });
}

/** Simple mutable tally printed at the end of each loader. */
export class Counter {
  private counts = new Map<string, number>();

  bump(key: string, by = 1): void {
    this.counts.set(key, (this.counts.get(key) ?? 0) + by);
  }

  get(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  summary(): string {
    const parts = [...this.counts.entries()].map(([k, v]) => `${k}=${v}`);
    return parts.length ? parts.join("  ") : "(nothing)";
  }
}
