/**
 * Pure formatting helpers for subscription UI copy. No I/O, no React — unit
 * tested. All marketing/dashboard copy is DATA-DRIVEN (§36.17): the
 * "after N paid months" number always comes from live plan data, never a
 * hardcoded string.
 */

/** Replace `{token}` placeholders in a copy template. Unknown tokens are left
 *  untouched so a missing var is visible rather than silently blank. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}

/** Pick the singular template when count === 1, else the plural template. */
export function pluralTemplate(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * The universal pricing-card note ("Selected perks unlock after N paid
 * months"). Returns null when nothing is month-gated so the caller hides the
 * line entirely. `months` is the data-driven `perkUnlockMonths`.
 */
export function formatPerkUnlockNote(
  months: number | null | undefined,
  copy: { universal: string; universalSingular: string },
): string | null {
  if (months == null || months <= 0) return null;
  return interpolate(pluralTemplate(months, copy.universalSingular, copy.universal), { months });
}

/** Remaining wellness credits needed to reach a target (never negative). */
export function remainingCredits(balance: number, required: number): number {
  return Math.max(0, required - balance);
}

/** Clamp a value/target ratio into [0,1]. target<=0 → fully complete. */
export function progressRatio(value: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, Math.max(0, value / target));
}

/** Whole-number progress percentage for width styles / a11y labels. */
export function progressPercent(value: number, target: number): number {
  return Math.round(progressRatio(value, target) * 100);
}

/** Consultation credits used this period, given a balance + monthly grant.
 *  Used = max(0, granted - balance) but never more than granted. */
export function creditsUsed(granted: number, remaining: number): number {
  return Math.min(granted, Math.max(0, granted - remaining));
}
