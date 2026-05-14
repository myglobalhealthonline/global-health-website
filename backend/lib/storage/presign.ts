import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type S3Env = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBase: string;
};

function readEnv(): S3Env {
  const endpoint = process.env.RAILWAY_S3_ENDPOINT;
  const bucket = process.env.RAILWAY_S3_BUCKET;
  const accessKeyId = process.env.RAILWAY_S3_ACCESS_KEY;
  const secretAccessKey = process.env.RAILWAY_S3_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Railway S3 env vars are not configured");
  }
  return {
    endpoint,
    region: process.env.RAILWAY_S3_REGION ?? "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBase: (process.env.RAILWAY_S3_PUBLIC_URL ?? `${endpoint}/${bucket}`).replace(/\/+$/, ""),
  };
}

export type PresignKind = "doctor" | "service" | "country" | "category";

export async function createPresignedPut(input: {
  kind: PresignKind;
  filename: string;
  contentType: string;
  size: number;
  expiresIn?: number;
}) {
  const env = readEnv();
  const client = new S3Client({
    endpoint: env.endpoint,
    region: env.region,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    forcePathStyle: true,
  });
  const ext = input.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = `${input.kind}s/${randomUUID()}.${ext}`;
  const cmd = new PutObjectCommand({
    Bucket: env.bucket,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.size,
  });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: input.expiresIn ?? 300 });
  return {
    uploadUrl,
    publicUrl: `${env.publicBase}/${key}`,
    key,
  };
}
