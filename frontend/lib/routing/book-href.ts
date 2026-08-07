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
