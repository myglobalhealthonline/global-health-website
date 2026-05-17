import { notFound, redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchDoctorConsultation,
  fetchDoctorConsultationServices,
  fetchDoctorDocuments,
  fetchDoctorExams,
  fetchDoctorFormSubmissions,
  fetchDoctorInvoice,
} from "@/lib/api/doctor-api";

export const dynamic = "force-dynamic";

type Params = { id: string };

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#555",
  margin: "0 0 6px",
};

function fmtMoney(cents: number | null, code: string | null) {
  if (cents == null) return "—";
  const v = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code ?? "USD",
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${code ?? ""}`;
  }
}

/**
 * Full appointment dossier for print. One server pass pulls consult,
 * exams, services, documents, form submissions, invoice. No sidebar /
 * branding — just a clean A4-sized page. Cmd-P → PDF works.
 */
export default async function PrintAppointmentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const user = await getServerAuthUser();
  if (!user) redirect(`/login?next=/print/appointments/${id}`);
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") redirect("/account");

  const [consultRes, examsRes, servicesRes, docsRes, formsRes, invoiceRes] =
    await Promise.all([
      fetchDoctorConsultation(id),
      fetchDoctorExams(id),
      // services-used needs the consultation id. We'll fetch after consult.
      Promise.resolve(null as Awaited<ReturnType<typeof fetchDoctorConsultationServices>> | null),
      fetchDoctorDocuments(id),
      fetchDoctorFormSubmissions(id),
      fetchDoctorInvoice(id),
    ]);
  if (!consultRes.ok) {
    if (consultRes.status === 404) notFound();
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <p>{consultRes.message}</p>
      </main>
    );
  }
  const { appointment, consultation } = consultRes.data;
  const exams = examsRes.ok ? examsRes.data.items : [];
  const documents = docsRes.ok ? docsRes.data.items : [];
  const submissions = formsRes.ok ? formsRes.data.items : [];
  const invoice = invoiceRes.ok ? invoiceRes.data.invoice : null;
  const servicesUsedRes = consultation
    ? await fetchDoctorConsultationServices(consultation.id)
    : null;
  void servicesRes;
  const servicesUsed = servicesUsedRes && servicesUsedRes.ok ? servicesUsedRes.data.items : [];

  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "40px 32px",
        fontFamily:
          "var(--font-display), 'Helvetica Neue', Arial, sans-serif",
        color: "#111",
        lineHeight: 1.5,
      }}
    >
      <header
        style={{
          borderBottom: "2px solid #111",
          paddingBottom: 16,
          marginBottom: 24,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#555",
          }}
        >
          Appointment summary
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 26 }}>{appointment.fullName}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
          {appointment.consultationType} ·{" "}
          {appointment.scheduledAt
            ? new Date(appointment.scheduledAt).toLocaleString()
            : "Not scheduled"}{" "}
          · {appointment.countryCode.toUpperCase()} ·{" "}
          {appointment.consultationMode === "IN_PERSON" ? "In person" : "Online"}
        </p>
      </header>

      <section style={{ marginBottom: 20 }}>
        <h2 style={sectionTitle}>Patient</h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {appointment.email}
          {appointment.phone ? ` · ${appointment.phone}` : ""}
        </p>
        {appointment.dateOfBirth ? (
          <p style={{ margin: "2px 0 0", fontSize: 13 }}>
            DOB {new Date(appointment.dateOfBirth).toLocaleDateString()}
          </p>
        ) : null}
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={sectionTitle}>Status</h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {appointment.status}
          {consultation
            ? ` · Consultation ${consultation.status}${
                consultation.signedAt
                  ? ` (signed ${new Date(consultation.signedAt).toLocaleString()})`
                  : ""
              }`
            : ""}
        </p>
      </section>

      {consultation ? (
        <>
          <SoapSection title="Chief complaint" body={consultation.chiefComplaint} />
          <SoapSection title="Subjective" body={consultation.subjective} />
          <SoapSection title="Objective" body={consultation.objective} />
          <SoapSection title="Assessment" body={consultation.assessment} />
          <SoapSection title="Plan" body={consultation.plan} />
        </>
      ) : null}

      {servicesUsed.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionTitle}>Services rendered</h2>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <th style={{ textAlign: "left", padding: "4px 0" }}>Item</th>
                <th style={{ textAlign: "right", padding: "4px 0" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "4px 0" }}>Unit</th>
                <th style={{ textAlign: "right", padding: "4px 0" }}>Line</th>
              </tr>
            </thead>
            <tbody>
              {servicesUsed.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: "4px 0" }}>{s.service?.name ?? s.customLabel ?? "—"}</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>{s.quantity}</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>
                    {fmtMoney(s.unitPriceCents, s.currencyCode)}
                  </td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>
                    {fmtMoney(
                      s.unitPriceCents != null ? s.unitPriceCents * s.quantity : null,
                      s.currencyCode,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {exams.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionTitle}>Exam results</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {exams.map((r) => (
              <li key={r.id} style={{ marginBottom: 8, fontSize: 13 }}>
                <strong>{r.testName}</strong>
                {r.performedAt
                  ? ` · ${new Date(r.performedAt).toLocaleDateString()}`
                  : ""}
                {r.notes ? (
                  <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{r.notes}</p>
                ) : null}
                {r.externalUrl ? (
                  <p style={{ margin: "2px 0 0", fontSize: 12 }}>Report: {r.externalUrl}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionTitle}>Attached documents</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
            {documents.map((d) => (
              <li key={d.id}>
                {d.label} · {d.mimetype} · {(d.byteSize / 1024).toFixed(1)} KB
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {submissions.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionTitle}>Form submissions</h2>
          {submissions.map((s) => (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                {s.template.title}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#666" }}>
                {new Date(s.submittedAt).toLocaleString()}
              </p>
              <dl style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                {(s.answers ?? []).map((a, i) => {
                  const def = s.template.fields.find((f) => f.key === a.key);
                  return (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <dt style={{ minWidth: "35%", color: "#555" }}>
                        {def?.label ?? a.key}
                      </dt>
                      <dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {a.value === null || a.value === "" ? "—" : String(a.value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </section>
      ) : null}

      {invoice ? (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionTitle}>Billing</h2>
          <p style={{ margin: 0, fontSize: 13 }}>
            Status: {invoice.paymentStatus} ·{" "}
            {fmtMoney(invoice.amountCents, invoice.currencyCode)}
            {invoice.paidAt
              ? ` · paid ${new Date(invoice.paidAt).toLocaleString()}`
              : ""}
          </p>
        </section>
      ) : null}

      <footer
        style={{
          marginTop: 32,
          borderTop: "1px solid #ccc",
          paddingTop: 12,
          fontSize: 11,
          color: "#666",
        }}
      >
        Global Health · printed {new Date().toLocaleString()}
      </footer>

      <style>{`
        @media print {
          body { background: #fff; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>
    </main>
  );
}

function SoapSection({
  title,
  body,
}: {
  title: string;
  body: string | null | undefined;
}) {
  if (!body || body.trim() === "") return null;
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={sectionTitle}>{title}</h2>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5 }}>{body}</p>
    </section>
  );
}
