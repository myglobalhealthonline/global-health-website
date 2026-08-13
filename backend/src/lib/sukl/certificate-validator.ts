import tls from "node:tls";
import type { AddressInfo } from "node:net";

import { loadSuklPfx } from "./certificate.js";
import { SuklError } from "./errors.js";
import type { SuklCertificateInfo } from "./certificate.types.js";

/**
 * Validates the SÚKL PKCS#12 and extracts its metadata.
 *
 * Node exposes no PKCS#12 parser, so subject / issuer / validity / fingerprint
 * cannot be read off a .pfx directly. Rather than add `node-forge` or shell out
 * to `openssl` (unavailable on some images, and writing the private key to a
 * temp file just to read a date is a needless secret-on-disk), we perform a TLS
 * handshake against ourselves:
 *
 *   1. Start a TLS server on 127.0.0.1:0 using the PFX as its identity.
 *   2. Connect to it over loopback with `rejectUnauthorized: false`.
 *   3. Read `socket.getPeerCertificate()` — that IS our certificate.
 *
 * One act proves four things at once: the blob parses as PKCS#12, the password
 * is correct, a usable private key is present (a TLS server cannot start
 * without one), and the certificate/key pair actually agree. No network egress,
 * no temporary file, no new dependency.
 *
 * Failures are categorised, never rethrown raw — an OpenSSL message can echo
 * parts of the input, and this function is called from an HTTP route.
 */

/** Upper bound on the loopback handshake. Generous; it is a local socket. */
const LOOPBACK_TIMEOUT_MS = 5_000;

/** Warn horizon, per the rotation policy in docs/sukl/TESTING_RUNBOOK.md. */
export const SUKL_EXPIRY_WARN_DAYS = [60, 30, 14, 7] as const;

let cachedInfo: SuklCertificateInfo | null = null;

export function resetSuklCertificateInfoCache(): void {
  cachedInfo = null;
}

