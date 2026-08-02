import path from "node:path";

/** Shared by auth.setup.ts (writer) and any role-authenticated spec (reader) —
 * kept out of both test files since Playwright forbids importing one test
 * file from another. */
export function storageStatePath(role: string): string {
  return path.join(__dirname, "../.storage", `${role}.json`);
}
