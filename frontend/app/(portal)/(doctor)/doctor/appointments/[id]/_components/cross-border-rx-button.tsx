"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Globe2 } from "lucide-react";

/**
 * Doctor A: raise a cross-jurisdiction prescription request from the
 * consultation. Picks a target country + an admin-authorised prescribing
 * doctor there, writes a clinical summary, and creates the request. The
 * backend mints an async-fee payment link and emails it to the patient; the
 * link is shown here too so the doctor can share it directly.
 */

export type CrossBorderRxCopy = {
  openButton: string;
  title: string;
  description: string;
  countryLabel: string;
  countryPlaceholder: string;
  doctorLabel: string;
  doctorPlaceholder: string;
  summaryLabel: string;
  summaryPlaceholder: string;
  billingNote: string;
  submit: string;
  submitting: string;
  cancel: string;
  loadingOptions: string;
  noTargets: string;
  selectCountryFirst: string;
  selectDoctorFirst: string;
  summaryRequired: string;
  couldNotCreate: string;
  createdTitle: string;
  createdBody: string;
  copyLink: string;
  copied: string;
  done: string;
};

type TargetCountry = {
  countryCode: string;
  countryName: string;
  doctors: { id: string; fullName: string; title: string }[];
};

export function CrossBorderRxButton({
  appointmentId,
  copy,
}: {
  appointmentId: string;
  copy: CrossBorderRxCopy;
}) {
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [targets, setTargets] = useState<TargetCountry[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/cross-border-rx/options`,
        { headers: { accept: "application/json" } },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { targets?: TargetCountry[] };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.message ?? copy.couldNotCreate);
        setTargets([]);
      } else {
        setTargets(json.data.targets ?? []);
      }
    } catch {
      // Network / non-JSON response — surface an error instead of hanging the
      // "Loading available countries…" state forever.
      setError(copy.couldNotCreate);
      setTargets([]);
    } finally {
      setLoadingOptions(false);
    }
  }, [appointmentId, copy.couldNotCreate]);

  const activeCountry = useMemo(
    () => targets.find((t) => t.countryCode === countryCode) ?? null,
    [targets, countryCode],
  );

  function reset() {
    setCountryCode("");
    setDoctorId("");
    setSummary("");
    setError(null);
    setConsentUrl(null);
    setCopied(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!countryCode) return setError(copy.selectCountryFirst);
    if (!doctorId) return setError(copy.selectDoctorFirst);
    if (!summary.trim()) return setError(copy.summaryRequired);
    startTransition(async () => {
      const res = await fetch(`/api/doctor/appointments/${appointmentId}/cross-border-rx`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetCountryCode: countryCode,
          targetDoctorId: doctorId,
          clinicalSummary: summary.trim(),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { consentUrl?: string | null };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotCreate);
        return;
      }
      setConsentUrl(json.data?.consentUrl ?? null);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          reset();
          void loadOptions();
        }}
        className="gh-btn gh-btn-soft"
      >
        <Globe2 className="size-3.5" /> {copy.openButton}
      </button>
    );
  }

  // Success view — request created, show the consent link to share.
  if (consentUrl !== null) {
    return (
      <div className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
        <p className="text-portal-meta font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
          {copy.createdTitle}
        </p>
        <p className="mt-1 text-portal-label text-[var(--portal-muted)]">{copy.createdBody}</p>
        {consentUrl ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={consentUrl}
              className="gh-input flex-1 text-portal-label"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="gh-btn gh-btn-soft"
              onClick={() => {
                void navigator.clipboard?.writeText(consentUrl).then(() => setCopied(true));
              }}
            >
              {copied ? copy.copied : copy.copyLink}
            </button>
          </div>
        ) : null}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="gh-btn gh-btn-primary"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            {copy.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3"
    >
      <p className="text-portal-meta font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {copy.title}
      </p>
      <p className="mt-1 text-portal-label text-[var(--portal-muted)]">{copy.description}</p>

      {loadingOptions ? (
        <p className="mt-2 text-portal-label text-[var(--portal-muted)]">{copy.loadingOptions}</p>
      ) : targets.length === 0 ? (
        <p className="mt-2 text-portal-label text-[var(--portal-muted)]">{copy.noTargets}</p>
      ) : (
        <div className="mt-2 grid gap-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.countryLabel}</span>
            <select
              className="gh-select"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setDoctorId("");
              }}
            >
              <option value="">{copy.countryPlaceholder}</option>
              {targets.map((t) => (
                <option key={t.countryCode} value={t.countryCode}>
                  {t.countryName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.doctorLabel}</span>
            <select
              className="gh-select"
              value={doctorId}
              disabled={!activeCountry}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">{copy.doctorPlaceholder}</option>
              {(activeCountry?.doctors ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title ? `${d.title} ${d.fullName}` : d.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.summaryLabel}</span>
            <textarea
              className="gh-input min-h-[5rem] resize-y"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={copy.summaryPlaceholder}
              maxLength={5000}
            />
          </label>

          <p className="text-portal-label text-[var(--portal-muted)]">{copy.billingNote}</p>
        </div>
      )}

      {error ? (
        <p className="gh-status-warning mt-2 rounded-md border px-3 py-2 text-portal-label">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="gh-btn gh-btn-soft"
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          disabled={pending || loadingOptions || targets.length === 0}
          className="gh-btn gh-btn-primary"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </div>
    </form>
  );
}