/** `{ CN: "x", O: "y" }` → `"CN=x, O=y"`. Arrays (repeated RDNs) are joined. */
function formatName(name: tls.PeerCertificate["subject"] | undefined): string {
  if (!name) return "";
  return Object.entries(name)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("+") : String(v)}`)
    .join(", ");
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Turns an OpenSSL open failure into a message that names the actual fix.
 *
 * The legacy case is worth separating: PKCS#12 files exported by Windows
 * certificate tooling and by Java `keytool` are often encrypted with RC2, which
 * OpenSSL 3 moved into the legacy provider that Node does not load. Such a file
 * is perfectly valid and the password is perfectly correct, but the generic
 * "wrong password or corrupt" message would send an operator hunting for a
 * problem that is not there. The fix is a re-export, and the message says so.
 *
 * The OpenSSL error message itself is never echoed — it can quote parts of the
 * input, and this text reaches an HTTP response.
 */
function describeOpenFailure(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);
  if (/unsupported/i.test(raw)) {
    // Confirmed with the real SÚKL test certificate on 2026-08-04: they export
    // with legacy RC2. The password and the certificate are fine; only the
    // container encryption is unreadable here.
    return (
      "The PKCS#12 file uses an encryption algorithm this runtime cannot read — legacy RC2, " +
      "which OpenSSL 3 moved into a provider Node does not load. SÚKL's own exports are like " +
      "this. Re-export it with modern encryption, keeping the same password, via a temporary " +
      "PEM in a restricted directory:\n" +
      "  openssl pkcs12 -in old.pfx -legacy -nodes -out tmp.pem\n" +
      "  openssl pkcs12 -export -in tmp.pem -out new.pfx\n" +
      "  shred -u tmp.pem\n" +
      "The `-nodes` belongs ONLY to the first command — it decrypts the key into the temporary " +
      "PEM. Never pass it to the export, or the private key is stored unencrypted in new.pfx. " +
      "See docs/sukl/TESTING_RUNBOOK.md."
    );
  }
  return (
    "The certificate could not be opened — either SUKL_TEST_PFX_PASSWORD is wrong or the " +
    "PKCS#12 file is corrupt. (OpenSSL reports both as the same failure.)"
  );
}

/**
 * Reads the certificate the PFX contains, by presenting it to ourselves.
 * Resolves with the raw peer certificate or rejects with a categorised error.
 */
async function readCertificateViaLoopback(
  pfx: Buffer,
  passphrase: string,
): Promise<tls.PeerCertificate> {
  // Build the secure context first and on its own: this is the step that fails
  // on a wrong password ("mac verify failure") or a corrupt blob, and doing it
  // separately keeps that diagnosis away from socket-level noise.
  try {
    tls.createSecureContext({ pfx, passphrase });
  } catch (cause) {
    throw new SuklError("SUKL_CERTIFICATE_INVALID", "certificate", describeOpenFailure(cause), {
      cause,
    });
  }

  const server = tls.createServer({ pfx, passphrase, requestCert: false });

  const close = () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const port = (server.address() as AddressInfo).port;

    const cert = await new Promise<tls.PeerCertificate>((resolve, reject) => {
      const socket = tls.connect(
        {
          port,
          host: "127.0.0.1",
          // Self-signed by definition — we are inspecting it, not trusting it.
          // This is a loopback socket to our own process, NOT a SÚKL call;
          // the real transport never disables verification.
          rejectUnauthorized: false,
          servername: "localhost",
        },
        () => {
          const peer = socket.getPeerCertificate();
          socket.destroy();
          if (!peer || Object.keys(peer).length === 0) {
            reject(
              new SuklError(
                "SUKL_CERTIFICATE_INVALID",
                "certificate",
                "The PKCS#12 opened but produced no certificate.",
              ),
            );
            return;
          }
          resolve(peer);
        },
      );
      socket.setTimeout(LOOPBACK_TIMEOUT_MS, () => {
        socket.destroy();
        reject(
          new SuklError(
            "SUKL_CERTIFICATE_INVALID",
            "certificate",
            "Timed out inspecting the certificate locally.",
          ),
        );
      });
      socket.once("error", (cause) => {
        reject(
          new SuklError(
            "SUKL_CERTIFICATE_INVALID",
            "certificate",
            "The certificate opened but could not be used for a TLS handshake — the " +
              "PKCS#12 most likely contains no private key, so it cannot authenticate to SÚKL.",
            { cause },
          ),
        );
      });
    });

    return cert;
  } finally {
    await close();
  }
}

/**
 * Validates an explicit PKCS#12 and returns its metadata. Pure with respect to
 * the environment, so it is directly testable — `config/env.ts` exports a frozen
 * snapshot that a test cannot steer by mutating `process.env`.
 *
 * Throws `SUKL_CERTIFICATE_INVALID` when the blob, password or key is unusable
 * and `SUKL_CERTIFICATE_EXPIRED` when it parsed but is past `notAfter`.
 */
export async function inspectPkcs12(input: {
  pfx: Buffer;
  passphrase: string;
  source: SuklCertificateInfo["source"];
  now?: Date;
}): Promise<SuklCertificateInfo> {
  const now = input.now ?? new Date();
  const peer = await readCertificateViaLoopback(input.pfx, input.passphrase);
  const source = input.source;

  const validFrom = new Date(peer.valid_from);
  const validTo = new Date(peer.valid_to);
  if (Number.isNaN(validTo.getTime())) {
    throw new SuklError(
      "SUKL_CERTIFICATE_INVALID",
      "certificate",
      "The certificate has an unreadable validity period.",
    );
  }

  const info: SuklCertificateInfo = {
    source,
    subject: formatName(peer.subject),
    issuer: formatName(peer.issuer),
    serialNumber: peer.serialNumber ?? "",
    validFrom,
    validTo,
    fingerprint256: peer.fingerprint256 ?? "",
    daysUntilExpiry: daysBetween(now, validTo),
    expired: validTo.getTime() <= now.getTime(),
    // Proven by the handshake having completed at all.
    hasPrivateKey: true,
  };

  if (info.expired) {
    throw new SuklError(
      "SUKL_CERTIFICATE_EXPIRED",
      "certificate",
      `The SÚKL certificate expired on ${validTo.toISOString()} — request a replacement ` +
        "through the SÚKL test-access portal.",
    );
  }

  return info;
}

/**
 * Validates the configured certificate. Cached per process: it cannot change
 * without a redeploy, and the admin console polls this on every page load.
 *
 * Throws `SUKL_NOT_CONFIGURED` when the gate is unsatisfied, plus whatever
 * `inspectPkcs12` raises.
 */
export async function inspectSuklCertificate(
  options?: { force?: boolean; now?: Date },
): Promise<SuklCertificateInfo> {
  const now = options?.now ?? new Date();
  if (cachedInfo && !options?.force) {
    // Recompute the clock-dependent fields so a cached result cannot report a
    // stale "42 days left" after the process has been up for a month.
    return {
      ...cachedInfo,
      daysUntilExpiry: daysBetween(now, cachedInfo.validTo),
      expired: cachedInfo.validTo.getTime() <= now.getTime(),
    };
  }

  const { pfx, passphrase, source } = loadSuklPfx();
  const info = await inspectPkcs12({ pfx, passphrase, source, now });
  // Only a VALID certificate is cached — inspectPkcs12 throws on an expired one,
  // and caching that would make the expiry error survive a rotation.
  cachedInfo = info;
  return info;
}

/**
 * The tightest warn threshold the certificate has crossed, or null when it is
 * still further out than 60 days. 8 days left → 14; 5 days left → 7; already
 * expired → 7 (the caller alerts on expiry separately, at higher severity).
 */
export function expiryWarnThreshold(daysUntilExpiry: number): number | null {
  const ascending = [...SUKL_EXPIRY_WARN_DAYS].sort((a, b) => a - b);
  for (const threshold of ascending) {
    if (daysUntilExpiry <= threshold) return threshold;
  }
  return null;
}
