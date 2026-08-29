import {
  getDoctorServiceBookability,
  type BookabilitySummary,
  type BookabilityState,
  type CountryDoctorCard,
  type CountryServiceCard,
} from "./get-country-collections";

export type ServiceDoctorSelection = {
  doctor: CountryDoctorCard;
  serviceId: string;
  serviceSlug: string;
  serviceNames: string[];
};

export function bookabilityStateRank(state: BookabilityState): number {
  return state === "BOOKABLE" ? 0 : state === "RETURNING" ? 1 : 2;
}

export function selectedServiceBookability(
  selection: ServiceDoctorSelection,
): BookabilitySummary {
  return getDoctorServiceBookability(
    selection.doctor.bookabilityByServiceId,
    selection.serviceId,
  );
}

/** Stable, immutable ordering for a doctor list already paired to one service. */
export function sortServiceDoctorSelectionsByBookability(
  selections: ServiceDoctorSelection[],
): ServiceDoctorSelection[] {
  return selections
    .map((selection, position) => ({ selection, position }))
    .toSorted((left, right) => {
      const leftState = selectedServiceBookability(left.selection).state;
      const rightState = selectedServiceBookability(right.selection).state;
      return bookabilityStateRank(leftState) - bookabilityStateRank(rightState) ||
        left.position - right.position;
    })
    .map(({ selection }) => selection);
}

/** Stable, immutable ordering for a roster shown against one exact service. */
export function sortDoctorsByServiceBookability(
  doctors: CountryDoctorCard[],
  serviceId: string,
): CountryDoctorCard[] {
  return doctors
    .map((doctor, position) => ({ doctor, position }))
    .toSorted((left, right) => {
      const leftState = getDoctorServiceBookability(
        left.doctor.bookabilityByServiceId,
        serviceId,
      ).state;
      const rightState = getDoctorServiceBookability(
        right.doctor.bookabilityByServiceId,
        serviceId,
      ).state;
      return bookabilityStateRank(leftState) - bookabilityStateRank(rightState) ||
        left.position - right.position;
    })
    .map(({ doctor }) => doctor);
}

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
        const existingState = getDoctorServiceBookability(
          doctor.bookabilityByServiceId,
          existing.serviceId,
        ).state;
        const candidateState = getDoctorServiceBookability(
          doctor.bookabilityByServiceId,
          service.id,
        ).state;
        const shouldUseCandidate =
          bookabilityStateRank(candidateState) < bookabilityStateRank(existingState);
        if (!existing.serviceNames.includes(service.name)) {
          selections.set(doctor.id, {
            ...existing,
            ...(shouldUseCandidate
              ? { serviceId: service.id, serviceSlug: service.slug, serviceIndex, assignmentIndex }
              : {}),
            serviceNames: [...existing.serviceNames, service.name],
          });
        } else if (shouldUseCandidate) {
          selections.set(doctor.id, {
            ...existing,
            serviceId: service.id,
            serviceSlug: service.slug,
            serviceIndex,
            assignmentIndex,
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
