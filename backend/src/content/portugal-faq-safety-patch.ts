import {
  portugalFaqSafetyPatchToken,
  type PortugalSafetyPatch,
} from "./portugal-faq-safety-patches.js";
import { portugalDatabaseIdentity } from "./portugal-seo-metadata-patch.js";

export function assertPortugalFaqSafetyApplyAuthorized(options: Readonly<{
  apply: boolean;
  patch: PortugalSafetyPatch;
  currentSourceSha256: string;
  sourceSha256: string | null;
  confirmation: string | null;
  databaseUrl: string | undefined;
  confirmationDatabase: string | null;
}>): void {
  if (!options.apply) return;
  if (options.sourceSha256 !== options.currentSourceSha256) {
    throw new Error("Portugal FAQ source SHA-256 does not match the current record");
  }
  if (options.confirmation !== portugalFaqSafetyPatchToken(options.patch)) {
    throw new Error("Portugal FAQ confirmation token does not match the selected safety patch");
  }

  let databaseIdentity: string;
  try {
    databaseIdentity = portugalDatabaseIdentity(options.databaseUrl ?? "");
  } catch {
    throw new Error("DATABASE_URL must contain a valid PostgreSQL database identity");
  }
  if (options.confirmationDatabase !== databaseIdentity) {
    throw new Error("Confirmed database identity does not match DATABASE_URL");
  }
}
