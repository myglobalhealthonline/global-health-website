import { Check } from "lucide-react";

export interface TimelineStep {
  /** "done" = already happened, "now" = current, "todo" = ahead. */
  state: "done" | "now" | "todo";
  /** Short when-label above the title ("Now", "30 Aug 2026", "After 3 paid months"). */
  when: string;
  title: string;
  body: string;
}

/**
 * "What happens next" — the membership lifecycle as a timeline. Answers the
 * two questions the tab could not before: when do benefits unlock, and what
 * (if anything) the member has to do. Presentational; the page derives the
 * steps from subscription state.
 */
export function MembershipTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="gh-membership-steps m-0 grid list-none p-0">
      {steps.map((step, i) => (
        <li key={i} className={`gh-membership-step gh-membership-step--${step.state}`}>
          <span aria-hidden className="gh-membership-step__dot">
            {step.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <div>
            <span className="gh-membership-step__when">{step.when}</span>
            <h3 className="gh-membership-step__title">{step.title}</h3>
            <p className="gh-membership-step__body">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
