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
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

type InsuranceI18n = {
  title: string;
  subtitle: string;
  providerName: string;
  providerPlaceholder: string;
  policyNumber: string;
  storedEncrypted: string;
  save: string;
  saving: string;
  saved: string;
  documentLabel: string;
  documentOnFile: string;
  uploadHint: string;
  upload: string;
  replace: string;
  uploading: string;
  uploaded: string;
  badgeNotVerified: string;
  badgePending: string;
  badgeVerified: string;
  badgeRejected: string;
};

const DEFAULT_I18N: InsuranceI18n = {
  title: "Insurance details",
  subtitle: "Add policy details and a document so care teams can verify coverage.",
  providerName: "Provider name",
  providerPlaceholder: "e.g. VHI, Laya, Cigna…",
  policyNumber: "Policy number",
  storedEncrypted: "Stored encrypted",
  save: "Save insurance details",
  saving: "Saving…",
  saved: "Insurance details saved",
  documentLabel: "Insurance document",
  documentOnFile: "Document on file",
  uploadHint:
    "Upload your insurance card or policy document (PDF, JPG, PNG — max 10 MB). Admin will review and update your status.",
  upload: "Upload document",
  replace: "Replace document",
  uploading: "Uploading…",
  uploaded: "Document uploaded — awaiting review",
  badgeNotVerified: "Not verified",
  badgePending: "Pending review",
  badgeVerified: "Verified",
  badgeRejected: "Rejected",
};

export function InsuranceTab({
  i18n = DEFAULT_I18N,
  onDirtyChange,
}: {
  i18n?: InsuranceI18n;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const STATUS_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
    NOT_VERIFIED: { label: i18n.badgeNotVerified, cls: "bg-gray-100 text-gray-700" },
    PENDING: { label: i18n.badgePending, cls: "bg-amber-100 text-amber-800" },
    VERIFIED: { label: i18n.badgeVerified, cls: "bg-emerald-100 text-emerald-800" },
    REJECTED: { label: i18n.badgeRejected, cls: "bg-rose-100 text-rose-800" },
  };
  const [data, setData] = useState<InsuranceData | null>(null);
  const [providerName, setProviderName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [initial, setInitial] = useState({ providerName: "", policyNumber: "" });
  const [loaded, setLoaded] = useState(false);
  const [savePending, startSave] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void fetchInsurance().then((res) => {
      if (res.ok) {
        setData(res.data.insurance);
        const loaded = {
          providerName: res.data.insurance.insuranceProviderName ?? "",
          policyNumber: res.data.insurance.insurancePolicyNumber ?? "",
        };
        setProviderName(loaded.providerName);
        setPolicyNumber(loaded.policyNumber);
        setInitial(loaded);
      }
      setLoaded(true);
    });
  }, []);

  const dirty = loaded && (providerName !== initial.providerName || policyNumber !== initial.policyNumber);
  useUnsavedChanges(dirty);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    startSave(async () => {
      const res = await patchInsurance({
        insuranceProviderName: providerName.trim() || null,
        insurancePolicyNumber: policyNumber.trim() || null,
      });
      if (res.ok) {
        setInitial({ providerName, policyNumber });
        setMsg({ kind: "ok", text: i18n.saved });
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
        setMsg({ kind: "ok", text: i18n.uploaded });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  if (!loaded) {
    return (
      <div className="gh-patient-empty-state gh-card p-6">
        <div className="h-4 w-44 rounded bg-[var(--portal-well)]" />
        <div className="mt-4 grid gap-3">
          <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
          <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[data?.insuranceDocumentStatus ?? "NOT_VERIFIED"];

  return (
    <section className="gh-patient-profile-tab space-y-4">
      <div className="gh-patient-form-card gh-card p-6">
        <header className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-[var(--portal-primary)]" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold text-[var(--portal-text)]">{i18n.title}</h3>
            <p className="mt-1 text-sm text-[var(--portal-muted)]">
              {i18n.subtitle}
            </p>
          </div>
        </header>
        <form onSubmit={onSave} method="post" className="space-y-4">
          <label className="block">
            <span className="gh-field-label">{i18n.providerName}</span>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              maxLength={200}
              placeholder={i18n.providerPlaceholder}
              className="gh-input mt-1 min-w-0"
            />
          </label>
          <label className="block">
            <span className="gh-field-label">{i18n.policyNumber}</span>
            <input
              type="text"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              maxLength={200}
              placeholder={i18n.storedEncrypted}
              className="gh-input mt-1 min-w-0"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savePending}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              <Save aria-hidden className="size-4" />
              {savePending ? i18n.saving : i18n.save}
            </button>
          </div>
        </form>
      </div>

      <div className="gh-patient-form-card gh-card p-6">
        <header className="mb-3">
          <p className="gh-field-label mb-1">{i18n.documentLabel}</p>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            {data?.hasDocument && (
              <span className="text-xs text-[var(--portal-muted)]">{i18n.documentOnFile}</span>
            )}
          </div>
        </header>
        <p className="mb-3 text-sm text-[var(--portal-muted)]">
          {i18n.uploadHint}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)] disabled:opacity-60">
          <Upload aria-hidden className="size-4" />
          {uploadPending ? i18n.uploading : data?.hasDocument ? i18n.replace : i18n.upload}
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
