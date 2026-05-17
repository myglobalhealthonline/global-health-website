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

  return (
    <main
      style={{
        maxWidth: 720,
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#555",
            }}
          >
            Invoice
          </p>
          <h1 style={{ margin: "6px 0 0", fontSize: 26 }}>
            {appointment ? appointment.fullName : "Patient"}
          </h1>
          {appointment ? (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
              {appointment.email}
              {appointment.phone ? ` · ${appointment.phone}` : ""}
            </p>
          ) : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
            Ref · <code>{id.slice(0, 12)}</code>
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>
            {appointment?.scheduledAt
              ? new Date(appointment.scheduledAt).toLocaleString()
              : appointment?.createdAt
                ? new Date(appointment.createdAt).toLocaleDateString()
                : ""}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              display: "inline-block",
              background:
                invoice.paymentStatus === "PAID"
                  ? "#d1fae5"
                  : invoice.paymentStatus === "REFUNDED"
                    ? "#fee2e2"
                    : "#fef3c7",
              color:
                invoice.paymentStatus === "PAID"
                  ? "#065f46"
                  : invoice.paymentStatus === "REFUNDED"
                    ? "#991b1b"
                    : "#92400e",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            {invoice.paymentStatus}
          </p>
        </div>
      </header>

      <section style={{ marginBottom: 24 }}>
        <table
          style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #111" }}>
              <th style={{ textAlign: "left", padding: "8px 0" }}>Item</th>
              <th style={{ textAlign: "right", padding: "8px 0", width: 60 }}>
                Qty
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", width: 100 }}>
                Unit
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", width: 100 }}>
                Line
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "12px 0", color: "#666" }}>
                  Consultation fee
                </td>
              </tr>
            ) : (
              invoice.lines.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 0" }}>{l.label}</td>
                  <td style={{ textAlign: "right", padding: "8px 0" }}>{l.quantity}</td>
                  <td style={{ textAlign: "right", padding: "8px 0" }}>
                    {fmtMoney(l.unitPriceCents, l.currencyCode ?? currencyFallback)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 0" }}>
                    {fmtMoney(
                      l.unitPriceCents != null ? l.unitPriceCents * l.quantity : null,
                      l.currencyCode ?? currencyFallback,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {(() => {
              const buckets = Object.entries(
                invoice.lineTotalsByCurrency ?? {},
              ).filter(([, v]) => v > 0);
              if (buckets.length > 1) {
                return buckets.map(([code, total]) => (
                  <tr key={code} style={{ borderTop: "1px solid #111" }}>
                    <td
                      colSpan={3}
                      style={{ textAlign: "right", padding: "8px 0", fontWeight: 700 }}
                    >
                      Total ({code})
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 700 }}>
                      {fmtMoney(total, code === "—" ? currencyFallback : code)}
                    </td>
                  </tr>
                ));
              }
              return (
                <tr style={{ borderTop: "2px solid #111" }}>
                  <td
                    colSpan={3}
                    style={{ textAlign: "right", padding: "10px 0", fontWeight: 700 }}
                  >
                    Total
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 0", fontWeight: 700 }}>
                    {fmtMoney(
                      invoice.lineTotalCents > 0
                        ? invoice.lineTotalCents
                        : invoice.amountCents,
                      currencyFallback,
                    )}
                  </td>
                </tr>
              );
            })()}
          </tfoot>
        </table>
      </section>

      {invoice.payments.length > 0 ? (
        <section style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#555",
              margin: "0 0 6px",
            }}
          >
            Payment events
          </h2>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: "4px 0" }}>{new Date(p.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "4px 0", color: "#555" }}>{p.status}</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>
                    {fmtMoney(p.amountCents, p.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
