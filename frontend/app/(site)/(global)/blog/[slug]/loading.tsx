export default function BlogPostLoading() {
  return (
    <div
      className="mx-auto max-w-[var(--container-width)] px-5 md:px-10"
      style={{ padding: "clamp(80px,10vw,140px) clamp(20px,4vw,40px)" }}
      aria-busy="true"
      aria-label="Loading article…"
    >
      <div className="animate-pulse space-y-6">
        <div className="h-3 w-24 rounded-full bg-[rgba(29,75,54,0.12)]" />
        <div className="h-10 w-3/4 rounded-lg bg-[rgba(29,75,54,0.12)]" />
        <div className="h-5 w-1/2 rounded-lg bg-[rgba(29,75,54,0.08)]" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-4 rounded bg-[rgba(29,75,54,0.08)]"
              style={{ width: `${85 - i * 5}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
