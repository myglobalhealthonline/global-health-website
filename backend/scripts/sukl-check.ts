import "dotenv/config";

import {
  fingerprintSuffix,
  inspectSuklCertificate,
  isAnySuklServiceConfigured,
  isSuklConfigured,
  isSuklServiceConfigured,
  isSuklError,
  suklHandshakeProbe,
  suklIco,
  suklMissingConfig,
  suklServiceUrl,
  suklWorkplaceCode,
  SUKL_SERVICES,
  SUKL_SERVICE_ENV_VARS,
  SUKL_SERVICE_LABELS,
} from "../src/lib/sukl/index.js";

/**
 * One-off SÚKL preflight, for a human at a terminal:
 *
 *   node --import tsx scripts/sukl-check.ts
 *
 * Same two stages as the admin console's Test connection button, minus the auth,
 * the database and the audit row — useful before the app is even running, and the
 * fastest way to find out whether a freshly issued certificate is usable.
 *
 * Prints certificate PUBLIC metadata only: subject, issuer, validity, and the
 * last 8 characters of the fingerprint. Never the password, the private key, or
 * the certificate path.
 */

function line(label: string, value: unknown) {
  console.log(`  ${label.padEnd(22)} ${String(value)}`);
}

async function main() {
  console.log("\nSÚKL preflight\n" + "─".repeat(60));

  if (!isSuklConfigured()) {
    console.log("\n  NOT CONFIGURED — missing:");
    for (const m of suklMissingConfig()) console.log(`    - ${m}`);
    console.log("\n  Fill these in backend/.env, then re-run.\n");
    process.exitCode = 1;
    return;
  }

  line("Environment", process.env.SUKL_ENVIRONMENT);
  line("Workplace code", suklWorkplaceCode());
  line("IČO", suklIco());

  // ─── Stage 1: certificate ──────────────────────────────────────────────────
  console.log("\n  Stage 1 — certificate");
  let ok = false;
  try {
    const cert = await inspectSuklCertificate({ force: true });
    ok = true;
    line("Source", cert.source === "base64" ? "SUKL_TEST_PFX_BASE64" : "SUKL_TEST_PFX_PATH");
    line("Subject", cert.subject);
    line("Issuer", cert.issuer);
    line("Serial", cert.serialNumber);
    line("Valid from", cert.validFrom.toISOString());
    line("Valid to", cert.validTo.toISOString());
    line("Days remaining", cert.daysUntilExpiry);
    line("Private key", cert.hasPrivateKey ? "present" : "MISSING");
    line("Fingerprint", `…${fingerprintSuffix(cert.fingerprint256)}`);
    console.log("\n  ✓ Parses, password correct, private key present, dates and issuer read.");
    console.log("    Subject O/OU are SÚKL's own certificate identifiers; they are NOT");
    console.log("    compared against the workplace code (semantics unconfirmed).");
  } catch (error) {
    const code = isSuklError(error) ? error.code : "UNKNOWN";
    console.log(`\n  ✗ ${code}`);
    console.log(`    ${isSuklError(error) ? error.safeMessage : String(error)}`);
    process.exitCode = 1;
    return;
  }

  // ─── Stage 2: mutual TLS, per service ──────────────────────────────────────
  console.log("\n  Stage 2 — mutual TLS");
  if (!isAnySuklServiceConfigured()) {
    console.log("    SKIPPED — no SÚKL service URL is set.");
    for (const s of SUKL_SERVICES) console.log(`      ${SUKL_SERVICE_ENV_VARS[s]}`);
    console.log("");
    return;
  }

  let anyFailed = false;
  for (const service of SUKL_SERVICES) {
    const label = SUKL_SERVICE_LABELS[service];
    if (!isSuklServiceConfigured(service)) {
      console.log(`\n  – ${label}: not configured (${SUKL_SERVICE_ENV_VARS[service]})`);
      continue;
    }
    console.log(`\n  ${label}`);
    line("URL", suklServiceUrl(service));
    try {
      const probe = await suklHandshakeProbe(service);
      line("Handshake", `ok in ${probe.durationMs}ms`);
      line("Peer issuer", probe.peerIssuer || "(none reported)");
      console.log("    ✓ SÚKL accepted our client certificate.");
    } catch (error) {
      anyFailed = true;
      const code = isSuklError(error) ? error.code : "UNKNOWN";
      console.log(`    ✗ ${code}`);
      console.log(`      ${isSuklError(error) ? error.safeMessage : String(error)}`);
    }
  }

  console.log(
    "\n  A successful handshake proves the TLS channel ONLY. It does not prove that\n" +
      "  any ePoukaz operation is permitted, and no request has been sent — the\n" +
      "  operation paths must be read from the ePoukaz v19 WSDL soap:address values\n" +
      "  first. See docs/sukl/INTERFACE_INVENTORY.md.\n",
  );
  if (anyFailed) process.exitCode = 1;
  void ok;
}

void main();
