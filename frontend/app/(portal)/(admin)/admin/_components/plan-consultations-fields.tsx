import type { AdminConsultationRule } from "@/lib/admin/plans-api";

type ServiceOpt = { id: string; name: string; kind: string };

type Props = {
  /** Non-PRESCRIPTION services for the plan's country. */
  services: ServiceOpt[];
  rules: AdminConsultationRule[];
  /** Plan-level unlock floor — shown so the admin knows rules can't beat it. */
  benefitsUnlockAfterPaidMonths: number;
};

/** Kinds a subscription benefit can ever apply to (checkout §36.11). */
const GP_KIND = "GENERAL";
const SPECIALIST_KIND = "SPECIALIST";

/** A rule that spends the monthly GP allowance (pricing-resolver isCreditRule). */
function isCreditRule(r: AdminConsultationRule): boolean {
  return r.isActive && r.isIncluded && r.usesCredits && r.creditsPerUse > 0;
}

/** Plain-English summary of what a rule currently does, for the row pill. */
function ruleSummary(r: AdminConsultationRule | undefined): string | null {
  if (!r) return null;
  if (!r.isActive) return "not available";
  if (isCreditRule(r)) return `${r.creditsPerUse} credit${r.creditsPerUse === 1 ? "" : "s"} per visit`;
  if (r.discountMode === "PERCENT") return `${r.discountPercent ?? 0}% off`;
  if (r.discountMode === "FIXED") return `${((r.fixedPriceCents ?? 0) / 100).toFixed(2)} fixed price`;
  return "full price";
}

