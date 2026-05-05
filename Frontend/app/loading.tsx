export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading page"
      className="flex min-h-[45vh] items-center justify-center"
    >
      <div className="border-muted border-t-primary size-10 animate-spin rounded-full border-4" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

