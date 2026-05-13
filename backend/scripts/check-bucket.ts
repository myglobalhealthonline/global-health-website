/**
 * One-shot smoke test for the configured Railway/T3 bucket.
 * Run from repo root:
 *   pnpm --filter backend exec tsx --env-file=../frontend/.env.local scripts/check-bucket.ts
 *
 * Performs PUT → HEAD → GET → DELETE of a tiny test object and reports timings.
 */
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`✗ Missing env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const ENDPOINT = required("RAILWAY_S3_ENDPOINT");
const REGION = process.env.RAILWAY_S3_REGION?.trim() || "auto";
const BUCKET = required("RAILWAY_S3_BUCKET");
const ACCESS_KEY = required("RAILWAY_S3_ACCESS_KEY");
const SECRET_KEY = required("RAILWAY_S3_SECRET_KEY");

const client = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

const KEY = `_healthcheck/connectivity-${Date.now()}.txt`;
const PAYLOAD = `Global Health bucket check — ${new Date().toISOString()}\n`;

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  try {
    const result = await fn();
    console.log(`✓ ${label} (${Date.now() - t}ms)`);
    return result;
  } catch (err) {
    console.error(`✗ ${label} failed after ${Date.now() - t}ms`);
    throw err;
  }
}

async function main() {
  console.log(`→ Endpoint: ${ENDPOINT}`);
  console.log(`→ Bucket:   ${BUCKET}`);
  console.log(`→ Region:   ${REGION}`);
  console.log(`→ Key:      ${KEY}\n`);

  await timed("PUT object", () =>
    client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: KEY,
        Body: PAYLOAD,
        ContentType: "text/plain; charset=utf-8",
      }),
    ),
  );

  const head = await timed("HEAD object", () =>
    client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: KEY })),
  );
  console.log(
    `  size=${head.ContentLength} bytes  etag=${head.ETag}  type=${head.ContentType}`,
  );

  const got = await timed("GET object", () =>
    client.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY })),
  );
  const body = await got.Body?.transformToString("utf-8");
  const matches = body === PAYLOAD;
  console.log(`  body length=${body?.length ?? 0}  matches=${matches}`);

  await timed("DELETE object", () =>
    client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: KEY })),
  );

  if (!matches) {
    console.error("\n✗ Body mismatch — credentials work but payload did not round-trip");
    process.exit(2);
  }
  console.log("\n✓ Bucket connection works.");
}

main().catch((err) => {
  console.error("\n✗ Bucket check failed:");
  console.error(err?.name ? `  ${err.name}: ${err.message}` : err);
  if (err?.$metadata) {
    console.error(
      `  httpStatus=${err.$metadata.httpStatusCode}  requestId=${err.$metadata.requestId}`,
    );
  }
  process.exit(1);
});
