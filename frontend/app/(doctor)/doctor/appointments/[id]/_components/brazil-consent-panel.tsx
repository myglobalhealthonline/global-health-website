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

export type BrazilConsentCopy = {
  loading: string;
  noSubmission: string;
  payment: string;
  name: string;
  email: string;
  pharmacy: string;
  message: string;
};

export function BrazilConsentPanel({
  appointmentId,
  countryCode,
  copy,
}: {
  appointmentId: string;
  countryCode: string;
  copy: BrazilConsentCopy;
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
    return <p className="text-sm text-[var(--portal-muted)]">{copy.loading}</p>;
  }
  if (!submission) {
    return (
      <p className="text-sm text-[var(--portal-muted)]">
        {copy.noSubmission}
      </p>
    );
  }

  return (
    <dl className="grid gap-2 text-sm">
      <div>
        <dt className="text-[var(--portal-muted)]">{copy.payment}</dt>
        <dd className="font-semibold">{submission.paymentStatus}</dd>
      </div>
      <div>
        <dt className="text-[var(--portal-muted)]">{copy.name}</dt>
        <dd>{submission.fullName ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-[var(--portal-muted)]">{copy.email}</dt>
        <dd>{submission.email ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-[var(--portal-muted)]">{copy.pharmacy}</dt>
        <dd>{submission.pharmacy ?? "—"}</dd>
      </div>
      {submission.message ? (
        <div>
          <dt className="text-[var(--portal-muted)]">{copy.message}</dt>
          <dd>{submission.message}</dd>
        </div>
      ) : null}
    </dl>
  );
}
