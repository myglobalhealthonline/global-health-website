"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, Upload } from "lucide-react";
import {
  fetchVerification,
  uploadIdDocument,
  type VerificationData,
  type VerificationStatus,
} from "@/lib/api/account-profile-api";
import { IdentityVerificationCard } from "./identity-verification-card";

type VerificationI18n = {
  title: string;
  subtitle: string;
  email: string;
  phone: string;
  insuranceDocument: string;
  governmentId: string;
  verifiedOn: string;
  reviewedOn: string;
  documentType: string;
  uploadHint: string;
  uploadDocument: string;
  replaceDocument: string;
  uploading: string;
  uploaded: string;
  badgeNotVerified: string;
  badgePending: string;
  badgeVerified: string;
  badgeRejected: string;
  docPassport: string;
  docIdCard: string;
  docResidenceCard: string;
  docNicop: string;
  docCnic: string;
  docOther: string;
};

const DEFAULT_I18N: VerificationI18n = {
  title: "Verification status",
  subtitle: "Keep identity, insurance, email, and phone checks ready before appointments.",
  email: "Email",
  phone: "Phone",
  insuranceDocument: "Insurance document",
  governmentId: "Government ID",
  verifiedOn: "Verified {date}",
  reviewedOn: "Reviewed {date}",
  documentType: "Document type",
  uploadHint: "One clear photo or scan of your passport or ID card. Max 10 MB. PDF, JPG, PNG.",
  uploadDocument: "Upload ID document",
  replaceDocument: "Replace ID document",
  uploading: "Uploading…",
  uploaded: "ID document saved",
  badgeNotVerified: "Not verified",
  badgePending: "Pending review",
  badgeVerified: "Verified",
  badgeRejected: "Rejected",
  docPassport: "Passport",
  docIdCard: "National ID card",
  docResidenceCard: "Residence card",
  docNicop: "NICOP",
  docCnic: "CNIC",
  docOther: "Other",
};

