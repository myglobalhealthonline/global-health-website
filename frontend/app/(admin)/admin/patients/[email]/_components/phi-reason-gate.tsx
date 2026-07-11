import { ShieldAlert } from "lucide-react";
import { AdminCard } from "../../../_components/atoms";
import { setPhiAccessReason } from "./phi-reason-actions";

/**
 * S-002 break-glass gate — shown instead of a patient's PHI when
 * ADMIN_PHI_REQUIRE_REASON is on and no gh_phi_reason cookie is present.
 * Server-rendered form; the server action sets the 15-min reason cookie
 * and redirects back to the page, which then fetches PHI normally.
 */
export function PhiReasonGate({
  returnTo,
  showError,
}: {
  returnTo: string;
  showError?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl pt-10">
      <AdminCard>
        <h1 className="flex items-center gap-2 text-[16px] font-bold text-[var(--color-text-primary)]">
          <ShieldAlert className="size-5 text-[var(--color-accent)]" aria-hidden />
          Reason required to view this medical record
        </h1>
        <p className="mt-2 text-portal-compact leading-relaxed text-[var(--color-text-muted)]">
          Access to patient health information requires a documented reason
          (break-glass). Your reason is stored in the medical access log with
          your name, and is valid for 15 minutes.
        </p>
        {showError ? (
          <p className="mt-3 text-portal-compact font-semibold text-red-600">
            Please enter a reason between 5 and 300 characters.
          </p>
        ) : null}
        <form action={setPhiAccessReason} className="mt-4 grid gap-3">
          <input type="hidden" name="next" value={returnTo} />
          <label
            htmlFor="phi-reason"
            className="text-portal-compact font-semibold text-[var(--color-text-primary)]"
          >
            Reason for access
          </label>
          <textarea
            id="phi-reason"
            name="reason"
            required
            minLength={5}
            maxLength={300}
            rows={3}
            placeholder='e.g. "Verifying ID documents for booking #1042" or "Patient support call — updating contact details"'
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent p-2.5 text-portal-compact text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="justify-self-start rounded-md bg-[var(--color-accent)] px-4 py-2 text-portal-compact font-bold text-white"
          >
            Confirm and view record
          </button>
        </form>
      </AdminCard>
    </div>
  );
}
