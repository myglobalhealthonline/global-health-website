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
  languagesLabel: string;
  viewProfileLabel: string;
  pickTimeLabel: string;
};

/** Narrow `common.doctors` to the strings the card needs. Source keys are
 *  named `viewProfile`/`pickTime` in the locale bundle (shared with other
 *  doctors-namespace consumers); the card prop names spell out `*Label`. */
export function doctorCardI18n(d: {
  registrationLabel: string;
  verifiedSuffix: string;
  verifyRegistrationAria: string;
  languagesLabel: string;
  viewProfile: string;
  pickTime: string;
}): DoctorCardI18n {
  return {
    registrationLabel: d.registrationLabel,
    verifiedSuffix: d.verifiedSuffix,
    verifyRegistrationAria: d.verifyRegistrationAria,
    languagesLabel: d.languagesLabel,
    viewProfileLabel: d.viewProfile,
    pickTimeLabel: d.pickTime,
  };
}
