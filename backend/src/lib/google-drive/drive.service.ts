import { env } from "../../config/env.js";

/**
 * Minimal Google Drive v3 client.
 *
 * Deliberately hand-rolled over `fetch` rather than pulling in `googleapis`:
 * the archive needs three calls (token, files.list, files.create) and the
 * official SDK is a large transitive dependency for them. Same shape as
 * lib/google-meet/google-meet.service.ts.
 *
 * AUTH — an OAuth refresh token belonging to a real Google account, NOT a
 * service account: the organisation enforces
 * `iam.disableServiceAccountKeyCreation`, so no service-account key can be
 * minted at all. Its own token (GOOGLE_DRIVE_REFRESH_TOKEN), not the
 * Meet/Calendar one, so re-consenting Drive can never invalidate a booking's
 * Meet link — same separation GOOGLE_SEO_REFRESH_TOKEN already uses. The client
 * id/secret fall back to GOOGLE_OAUTH_* when no Drive-specific pair is set.
 *
 * Uploads consume the storage quota of THAT account, so the "Invoice" root
 * should live on a Shared Drive (owned by the org, survives the account being
 * closed) — but unlike a service account, a My Drive folder also works. Every
 * call carries `supportsAllDrives` / `includeItemsFromAllDrives`; without them
 * the API behaves as if shared-drive files do not exist.
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const METADATA_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;

/** OAuth client for the Drive archive, falling back to the shared GOOGLE_OAUTH_* pair. */
export function driveOAuthClient(): { clientId?: string; clientSecret?: string } {
  return {
    clientId: (env.GOOGLE_DRIVE_CLIENT_ID ?? env.GOOGLE_OAUTH_CLIENT_ID)?.trim(),
    clientSecret: (env.GOOGLE_DRIVE_CLIENT_SECRET ?? env.GOOGLE_OAUTH_CLIENT_SECRET)?.trim(),
  };
}

export function isGoogleDriveConfigured(): boolean {
  const { clientId, clientSecret } = driveOAuthClient();
  return Boolean(
    clientId &&
      clientSecret &&
      env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim() &&
      env.GOOGLE_DRIVE_INVOICE_ROOT_FOLDER_ID?.trim(),
  );
}

let cachedToken: { value: string; expiresAtMs: number } | null = null;
let inFlightToken: Promise<string> | null = null;

async function requestAccessToken(): Promise<string> {
  const { clientId, clientSecret } = driveOAuthClient();
  const refreshToken = env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Drive OAuth is not configured — need GOOGLE_DRIVE_REFRESH_TOKEN plus a client id/secret",
    );
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(
      `Drive OAuth failed: ${data.error_description || data.error || `HTTP ${response.status}`}`,
    );
  }
  // 60s of slack so a token cannot expire mid-upload.
  cachedToken = {
    value: data.access_token,
    expiresAtMs: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.value;
}

/** Cached Drive access token. Concurrent callers share one mint. */
export async function getDriveAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now()) return cachedToken.value;
  if (!inFlightToken) {
    inFlightToken = requestAccessToken().finally(() => {
      inFlightToken = null;
    });
  }
  return inFlightToken;
}

/** Drive's query language is single-quoted; escape the two characters that break out of it. */
function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

type DriveFile = { id: string; name: string; createdTime?: string };

async function driveList(token: string, q: string): Promise<DriveFile[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "files(id,name,createdTime)");
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
  });
  const data = (await response.json()) as { files?: DriveFile[]; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(`Drive list failed: ${data.error?.message ?? `HTTP ${response.status}`}`);
  }
  return data.files ?? [];
}

/**
 * Deterministic winner when two workers raced and created the same folder
 * twice: oldest wins, id breaks the tie. Every worker picks the same one, so a
 * duplicate is left empty instead of splitting a month's documents across two.
 */
export function canonicalFolder(files: DriveFile[]): DriveFile {
  return [...files].sort((a, b) => {
    const byTime = (a.createdTime ?? "").localeCompare(b.createdTime ?? "");
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  })[0]!;
}

