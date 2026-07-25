type Props = {
  meetingUrl: string | null;
  hasConsultation: boolean;
  variant?: "cell" | "panel";
};

export function OrderMeetLinkDisplay({
  meetingUrl,
  hasConsultation,
  variant = "cell",
}: Props) {
  if (!hasConsultation) {
    return variant === "cell" ? (
      <span className="gh-admin-order-meet-link text-xs text-[var(--color-text-muted)]">—</span>
    ) : null;
  }

  if (!meetingUrl) {
    return variant === "cell" ? (
      <span className="gh-admin-order-meet-link text-xs text-[var(--color-text-muted)]">Pending</span>
    ) : (
      <p className="gh-admin-order-meet-panel p-5 text-sm text-[var(--color-text-muted)]">
        Meet link is created automatically when payment completes.
      </p>
    );
  }

  if (variant === "cell") {
    return (
      <a
        href={meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gh-admin-order-meet-link inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
        title={meetingUrl}
      >
        Join Meet
      </a>
    );
  }

  return (
    <p className="gh-admin-order-meet-panel p-5 text-sm">
      <a
        href={meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gh-admin-order-meet-link inline-flex items-center gap-1.5 break-all font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        {meetingUrl}
      </a>
    </p>
  );
}
