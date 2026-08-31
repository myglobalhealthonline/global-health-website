"use client";

import { useRef, useState, type FormEvent } from "react";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

type Copy = {
  heading: string; fullName: string; email: string; phone: string; message: string;
  cv: string; cvHelp: string; privacyPrefix: string; privacyLink: string; submit: string;
  submitting: string; success: string; invalidPdf: string; tooLarge: string;
  infected: string; unavailable: string; genericError: string; closed: string;
};

export function JobApplicationForm({ jobId, privacyHref, locale, copy }: { jobId: string; privacyHref: string; locale: string; copy: Copy }) {
  const [state, setState] = useState<{ status: "idle" | "pending" | "success" | "error"; message?: string }>({ status: "idle" });
  const [fileSummary, setFileSummary] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "pending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("cv");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      return setState({ status: "error", message: copy.invalidPdf });
    }
    if (file.size > MAX_PDF_BYTES) return setState({ status: "error", message: copy.tooLarge });
    setState({ status: "pending" });
    try {
      const response = await fetch(`/api/public/jobs/${encodeURIComponent(jobId)}/applications`, {
        method: "POST", body: data, cache: "no-store",
      });
      if (response.ok) {
        formRef.current?.reset();
        setFileSummary("");
        return setState({ status: "success", message: copy.success });
      }
      const message = response.status === 413 ? copy.tooLarge : response.status === 422 ? copy.infected
        : response.status === 409 ? copy.closed
        : response.status === 503 || response.status === 504 ? copy.unavailable
        : response.status === 400 ? copy.invalidPdf : copy.genericError;
      setState({ status: "error", message });
    } catch {
      setState({ status: "error", message: copy.unavailable });
    }
  }

  if (state.status === "success") return <div className="gh-careers-application-success" role="status"><strong>{state.message}</strong></div>;
  return <section id="apply" className="gh-careers-application">
    <h2>{copy.heading}</h2>
    <form ref={formRef} onSubmit={submit} encType="multipart/form-data">
      <label><span>{copy.fullName}</span><input name="fullName" autoComplete="name" maxLength={120} required /></label>
      <label><span>{copy.email}</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label><span>{copy.phone}</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
      <label className="gh-careers-form-wide"><span>{copy.message}</span><textarea name="message" rows={5} maxLength={2000} /></label>
      <label className="gh-careers-form-wide"><span>{copy.cv}</span><input name="cv" type="file" accept="application/pdf,.pdf" required onChange={(event) => {
        const file = event.target.files?.[0];
        setFileSummary(file ? `${file.name} · ${new Intl.NumberFormat(locale, {
          style: "unit", unit: "megabyte", unitDisplay: "short", maximumFractionDigits: 2,
        }).format(file.size / 1024 / 1024)}` : "");
      }} /><small>{fileSummary || copy.cvHelp}</small></label>
      <label className="gh-careers-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      <input type="hidden" name="privacyNoticeLocale" value={locale.toUpperCase()} />
      <label className="gh-careers-privacy gh-careers-form-wide"><input name="privacyAcknowledged" type="checkbox" value="true" required />
        <span>{copy.privacyPrefix} <a href={privacyHref} target="_blank" rel="noopener noreferrer">{copy.privacyLink}</a>.</span>
      </label>
      {state.status === "error" ? <p className="gh-careers-form-error" role="alert">{state.message}</p> : null}
      <button className="gh2-btn-lime" type="submit" disabled={state.status === "pending"}>{state.status === "pending" ? copy.submitting : copy.submit}</button>
    </form>
  </section>;
}
