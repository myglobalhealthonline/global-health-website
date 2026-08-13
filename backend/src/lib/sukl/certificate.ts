import { readFileSync } from "node:fs";

import { env } from "../../config/env.js";
import { isSuklConfigured, suklMissingConfig } from "./config.js";
import { SuklError, SuklNotConfiguredError } from "./errors.js";
import type { SuklCertificateSource } from "./certificate.types.js";

/**
 * Loads the SÚKL workplace communication certificate (PKCS#12) into memory.
 *
 * Two sources, checked in this order:
 *
 *   SUKL_TEST_PFX_BASE64 — Railway. Decoded straight into a Buffer; the bytes
 *                          never touch the filesystem.
 *   SUKL_TEST_PFX_PATH   — local development. Read from an absolute path that
 *                          lives OUTSIDE the repository.
 *
 * BASE64 wins when both are present, so a Railway service cannot fall through
 * to a stale path baked into an image.
 *
 * The blob is cached for the process lifetime — it is read on every outbound
 * call and re-reading a file per request would be pointless I/O. Rotation means
 * a redeploy, which is the intended operational model (see the rotation runbook
 * in docs/sukl/TESTING_RUNBOOK.md); `resetSuklCertificateCache()` exists for
 * tests, mirroring `resetWeblimsTokenCache()`.
 *
 * The env-reading and the actual work are separated on purpose: `config/env.ts`
 * exports a FROZEN snapshot parsed once at module load, so a test cannot steer
 * this by mutating `process.env`. `readSuklPfx` takes its inputs explicitly and
 * is therefore fully testable; `loadSuklPfx` is the thin env-driven wrapper.
 *
 * NOTHING in this file may log, return or embed in an error message: the PFX
 * bytes, the private key, the password, or the resolved filesystem path.
 */

let cached: { pfx: Buffer; source: SuklCertificateSource } | null = null;

export function resetSuklCertificateCache(): void {
  cached = null;
}

export interface LoadedSuklPfx {
  pfx: Buffer;
  passphrase: string;
  source: SuklCertificateSource;
}

export interface SuklPfxSource {
  base64?: string;
  path?: string;
}

/**
 * Resolves a certificate source to bytes. Pure with respect to the environment.
 *
 * Throws `SUKL_NOT_CONFIGURED` when neither input is usable and
 * `SUKL_CERTIFICATE_INVALID` when the one supplied cannot be turned into a
 * plausible PKCS#12 blob.
 */
export function readSuklPfx(source: SuklPfxSource): {
  pfx: Buffer;
  source: SuklCertificateSource;
} {
  const base64 = source.base64?.trim();
  if (base64) {
    const pfx = Buffer.from(base64, "base64");
    // Buffer.from silently drops invalid base64 rather than throwing, so a
    // truncated or whitespace-mangled Railway variable would otherwise surface
    // much later as an opaque TLS error. A real PKCS#12 is never this small.
    if (pfx.byteLength < 64) {
      throw new SuklError(
        "SUKL_CERTIFICATE_INVALID",
        "certificate",
        "SUKL_TEST_PFX_BASE64 did not decode to a plausible PKCS#12 blob — re-encode " +
          "the .pfx with `base64 -w0` and paste it as a single line.",
      );
    }
    return { pfx, source: "base64" };
  }

  const path = source.path?.trim();
  if (!path) {
    throw new SuklNotConfiguredError(
      "No certificate source — set SUKL_TEST_PFX_BASE64 or SUKL_TEST_PFX_PATH.",
    );
  }

  let pfx: Buffer;
  try {
    pfx = readFileSync(path);
  } catch (cause) {
    // The path itself is withheld: on a misconfigured box it is the one hint
    // that would help someone locate the private key on disk.
    throw new SuklError(
      "SUKL_CERTIFICATE_INVALID",
      "certificate",
      "SUKL_TEST_PFX_PATH could not be read — check the path exists and the backend " +
        "process can read it.",
      { cause },
    );
  }
  if (pfx.byteLength === 0) {
    throw new SuklError(
      "SUKL_CERTIFICATE_INVALID",
      "certificate",
      "The file at SUKL_TEST_PFX_PATH is empty.",
    );
  }
  return { pfx, source: "path" };
}

export function loadSuklPfx(): LoadedSuklPfx {
  if (!isSuklConfigured()) {
    throw new SuklNotConfiguredError(
      `SÚKL is not configured — missing: ${suklMissingConfig().join(", ")}`,
    );
  }

  // Non-null: isSuklConfigured() already proved the password is present.
  const passphrase = env.SUKL_TEST_PFX_PASSWORD!.trim();

  if (cached) return { ...cached, passphrase };

  cached = readSuklPfx({
    base64: env.SUKL_TEST_PFX_BASE64,
    path: env.SUKL_TEST_PFX_PATH,
  });
  return { ...cached, passphrase };
}
