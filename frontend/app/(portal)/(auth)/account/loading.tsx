import { CommandBandSkeleton, StatGridSkeleton } from "@/components/portal-skeletons";

export default function AccountLoading() {
  return (
    <div className="gh-patient-page grid gap-6">
      <CommandBandSkeleton metrics={3} />
      <StatGridSkeleton items={3} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-80 rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)]" />
        <div className="h-80 rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)]" />
      </div>
    </div>
  );
}
