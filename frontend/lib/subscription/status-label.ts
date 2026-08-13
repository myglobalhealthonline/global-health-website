type StatusCopy = {
  status_active: string;
  status_incomplete: string;
  status_past_due: string;
  status_canceled: string;
  status_paused: string;
};

/**
 * Localized label for a subscription status. Lives outside ManagePanel so the
 * server page (membership card pill) and the client panel can't drift — the
 * card used to print the raw wire value ("INCOMPLETE").
 */
export function subscriptionStatusLabel(status: string, t: StatusCopy): string {
  switch (status) {
    case "ACTIVE":
      return t.status_active;
    case "INCOMPLETE":
      return t.status_incomplete;
    case "PAST_DUE":
      return t.status_past_due;
    case "CANCELED":
      return t.status_canceled;
    case "PAUSED":
      return t.status_paused;
    default:
      return status.toLowerCase();
  }
}
