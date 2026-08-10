"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn } from "@/components/portal-atoms";
import {
  fetchMyMedicalAccessRequests,
  submitMedicalAccessRequest,
} from "@/lib/api/medical-access-requests-client";
import type { MedicalAccessDeniedDetails } from "@/lib/api/doctor-api";

export type MedicalAccessDeniedCopy = {
  title: string;
  reasonDoctor2faRequired: string;
  reasonDoctorNoConfidentialityAgreement: string;
  reasonDoctorNoValidAccessPath: string;
  reasonDefault: string;
  actionConfidentiality: string;
  action2fa: string;
  requestAccess: string;
  requestAccessDialogTitle: string;
  requestAccessReasonLabel: string;
  requestAccessReasonPlaceholder: string;
  requestAccessReasonHint: string;
  requestAccessSubmit: string;
  requestAccessCancel: string;
  requestAccessSubmitted: string;
  requestAccessPending: string;
  requestAccessError: string;
};

// Maps the guard's catalogued denyReason codes (medical-access-guard.ts
// DENY_REASON_INFO) to a translated copy key. Kept local — not derived from
// the backend's `remedy` string — so the notice stays translatable per
// doctor.json rather than always rendering server-authored English.
const REASON_COPY_KEY: Record<string, keyof MedicalAccessDeniedCopy> = {
  DOCTOR_2FA_REQUIRED: "reasonDoctor2faRequired",
  DOCTOR_NO_CONFIDENTIALITY_AGREEMENT: "reasonDoctorNoConfidentialityAgreement",
  DOCTOR_NO_VALID_ACCESS_PATH: "reasonDoctorNoValidAccessPath",
};

const SUBMITTED_KEY_PREFIX = "gh-doctor-access-request-";

/**
 * Shown in place of a denied clinical read (see
 * appointments/[id]/page.tsx's `!consultRes.ok` branch). Surfaces the
 * catalogued deny reason + remedy, and — for the non-self-fixable
 * DOCTOR_NO_VALID_ACCESS_PATH case — the MedicalAccessGrant request flow
 * (backend/src/routes/medical-access-requests.route.ts), with its
 * pending/approved state reflected via a locally-remembered requestId
 * (there is no per-patient status endpoint, only "list my requests").
 */
export function MedicalAccessDeniedNotice({
  appointmentId,
  denial,
  copy,
}: {
  appointmentId: string;
  denial: MedicalAccessDeniedDetails;
  copy: MedicalAccessDeniedCopy;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<
    "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "REVOKED" | null
  >(null);

  const storageKey = `${SUBMITTED_KEY_PREFIX}${appointmentId}`;

  useEffect(() => {
    if (!denial.canRequestAccess) return;
    let requestId: string | null = null;
    try {
      requestId = sessionStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (!requestId) return;
    fetchMyMedicalAccessRequests().then((res) => {
      if (!res.ok) return;
      const row = res.data.requests.find((r) => r.id === requestId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot status check after mount
      if (row) setPendingStatus(row.status);
    });
  }, [denial.canRequestAccess, storageKey]);

  const reasonCopyKey = REASON_COPY_KEY[denial.reasonCode];
  const remedyText = reasonCopyKey ? copy[reasonCopyKey] : (denial.remedy || copy.reasonDefault);

  async function handleSubmit() {
    if (reason.trim().length < 10) return;
    setSubmitting(true);
    setError(null);
    const res = await submitMedicalAccessRequest(appointmentId, reason.trim());
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message || copy.requestAccessError);
      return;
    }
    try {
      sessionStorage.setItem(storageKey, res.data.requestId);
    } catch {
      // sessionStorage unavailable — pending state just won't survive reload.
    }
    setPendingStatus("PENDING");
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div
      className="gh-admin-card gh-doctor-access-denied flex items-start gap-3 p-4"
      style={{ borderLeft: "3px solid var(--portal-warning)" }}
    >
      <ShieldAlert
        className="mt-0.5 size-5 shrink-0"
        style={{ color: "var(--portal-warning-text)" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold" style={{ color: "var(--portal-warning-text)" }}>
          {copy.title}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--portal-text)" }}>
          {remedyText}
        </p>

        {denial.reasonCode === "DOCTOR_2FA_REQUIRED" ? (
          <Link
            href="/doctor/security?tab=2fa"
            className="mt-2 inline-block text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--portal-warning-text)" }}
          >
            {copy.action2fa}
          </Link>
        ) : null}
        {denial.reasonCode === "DOCTOR_NO_CONFIDENTIALITY_AGREEMENT" ? (
          <Link
            href="/doctor/confidentiality"
            className="mt-2 inline-block text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--portal-warning-text)" }}
          >
            {copy.actionConfidentiality}
          </Link>
        ) : null}

        {denial.canRequestAccess ? (
          pendingStatus === "PENDING" ? (
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--portal-text)" }}>
              {copy.requestAccessPending}
            </p>
          ) : (
            <div className="mt-3">
              <Btn size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>
                {copy.requestAccess}
              </Btn>
            </div>
          )
        ) : null}
      </div>

      <PortalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={copy.requestAccessDialogTitle}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDialogOpen(false)}>
              {copy.requestAccessCancel}
            </Btn>
            <Btn
              variant="primary"
              loading={submitting}
              disabled={reason.trim().length < 10}
              onClick={handleSubmit}
            >
              {copy.requestAccessSubmit}
            </Btn>
          </>
        }
      >
        <label className="block text-sm font-semibold" style={{ color: "var(--portal-text)" }}>
          {copy.requestAccessReasonLabel}
        </label>
        <textarea
          className="gh-input mt-1.5 w-full resize-y"
          rows={4}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={copy.requestAccessReasonPlaceholder}
        />
        <p className="mt-1 text-portal-meta" style={{ color: "var(--portal-muted)" }}>
          {copy.requestAccessReasonHint}
        </p>
        {error ? (
          <p className="mt-2 text-sm" style={{ color: "var(--portal-danger-text)" }}>
            {error}
          </p>
        ) : null}
      </PortalDialog>
    </div>
  );
}