/** In-process folder-id cache, keyed `<parentId>/<name>`. Folders are never renamed. */
const folderIdCache = new Map<string, Promise<string>>();

async function createFolder(token: string, name: string, parentId: string): Promise<void> {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
      signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(
      `Drive folder create failed: ${data.error?.message ?? `HTTP ${response.status}`}`,
    );
  }
}

async function resolveFolder(name: string, parentId: string): Promise<string> {
  const token = await getDriveAccessToken();
  const q =
    `name = '${escapeQueryValue(name)}' and mimeType = '${FOLDER_MIME}' ` +
    `and '${escapeQueryValue(parentId)}' in parents and trashed = false`;

  const existing = await driveList(token, q);
  if (existing.length > 0) return canonicalFolder(existing).id;

  await createFolder(token, name, parentId);

  // Re-list instead of trusting the create response: another worker may have
  // created the same folder in the same instant, and both must then converge on
  // the same id rather than each keeping its own.
  const afterCreate = await driveList(token, q);
  if (afterCreate.length === 0) {
    throw new Error(`Drive folder '${name}' was created but is not listable under ${parentId}`);
  }
  return canonicalFolder(afterCreate).id;
}

/** Folder id for `name` under `parentId`, creating it if absent. Idempotent. */
export async function ensureFolder(name: string, parentId: string): Promise<string> {
  const key = `${parentId}/${name}`;
  const cached = folderIdCache.get(key);
  if (cached) return cached;

  const pending = resolveFolder(name, parentId).catch((err: unknown) => {
    // A failed lookup must not stay cached — the next payment should retry it.
    folderIdCache.delete(key);
    throw err;
  });
  folderIdCache.set(key, pending);
  return pending;
}

/** Walk (creating as needed) a folder chain under `rootId`; returns the leaf id. */
export async function ensureFolderPath(segments: string[], rootId: string): Promise<string> {
  let parentId = rootId;
  for (const segment of segments) {
    parentId = await ensureFolder(segment, parentId);
  }
  return parentId;
}

export async function findFileInFolder(name: string, parentId: string): Promise<DriveFile | null> {
  const token = await getDriveAccessToken();
  const files = await driveList(
    token,
    `name = '${escapeQueryValue(name)}' and '${escapeQueryValue(parentId)}' in parents ` +
      `and trashed = false`,
  );
  return files[0] ?? null;
}

/**
 * Multipart upload of a single file. Fiscal PDFs are small (tens of KB), so the
 * one-request form is right here — no resumable session needed.
 */
export async function uploadFile(opts: {
  name: string;
  parentId: string;
  body: Buffer;
  mimeType: string;
}): Promise<string> {
  const token = await getDriveAccessToken();
  const boundary = `ghw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({ name: opts.name, parents: [opts.parentId] });

  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`,
    ),
    opts.body,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files" +
      "?uploadType=multipart&supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: payload,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    },
  );
  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!response.ok || !data.id) {
    throw new Error(`Drive upload failed: ${data.error?.message ?? `HTTP ${response.status}`}`);
  }
  return data.id;
}

/**
 * Upload only when nothing of that name is already in the folder. A fiscal
 * document is immutable, so a re-run (webhook retry, admin resend, a second
 * backfill pass) must never leave two copies of one document number in the
 * accountant's folder.
 */
export async function uploadFileIfAbsent(opts: {
  name: string;
  parentId: string;
  body: Buffer;
  mimeType: string;
}): Promise<{ fileId: string; created: boolean }> {
  const existing = await findFileInFolder(opts.name, opts.parentId);
  if (existing) return { fileId: existing.id, created: false };
  return { fileId: await uploadFile(opts), created: true };
}

/** Test seam — drops the token + folder caches. */
export function resetDriveCachesForTest(): void {
  cachedToken = null;
  inFlightToken = null;
  folderIdCache.clear();
}
