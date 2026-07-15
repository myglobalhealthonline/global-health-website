/**
 * Phase 1 — copy every object from Scaleway (source) to Tigris (this app's
 * bucket), keys BYTE-IDENTICAL. Then MedicalDocument.fileKey (= source
 * filePath) resolves against the new bucket with zero rewriting.
 *
 *   # needs SOURCE_S3_* (Scaleway, from .env.migration) in the environment,
 *   # and S3_* (Tigris, backend/.env) for the target.
 *   DRY_RUN=false node --import tsx scripts/legacy-migration/sync-files.ts
 *   MIGRATION_ENV_FILE=/secure/.env.migration DRY_RUN=false node --import tsx scripts/legacy-migration/sync-files.ts
 *
 * Idempotent: an object already present in the target with the same size is
 * skipped, so the sync can be re-run freely. For very large buckets prefer
 * `rclone copy scaleway:patient-files tigris:<bucket>` — this script is the
 * dependency-free equivalent (source objects are <=10MB by the old app's cap).
 */
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { DRY_RUN, banner } from "./lib/config.js";
import { Counter } from "./lib/report.js";
import {
  headObject,
  putObject,
  isObjectStorageConfigured,
} from "../../src/services/object-storage.js";

// Optionally pull SOURCE_S3_* / target overrides from a dedicated env file.
if (process.env.MIGRATION_ENV_FILE) {
  dotenvConfig({ path: process.env.MIGRATION_ENV_FILE });
}

const STAGE = "file-sync";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is required for the file sync (see .env.migration).`);
  return v;
}

function sourceClient(): { client: S3Client; bucket: string } {
  const bucket = requireEnv("SOURCE_S3_BUCKET");
  const client = new S3Client({
    region: requireEnv("SOURCE_S3_REGION"),
    endpoint: requireEnv("SOURCE_S3_ENDPOINT"),
    forcePathStyle: (process.env.SOURCE_S3_FORCE_PATH_STYLE ?? "true") !== "false",
    credentials: {
      accessKeyId: requireEnv("SOURCE_S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("SOURCE_S3_SECRET_KEY"),
    },
    maxAttempts: 3,
  });
  return { client, bucket };
}

interface Streamable {
  transformToByteArray(): Promise<Uint8Array>;
}

async function main() {
  banner(STAGE);
  if (!isObjectStorageConfigured()) {
    throw new Error("Target object storage (S3_*/Tigris) is not configured in backend/.env.");
  }
  const { client, bucket } = sourceClient();
  const c = new Counter();

  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    token = page.IsTruncated ? page.NextContinuationToken : undefined;

    for (const obj of page.Contents ?? []) {
      const key = obj.Key;
      if (!key) continue;
      c.bump("listed");

      // Idempotency: skip if target already has it at the same size.
      const existing = await headObject(key);
      if (existing && existing.contentLength === (obj.Size ?? -1)) {
        c.bump("skipped-present");
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [dry] would copy ${key} (${obj.Size ?? "?"} bytes)`);
        c.bump("would-copy");
        continue;
      }

      const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = got.Body as unknown as Streamable | undefined;
      if (!body) {
        console.warn(`  ! no body for ${key} — skipped`);
        c.bump("no-body");
        continue;
      }
      const buf = Buffer.from(await body.transformToByteArray());
      await putObject(key, buf, got.ContentType ?? "application/octet-stream");
      c.bump("copied");
      if (c.get("copied") % 50 === 0) console.log(`  copied ${c.get("copied")} …`);
    }
  } while (token);

  console.log(`\n${STAGE} done: ${c.summary()}`);
}

main().catch((err) => {
  console.error(`${STAGE} failed:`, err);
  process.exit(1);
});
