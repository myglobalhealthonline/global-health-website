import type { CountryDoctorCard, CountryServiceCard } from "./get-country-collections";

export type SpecialistDoctorSelection = {
  doctor: CountryDoctorCard;
  serviceId: string;
  serviceSlug: string;
  serviceNames: string[];
};

/**
 * Selects doctors who can actually be booked against one of the active
 * specialist services supplied by the country service endpoint.
 *
 * The service assignment is the eligibility contract. Specialty relations are
 * intentionally not consulted here because they are descriptive metadata and
 * can be absent on an otherwise valid ServiceDoctor assignment.
 */
export function selectSpecialistDoctors(
  doctors: CountryDoctorCard[],
  specialistServices: CountryServiceCard[],
): SpecialistDoctorSelection[] {
  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const selections = new Map<string, SpecialistDoctorSelection & { serviceIndex: number; assignmentIndex: number }>();

  for (const [serviceIndex, service] of specialistServices.entries()) {
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
      const featuredDifference = Number(right.doctor.isFeatured === true) - Number(left.doctor.isFeatured === true);
      return featuredDifference ||
        left.serviceIndex - right.serviceIndex ||
        left.assignmentIndex - right.assignmentIndex ||
        left.doctor.fullName.localeCompare(right.doctor.fullName) ||
        left.doctor.id.localeCompare(right.doctor.id);
    })
    .map((selection) => ({
      doctor: selection.doctor,
      serviceId: selection.serviceId,
      serviceSlug: selection.serviceSlug,
      serviceNames: selection.serviceNames,
    }));
}
