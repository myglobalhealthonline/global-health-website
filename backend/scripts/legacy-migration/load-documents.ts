/**
 * Phase 1 — load the embedded UPLOAD…[] arrays -> MedicalDocument rows.
 * Run AFTER load-patients (needs the profiles) and AFTER the file sync (needs
 * the objects present in Tigris to HEAD-verify).
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/load-documents.ts             # dry run
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/load-documents.ts
 *
 * Rules:
 *   - object_key (fileKey) = source filePath VERBATIM (doubly-prefixed key kept).
 *   - Every object is HEAD-checked in storage first. A document whose object is
 *     missing is a lost medical record — it is LOGGED and NOT inserted (never a
 *     phantom row pointing at nothing).
 *   - Idempotent: MedicalDocument upserts on legacyMongoId.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, banner } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";
import { MARKETS, patientCollection } from "./lib/markets.js";
import { mapDocument, collectDocArrays } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";
import { headObject, isObjectStorageConfigured } from "../../src/services/object-storage.js";

const STAGE = "documents";

type Prof = { id: string; globalHealthNumber: string | null };

/** Preload legacy patient id -> profile once (avoids a per-patient query over the proxy). */
async function preloadProfiles(): Promise<Map<string, Prof>> {
  const map = new Map<string, Prof>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, globalHealthNumber: true, legacyMongoIds: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      for (const lid of r.legacyMongoIds) {
        map.set(lid, { id: r.id, globalHealthNumber: r.globalHealthNumber });
      }
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

async function main() {
  requireDumpDir();
  banner(STAGE);

  const storageOn = isObjectStorageConfigured();
  if (!storageOn) {
    console.warn(
      "  WARNING: object storage not configured — objects cannot be HEAD-verified. " +
        "Configure S3_* (Tigris) so missing objects are caught.",
    );
  }

  const c = new Counter();
  console.log("  preloading patient profiles…");
  const profiles = await preloadProfiles();
  console.log(`  ${profiles.size} legacy patient ids mapped.\n`);

  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) continue;

    for await (const doc of readCollection(coll)) {
      const legacyId = typeof doc._id === "string" ? doc._id : String(doc._id ?? "");
      const arrays = collectDocArrays(doc);
      const total = arrays.reduce((n, a) => n + a.elements.length, 0);
      if (total === 0) continue;

      const profile = legacyId ? (profiles.get(legacyId) ?? null) : null;
      if (!profile) {
        await logUnresolved({
          stage: STAGE,
          sourceColl: coll,
          legacyId,
          columnName: "patientProfileId",
          reason: `no PatientProfile with legacyMongoId ${legacyId} — run load-patients first`,
        });
        c.bump("orphan-patient", total);
        continue;
      }

      let ordinal = 0;
      for (const arr of arrays) {
        for (const el of arr.elements) {
          const m = mapDocument(el, legacyId, ordinal, arr.arrayName);
          ordinal += 1;
          c.bump("read");
        if (!m) {
          await logUnresolved({
            stage: STAGE,
            sourceColl: coll,
            legacyId,
            columnName: "fileKey",
            reason: "UPLOAD…[] element has no filePath",
          });
          c.bump("no-key");
          continue;
        }

        // Verify the object exists before we point a DB row at it. HEAD can
        // transiently time out (Tigris DNS/network) — retry rather than abort
        // the whole run. If it never resolves, log + skip (re-run will retry).
        let byteSize = 0;
        let mimetype = m.mimetype;
        if (storageOn) {
          let head: Awaited<ReturnType<typeof headObject>> = null;
          let headErr: unknown = null;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            try {
              head = await headObject(m.objectKey);
              headErr = null;
              break;
            } catch (e) {
              headErr = e;
            }
          }
          if (headErr) {
            await logUnresolved({
              stage: STAGE,
              sourceColl: coll,
              legacyId,
              targetModel: "MedicalDocument",
              columnName: "fileKey",
              legacyValue: m.objectKey,
              reason: `HEAD failed after retries (transient) — ${(headErr as Error).message}; re-run to retry`,
            });
            c.bump("head-error");
            continue;
          }
          if (!head) {
            await logUnresolved({
              stage: STAGE,
              sourceColl: coll,
              legacyId,
              targetModel: "MedicalDocument",
              columnName: "fileKey",
              legacyValue: m.objectKey,
              reason: "object missing in storage (HEAD 404) — LOST record, not inserted",
            });
            c.bump("object-missing");
            continue;
          }
          byteSize = head.contentLength;
          if (head.contentType) mimetype = head.contentType;
        }

        if (DRY_RUN) {
          console.log(
            `  [dry] ${market} ${legacyId} doc "${m.fileName}" type=${m.documentType} ` +
              `key=${m.objectKey} size=${byteSize} visible=${m.visibleToPatient}`,
          );
          c.bump("would-write");
          continue;
        }

        await prisma.medicalDocument.upsert({
          where: { legacyMongoId: m.legacyMongoId },
          update: {
            patientProfileId: profile.id,
            globalHealthNumber: profile.globalHealthNumber,
            documentType: m.documentType,
            title: m.title,
            fileName: m.fileName,
            mimetype,
            byteSize,
            visibleToPatient: m.visibleToPatient,
            uploadedByRole: m.uploadedByRole,
          },
          create: {
            legacyMongoId: m.legacyMongoId,
            patientProfileId: profile.id,
            globalHealthNumber: profile.globalHealthNumber,
            uploadedByRole: m.uploadedByRole,
            documentType: m.documentType,
            title: m.title,
            fileKey: m.objectKey,
            fileName: m.fileName,
            mimetype,
            byteSize,
            visibleToPatient: m.visibleToPatient,
          },
        });
          c.bump("written");
        }
      }
    }
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
}

main()
  .catch((err) => {
    console.error(`${STAGE} failed:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
