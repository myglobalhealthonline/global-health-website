import { PageHeaderSkeleton, SummaryStripSkeleton } from "@/components/portal-skeletons";

// ponytail: hand-rolled to match the real card-list layout (09-005) — Forms
// isn't a table, so ListPageSkeleton's table+filter shape doesn't apply.
export default function DoctorFormsLoading() {
  return (
    <div className="gh-skeleton-list space-y-6">
      <PageHeaderSkeleton />
      <SummaryStripSkeleton items={2} />
      <section className="gh-card gh-skeleton-section p-6">
        <div className="gh-skeleton-bar mb-4 h-5 w-40" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-[var(--portal-line)] p-4">
              <div className="gh-skeleton-bar h-4 w-48" />
              <div className="gh-skeleton-bar mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
