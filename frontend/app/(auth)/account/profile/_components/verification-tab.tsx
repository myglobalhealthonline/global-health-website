"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, Upload } from "lucide-react";
import {
  fetchVerification,
  uploadIdDocument,
  type VerificationData,
  type VerificationStatus,
} from "@/lib/api/account-profile-api";

const BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  NOT_VERIFIED: { label: "Not verified", cls: "bg-gray-100 text-gray-700" },
  PENDING: { label: "Pending review", cls: "bg-amber-100 text-amber-800" },
  VERIFIED: { label: "Verified", cls: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-800" },
};

const ID_DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "id_card", label: "National ID card" },
  { value: "residence_card", label: "Residence card" },
  { value: "nicop", label: "NICOP" },
  { value: "cnic", label: "CNIC" },
  { value: "other", label: "Other" },
];

function StatusBadge({ status }: { status: VerificationStatus }) {
  const b = BADGE[status];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${b.cls}`}>{b.label}</span>
  );
}

export function VerificationTab() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [docType, setDocType] = useState("passport");
  const [uploadSide, setUploadSide] = useState<"front" | "back">("front");
  const [pending, startUpload] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

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
    setUploadSide(side);
    startUpload(async () => {
      const res = await uploadIdDocument(file, side, docType);
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, idVerificationStatus: "PENDING" } : prev,
        );
        setMsg({ kind: "ok", text: `ID document (${side}) uploaded — awaiting admin review` });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  if (!loaded) {
    return <div className="gh-card p-6 text-sm text-[var(--color-text-muted)]">Loading…</div>;
  }

  const v = data;

  return (
    <section className="space-y-4">
      <div className="gh-card p-6">
        <header className="mb-4 flex items-center gap-2">
          <BadgeCheck className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Verification status</h3>
        </header>

        <div className="divide-y divide-[var(--color-border)]">
          {/* Email */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Email</p>
              {v?.emailVerifiedAt && (
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Verified {new Date(v.emailVerifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <StatusBadge status={v?.emailVerificationStatus ?? "NOT_VERIFIED"} />
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Phone</p>
              {v?.phoneVerifiedAt && (
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Verified {new Date(v.phoneVerifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <StatusBadge status={v?.phoneVerificationStatus ?? "NOT_VERIFIED"} />
          </div>

          {/* Insurance */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Insurance document</p>
            </div>
            <StatusBadge status={v?.insuranceDocumentStatus ?? "NOT_VERIFIED"} />
          </div>

          {/* ID */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Government ID</p>
                {v?.idDocumentType && (
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)] capitalize">
                    {v.idDocumentType.replace(/_/g, " ")}
                  </p>
                )}
                {v?.idVerificationReviewedAt && (
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    Reviewed {new Date(v.idVerificationReviewedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <StatusBadge status={v?.idVerificationStatus ?? "NOT_VERIFIED"} />
            </div>
            {v?.idVerificationAdminNotes && (
              <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {v.idVerificationAdminNotes}
              </p>
            )}

            {(v?.idVerificationStatus === "NOT_VERIFIED" || v?.idVerificationStatus === "REJECTED") && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="gh-field-label">Document type</label>
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
                <p className="text-xs text-[var(--color-text-muted)]">
                  Upload front side (and back if applicable). Max 10 MB per file. PDF, JPG, PNG.
                </p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)] disabled:opacity-60">
                    <Upload aria-hidden className="size-4" />
                    {pending && uploadSide === "front" ? "Uploading…" : "Upload front"}
                    <input
                      ref={frontRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => onFileChange(e, "front")}
                      disabled={pending}
                      className="sr-only"
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)] disabled:opacity-60">
                    <Upload aria-hidden className="size-4" />
                    {pending && uploadSide === "back" ? "Uploading…" : "Upload back"}
                    <input
                      ref={backRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => onFileChange(e, "back")}
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

      {msg ? (
        <p
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
