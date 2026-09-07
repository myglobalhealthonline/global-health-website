import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DataDeletionRequestAction,
  isDeletionRequestOpen,
  type DataDeletionI18n,
} from "@/app/(portal)/(auth)/account/security/_components/data-deletion-request";

/**
 * PR-2: the formal (admin-reviewed) GDPR erasure request had a backend
 * endpoint, an admin review queue, and no frontend caller at all. The account
 * portal's Data tab now offers it beside the self-service 30-day deletion.
 *
 * What must not regress: a patient with a request already in the queue is
 * shown its state instead of a second submit button — the endpoint's own
 * 3-per-24h rate limit is a backstop, not the UX.
 */
const i18n: DataDeletionI18n = {
  formalRequestCta: "Request formal deletion",
  formalRequestDialogTitle: "Request formal deletion?",
  formalRequestDialogBody: "Reviewed by the privacy team.",
  formalRequestReasonLabel: "Reason (optional)",
  formalRequestReasonPlaceholder: "Tell us why you are asking",
  formalRequestSubmit: "Submit request",
  formalRequestSubmitting: "Submitting…",
  formalRequestPending: "Formal deletion request submitted on {date}.",
  formalRequestFailed: "Could not submit your request",
  cancel: "Cancel",
};

const render = (request: Parameters<typeof DataDeletionRequestAction>[0]["request"]) =>
  renderToStaticMarkup(
    <DataDeletionRequestAction i18n={i18n} request={request} onSubmitted={() => {}} />,
  );

describe("account data-deletion request action", () => {
  it("offers the request when the patient has none", () => {
    const html = render(null);
    expect(html).toContain("Request formal deletion");
    expect(html).not.toContain("Formal deletion request submitted");
  });

  it("replaces the button with the pending state once one is open", () => {
    const html = render({
      id: "req-1",
      requestStatus: "SUBMITTED",
      requestedAt: "2026-09-01T10:00:00.000Z",
    });
    expect(html).toContain("Formal deletion request submitted");
    expect(html).not.toContain("Request formal deletion");
  });

  it("treats an in-progress review as open and a finished one as closed", () => {
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "PARTIALLY_COMPLETED"]) {
      expect(
        isDeletionRequestOpen({ id: "r", requestStatus: status, requestedAt: "2026-09-01" }),
        status,
      ).toBe(true);
    }
    for (const status of ["COMPLETED", "REJECTED"]) {
      expect(
        isDeletionRequestOpen({ id: "r", requestStatus: status, requestedAt: "2026-09-01" }),
        status,
      ).toBe(false);
    }
    expect(isDeletionRequestOpen(null)).toBe(false);
  });

  it("lets the patient ask again once the previous request is finished", () => {
    const html = render({
      id: "req-0",
      requestStatus: "REJECTED",
      requestedAt: "2026-08-01T10:00:00.000Z",
    });
    expect(html).toContain("Request formal deletion");
  });
});
