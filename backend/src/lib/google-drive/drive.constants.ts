/**
 * Drive constants with NO dependency on config/env.ts.
 *
 * Kept separate so the one-off token-minting script can share the exact scope
 * the runtime asks for without dragging in whole-file env validation — that
 * validation fails on any unrelated blank variable, and a script whose only job
 * is to produce a credential must not need a fully configured environment.
 */

/** Full Drive scope. `drive.file` would only see files this client itself
 *  created, which cannot find an "Invoice" root folder made by hand. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
