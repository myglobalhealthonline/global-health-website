"use client";

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck, Upload, Save } from "lucide-react";
import {
  fetchInsurance,
  patchInsurance,
  uploadInsuranceDocument,
  type InsuranceData,
  type VerificationStatus,
} from "@/lib/api/account-profile-api";

const STATUS_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  NOT_VERIFIED: { label: "Not verified", cls: "bg-gray-100 text-gray-700" },
  PENDING: { label: "Pending review", cls: "bg-amber-100 text-amber-800" },
  VERIFIED: { label: "Verified", cls: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-800" },
};

export function InsuranceTab() {
  const [data, setData] = useState<InsuranceData | null>(null);
  const [providerName, setProviderName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [savePending, startSave] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void fetchInsurance().then((res) => {
      if (res.ok) {
        setData(res.data.insurance);
        setProviderName(res.data.insurance.insuranceProviderName ?? "");
        setPolicyNumber(res.data.insurance.insurancePolicyNumber ?? "");
      }
      setLoaded(true);
    });
  }, []);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    startSave(async () => {
      const res = await patchInsurance({
        insuranceProviderName: providerName.trim() || null,
        insurancePolicyNumber: policyNumber.trim() || null,
      });
      if (res.ok) {
        setMsg({ kind: "ok", text: "Insurance details saved" });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setMsg(null);
    startUpload(async () => {
      const res = await uploadInsuranceDocument(file);
      if (res.ok) {
        setData((prev) => prev ? { ...prev, hasDocument: true, insuranceDocumentStatus: "PENDING" } : prev);
        setMsg({ kind: "ok", text: "Document uploaded — awaiting review" });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  if (!loaded) {
    return <div className="gh-patient-empty-state gh-card p-6 text-sm text-[var(--color-text-muted)]">Loading…</div>;
  }

  const badge = STATUS_BADGE[data?.insuranceDocumentStatus ?? "NOT_VERIFIED"];

  return (
    <section className="gh-patient-profile-tab space-y-4">
      <div className="gh-patient-form-card gh-card p-6">
        <header className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Insurance details</h3>
        </header>
        <form onSubmit={onSave} className="space-y-4">
          <label className="block">
            <span className="gh-field-label">Provider name</span>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              maxLength={200}
              placeholder="e.g. VHI, Laya, Cigna…"
              className="gh-input mt-1 min-w-0"
            />
          </label>
          <label className="block">
            <span className="gh-field-label">Policy number</span>
            <input
              type="text"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              maxLength={200}
              placeholder="Stored encrypted"
              className="gh-input mt-1 min-w-0"
            />
          </label>
          <button
            type="submit"
            disabled={savePending}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            <Save aria-hidden className="size-4" />
            {savePending ? "Saving…" : "Save insurance details"}
          </button>
        </form>
      </div>

      <div className="gh-patient-form-card gh-card p-6">
        <header className="mb-3">
          <p className="gh-field-label mb-1">Insurance document</p>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            {data?.hasDocument && (
              <span className="text-xs text-[var(--color-text-muted)]">Document on file</span>
            )}
          </div>
        </header>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Upload your insurance card or policy document (PDF, JPG, PNG — max 10 MB).
          Admin will review and update your status.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)] disabled:opacity-60">
          <Upload aria-hidden className="size-4" />
          {uploadPending ? "Uploading…" : data?.hasDocument ? "Replace document" : "Upload document"}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={onFileChange}
            disabled={uploadPending}
            className="sr-only"
          />
        </label>
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
