import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClinicalNoteBody } from "@/components/clinical/clinical-note-body";
import { formatAppDateTime } from "@/lib/format-datetime";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicMetadata({
  // Tokens grant access and must never be copied into crawler-facing fields.
  path: "/share/consults",
  title: "Secure consultation share",
  description: "Secure access to a consultation shared through Global Health.",
  kind: "page",
  noindex: true,
});

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
  noteFormat: "SOAP" | "FREEFORM";
  note: string | null;
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

// ── Variant K design tokens (mirrors print/consults + backend/src/lib/pdf/brand.ts) ──

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
function EcgRule({ limePeak = true }: { limePeak?: boolean }) {
  return (
    <svg
      viewBox="0 0 600 24"
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: 10 }}
      aria-hidden
    >
      <path
        d="M0 12 H250 L262 12 L268 12 L274 4 L282 20 L288 12 L300 12 H600"
        fill="none"
        stroke={VK.night}
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
 * Public-facing shared consultation. Token in the URL is the proof of
 * access; no auth required. Backend returns 410 if expired/revoked —
 * we render a friendly "link no longer valid" page in that case.
 *
 * No headers / layout shell. Designed for a referring colleague to read
 * and print, so it renders as its own paper sheet on an ivory backdrop:
 * the shared `body` is forced to the dark forest chrome colour
 * (globals.css, `background: #0f2e25 !important`), which this page's own
 * text used to sit directly on top of — dark ink on a dark ground,
 * effectively unreadable. Every branch below therefore paints its own
 * full-height surface, and the styles are inline because /share does not
 * load portal.css.
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
      <Notice title="Service unavailable">
        Please try again in a few minutes.
      </Notice>
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
      <Notice title="Link no longer valid">
        {json?.message ?? "This shared link has expired or been revoked."}
      </Notice>
    );
  }
  if (!res.ok) {
    return (
      <Notice title="Could not load">
        Please ask the sender for a new link.
      </Notice>
    );
  }
  const json = (await res.json()) as {
    ok: boolean;
    data: { consultation: SharedConsult; expiresAt: string };
  };
  const { consultation, expiresAt } = json.data;
  const appointment = consultation.appointment;
  const scheduledLabel = appointment.scheduledAt
    ? formatAppDateTime(appointment.scheduledAt)
    : "Not scheduled";

  return (
    <Sheet>
      <div className="vk-topline">
        <span className="vk-logo-text">Global Health</span>
        <span className="vk-caps vk-topline-caps">Shared consultation</span>
      </div>

      <header className="vk-masthead">
        <h1 className="vk-mast-title">Consultation</h1>
        <div className="vk-mast-sub">
          <span className="vk-mast-no">{appointment.fullName}</span>
          <span className="vk-mast-issued">{scheduledLabel}</span>
          <span
            className="vk-mast-status"
            style={
              consultation.signedAt
                ? undefined
                : { borderBottomColor: VK.faint }
            }
          >
            {consultation.signedAt
              ? `Signed ${new Date(consultation.signedAt).toLocaleDateString()}`
              : "Draft — not signed"}
          </span>
        </div>
        <div className="vk-ecg">
          <EcgRule limePeak={!!consultation.signedAt} />
        </div>
      </header>

      <div className="vk-parties">
        <div className="vk-party">
          <span className="vk-caps">Patient</span>
          <div className="vk-n">{appointment.fullName}</div>
          <div className="vk-l">
            {appointment.consultationType} ·{" "}
            {appointment.countryCode.toUpperCase()}
          </div>
        </div>
        {consultation.doctor ? (
          <div className="vk-party">
            <span className="vk-caps">Recorded by</span>
            <div className="vk-n">{consultation.doctor.fullName}</div>
            {consultation.doctor.title ? (
              <div className="vk-l">{consultation.doctor.title}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <SoapSection title="Chief complaint" body={consultation.chiefComplaint} />
      {consultation.noteFormat === "FREEFORM" ? (
        <SoapSection title="Clinical note" body={consultation.note} />
      ) : (
        <>
          <SoapSection title="Subjective" body={consultation.subjective} />
          <SoapSection title="Objective" body={consultation.objective} />
          <SoapSection title="Assessment" body={consultation.assessment} />
          <SoapSection title="Plan" body={consultation.plan} />
        </>
      )}

      <footer className="vk-foot">
        <div className="vk-foot-rule" />
        <div className="vk-fb">
          <span className="vk-fb-brand">Global Health</span>
          <span className="vk-fb-tag">
            link expires {new Date(expiresAt).toLocaleString()}
          </span>
        </div>
      </footer>
    </Sheet>
  );
}

/** The paper sheet + all of this route's styling. */
function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="vk-backdrop">
      <div className="vk-sheet">
        <div className="vk-spine" />
        <div className="vk-spine-caption">
          <span>Global Health</span>
        </div>
        <div className="vk-page">{children}</div>
      </div>
      <style>{SHEET_CSS}</style>
    </div>
  );
}

/** Expired / revoked / backend-down states, on the same paper. */
function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <div className="vk-topline">
        <span className="vk-logo-text">Global Health</span>
        <span className="vk-caps vk-topline-caps">Shared consultation</span>
      </div>
      <div className="vk-masthead">
        <h1 className="vk-mast-title">{title}</h1>
        <div className="vk-ecg">
          <EcgRule limePeak={false} />
        </div>
      </div>
      <p className="vk-notice">{children}</p>
    </Sheet>
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
    <section className="vk-section">
      <h2 className="vk-caps">{title}</h2>
      <ClinicalNoteBody body={body} prefix="vk-note" />
    </section>
  );
}

