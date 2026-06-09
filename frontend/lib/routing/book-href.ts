type BookHrefInput = {
  country: string;
  lang: string;
  service?: string | null;
  serviceId?: string | null;
  doctor?: string | null;
  slot?: string | null;
};

export function buildBookHref({
  country,
  lang,
  service,
  serviceId,
  doctor,
  slot,
}: BookHrefInput): string {
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (serviceId) params.set("serviceId", serviceId);
  if (doctor) params.set("doctor", doctor);
  if (slot) params.set("slot", slot);
  const query = params.toString();
  return `/${country}/${lang}/book${query ? `?${query}` : ""}`;
}
