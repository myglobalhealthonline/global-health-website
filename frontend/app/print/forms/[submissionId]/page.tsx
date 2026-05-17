import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const dynamic = "force-dynamic";

type Params = { submissionId: string };

type Field = {
  key: string;
  label: string;
  type: "text" | "longtext" | "choice" | "number" | "date";
  required?: boolean;
  options?: string[];
};

/**
 * Print-friendly form submission. Doctor / admin only. One server
 * fetch pulls the submission, the template it was filled against, and
 * the appointment context so the receiver knows whose form they're
 * looking at.
 */
export default async function PrintFormSubmissionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { submissionId } = await params;
  const user = await getServerAuthUser();
  if (!user) redirect(`/login?next=/print/forms/${submissionId}`);
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") redirect("/account");

  const backend = getBackendOrigin();
  if (!backend) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <p>Service unavailable.</p>
      </main>
    );
  }
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const res = await fetch(
    `${backend}/api/doctor/form-submissions/${encodeURIComponent(submissionId)}`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    },
  );
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <p>Could not load submission.</p>
      </main>
    );
  }
  const json = (await res.json()) as {
    ok: boolean;
    data: {
      submission: {
        id: string;
        template: {
          title: string;
          description: string | null;
          fields: Field[];
        };
        answers: Array<{ key: string; value: string | number | boolean | null }>;
        submittedAt: string;
      };
      appointment: {
        id: string;
        fullName: string;
        email: string;
        consultationType: string;
        countryCode: string;
      };
    };
  };
  const { submission, appointment } = json.data;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 32px",
        fontFamily: "var(--font-display), 'Helvetica Neue', Arial, sans-serif",
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
          Form submission
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 22 }}>
          {submission.template.title}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
          Submitted {new Date(submission.submittedAt).toLocaleString()}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13 }}>
          Patient: <strong>{appointment.fullName}</strong> · {appointment.email} ·{" "}
          {appointment.consultationType} · {appointment.countryCode.toUpperCase()}
        </p>
        {submission.template.description ? (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12.5,
              color: "#555",
              whiteSpace: "pre-wrap",
            }}
          >
            {submission.template.description}
          </p>
        ) : null}
      </header>

      <dl style={{ margin: 0, fontSize: 14 }}>
        {submission.template.fields.map((field) => {
          const a = submission.answers.find((entry) => entry.key === field.key);
          const value =
            a === undefined || a.value === null || a.value === ""
              ? "—"
              : String(a.value);
          return (
            <div
              key={field.key}
              style={{
                display: "flex",
                gap: 16,
                paddingBlock: 10,
                borderBottom: "1px solid #eee",
              }}
            >
              <dt
                style={{
                  minWidth: "40%",
                  color: "#555",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {field.label}
              </dt>
              <dd style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5 }}>
                {value}
              </dd>
            </div>
          );
        })}
      </dl>

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
