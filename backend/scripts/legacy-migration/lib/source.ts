/**
 * Read the offline NDJSON exports produced by `mongoexport` (see README).
 *
 * The loaders NEVER connect to live Atlas — they read the dumped files under
 * DUMP_DIR. This keeps the import re-runnable, decoupled from the source, and
 * means no `mongodb` runtime dependency is added to the backend.
 *
 * `mongoexport` emits MongoDB Extended JSON (relaxed). This module collapses
 * the `$oid` / `$date` / `$numberLong` / ... wrappers back into plain JS values
 * so the mapping code sees strings, numbers and Dates — not envelopes.
 */
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { DUMP_DIR } from "./config.js";

/** A source document after Extended-JSON normalization. */
export type SourceDoc = Record<string, unknown>;

/**
 * Recursively collapse MongoDB Extended JSON wrappers into plain JS values.
 *   { $oid: "abc" }              -> "abc"
 *   { $date: "2026-01-02T..." }  -> Date
 *   { $date: { $numberLong } }   -> Date
 *   { $numberLong|Int|Double|Decimal } -> number
 * Everything else is walked structurally.
 */
export function normalizeExtendedJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map(normalizeExtendedJson);

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.length === 1) {
    const k = keys[0];
    const v = obj[k];
    switch (k) {
      case "$oid":
        return String(v);
      case "$numberLong":
      case "$numberInt":
      case "$numberDouble":
      case "$numberDecimal":
        return Number(v);
      case "$date":
        // relaxed: ISO string; canonical: { $numberLong: "epochMillis" }
        if (typeof v === "object" && v !== null && "$numberLong" in (v as object)) {
          return new Date(Number((v as Record<string, unknown>).$numberLong));
        }
        return new Date(String(v));
      case "$undefined":
        return undefined;
      default:
        break;
    }
  }

  // $binary / $timestamp / $regularExpression etc. are not needed by this
  // migration; drop the wrapper's structure but keep something inspectable.
  if (keys.length >= 1 && keys.every((k) => k.startsWith("$"))) {
    return obj; // leave exotic BSON types verbatim; mapping decides what to do
  }

  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = normalizeExtendedJson(obj[key]);
  return out;
}

/** Absolute path of a collection's NDJSON export. */
export function collectionFile(collection: string): string {
  return join(DUMP_DIR, `${collection}.ndjson`);
}

/** True if the export file for a collection exists. */
export function hasCollection(collection: string): boolean {
  return existsSync(collectionFile(collection));
}

/**
 * Stream a collection's documents one at a time (normalized). Skips blank
 * lines. Throws a clear error if the export file is missing.
 */
export async function* readCollection(
  collection: string,
): AsyncGenerator<SourceDoc> {
  const file = collectionFile(collection);
  if (!existsSync(file)) {
    throw new Error(
      `Export not found: ${file}\n` +
        `Run the mongoexport step first (see scripts/legacy-migration/README.md).`,
    );
  }
  const rl = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    yield normalizeExtendedJson(JSON.parse(trimmed)) as SourceDoc;
  }
}

/** Count documents in a collection export (streaming, no full load). */
export async function countCollection(collection: string): Promise<number> {
  let n = 0;
  for await (const _ of readCollection(collection)) n += 1;
  return n;
}

/** The Mongo _id of a source doc as a hex string (post-normalization). */
export function docId(doc: SourceDoc): string | null {
  const id = doc._id;
  if (id == null) return null;
  return typeof id === "string" ? id : String(id);
}
