/**
 * Side-effect module imported FIRST by client.test.ts.
 *
 * `config/env.ts` parses `process.env` once at module load and exports a frozen
 * snapshot, so the WebLIMS vars have to exist before anything pulls that module
 * in. Import order is the only lever available — mutating `process.env` from
 * inside a test is too late.
 */
process.env.WEBLIMS_BASE_URL = "https://weblims.example.cz";
process.env.WEBLIMS_CLIENT_ID = "WLClient1";
process.env.WEBLIMS_CLIENT_SECRET = "test-secret";
process.env.WEBLIMS_API_VERSION = "1.0";
