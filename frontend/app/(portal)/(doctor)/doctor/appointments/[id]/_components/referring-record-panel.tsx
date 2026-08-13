import { Globe2 } from "lucide-react";

export type ReferringRecordCopy = {
  sourceRecordTitle: string;
  sourceRecordDesc: string;
  fromLabel: string;
  requestedOn: string;
  summaryHeading: string;
  soapConsentNote: string;
  soapChiefComplaint: string;
  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;
  soapEmpty: string;
  sourceDocumentsNote: string;
  soapNote: string;
};

export type ReferringRecord = {
  requestId: string;
  status: string;
  requestedAt: string;
  sourceDoctorName: string | null;
  clinicalSummary: string;
  soap: {
    chiefComplaint: string | null;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    noteFormat: "SOAP" | "FREEFORM";
    note: string | null;
  };
};

/**
 * Read-only disclosure panel on an async cross-border prescription
 * appointment: the referring doctor's consultation note as the patient
 * consented to share it.
 *
 * Deliberately rendered above the prescriber's own note and independent of the
 * request's status — the inbox card that used to be the only place this
 * appeared disappears as soon as the request is accepted, which left the
 * prescribing doctor writing up a consultation with nothing to write from.
 */
export function ReferringRecordPanel({
  record,
  copy,
}: {
  record: ReferringRecord;
  copy: ReferringRecordCopy;
}) {
  const rows: Array<[string, string | null]> =
    record.soap.noteFormat === "FREEFORM"
      ? [
          [copy.soapChiefComplaint, record.soap.chiefComplaint],
          [copy.soapNote, record.soap.note],
        ]
      : [
          [copy.soapChiefComplaint, record.soap.chiefComplaint],
          [copy.soapSubjective, record.soap.subjective],
          [copy.soapObjective, record.soap.objective],
          [copy.soapAssessment, record.soap.assessment],
          [copy.soapPlan, record.soap.plan],
        ];
  const present = rows.filter(([, v]) => v && v.trim());
  const summary = record.clinicalSummary.trim();

  return (
    <section className="mb-6 rounded-lg border border-[var(--portal-line)] bg-[var(--portal-well)] p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="m-0 flex items-center gap-2 text-[var(--portal-text)]">
            <Globe2 className="size-4" aria-hidden />
            <span
              style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800 }}
            >
              {copy.sourceRecordTitle}
            </span>
          </h4>
          <p className="mt-1 text-portal-label text-[var(--portal-muted)]">
            {copy.sourceRecordDesc}
          </p>
        </div>
        <div className="text-right text-portal-label text-[var(--portal-muted)]">
          {record.sourceDoctorName ? (
            <p>
              {copy.fromLabel}: <span className="font-semibold">{record.sourceDoctorName}</span>
            </p>
          ) : null}
          <p>
            {copy.requestedOn}: {new Date(record.requestedAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      {summary ? (
        <div className="mt-3">
          <p className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
            {copy.summaryHeading}
          </p>
          <p className="mt-1 whitespace-pre-wrap rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface)] p-3 text-portal-compact text-[var(--portal-text)]">
            {summary}
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-portal-label text-[var(--portal-muted)]">{copy.soapConsentNote}</p>
      {present.length === 0 ? (
        <p className="mt-1 text-portal-label text-[var(--portal-muted)]">{copy.soapEmpty}</p>
      ) : (
        <dl className="mt-2 grid gap-3 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface)] p-3">
          {present.map(([label, value]) => (
            <div key={label}>
              <dt className="text-portal-label font-semibold text-[var(--portal-muted)]">
                {label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-portal-compact text-[var(--portal-text)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-3 text-portal-meta text-[var(--portal-muted)]">
        {copy.sourceDocumentsNote}
      </p>
    </section>
  );
}
