import { notFound, redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchDoctorConsultation,
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
 * Standalone invoice receipt for print/share. One server pass pulls
 * the patient context (from the consultation endpoint) and the invoice
 * payload (lines + payments + totals). Doctor / admin only.
 */
export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const user = await getServerAuthUser();
  if (!user) redirect(`/login?next=/print/invoices/${id}`);
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") redirect("/account");

  const [consultRes, invoiceRes] = await Promise.all([
    fetchDoctorConsultation(id),
    fetchDoctorInvoice(id),
  ]);
  if (!invoiceRes.ok) {
    if (invoiceRes.status === 404) notFound();
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <p>{invoiceRes.message}</p>
      </main>
    );
  }
  if (!consultRes.ok) {
    if (consultRes.status === 404) notFound();
  }
  const invoice = invoiceRes.data.invoice;
  const appointment = consultRes.ok ? consultRes.data.appointment : null;
  const currencyFallback =
    invoice.lines.find((l) => l.currencyCode)?.currencyCode ??
    invoice.currencyCode ??
    "EUR";

  const isPaid = invoice.paymentStatus === "PAID";
  const isRefunded = invoice.paymentStatus === "REFUNDED";
  const scheduledLabel = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt).toLocaleString()
    : appointment?.createdAt
      ? new Date(appointment.createdAt).toLocaleDateString()
      : "";

  const buckets = Object.entries(invoice.lineTotalsByCurrency ?? {}).filter(
    ([, v]) => v > 0,
  );

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
            <div className="vk-mast-title">Invoice</div>
            <div className="vk-mast-sub">
              <span className="vk-mast-no">
                {appointment ? appointment.fullName : "Patient"}
              </span>
              {scheduledLabel ? (
                <span className="vk-mast-issued">{scheduledLabel}</span>
              ) : null}
              <span className="vk-mast-status">
                {isPaid ? "PAID" : isRefunded ? "REFUNDED" : invoice.paymentStatus}
              </span>
            </div>
            <div className="vk-ecg">
              <EcgRule />
            </div>
          </div>

          {appointment ? (
            <div className="vk-parties">
              <div className="vk-party">
                <span className="vk-caps">Patient</span>
                <div className="vk-n">{appointment.fullName}</div>
                <div className="vk-l">{appointment.email}</div>
                {appointment.phone ? <div className="vk-l">{appointment.phone}</div> : null}
              </div>
            </div>
          ) : null}

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
              {invoice.lines.length === 0 ? (
                <tr>
                  <td className="vk-td vk-desc" colSpan={4}>
                    Consultation fee
                  </td>
                </tr>
              ) : (
                invoice.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="vk-td vk-desc">{l.label}</td>
                    <td className="vk-td vk-num">{l.quantity}</td>
                    <td className="vk-td vk-num">
                      {fmtMoney(l.unitPriceCents, l.currencyCode ?? currencyFallback)}
                    </td>
                    <td className="vk-td vk-num vk-strong">
                      {fmtMoney(
                        l.unitPriceCents != null ? l.unitPriceCents * l.quantity : null,
                        l.currencyCode ?? currencyFallback,
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="vk-settle">
            <div className="vk-settle-left" />
            <div className="vk-totals">
              {buckets.length > 1 ? (
                buckets.map(([code, total]) => (
                  <div className="vk-grand" key={code} style={{ marginTop: 4 }}>
                    <span className="vk-gl">Total ({code})</span>
                    <span className="vk-gv">
                      {fmtMoney(total, code === "—" ? currencyFallback : code)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="vk-grand">
                  <span className="vk-gl">Total</span>
                  <span className="vk-gv">
                    {fmtMoney(
                      invoice.lineTotalCents > 0 ? invoice.lineTotalCents : invoice.amountCents,
                      currencyFallback,
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {invoice.payments.length > 0 ? (
            <div className="vk-payments">
              <span className="vk-caps">Payment events</span>
              <table className="vk-payments-table">
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="vk-pay-date">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="vk-pay-status">{p.status}</td>
                      <td className="vk-pay-amt">{fmtMoney(p.amountCents, p.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        .vk-items { width: 100%; border-collapse: collapse; margin-top: 28px; }
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
        .vk-settle { display: flex; justify-content: flex-end; margin-top: 24px; }
        .vk-settle-left { flex: 1; }
        .vk-totals { width: 280px; max-width: 100%; }
        .vk-grand {
          border-top: 2px solid ${VK.night};
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .vk-gl { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${VK.forest}; }
        .vk-gv { font-family: ${VK_SERIF}; font-style: italic; font-size: 28px; color: ${VK.night}; letter-spacing: -0.01em; }
        .vk-payments { margin-top: 28px; }
        .vk-payments .vk-caps { display: block; margin-bottom: 8px; }
        .vk-payments-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .vk-payments-table td { padding: 5px 0; border-bottom: 1px solid ${VK.hairline}; }
        .vk-pay-status { color: ${VK.muted}; padding-left: 12px; }
        .vk-pay-amt { text-align: right; font-variant-numeric: tabular-nums; color: ${VK.ink}; }
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
