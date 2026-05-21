"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { fetchPatientUploadInfo, uploadPatientFile } from "@/lib/api/public-api";

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
        <p className="text-sm text-red-700">{error}</p>
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
        <p className="mt-4 text-sm font-semibold text-emerald-800">{success}</p>
      ) : (
        <form className="mt-6" onSubmit={submit}>
          <input
            name="file"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            required
            className="block w-full text-sm"
          />
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="gh-btn gh-btn-primary mt-4 w-full"
          >
            {pending ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PatientUploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <PatientUploadForm />
      </Suspense>
    </main>
  );
}
