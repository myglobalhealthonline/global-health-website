import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * Credential handling for the partner booking API (`/api/partner/v1/*`).
 *
 * Key format: `ghp_live_<43-char base64url>` — 32 bytes of CSPRNG entropy.
 * We store only `sha256(fullKey)`. Because the secret is high-entropy (256
 * bits) rather than a user-chosen password, a plain SHA-256 is the right
 * primitive: there is nothing to brute-force, and a deterministic digest
 * lets authentication do ONE indexed lookup instead of loading every row
 * and comparing hashes one by one (which is what bcrypt would force, and
 * which degrades linearly as integrators are added).
 *
 * The plaintext is returned exactly once, from `mintPartnerApiKey`. It is
 * never logged and never recoverable — a lost key is re-minted, not read
 * back.
 */

const KEY_PREFIX = "ghp_live_";
/** Leading fragment kept in the clear so admins can identify a key in a list. */
const DISPLAY_PREFIX_CHARS = 8;

export type PartnerApiClientSummary = {
  id: string;
  name: string;
  keyPrefix: string;
  allowedCountryCodes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

/** The authenticated caller, as resolved from the `X-Api-Key` header. */
export type PartnerApiCaller = {
  clientId: string;
  name: string;
  /** Empty array = unrestricted (every active country). */
  allowedCountryCodes: string[];
};

export function hashPartnerApiKey(plaintextKey: string): string {
  return createHash("sha256").update(plaintextKey, "utf8").digest("hex");
}

function generatePartnerApiKey(): { key: string; prefix: string } {
  const secret = randomBytes(32).toString("base64url");
  return {
    key: `${KEY_PREFIX}${secret}`,
    prefix: `${KEY_PREFIX}${secret.slice(0, DISPLAY_PREFIX_CHARS)}`,
  };
}

/**
 * Create a client + its first key. The returned `key` is the ONLY time the
 * plaintext exists outside the caller's own storage — surface it to the
 * admin once and tell them to store it in their secret manager.
 */
export async function mintPartnerApiKey(input: {
  name: string;
  allowedCountryCodes: string[];
  createdByUserId: string | null;
}): Promise<{ client: PartnerApiClientSummary; key: string }> {
  const { key, prefix } = generatePartnerApiKey();
  try {
    const row = await prisma.partnerApiClient.create({
      data: {
        name: input.name.trim(),
        keyPrefix: prefix,
        keyHash: hashPartnerApiKey(key),
        allowedCountryCodes: input.allowedCountryCodes.map((c) =>
          c.trim().toLowerCase(),
        ),
        createdByUserId: input.createdByUserId,
      },
    });
    return { client: toSummary(row), key };
  } catch (error) {
    throw normalizeDbError(error, "Partner API clients are unavailable");
  }
}

export async function listPartnerApiClients(): Promise<PartnerApiClientSummary[]> {
  try {
    const rows = await prisma.partnerApiClient.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSummary);
  } catch (error) {
    throw normalizeDbError(error, "Partner API clients are unavailable");
  }
}

/**
 * Soft-revoke. We never delete: AuditLog rows reference the client id, and a
 * deleted row would turn "who made this booking?" into a dead end.
 */
export async function revokePartnerApiClient(
  id: string,
): Promise<PartnerApiClientSummary | null> {
  try {
    const existing = await prisma.partnerApiClient.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await prisma.partnerApiClient.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });
    return toSummary(row);
  } catch (error) {
    throw normalizeDbError(error, "Partner API clients are unavailable");
  }
}

/**
 * Resolve an `X-Api-Key` header to a caller. Returns null for any failure
 * mode — missing, malformed, unknown, or revoked — so the route can answer a
 * single undifferentiated 401 and avoid confirming which keys exist.
 *
 * `lastUsedAt` is refreshed fire-and-forget: it is observability for key
 * rotation, and must never add latency to, or fail, a booking request.
 */
export async function authenticatePartnerApiKey(
  headerValue: string | string[] | undefined,
): Promise<PartnerApiCaller | null> {
  if (typeof headerValue !== "string") return null;
  const provided = headerValue.trim();
  if (!provided.startsWith(KEY_PREFIX)) return null;

  const client = await prisma.partnerApiClient.findUnique({
    where: { keyHash: hashPartnerApiKey(provided) },
    select: {
      id: true,
      name: true,
      isActive: true,
      allowedCountryCodes: true,
    },
  });
  if (!client || !client.isActive) return null;

  void prisma.partnerApiClient
    .update({ where: { id: client.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    clientId: client.id,
    name: client.name,
    allowedCountryCodes: client.allowedCountryCodes,
  };
}

/** Empty scope list = unrestricted. Codes are stored + compared lowercase. */
export function callerMayAccessCountry(
  caller: PartnerApiCaller,
  countryCode: string,
): boolean {
  if (caller.allowedCountryCodes.length === 0) return true;
  return caller.allowedCountryCodes.includes(countryCode.trim().toLowerCase());
}

function toSummary(row: {
  id: string;
  name: string;
  keyPrefix: string;
  allowedCountryCodes: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): PartnerApiClientSummary {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    allowedCountryCodes: row.allowedCountryCodes,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
