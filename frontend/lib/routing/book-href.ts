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
};

export function buildBookHref({
  country,
  lang,
  service,
  serviceId,
  doctor,
  slot,
  at,
}: BookHrefInput): string {
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (serviceId) params.set("serviceId", serviceId);
  if (doctor) params.set("doctor", doctor);
  if (slot) params.set("slot", slot);
  if (at) params.set("at", at);
  const query = params.toString();
  return `/${country}/${lang}/book${query ? `?${query}` : ""}`;
}
