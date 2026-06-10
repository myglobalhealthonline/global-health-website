import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * RFC 6238 TOTP — implemented with node:crypto only (no npm packages).
 *
 * Compatible with Google Authenticator, Authy, 1Password, Bitwarden, etc.
 * Uses SHA-1 HMAC, 6-digit codes, 30-second time step — all standard defaults.
 *
 * Base32 alphabet (RFC 4648):
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// ---------------------------------------------------------------------------
// Base32 helpers
// ---------------------------------------------------------------------------

/** Encode a Buffer to a base32 string (no padding). */
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

/** Decode a base32 string to a Buffer. Throws on invalid characters. */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ---------------------------------------------------------------------------
// TOTP core
// ---------------------------------------------------------------------------

/**
 * Compute a single TOTP value for a given time counter T.
 * T = floor(unix_seconds / 30)
 */
function computeTotp(secretBytes: Buffer, T: number, digits = 6): string {
  // T as 8-byte big-endian buffer
  const counter = Buffer.alloc(8);
  // JS bitwise ops are 32-bit; handle 64-bit T by splitting hi/lo.
  const hi = Math.floor(T / 0x100000000);
  const lo = T >>> 0;
  counter.writeUInt32BE(hi, 0);
  counter.writeUInt32BE(lo, 4);

  const hmac = createHmac("sha1", secretBytes).update(counter).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a new TOTP secret: 20 random bytes, base32-encoded.
 * Standard authenticator apps expect 16–32 base32 chars; 20 bytes → 32 chars.
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Build an otpauth:// URI for use in QR codes.
 * Issuer defaults to "MyGlobalHealth".
 */
export function generateTotpUri(
  secret: string,
  email: string,
  issuer = "MyGlobalHealth",
): string {
  const enc = encodeURIComponent;
  return (
    `otpauth://totp/${enc(issuer)}:${enc(email)}` +
    `?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}

/**
 * Verify a 6-digit TOTP token.
 * Accepts current window T, plus T-1 and T+1 to tolerate clock skew.
 * Uses timing-safe comparison to prevent oracle attacks.
 */
export function verifyTotp(secret: string, token: string): boolean {
  let secretBytes: Buffer;
  try {
    secretBytes = base32Decode(secret);
  } catch {
    return false;
  }

  const T = Math.floor(Date.now() / 1000 / 30);
  const candidate = token.trim().padStart(6, "0");

  for (const delta of [-1, 0, 1]) {
    const expected = computeTotp(secretBytes, T + delta);
    const aBuf = Buffer.from(expected, "utf8");
    const bBuf = Buffer.from(candidate, "utf8");
    if (aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

/** Characters used for backup codes — uppercase alphanumeric, no ambiguous chars (0/O, 1/I/L). */
const BACKUP_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generate `count` single-use 8-character backup codes.
 * These are displayed ONCE to the user. The caller MUST hash them via
 * hashBackupCode() before storing.
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8);
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += BACKUP_CODE_CHARS[bytes[j] % BACKUP_CODE_CHARS.length];
    }
    codes.push(code);
  }
  return codes;
}

/**
 * SHA-256 hash a backup code for safe storage.
 * Always normalizes: trim + uppercase before hashing.
 */
export function hashBackupCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return createHmac("sha256", "backup-code-hash")
    .update(normalized, "utf8")
    .digest("hex");
}

// Note: using HMAC rather than bare SHA-256 means the hash is domain-separated
// from other SHA-256 uses. The key "backup-code-hash" is a fixed domain label
// (not a secret); the security comes from the 8-char code's entropy.

/**
 * Verify a user-supplied backup code against the stored hashes.
 * Returns whether it matched and the remaining hashes (matched one removed).
 * Timing-safe: always checks all hashes.
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): { valid: boolean; remaining: string[] } {
  const candidate = hashBackupCode(code);
  const candidateBuf = Buffer.from(candidate, "hex");

  let matchIndex = -1;
  for (let i = 0; i < hashedCodes.length; i++) {
    const storedBuf = Buffer.from(hashedCodes[i], "hex");
    if (
      storedBuf.length === candidateBuf.length &&
      timingSafeEqual(storedBuf, candidateBuf)
    ) {
      matchIndex = i;
      // Do NOT break — iterate all to avoid early-exit timing leak.
    }
  }

  if (matchIndex === -1) {
    return { valid: false, remaining: hashedCodes };
  }

  const remaining = hashedCodes.filter((_, idx) => idx !== matchIndex);
  return { valid: true, remaining };
}
