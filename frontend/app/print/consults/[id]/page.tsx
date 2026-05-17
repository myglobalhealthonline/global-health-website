import { notFound, redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchDoctorConsultation,
  fetchDoctorExams,
} from "@/lib/api/doctor-api";

export const dynamic = "force-dynamic";

type Params = { id: string };

/**
 * Print-friendly consultation summary. Lives outside the doctor route
 * group so the sidebar shell doesn't render — opens in a new tab, the
 * doctor hits Cmd/Ctrl-P. Auth still required: DOCTOR or ADMIN role
 * with the appointment owned by the calling doctor (admin sees any).
 *
 * MVP intentionally HTML-only. PDF generation (Playwright /
 * @react-pdf/renderer) is on the Phase 4 roadmap.
 */
export default async function PrintConsultPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const user = await getServerAuthUser();
  if (!user) redirect(`/login?next=/print/consults/${id}`);
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
    redirect("/account");
  }

  const [consultRes, examsRes] = await Promise.all([
    fetchDoctorConsultation(id),
    fetchDoctorExams(id),
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

  return (
    <main
      style={{
        maxWidth: 800,
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
          Consultation summary
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 26 }}>{appointment.fullName}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
          {appointment.consultationType} ·{" "}
          {appointment.scheduledAt
            ? new Date(appointment.scheduledAt).toLocaleString()
            : "Not scheduled"}{" "}
          · {appointment.countryCode.toUpperCase()}
        </p>
        {consultation?.status === "SIGNED" && consultation.signedAt ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#0a7d40" }}>
            Signed {new Date(consultation.signedAt).toLocaleString()}
          </p>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#a55a00" }}>
            Draft — not yet signed
          </p>
        )}
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

      <SoapSection title="Chief complaint" body={consultation?.chiefComplaint} />
      <SoapSection title="Subjective" body={consultation?.subjective} />
      <SoapSection title="Objective" body={consultation?.objective} />
      <SoapSection title="Assessment" body={consultation?.assessment} />
      <SoapSection title="Plan" body={consultation?.plan} />

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
                  <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>
                    {r.notes}
                  </p>
                ) : null}
                {r.externalUrl ? (
                  <p style={{ margin: "2px 0 0", fontSize: 12 }}>
                    Report: {r.externalUrl}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
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

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#555",
  margin: "0 0 6px",
};

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
