import { adminRequest } from "./core";

export type PatientDuplicateCandidate = {
  patientProfileId: string;
  globalHealthNumber: string | null;
  fullName: string | null;
  email: string;
  matchReasons: string[];
};

export const fetchAdminPatientDuplicates = (patientProfileId: string) =>
  adminRequest<{ duplicates: PatientDuplicateCandidate[] }>(
    `/api/admin/patient-merge/duplicates/${encodeURIComponent(patientProfileId)}`,
  );
