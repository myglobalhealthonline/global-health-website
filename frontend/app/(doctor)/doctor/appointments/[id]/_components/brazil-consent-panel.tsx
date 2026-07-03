"use client";

import { useEffect, useState } from "react";

type Submission = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  pharmacy: string | null;
  message: string;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
};

export function BrazilConsentPanel({
  appointmentId,
  countryCode,
}: {
  appointmentId: string;
  countryCode: string;
}) {
  const [submission, setSubmission] = useState<Submission | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (countryCode.toLowerCase() !== "br") return;
    fetch(`/api/doctor/appointments/${appointmentId}/brazil-consent`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { submission?: Submission } }) => {
        if (json.ok && json.data?.submission) setSubmission(json.data.submission);
        else setSubmission(null);
      })
      .catch(() => setSubmission(null));
  }, [appointmentId, countryCode]);

  if (countryCode.toLowerCase() !== "br") return null;
  if (submission === undefined) {
    return <p className="text-sm text-[var(--portal-muted)]">Loading…</p>;
  }
  if (!submission) {
    return (
      <p className="text-sm text-[var(--portal-muted)]">
        No Brazil consent submission yet.
      </p>
    );
  }

  return (
    <dl className="grid gap-2 text-sm">
      <div>
        <dt className="text-[var(--portal-muted)]">Payment</dt>
        <dd className="font-semibold">{submission.paymentStatus}</dd>
      </div>
      <div>
        <dt className="text-[var(--portal-muted)]">Name</dt>
        <dd>{submission.fullName ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-[var(--portal-muted)]">Email</dt>
        <dd>{submission.email ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-[var(--portal-muted)]">Pharmacy</dt>
        <dd>{submission.pharmacy ?? "—"}</dd>
      </div>
      {submission.message ? (
        <div>
          <dt className="text-[var(--portal-muted)]">Message</dt>
          <dd>{submission.message}</dd>
        </div>
      ) : null}
    </dl>
  );
}
