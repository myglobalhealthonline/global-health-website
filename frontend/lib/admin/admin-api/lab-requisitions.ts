import { adminRequest } from "./core";
import type { AdminPagination } from "./test-centers";

/**
 * Admin API for external-laboratory requisitions (Synlab CZ / WebLIMS 2).
 * Backend: `routes/admin-lab-requisitions.route.ts`.
 */

export type LabRequisitionStatus =
  | "PRESCRIBED"
  | "PATIENT_CONFIRMED"
  | "AWAITING_PAYMENT"
  | "READY_TO_SEND"
  | "SENT_TO_LAB"
  | "SAMPLE_COLLECTED"
  | "RESULT_RECEIVED"
  | "CLOSED"
  | "CANCELLED";

export type LabRequisitionItemDto = {
  id: string;
  examTypeId: string | null;
  label: string;
  /** Null until the confirmation call has happened. */
  patientAccepted: boolean | null;
  unitPriceCents: number | null;
  currencyCode: string | null;
};

export type LabRequisitionDto = {
  id: string;
  countryCode: string;
  provider: string;
  status: LabRequisitionStatus;
  priority: string;
  appointmentId: string | null;
  orderId: string | null;
  testCenterId: string | null;
  adminNotes: string | null;
  /** Plain-text method list read back from WebLIMS after the operator saved. */
  methodsText: string | null;
  methodsFetchedAt: string | null;
  externalRequisitionNo: string | null;
  collectionDate: string | null;
  handedOffAt: string | null;
  /** A WebLIMS form token exists and has not expired. */
  hasLiveFormToken: boolean;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    fullName: string | null;
    email: string;
    globalHealthNumber: string | null;
  };
  items: LabRequisitionItemDto[];
};

export async function fetchLabRequisitions(params: {
  page?: number;
  status?: LabRequisitionStatus | "";
  countryCode?: string;
  q?: string;
} = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.status) search.set("status", params.status);
  if (params.countryCode) search.set("countryCode", params.countryCode);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();

  return adminRequest<{
    requisitions: LabRequisitionDto[];
    pagination: AdminPagination;
    /** False when WEBLIMS_* env is unset — the handoff actions stay disabled. */
    weblimsConfigured: boolean;
  }>(`/api/admin/lab-requisitions${qs ? `?${qs}` : ""}`);
}
