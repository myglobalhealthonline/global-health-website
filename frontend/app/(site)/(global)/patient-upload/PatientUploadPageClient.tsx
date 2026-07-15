"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { fetchPatientUploadInfo, uploadPatientFile } from "@/lib/api/public-api";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import type { CommonLocale } from "@/lib/i18n/types";

function PatientUploadForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState<{ email: string; fullName: string | null } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("Invalid upload link.");
      return;
    }
    fetchPatientUploadInfo(token).then((res) => {
      if (!res.ok) setError(res.message);
      else setInfo(res.data);
    });
  }, [token]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement)
      ?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    startTransition(async () => {
      const res = await uploadPatientFile(token, file);
      if (!res.ok) setError(res.message);
      else setSuccess("File uploaded successfully. Thank you.");
    });
  }

  if (error && !info) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8">
        <p role="alert" className="gh-status-error rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
          {error}
        </p>
      </div>
    );
  }
  if (!info) {
    return <p className="text-center text-sm">Loading…</p>;
  }

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
        Upload medical files
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {info.fullName ? `For ${info.fullName}` : info.email} — PDF or images, max 10 MB.
      </p>
      {success ? (
        <p role="status" className="gh-status-success mt-4 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm font-semibold">
          {success}
        </p>
      ) : (
        <form className="mt-6" onSubmit={submit}>
          <input
            name="file"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            required
            className="block w-full cursor-pointer rounded-[var(--radius-card-sm)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-background-soft)] p-4 text-sm text-[var(--color-text-body)] file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--color-brand-primary)] file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white"
          />
          {error ? (
            <p role="alert" className="gh-status-error mt-3 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="gh2-btn-lime mt-4 w-full justify-center disabled:opacity-60"
          >
            {pending ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}
    </div>
  );
}

export function PatientUploadPageClient({ flow }: { flow: CommonLocale["flow"] }) {
  return (
    <>
    <GH2FlowHeader
      title={flow.patientUploadTitle}
      subtitle={flow.patientUploadSubtitle}
      activeStep={1}
      steps={[flow.patientUploadStepUpload, flow.patientUploadStepReview]}
    />
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <PatientUploadForm />
      </Suspense>
    </section>
    </>
  );
}