const SHEET_CSS = `
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
    margin: 0;
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
    margin: 0;
    font-weight: 400;
  }
  .vk-mast-sub { margin-top: 14px; display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap; }
  .vk-mast-no { font-size: 15px; font-weight: 700; letter-spacing: 0.01em; color: ${VK.forest}; font-family: ${VK_SERIF}; }
  .vk-mast-issued { font-size: 13px; color: ${VK.muted}; }
  .vk-mast-status {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${VK.night};
    border-bottom: 2px solid ${VK.lime};
    padding-bottom: 2px;
  }
  .vk-ecg { margin-top: 20px; }
  .vk-parties { display: flex; gap: 32px; margin-top: 28px; flex-wrap: wrap; }
  .vk-party { flex: 1 1 200px; min-width: 180px; }
  .vk-party .vk-caps { display: block; margin-bottom: 6px; }
  .vk-n { font-family: ${VK_SERIF}; font-size: 16px; color: ${VK.night}; }
  .vk-l { font-size: 12.5px; color: ${VK.muted}; margin-top: 3px; }
  .vk-notice { margin: 24px 0 0; font-size: 14px; color: ${VK.muted}; }
  .vk-section { margin-top: 28px; }
  .vk-section .vk-caps { display: block; margin-bottom: 8px; }

  /* Clinical note body — Markdown-lite output (ClinicalNoteBody). */
  .vk-note-body {
    font-family: ${VK_SERIF};
    font-size: 14px;
    line-height: 1.65;
    color: ${VK.ink};
    overflow-wrap: break-word;
  }
  .vk-note-p { margin: 0 0 10px; }
  .vk-note-body > :last-child { margin-bottom: 0; }
  .vk-note-h1, .vk-note-h2, .vk-note-h3 {
    font-family: ${VK_SANS};
    color: ${VK.night};
    margin: 18px 0 6px;
    line-height: 1.3;
  }
  .vk-note-body > :first-child { margin-top: 0; }
  .vk-note-h1 { font-size: 15px; font-weight: 700; letter-spacing: 0.01em; }
  .vk-note-h2 { font-size: 13.5px; font-weight: 700; }
  .vk-note-h3 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${VK.forest};
  }
  .vk-note-ul, .vk-note-ol { margin: 0 0 10px; padding-left: 20px; }
  .vk-note-ul { list-style: disc; }
  .vk-note-ol { list-style: decimal; }
  .vk-note-ul li, .vk-note-ol li { margin: 2px 0; }
  .vk-note-quote {
    margin: 0 0 10px;
    padding: 2px 0 2px 12px;
    border-left: 2px solid ${VK.hairlineDark};
    color: ${VK.muted};
  }
  .vk-note-rule { border: 0; border-top: 1px solid ${VK.hairline}; margin: 16px 0; }
  .vk-note-body code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px;
    background: ${VK.ivory};
    padding: 1px 4px;
    border-radius: 3px;
  }
  .vk-note-body strong { font-weight: 700; color: ${VK.night}; }

  .vk-foot { margin-top: 40px; }
  .vk-foot-rule { border-top: 1px solid ${VK.hairline}; margin-bottom: 14px; }
  .vk-fb { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 11px; }
  .vk-fb-brand { font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: ${VK.forest}; }
  .vk-fb-tag { color: ${VK.faint}; font-family: ${VK_SERIF}; font-style: italic; font-size: 13px; }

  @media (max-width: 640px) {
    .vk-backdrop { padding: 0; }
    .vk-sheet { box-shadow: none; }
    .vk-page { padding: 24px 20px 32px 34px; }
    .vk-mast-title { font-size: 30px; }
    .vk-mast-sub { gap: 10px; }
  }

  @media print {
    @page { size: A4; margin: 0; }
    html, body { background: ${VK.paper} !important; }
    .vk-backdrop { background: ${VK.paper}; padding: 0; min-height: 0; }
    .vk-sheet { max-width: none; box-shadow: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .vk-spine, .vk-spine-caption {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .vk-page { padding: 18mm 16mm 20mm 24mm; }
    .vk-section { break-inside: avoid; }
  }
`;
