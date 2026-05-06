import {
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { env } from "../config/env.js";

let client: S3Client | null = null;

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    env.S3_BUCKET &&
      env.S3_ENDPOINT &&
      env.S3_REGION &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}

function getClient(): S3Client {
  if (!isObjectStorageConfigured()) {
    throw new Error("Object storage is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: env.S3_REGION!,
      endpoint: env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key: string): Promise<GetObjectCommandOutput> {
  return getClient().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
    }),
  );
}

export function streamToNodeReadable(body: GetObjectCommandOutput["Body"]): Readable | null {
  if (!body) return null;
  if (body instanceof Readable) return body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const web = body as any;
  if (typeof web.transformToWebStream === "function") {
    return Readable.fromWeb(web.transformToWebStream());
  }
  return null;
}
