type BookHrefInput = {
  country: string;
  lang: string;
  service?: string | null;
  serviceId?: string | null;
  doctor?: string | null;
  slot?: string | null;
  /** Chosen clinic-local start time (ISO) in the service-first time→doctor
   *  flow: the patient picked a time but not yet a doctor. */
  at?: string | null;
  /** Insurance choice, made right after the service: a company id, or the
   *  literal "none" for "pay the standard price". Absent = not chosen yet, so
   *  the wizard still owes the patient the insurance step. Doctors + slots are
   *  filtered to the chosen insurer's network. */
  insurance?: string | null;
  /**
   * Benefit choice (§11.2), which replaced `insurance` as the wizard's param:
   * `membership:<enrollmentId>`, `insurance:<companyId>`, `corporate`,
   * `plan:credit`, `plan:discount`, or `none`. `insurance` is still accepted
   * and mapped, so live links and indexed URLs keep working.
   */
  benefit?: string | null;
};

export const BOOKING_WORKFLOW_PARAM_KEYS = [
  "doctor",
  "service",
  "serviceId",
  "slot",
  "gp",
  "language",
  "at",
  "insurance",
  "benefit",
  "from",
] as const;

export function buildBookHref({
  country,
  lang,
  service,
  serviceId,
  doctor,
  slot,
  at,
  insurance,
  benefit,
}: BookHrefInput): string {
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (serviceId) params.set("serviceId", serviceId);
  if (benefit) params.set("benefit", benefit);
  else if (insurance) params.set("insurance", insurance);
  if (doctor) params.set("doctor", doctor);
  if (slot) params.set("slot", slot);
  if (at) params.set("at", at);
  const query = params.toString();
  return `/${country}/${lang}/book${query ? `?${query}` : ""}`;
}

/**
 * A service's own landing page — the crawlable link a doctor profile's
 * assigned-service card points at (international-linking batch, 2026-08-09),
 * distinct from `buildBookHref`'s preselected booking destination. Kept
 * alongside it since both feed the same `ServiceCard` two-CTA card.
 */
export function buildServiceDetailHref(country: string, lang: string, serviceSlug: string): string {
  return `/${country}/${lang}/services/${serviceSlug}`;
}

/**
 * True when a booking href already pins BOTH the service and the doctor.
 *
 * Those combinations are a cross-product: every doctor x every service they
 * are assigned to. Kept as the narrower classifier for flow-specific logic; it
 * has no callers today because crawlability is now governed sitewide by the
 * broader `isBookingWorkflowHref` below.
 */
export function isPreselectionPairHref(href: string | null | undefined): boolean {
  if (!href) return false;
  const queryIndex = href.indexOf("?");
  if (queryIndex === -1) return false;
  const params = new URLSearchParams(href.slice(queryIndex + 1));
  const hasService = params.has("service") || params.has("serviceId");
  const hasDoctor = params.has("doctor");
  return hasService && hasDoctor;
}

/**
 * True for a booking-wizard URL carrying any supported workflow state.
 *
 * This powers metadata decisions for `/book?...`: the page keeps the clean
 * canonical `/book`, but any wizard-state variant is treated as `noindex`.
 */
export function isBookingWorkflowHref(href: string | null | undefined): boolean {
  if (!href) return false;
  const queryIndex = href.indexOf("?");
  if (queryIndex === -1) return false;
  const params = new URLSearchParams(href.slice(queryIndex + 1));
  return BOOKING_WORKFLOW_PARAM_KEYS.some((key) => params.has(key));
}
