import { adminRequest } from "./core";

export type PatientDuplicateCandidate = {
  patientProfileId: string;
  globalHealthNumber: string | null;
  fullName: string | null;
  email: string;
  matchReasons: string[];
};

/**
 * Fold `duplicatePatientId` into `primaryPatientId`. Irreversible: the primary
 * survives with both records' appointments, orders, documents and notes; the
 * duplicate's User account is deactivated. `reason` is stored on the merge log
 * and the backend requires at least 10 characters.
 */
export const mergeAdminPatients = (body: {
  primaryPatientId: string;
  duplicatePatientId: string;
  reason: string;
}) =>
  adminRequest<{ merged: true }>("/api/admin/patient-merge", {
    method: "POST",
    body,
  });

export const fetchAdminPatientDuplicates = (patientProfileId: string) =>
  adminRequest<{ duplicates: PatientDuplicateCandidate[] }>(
    `/api/admin/patient-merge/duplicates/${encodeURIComponent(patientProfileId)}`,
  );
