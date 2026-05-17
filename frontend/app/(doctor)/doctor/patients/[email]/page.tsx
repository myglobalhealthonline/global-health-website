import Link from "next/link";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import { fetchDoctorPatientDetail } from "@/lib/api/doctor-api";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ email: string }> };

export default async function DoctorPatientDetailPage({ params }: PageProps) {
  const { email } = await params;
  const decoded = decodeURIComponent(email);
  const result = await fetchDoctorPatientDetail(decoded);

  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <Link
          href="/doctor/patients"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" /> Back to patients
        </Link>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
      </div>
    );
  }

  const { patient, appointments } = result.data;

  return (
    <>
      <Link
        href="/doctor/patients"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to patients
      </Link>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Patient
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          {patient.fullName}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {patient.email}
          {patient.phone ? ` · ${patient.phone}` : ""} ·{" "}
          {patient.countryCode.toUpperCase()}
        </p>
      </header>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <section className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Appointment history
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Every appointment this patient has had with you. Open one to
            jump into the workspace.
          </p>
          {appointments.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
              No appointments.
            </p>
          ) : (
            <table className="mt-4 w-full text-[13px]">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  <th className="py-2 text-left">When</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Payment</th>
                  <th className="py-2 text-left">Consult</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--color-border)]">
                    <td className="py-2.5">
                      {a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleString()
                        : new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 capitalize">{a.consultationType}</td>
                    <td className="py-2.5 text-[12px]">{a.status}</td>
                    <td className="py-2.5 text-[12px]">{a.paymentStatus}</td>
                    <td className="py-2.5 text-[12px]">
                      {a.consultation
                        ? a.consultation.status === "SIGNED"
                          ? "Signed"
                          : "Draft"
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {a.meetingUrl ? (
                          <a
                            href={a.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                          >
                            <ExternalLink className="size-3" /> Join
                          </a>
                        ) : null}
                        <Link
                          href={`/doctor/appointments/${a.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                        >
                          Open <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className="grid gap-4 self-start">
          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Summary
            </h3>
            <dl className="mt-3 grid gap-2 text-[13px]">
              <Row label="Email" value={patient.email} />
              <Row label="Phone" value={patient.phone ?? "—"} />
              <Row label="Country" value={patient.countryCode.toUpperCase()} />
              <Row
                label="Date of birth"
                value={
                  patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString()
                    : "—"
                }
              />
              <Row
                label="First seen"
                value={new Date(patient.firstSeen).toLocaleDateString()}
              />
              <Row
                label="Total appointments"
                value={String(patient.appointmentCount)}
              />
              <Row
                label="Signed consults"
                value={String(patient.signedConsultCount)}
              />
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)]/60 py-1">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
