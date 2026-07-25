/**
 * Doctor-card chrome strings, kept OUT of `DoctorCard.tsx` on purpose: that
 * file is `"use client"`, and a server component calling a function exported
 * from a client module fails at prerender ("Attempted to call
 * doctorCardI18n() from the server but doctorCardI18n is on the client").
 * This module has no directive, so both sides can import it.
 */
export type DoctorCardI18n = {
  registrationLabel: string;
  verifiedSuffix: string;
  verifyRegistrationAria: string;
};

/** Narrow `common.doctors` to the strings the card needs. */
export function doctorCardI18n(d: DoctorCardI18n): DoctorCardI18n {
  return {
    registrationLabel: d.registrationLabel,
    verifiedSuffix: d.verifiedSuffix,
    verifyRegistrationAria: d.verifyRegistrationAria,
  };
}
