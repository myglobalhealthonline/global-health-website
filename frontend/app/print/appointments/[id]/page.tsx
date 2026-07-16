import { notFound, redirect } from "next/navigation";
import { formatAppDateTime } from "@/lib/format-datetime";
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
 * Full appointment dossier for print. One server pass pulls consult,
 * exams, services, documents, form submissions, invoice. No sidebar /
 * branding — just a clean A4-sized sheet. Cmd-P → PDF works.
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

  const scheduledLabel = appointment.scheduledAt
    ? formatAppDateTime(appointment.scheduledAt)
    : "Not scheduled";

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
              Ref — {id.slice(0, 12)}
            </span>
          </div>

          <div className="vk-masthead">
            <div className="vk-mast-title">Appointment</div>
            <div className="vk-mast-sub">
              <span className="vk-mast-no">{appointment.fullName}</span>
              <span className="vk-mast-issued">{scheduledLabel}</span>
              <span className="vk-mast-status">{appointment.status}</span>
            </div>
            <div className="vk-ecg">
              <EcgRule />
            </div>
          </div>

          <div className="vk-parties">
            <div className="vk-party">
              <span className="vk-caps">Patient</span>
              <div className="vk-n">{appointment.fullName}</div>
              <div className="vk-l">
                {appointment.email}
                {appointment.phone ? ` · ${appointment.phone}` : ""}
              </div>
              {appointment.dateOfBirth ? (
                <div className="vk-l">
                  DOB {new Date(appointment.dateOfBirth).toLocaleDateString()}
                </div>
              ) : null}
            </div>
            <div className="vk-party">
              <span className="vk-caps">Consultation</span>
              <div className="vk-n">{appointment.consultationType}</div>
              <div className="vk-l">
                {appointment.countryCode.toUpperCase()} ·{" "}
                {appointment.consultationMode === "IN_PERSON" ? "In person" : "Online"}
              </div>
              {consultation ? (
                <div className="vk-l">
                  Consult {consultation.status}
                  {consultation.signedAt
                    ? ` · signed ${new Date(consultation.signedAt).toLocaleString()}`
                    : ""}
                </div>
              ) : null}
            </div>
          </div>

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
            <div className="vk-section">
              <span className="vk-caps">Services rendered</span>
              <table className="vk-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="vk-num">Qty</th>
                    <th className="vk-num">Unit</th>
                    <th className="vk-num">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesUsed.map((s) => (
                    <tr key={s.id}>
                      <td className="vk-td vk-desc">{s.service?.name ?? s.customLabel ?? "—"}</td>
                      <td className="vk-td vk-num">{s.quantity}</td>
                      <td className="vk-td vk-num">
                        {fmtMoney(s.unitPriceCents, s.currencyCode)}
                      </td>
                      <td className="vk-td vk-num vk-strong">
                        {fmtMoney(
                          s.unitPriceCents != null ? s.unitPriceCents * s.quantity : null,
                          s.currencyCode,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {exams.length > 0 ? (
            <div className="vk-section">
              <span className="vk-caps">Exam results</span>
              <div className="vk-list">
                {exams.map((r) => (
                  <div className="vk-list-item" key={r.id}>
                    <div className="vk-n" style={{ fontSize: 14 }}>
                      {r.testName}
                      {r.performedAt
                        ? ` · ${new Date(r.performedAt).toLocaleDateString()}`
                        : ""}
                    </div>
                    {r.notes ? <p className="vk-section-body">{r.notes}</p> : null}
                    {r.externalUrl ? (
                      <p className="vk-l" style={{ marginTop: 4 }}>Report: {r.externalUrl}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {documents.length > 0 ? (
            <div className="vk-section">
              <span className="vk-caps">Attached documents</span>
              <div className="vk-list">
                {documents.map((d) => (
                  <div className="vk-list-item vk-l" key={d.id}>
                    {d.label} · {d.mimetype} · {(d.byteSize / 1024).toFixed(1)} KB
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {submissions.length > 0 ? (
            <div className="vk-section">
              <span className="vk-caps">Form submissions</span>
              {submissions.map((s) => (
                <div className="vk-list-item" key={s.id}>
                  <div className="vk-n" style={{ fontSize: 14 }}>{s.template.title}</div>
                  <div className="vk-l" style={{ marginBottom: 8 }}>
                    {new Date(s.submittedAt).toLocaleString()}
                  </div>
                  {(s.answers ?? []).map((a, i) => {
                    const def = s.template.fields.find((f) => f.key === a.key);
                    return (
                      <div className="vk-kv" key={i}>
                        <span className="vk-kv-k">{def?.label ?? a.key}</span>
                        <span className="vk-kv-v">
                          {a.value === null || a.value === "" ? "—" : String(a.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}

          {invoice ? (
            <div className="vk-section">
              <span className="vk-caps">Billing</span>
              <p className="vk-section-body" style={{ fontFamily: VK_SANS, fontSize: 13.5 }}>
                Status: {invoice.paymentStatus} ·{" "}
                {fmtMoney(invoice.amountCents, invoice.currencyCode)}
                {invoice.paidAt
                  ? ` · paid ${new Date(invoice.paidAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          ) : null}

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
        .vk-party { flex: 1 1 160px; min-width: 160px; }
        .vk-party .vk-caps { display: block; margin-bottom: 6px; }
        .vk-n { font-family: ${VK_SERIF}; font-size: 16px; color: ${VK.night}; }
        .vk-l { font-size: 12.5px; color: ${VK.muted}; margin-top: 3px; }
        .vk-items { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .vk-items th {
          text-align: left;
          padding: 0 0 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${VK.forest};
          border-bottom: 2px solid ${VK.night};
        }
        .vk-items th.vk-num { text-align: right; }
        .vk-items th:nth-child(2) { width: 48px; }
        .vk-items th:nth-child(3), .vk-items th:nth-child(4) { width: 96px; }
        .vk-td { padding: 14px 0; border-bottom: 1px solid ${VK.hairline}; }
        .vk-td.vk-desc { font-family: ${VK_SERIF}; font-size: 15px; color: ${VK.night}; padding-right: 24px; }
        .vk-td.vk-num {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          font-size: 13.5px;
          color: ${VK.muted};
        }
        .vk-td.vk-strong { color: ${VK.night}; }
        .vk-section { margin-top: 28px; }
        .vk-section .vk-caps { display: block; margin-bottom: 8px; }
        .vk-section-body { margin: 6px 0 0; font-family: ${VK_SERIF}; font-size: 14px; color: ${VK.ink}; white-space: pre-wrap; line-height: 1.6; }
        .vk-list { margin-top: 4px; }
        .vk-list-item { padding: 10px 0; border-bottom: 1px solid ${VK.hairline}; }
        .vk-list-item:first-child { padding-top: 0; }
        .vk-kv { display: flex; gap: 16px; padding: 6px 0; border-bottom: 1px solid ${VK.hairline}; }
        .vk-kv-k { min-width: 38%; font-size: 12px; color: ${VK.muted}; }
        .vk-kv-v { font-size: 13.5px; color: ${VK.ink}; white-space: pre-wrap; }
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

function SoapSection({
  title,
  body,
}: {
  title: string;
  body: string | null | undefined;
}) {
  if (!body || body.trim() === "") return null;
  return (
    <div className="vk-section">
      <span className="vk-caps">{title}</span>
      <p className="vk-section-body">{body}</p>
    </div>
  );
}
