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

// ── Variant K design tokens (mirrors backend/src/lib/pdf/brand.ts) ──────────

const VK = {
  night: "#0F2E25",
  forest: "#1D4B36",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FFFFFF",
  ivory: "#F6F8F1",
  lime: "#B0F122",
};
const VK_SANS = `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`;
const VK_SERIF = `Georgia, "Times New Roman", serif`;

/** ECG pulse rule — brand motif, mirrors backend/src/lib/pdf/brand.ts pdfEcgRule(). */
function EcgRule({ strokeColor = VK.night, limePeak = true }: { strokeColor?: string; limePeak?: boolean }) {
  return (
    <svg viewBox="0 0 600 24" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 10 }}>
      <path
        d="M0 12 H250 L262 12 L268 12 L274 4 L282 20 L288 12 L300 12 H600"
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
      />
      {limePeak ? (
        <path
          d="M262 12 L268 12 L274 4 L282 20 L288 12 L294 12"
          fill="none"
          stroke={VK.lime}
          strokeWidth={1.6}
        />
      ) : null}
    </svg>
  );
}

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
  const submittedLabel = new Date(submission.submittedAt).toLocaleString();

  return (
    <div className="vk-backdrop">
      <div className="vk-sheet">
        <div className="vk-spine" />
        <div className="vk-spine-caption">
          <span>Global Health</span>
        </div>

        <div className="vk-page">
          <div className="vk-topline">
            <span className="vk-logo-text">Global Health</span>
            <span className="vk-caps vk-topline-caps">
              Ref — {submissionId.slice(0, 12)}
            </span>
          </div>

          <div className="vk-masthead">
            <div className="vk-mast-title">Form Submission</div>
            <div className="vk-mast-sub">
              <span className="vk-mast-no">{submission.template.title}</span>
              <span className="vk-mast-issued">{submittedLabel}</span>
            </div>
            <div className="vk-ecg">
              <EcgRule />
            </div>
          </div>

          {submission.template.description ? (
            <p className="vk-section-body" style={{ marginTop: 16 }}>
              {submission.template.description}
            </p>
          ) : null}

          <div className="vk-parties">
            <div className="vk-party">
              <span className="vk-caps">Patient</span>
              <div className="vk-n">{appointment.fullName}</div>
              <div className="vk-l">{appointment.email}</div>
            </div>
            <div className="vk-party">
              <span className="vk-caps">Consultation</span>
              <div className="vk-n">{appointment.consultationType}</div>
              <div className="vk-l">{appointment.countryCode.toUpperCase()}</div>
            </div>
          </div>

          <div className="vk-section">
            <span className="vk-caps">Responses</span>
            <div className="vk-kv-list">
              {submission.template.fields.map((field) => {
                const a = submission.answers.find((entry) => entry.key === field.key);
                const value =
                  a === undefined || a.value === null || a.value === ""
                    ? "—"
                    : String(a.value);
                return (
                  <div className="vk-kv" key={field.key}>
                    <span className="vk-kv-k">{field.label}</span>
                    <span className="vk-kv-v">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="vk-foot">
            <div className="vk-foot-rule" />
            <div className="vk-fb">
              <span className="vk-fb-brand">Global Health</span>
              <span className="vk-fb-tag">printed {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .vk-backdrop {
          background: ${VK.ivory};
          min-height: 100vh;
          padding: 40px 16px;
          font-family: ${VK_SANS};
          color: ${VK.ink};
        }
        .vk-sheet {
          position: relative;
          max-width: 820px;
          margin: 0 auto;
          background: ${VK.paper};
          box-shadow: 0 1px 3px rgba(15, 46, 37, 0.08), 0 20px 48px rgba(15, 46, 37, 0.1);
          overflow: hidden;
        }
        .vk-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 18px;
          background: ${VK.night};
        }
        .vk-spine-caption {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 32px;
        }
        .vk-spine-caption span {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(242, 245, 236, 0.75);
        }
        .vk-page { position: relative; padding: 32px 32px 40px 56px; }
        .vk-caps {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: ${VK.faint};
        }
        .vk-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid ${VK.hairlineDark};
          padding-bottom: 14px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .vk-topline-caps { color: ${VK.forest}; }
        .vk-logo-text { font-size: 18px; font-weight: 700; color: ${VK.forest}; letter-spacing: 0.04em; }
        .vk-masthead { margin-top: 28px; }
        .vk-mast-title {
          font-family: ${VK_SERIF};
          font-style: italic;
          font-size: 40px;
          line-height: 1.05;
          color: ${VK.night};
          letter-spacing: -0.01em;
        }
        .vk-mast-sub { margin-top: 14px; display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap; }
        .vk-mast-no { font-size: 15px; font-weight: 700; letter-spacing: 0.01em; color: ${VK.forest}; font-family: ${VK_SERIF}; }
        .vk-mast-issued { font-size: 13px; color: ${VK.muted}; }
        .vk-ecg { margin-top: 20px; }
        .vk-parties { display: flex; gap: 32px; margin-top: 28px; flex-wrap: wrap; }
        .vk-party { flex: 1 1 160px; min-width: 160px; }
        .vk-party .vk-caps { display: block; margin-bottom: 6px; }
        .vk-n { font-family: ${VK_SERIF}; font-size: 16px; color: ${VK.night}; }
        .vk-l { font-size: 12.5px; color: ${VK.muted}; margin-top: 3px; }
        .vk-section { margin-top: 28px; }
        .vk-section .vk-caps { display: block; margin-bottom: 8px; }
        .vk-section-body { margin: 6px 0 0; font-family: ${VK_SERIF}; font-size: 14px; color: ${VK.ink}; white-space: pre-wrap; line-height: 1.6; }
        .vk-kv-list { margin-top: 4px; }
        .vk-kv { display: flex; gap: 16px; padding: 10px 0; border-bottom: 1px solid ${VK.hairline}; }
        .vk-kv:first-child { padding-top: 0; }
        .vk-kv-k { min-width: 38%; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; color: ${VK.muted}; }
        .vk-kv-v { font-family: ${VK_SERIF}; font-size: 14px; color: ${VK.ink}; white-space: pre-wrap; }
        .vk-foot { margin-top: 40px; }
        .vk-foot-rule { border-top: 1px solid ${VK.hairline}; margin-bottom: 14px; }
        .vk-fb { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 11px; }
        .vk-fb-brand { font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: ${VK.forest}; }
        .vk-fb-tag { color: ${VK.faint}; font-family: ${VK_SERIF}; font-style: italic; font-size: 13px; }

        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: ${VK.paper}; }
          .vk-backdrop { background: ${VK.paper}; padding: 0; min-height: 0; }
          .vk-sheet { max-width: none; box-shadow: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .vk-spine, .vk-spine-caption {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .vk-page { padding: 18mm 16mm 20mm 24mm; }
        }
      `}</style>
    </div>
  );
}
