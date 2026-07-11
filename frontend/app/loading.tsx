export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading page"
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center gap-6 gh2-section-forest"
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute size-32 animate-ping rounded-full bg-[var(--color-accent)]/10" />
        <span className="absolute size-32 animate-spin rounded-full border-2 border-white/10 border-t-[var(--color-accent)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/global-health-light.png"
          alt="Global Health"
          className="relative h-16 w-auto"
        />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
