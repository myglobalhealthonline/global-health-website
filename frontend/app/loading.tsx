export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading page"
      className="flex min-h-[45vh] items-center justify-center"
    >
      <div className="size-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-brand-primary)]" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
