import { join } from "node:path";

/**
 * Side-effect module imported FIRST by the SÚKL tests.
 *
 * `config/env.ts` parses `process.env` once at module load and exports a frozen
 * snapshot, so these vars have to exist before anything pulls that module in.
 * Import order is the only lever available — mutating `process.env` from inside a
 * test is too late. Mirrors lib/weblims/client.test-env.ts.
 *
 * The service URLs are deliberately left unset: the tests that need an endpoint
 * stand up a local TLS server on an ephemeral port and inject its URL themselves,
 * and leaving them unset here is also what lets the "service-not-configured"
 * paths be asserted.
 */
// `__dirname` is the CJS global — this package compiles to CJS (module=NodeNext,
// no "type":"module"), same reasoning as the autoload path in app.ts.
export const FIXTURE_DIR = join(__dirname, "__fixtures__");
export const FIXTURE_PASSWORD = "fixture-password";
export const VALID_PFX = join(FIXTURE_DIR, "self-signed-test.p12");
export const EXPIRED_PFX = join(FIXTURE_DIR, "expired-test.p12");
/** Certificate half of VALID_PFX, in PEM. Public material; used as a trust
 *  anchor by transport.test.ts so both ends of the local mTLS handshake can
 *  verify each other with `rejectUnauthorized` left on. */
export const FIXTURE_CA_PEM = join(FIXTURE_DIR, "self-signed-test.crt");

process.env.SUKL_ENVIRONMENT = "test";
process.env.SUKL_TEST_PFX_PATH = VALID_PFX;
process.env.SUKL_TEST_PFX_PASSWORD = FIXTURE_PASSWORD;
process.env.SUKL_TEST_WORKPLACE_CODE = "00150928369";
process.env.SUKL_TEST_ENTITY_ICO = "19071680";
process.env.SUKL_REQUEST_TIMEOUT_MS = "5000";

// Explicitly CLEARED, not merely left alone. `test-guard.ts` loads the
// developer's real `.env`, which now carries the live SÚKL service hosts — so
// without this the suite would silently inherit them, and a test asserting the
// "service not configured" path would pass or fail depending on whose machine
// it ran on. Tests must not depend on local .env contents.
//
// It also removes any chance of the suite opening a socket to SÚKL.
delete process.env.SUKL_EPOUKAZ_CUEP_TEST_URL;
delete process.env.SUKL_EPOUKAZ_COMMON_TEST_URL;
// Certificate source too: the fixture path above must win over a real cert.
delete process.env.SUKL_TEST_PFX_BASE64;