function ServiceChecklist({
  name,
  services,
  rules,
  checkedIds,
  emptyLabel,
  /** Render a per-service fixed-price override next to each tick box. */
  withFixedPrice = false,
}: {
  name: string;
  services: ServiceOpt[];
  rules: Map<string, AdminConsultationRule>;
  checkedIds: Set<string>;
  emptyLabel: string;
  withFixedPrice?: boolean;
}) {
  if (services.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>;
  }
  // Covered services first — the list is a state view of every service, not an
  // "add" queue, so what the plan already covers has to read as settled.
  const ordered = [
    ...services.filter((s) => checkedIds.has(s.id)),
    ...services.filter((s) => !checkedIds.has(s.id)),
  ];
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {ordered.map((s) => {
        const rule = rules.get(s.id);
        const summary = ruleSummary(rule);
        const fixedMajor =
          rule?.isActive && rule.discountMode === "FIXED" && rule.fixedPriceCents != null
            ? (rule.fixedPriceCents / 100).toFixed(2)
            : "";
        return (
          <li
            key={s.id}
            className="flex items-start gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-3 py-2"
          >
            <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
              <input
                type="checkbox"
                name={name}
                value={s.id}
                defaultChecked={checkedIds.has(s.id)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="block font-medium text-[var(--color-text-primary)]">{s.name}</span>
                {summary ? (
                  <span className="block text-xs font-semibold text-[var(--color-text-body)]">
                    Covered — {summary}
                  </span>
                ) : (
                  <span className="block text-xs text-[var(--color-text-muted)]">Not covered</span>
                )}
              </span>
            </label>
            {withFixedPrice ? (
              <label className="flex w-24 shrink-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Fixed price
                </span>
                <input
                  name={`fixedPrice_${s.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={fixedMajor}
                  placeholder="—"
                  className="gh-input min-w-0"
                />
              </label>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Plan-level consultation config: which GP visits the monthly allowance pays
 * for, and one specialist discount for the whole plan. Writes the per-service
 * PlanConsultationRule rows underneath (the pricing engine still resolves per
 * service — the rows are just no longer hand-maintained one at a time).
 *
 * Presentational server component; the parent form's action reconciles the tick
 * boxes against the existing rules.
 */
export function PlanConsultationsFields({ services, rules, benefitsUnlockAfterPaidMonths }: Props) {
  const gpServices = services.filter((s) => s.kind === GP_KIND);
  const specialistServices = services.filter((s) => s.kind === SPECIALIST_KIND);
  const ruleById = new Map(rules.map((r) => [r.serviceId, r]));

  // A service is ticked when the plan carries ANY active rule for it. Deriving
  // the tick from the rule's *shape* instead would leave a row reading "Covered"
  // with an empty box — and the save pass would then delete that rule as if the
  // admin had unticked it. Each block can only express one shape (GP = credits,
  // specialist = discount), so a legacy rule of the other shape converts on save.
  const kindOf = new Map(services.map((s) => [s.id, s.kind]));
  const activeRuleServiceIds = new Set(rules.filter((r) => r.isActive).map((r) => r.serviceId));
  const gpChecked = new Set(
    [...activeRuleServiceIds].filter((sid) => kindOf.get(sid) === GP_KIND),
  );
  const specialistChecked = new Set(
    [...activeRuleServiceIds].filter((sid) => kindOf.get(sid) === SPECIALIST_KIND),
  );
  const convertingRules = rules.filter(
    (r) =>
      r.isActive &&
      ((kindOf.get(r.serviceId) === GP_KIND && !isCreditRule(r)) ||
        (kindOf.get(r.serviceId) === SPECIALIST_KIND && isCreditRule(r))),
  );

  // Seed the single percent field from existing rows. When rows disagree, seed
  // NOTHING — picking one (say the highest, which is often a legacy 100% "free"
  // row) would hand every ticked service that discount on the next save.
  const percents = Array.from(
    new Set(
      rules
        .filter((r) => r.isActive && r.discountMode === "PERCENT" && r.discountPercent != null)
        .map((r) => r.discountPercent as number),
    ),
  );
  const mixedPercents = percents.length > 1;
  const seededPercent = mixedPercents ? "" : percents[0] ?? "";

  // Rules pointing at a service that is no longer active/listed. They can't be
  // ticked (the service isn't in the picker) and the save pass leaves them
  // alone, so name them rather than letting them sit invisible.
  const listedIds = new Set(services.map((s) => s.id));
  const orphanRules = rules.filter((r) => !listedIds.has(r.serviceId));

  const gpUncovered = gpServices.filter((s) => !gpChecked.has(s.id)).length;
  const specialistUncovered = specialistServices.filter((s) => !specialistChecked.has(s.id)).length;

  const creditsPerUse =
    rules.find((r) => isCreditRule(r))?.creditsPerUse ?? 1;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            GP visits paid by the monthly allowance
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tick every GP service the plan&apos;s monthly consultation credits can be spent on. An
            unticked service is charged at full price even though the member holds credits.
          </p>
        </div>
        {gpUncovered > 0 ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-xs">
            {gpUncovered} GP service{gpUncovered === 1 ? " is" : "s are"} not covered by this plan.
          </p>
        ) : null}
        <ServiceChecklist
          name="gpServiceIds"
          services={gpServices}
          rules={ruleById}
          checkedIds={gpChecked}
          emptyLabel="No GP services exist for this country yet."
        />
        <label className="flex max-w-[16rem] flex-col gap-1.5">
          <span className="gh-field-label">Credits used per visit</span>
          <input
            name="creditsPerUse"
            type="number"
            min="1"
            max="24"
            defaultValue={creditsPerUse}
            className="gh-input min-w-0"
          />
          <span className="text-xs text-[var(--color-text-muted)]">Normally 1.</span>
        </label>
      </section>

      <section className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Specialist discount
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tick every specialist service the plan discounts. They all use the percentage below
            unless you type a fixed price next to one — that service is then charged exactly that
            amount instead. Either way it never spends consultation credits.
          </p>
        </div>
        {mixedPercents ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-xs">
            This plan currently has different discounts per service ({percents.join("%, ")}%), so the
            box below starts empty on purpose. Whatever you enter applies to every ticked service
            that has no fixed price of its own.
          </p>
        ) : null}
        {specialistUncovered > 0 ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-xs">
            {specialistUncovered} specialist service{specialistUncovered === 1 ? " has" : "s have"} no
            discount on this plan.
          </p>
        ) : null}
        <label className="flex max-w-[16rem] flex-col gap-1.5">
          <span className="gh-field-label">Discount %</span>
          <input
            name="specialistDiscountPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={seededPercent}
            className="gh-input min-w-0"
            placeholder="e.g. 10"
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Required for any ticked service that has no fixed price of its own.
          </span>
        </label>
        <ServiceChecklist
          name="specialistServiceIds"
          services={specialistServices}
          rules={ruleById}
          checkedIds={specialistChecked}
          emptyLabel="No specialist services exist for this country yet."
          withFixedPrice
        />
      </section>

      {convertingRules.length > 0 ? (
        <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-xs">
          {convertingRules.length} rule{convertingRules.length === 1 ? "" : "s"} set up in the old
          editor do not fit this layout ({convertingRules.map((r) => r.service.name).join(", ")}).
          Saving converts them: GP services become credit-covered, specialist services become
          discounted. Untick one first if you would rather remove it.
        </p>
      ) : null}

      {orphanRules.length > 0 ? (
        <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-xs">
          {orphanRules.length} rule{orphanRules.length === 1 ? "" : "s"} point at a service that is
          no longer active ({orphanRules.map((r) => r.service.name).join(", ")}). Saving leaves them
          untouched; re-activate the service to edit or clear them.
        </p>
      ) : null}

      <p className="text-xs text-[var(--color-text-muted)]">
        Everything here unlocks after {benefitsUnlockAfterPaidMonths} paid month
        {benefitsUnlockAfterPaidMonths === 1 ? "" : "s"}, set on the Plan &amp; price tab.
      </p>
    </div>
  );
}
