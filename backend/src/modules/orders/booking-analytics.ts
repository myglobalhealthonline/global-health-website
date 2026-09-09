/** Receipt-only proof of fulfilment. Never expose appointment or patient IDs. */
export function bookedConsultations(paymentStatus: string, links: { appointment: {
  status: string; countryCode: string; service: { kind: string } | null;
} }[]): { market: string; serviceKind: string }[] {
  if (paymentStatus !== "PAID") return [];
  return links.flatMap(({ appointment }) =>
    appointment.status !== "CANCELLED" && appointment.service
      ? [{ market: appointment.countryCode, serviceKind: appointment.service.kind }]
      : []);
}
