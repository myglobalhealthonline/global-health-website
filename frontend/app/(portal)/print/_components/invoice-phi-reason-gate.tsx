import { setPhiAccessReason } from "../../(admin)/admin/_components/phi-reason-actions";

/**
 * S-002 break-glass gate for the printable billing document.
 *
 * The admin invoice detail route runs `guardMedicalRead`, and in production
 * ADMIN_PHI_REQUIRE_REASON is on — so a plain ADMIN with no `gh_phi_reason`
 * cookie is denied ADMIN_BREAK_GLASS_REASON_REQUIRED. This page used to turn
 * that 403 into `notFound()`, which is why the admin portal's "View" button
 * looked like a broken link rather than a control asking for a reason.
 *
 * Deliberately NOT the admin portal's `PhiReasonGate`: /print does not load
 * portal.css (see CLAUDE.md), so the admin card styling would not apply here.
 * Same server action, same 15-minute cookie, standalone styling.
 */
export function InvoicePhiReasonGate({
  returnTo,
  showError,
}: {
  returnTo: string;
  showError?: boolean;
}) {
  return (
    <div style={{ margin: "0 auto", maxWidth: "34rem", padding: "3rem 1.25rem" }}>
      <div
        style={{
          border: "1px solid #E4E7DD",
          borderRadius: "16px",
          background: "#ffffff",
          padding: "1.75rem",
          fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#2D3B36",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
          Reason required to view this document
        </h1>
        <p style={{ marginTop: "0.6rem", fontSize: "14px", lineHeight: 1.6, color: "#5b6b66" }}>
          This billing document carries patient information. Your reason is
          stored in the medical access log with your name and is valid for 15
          minutes.
        </p>
        {showError ? (
          <p style={{ marginTop: "0.75rem", fontSize: "14px", fontWeight: 600, color: "#c02626" }}>
            Please enter a reason between 5 and 300 characters.
          </p>
        ) : null}
        <form action={setPhiAccessReason} style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <input type="hidden" name="next" value={returnTo} />
          <label htmlFor="phi-reason" style={{ fontSize: "14px", fontWeight: 600 }}>
            Reason for access
          </label>
          <textarea
            id="phi-reason"
            name="reason"
            required
            minLength={5}
            maxLength={300}
            rows={3}
            placeholder='e.g. "Patient support call — resending invoice IE-00326"'
            style={{
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #E4E7DD",
              padding: "0.6rem",
              fontSize: "14px",
              fontFamily: "inherit",
              color: "#2D3B36",
            }}
          />
          <button
            type="submit"
            style={{
              justifySelf: "start",
              borderRadius: "8px",
              border: "none",
              background: "#2D4F3D",
              color: "#ffffff",
              padding: "0.6rem 1.1rem",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Confirm and view document
          </button>
        </form>
      </div>
    </div>
  );
}
