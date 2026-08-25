import type { CountryDoctorCard, CountryServiceCard } from "./get-country-collections";
import {
  selectServiceDoctors,
  type ServiceDoctorSelection,
} from "./service-doctor-selection";

export type SpecialistDoctorSelection = ServiceDoctorSelection;

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
  return selectServiceDoctors(doctors, specialistServices);
}
