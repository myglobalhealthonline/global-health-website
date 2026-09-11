import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

/**
 * Vertical booking-steps rail for the dark sidebar panel. Shared by the
 * consultation wizard (/book) and the test-centre flow (/book-a-test) so both
 * booking journeys read as the same product.
 */
export function StepIndicator({
  current,
  labels,
  values,
  hrefs,
}: {
  current: number;
  labels: string[];
  values: (string | null)[];
  /** Back-nav target per step. Only rendered as a link when the step is
   *  complete (step.n < current) — current/future steps aren't reachable
   *  yet. Replaces the old per-card "Change service" / "Edit doctor" /
   *  "Change time" ghost buttons: back-navigation lives in one place. */
  hrefs?: (string | null)[];
}) {
  return (
    <ol className="relative mt-5 grid gap-3">
      {/* Vertical rail through the step dots — the single "you are here"
        * signal (replaces the old per-label underline hack). */}
      <span
        aria-hidden
        className="absolute left-4 top-4 bottom-4 w-px bg-white/12"
      />
      {labels.map((_label, i) => {
        // Step count is dynamic: services with a bookable insurer add an
        // Insurance step between Service and Time.
        const step = { n: i + 1 };
        const complete = step.n < current;
        const active = step.n === current;
        const value = values[step.n - 1] ?? null;
        const href = complete ? (hrefs?.[step.n - 1] ?? null) : null;

        const dot = (
          <span
            className={`relative z-10 mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              active
                ? "bg-[var(--color-brand-accent)] text-[#0a1f1a] ring-4 ring-[rgba(176,241,34,0.18)]"
                : complete
                  ? "bg-[rgba(176,241,34,0.14)] text-[var(--color-brand-accent)]"
                  : "bg-white/5 text-white/45"
            }`}
          >
            {complete ? <CheckCircle2 className="size-3.5" aria-hidden /> : step.n}
          </span>
        );

        const label = (
          <span className="flex flex-col">
            <span
              className={
                active
                  ? "text-sm font-bold text-white/92"
                  : complete
                    ? "text-sm font-semibold text-[var(--color-brand-accent)] group-hover:underline"
                    : "text-sm font-semibold text-white/45"
              }
            >
              {labels[step.n - 1]}
              {active ? (
                <span className="sr-only"> — Step {step.n} of {labels.length}</span>
              ) : null}
            </span>
            {value ? (
              <span className="text-xs leading-snug text-white/55">{value}</span>
            ) : null}
          </span>
        );

        return (
          <li
            key={step.n}
            className="relative"
            aria-current={active ? "step" : undefined}
          >
            {href ? (
              <Link href={href} className="group flex items-start gap-3">
                {dot}
                {label}
              </Link>
            ) : (
              <div className="flex items-start gap-3">
                {dot}
                {label}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
