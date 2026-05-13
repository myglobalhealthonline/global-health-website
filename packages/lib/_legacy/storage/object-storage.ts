import {
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "../config/env.js";

let client: S3Client | null = null;

export class MediaObjectNotFoundError extends Error {
  constructor(readonly key: string) {
    super(`Media object not found: ${key}`);
    this.name = "MediaObjectNotFoundError";
  }
}

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    env.S3_BUCKET &&
      env.S3_ENDPOINT &&
      env.S3_REGION &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}

function isDevLocalMediaEnabled(): boolean {
  return env.NODE_ENV !== "production" || Boolean(env.LOCAL_MEDIA_ROOT?.trim());
}

function localMediaRootResolved(): string {
  const rel = env.LOCAL_MEDIA_ROOT?.trim() || ".data/local-media";
  return path.resolve(process.cwd(), rel);
}

function safeLocalFilePath(key: string): string {
  const root = localMediaRootResolved();
  const full = path.resolve(root, key);
  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid media key path");
  }
  return full;
}

function contentTypeForKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

/** S3 (production/staging) or local disk (development when S3 unset). */
export function isMediaStorageConfigured(): boolean {
  return isObjectStorageConfigured() || isDevLocalMediaEnabled();
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
  if (isObjectStorageConfigured()) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }

  if (isDevLocalMediaEnabled()) {
    const full = safeLocalFilePath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return;
  }

  throw new Error("Object storage is not configured");
}

export async function getObject(key: string): Promise<GetObjectCommandOutput> {
  if (isObjectStorageConfigured()) {
    return getClient().send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
      }),
    );
  }

  if (isDevLocalMediaEnabled()) {
    const full = safeLocalFilePath(key);
    try {
      await access(full);
    } catch {
      throw new MediaObjectNotFoundError(key);
    }
    return {
      Body: createReadStream(full),
      ContentType: contentTypeForKey(key),
    } as unknown as GetObjectCommandOutput;
  }

  throw new Error("Object storage is not configured");
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