function StatusBadge({ status, i18n }: { status: VerificationStatus; i18n: VerificationI18n }) {
  const BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
    NOT_VERIFIED: { label: i18n.badgeNotVerified, cls: "bg-gray-100 text-gray-700" },
    PENDING: { label: i18n.badgePending, cls: "bg-amber-100 text-amber-800" },
    VERIFIED: { label: i18n.badgeVerified, cls: "bg-emerald-100 text-emerald-800" },
    REJECTED: { label: i18n.badgeRejected, cls: "bg-rose-100 text-rose-800" },
  };
  const b = BADGE[status];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${b.cls}`}>{b.label}</span>
  );
}

export function VerificationTab({ i18n = DEFAULT_I18N }: { i18n?: VerificationI18n }) {
  const ID_DOC_TYPES = [
    { value: "passport", label: i18n.docPassport },
    { value: "id_card", label: i18n.docIdCard },
    { value: "residence_card", label: i18n.docResidenceCard },
    { value: "nicop", label: i18n.docNicop },
    { value: "cnic", label: i18n.docCnic },
    { value: "other", label: i18n.docOther },
  ];
  const [data, setData] = useState<VerificationData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [docType, setDocType] = useState("passport");
  // Bumped on a successful ID upload so the identity-verification card below
  // re-reads its status. It owns a separate fetch, and without this nudge a
  // patient who has just uploaded their ID keeps being told to upload their ID.
  const [idDocVersion, setIdDocVersion] = useState(0);
  const [pending, startUpload] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchVerification().then((res) => {
      if (res.ok) setData(res.data.verification);
      setLoaded(true);
    });
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setMsg(null);
    startUpload(async () => {
      const res = await uploadIdDocument(file, side, docType);
      if (res.ok) {
        // Re-read rather than guessing a status. An upload no longer submits
        // anything for review, and replacing a document that WAS submitted
        // pulls it back out of the queue — so the badge here can move in
        // either direction and only the server knows which.
        const fresh = await fetchVerification();
        if (fresh.ok) setData(fresh.data.verification);
        setIdDocVersion((v) => v + 1);
        setMsg({ kind: "ok", text: i18n.uploaded });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  if (!loaded) {
    return (
      <div className="gh-patient-empty-state gh-card p-6">
        <div className="h-4 w-40 rounded bg-[var(--portal-well)]" />
        <div className="mt-4 grid gap-3">
          <div className="h-14 rounded-lg bg-[var(--portal-well)]" />
          <div className="h-14 rounded-lg bg-[var(--portal-well)]" />
          <div className="h-14 rounded-lg bg-[var(--portal-well)]" />
        </div>
      </div>
    );
  }

  const v = data;

  return (
    <section className="gh-patient-profile-tab space-y-4">
      <div className="gh-patient-form-card gh-card p-6">
        <header className="mb-4 flex items-center gap-2">
          <BadgeCheck className="size-5 text-[var(--portal-primary)]" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold text-[var(--portal-text)]">{i18n.title}</h3>
            <p className="mt-1 text-sm text-[var(--portal-muted)]">
              {i18n.subtitle}
            </p>
          </div>
        </header>

        <div className="divide-y divide-[var(--portal-line)]">
          {/* Email */}
          <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-[var(--portal-text)]">{i18n.email}</p>
              {v?.emailVerifiedAt && (
                <p className="mt-0.5 text-xs text-[var(--portal-muted)]">
                  {i18n.verifiedOn.replace("{date}", new Date(v.emailVerifiedAt).toLocaleDateString())}
                </p>
              )}
            </div>
            <StatusBadge status={v?.emailVerificationStatus ?? "NOT_VERIFIED"} i18n={i18n} />
          </div>

          {/* Phone */}
          <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-[var(--portal-text)]">{i18n.phone}</p>
              {v?.phoneVerifiedAt && (
                <p className="mt-0.5 text-xs text-[var(--portal-muted)]">
                  {i18n.verifiedOn.replace("{date}", new Date(v.phoneVerifiedAt).toLocaleDateString())}
                </p>
              )}
            </div>
            <StatusBadge status={v?.phoneVerificationStatus ?? "NOT_VERIFIED"} i18n={i18n} />
          </div>

          {/* Insurance */}
          <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-[var(--portal-text)]">{i18n.insuranceDocument}</p>
            </div>
            <StatusBadge status={v?.insuranceDocumentStatus ?? "NOT_VERIFIED"} i18n={i18n} />
          </div>

          {/* ID */}
          <div className="py-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-medium text-[var(--portal-text)]">{i18n.governmentId}</p>
                {v?.idDocumentType && (
                  <p className="mt-0.5 text-xs text-[var(--portal-muted)] capitalize">
                    {v.idDocumentType.replace(/_/g, " ")}
                  </p>
                )}
                {v?.idVerificationReviewedAt && (
                  <p className="mt-0.5 text-xs text-[var(--portal-muted)]">
                    {i18n.reviewedOn.replace("{date}", new Date(v.idVerificationReviewedAt).toLocaleDateString())}
                  </p>
                )}
              </div>
              <StatusBadge status={v?.idVerificationStatus ?? "NOT_VERIFIED"} i18n={i18n} />
            </div>
            {v?.idVerificationAdminNotes && (
              <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {v.idVerificationAdminNotes}
              </p>
            )}

            {/* Available until the ID is actually verified — including while a
                submission is awaiting review. Patients photograph the wrong
                page, or a blurred one, and previously had no way back: once a
                selfie flipped the status to PENDING these controls vanished
                and the wrong ID was stuck on file. */}
            {v?.idVerificationStatus !== "VERIFIED" && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="gh-field-label">{i18n.documentType}</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="gh-input mt-1"
                  >
                    {ID_DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-[var(--portal-muted)]">
                  {i18n.uploadHint}
                </p>
                {/* One document, not a front/back pair. A passport photo page
                    is a single image, and the second slot only ever produced
                    half-finished uploads. Re-uploading replaces what is on
                    file, which is how a patient fixes a wrong photo. */}
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)] disabled:opacity-60">
                    <Upload aria-hidden className="size-4" />
                    {pending
                      ? i18n.uploading
                      : v?.hasIdDocument
                        ? i18n.replaceDocument
                        : i18n.uploadDocument}
                    <input
                      ref={frontRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => onFileChange(e, "front")}
                      disabled={pending}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sits below the ID upload because it depends on it — the face has
          nothing to be matched against until the document is on file. Renders
          nothing unless the server says this patient is in scope. */}
      <IdentityVerificationCard refreshKey={idDocVersion} />

      {msg ? (
        <p
          role={msg.kind === "ok" ? "status" : "alert"}
          className={`rounded-md px-3 py-2 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}
