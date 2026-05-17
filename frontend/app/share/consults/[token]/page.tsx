import { notFound } from "next/navigation";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = { token: string };

type SharedConsult = {
  id: string;
  status: "DRAFT" | "SIGNED";
  signedAt: string | null;
  chiefComplaint: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  doctor: { fullName: string; title: string } | null;
  appointment: {
    fullName: string;
    consultationType: string;
    countryCode: string;
    scheduledAt: string | null;
    dateOfBirth: string | null;
    createdAt: string;
  };
};

/**
 * Public-facing shared consultation. Token in the URL is the proof of
 * access; no auth required. Backend returns 410 if expired/revoked —
 * we render a friendly "link no longer valid" page in that case.
 *
 * No headers / layout shell. Designed for a referring colleague to
 * read and print.
 */
export default async function SharedConsultPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const backend = getBackendOrigin();
  if (!backend) {
    return (
      <Wrapper>
        <p>Service unavailable. Try again later.</p>
      </Wrapper>
    );
  }
  const res = await fetch(
    `${backend}/api/share-links/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) notFound();
  if (res.status === 410) {
    const json = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    return (
      <Wrapper>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Link no longer valid</h1>
        <p style={{ color: "#666" }}>
          {json?.message ?? "This shared link has expired or been revoked."}
        </p>
      </Wrapper>
    );
  }
  if (!res.ok) {
    return (
      <Wrapper>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Could not load</h1>
        <p style={{ color: "#666" }}>Please ask the sender for a new link.</p>
      </Wrapper>
    );
  }
  const json = (await res.json()) as {
    ok: boolean;
    data: { consultation: SharedConsult; expiresAt: string };
  };
  const { consultation, expiresAt } = json.data;

  return (
    <Wrapper>
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
          Shared consultation summary
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 26 }}>
          {consultation.appointment.fullName}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
          {consultation.appointment.consultationType} ·{" "}
          {consultation.appointment.scheduledAt
            ? new Date(consultation.appointment.scheduledAt).toLocaleString()
            : "Not scheduled"}{" "}
          · {consultation.appointment.countryCode.toUpperCase()}
        </p>
        {consultation.doctor ? (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#222" }}>
            Recorded by {consultation.doctor.fullName}
            {consultation.doctor.title ? `, ${consultation.doctor.title}` : ""}
          </p>
        ) : null}
        {consultation.signedAt ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#0a7d40" }}>
            Signed {new Date(consultation.signedAt).toLocaleString()}
          </p>
        ) : null}
      </header>

      <SoapSection title="Chief complaint" body={consultation.chiefComplaint} />
      <SoapSection title="Subjective" body={consultation.subjective} />
      <SoapSection title="Objective" body={consultation.objective} />
      <SoapSection title="Assessment" body={consultation.assessment} />
      <SoapSection title="Plan" body={consultation.plan} />

      <footer
        style={{
          marginTop: 32,
          borderTop: "1px solid #ccc",
          paddingTop: 12,
          fontSize: 11,
          color: "#666",
        }}
      >
        Link expires {new Date(expiresAt).toLocaleString()} · Global Health
      </footer>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
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
      {children}
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
      <h2
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#555",
          margin: "0 0 6px",
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5 }}>{body}</p>
    </section>
  );
}
