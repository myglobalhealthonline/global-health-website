import type { CountryDoctorCard, CountryServiceCard } from "./get-country-collections";

export type ServiceDoctorSelection = {
  doctor: CountryDoctorCard;
  serviceId: string;
  serviceSlug: string;
  serviceNames: string[];
};

/**
 * Selects doctors with a reciprocal assignment to one of the supplied active
 * services. Service assignments, rather than specialty labels, are the public
 * booking eligibility contract.
 */
export function selectServiceDoctors(
  doctors: CountryDoctorCard[],
  services: CountryServiceCard[],
): ServiceDoctorSelection[] {
  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const selections = new Map<
    string,
    ServiceDoctorSelection & { serviceIndex: number; assignmentIndex: number }
  >();

  for (const [serviceIndex, service] of services.entries()) {
    for (const [assignmentIndex, doctorId] of service.assignedDoctorIds.entries()) {
      const doctor = doctorById.get(doctorId);
      if (!doctor || !doctor.assignedServiceIds.includes(service.id)) continue;

      const existing = selections.get(doctor.id);
      if (existing) {
        if (!existing.serviceNames.includes(service.name)) {
          selections.set(doctor.id, {
            ...existing,
            serviceNames: [...existing.serviceNames, service.name],
          });
        }
        continue;
      }

      selections.set(doctor.id, {
        doctor,
        serviceId: service.id,
        serviceSlug: service.slug,
        serviceNames: [service.name],
        serviceIndex,
        assignmentIndex,
      });
    }
  }

  return [...selections.values()]
    .toSorted((left, right) => {
      const featuredDifference =
        Number(right.doctor.isFeatured === true) - Number(left.doctor.isFeatured === true);
      return (
        featuredDifference ||
        left.serviceIndex - right.serviceIndex ||
        left.assignmentIndex - right.assignmentIndex ||
        left.doctor.fullName.localeCompare(right.doctor.fullName) ||
        left.doctor.id.localeCompare(right.doctor.id)
      );
    })
    .map((selection) => ({
      doctor: selection.doctor,
      serviceId: selection.serviceId,
      serviceSlug: selection.serviceSlug,
      serviceNames: selection.serviceNames,
    }));
}
