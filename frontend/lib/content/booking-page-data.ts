import { countries } from "@/data/countries";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";

const consultationTypeOptions = [
  { value: "general", label: "General consultation" },
  { value: "specialist", label: "Specialist consultation" },
  { value: "follow-up", label: "Follow-up consultation" },
];

export function getBookingPageData(locale: LocaleCode = "en") {
  const common = getCommonLocale(locale);

  return {
    hero: {
      title: "Book an online consultation",
      description:
        "Choose your country, select a consultation type, and share your details so the clinic team can schedule your appointment.",
      primaryCtaLabel: "Start consultation",
    },
    form: {
      title: "Booking request",
      description:
        "This is a frontend placeholder flow. TODO: Connect this form to backend booking APIs in a later phase.",
      fields: {
        country: {
          label: "Country",
          placeholder: "Select your country",
        },
        consultationType: {
          label: "Consultation type",
          placeholder: "Select consultation type",
        },
        fullName: {
          label: "Patient full name",
          placeholder: "Enter full name",
        },
        email: {
          label: "Email",
          placeholder: "Enter email address",
        },
        phone: {
          label: "Phone",
          placeholder: "Enter phone number",
        },
        notes: {
          label: "Message or notes (optional)",
          placeholder: "Share any important context for the clinic team",
        },
        consent:
          "By submitting, you confirm that the information provided is accurate and agree to be contacted for booking follow-up. TODO: replace with approved legal copy.",
      },
      submitLabel: common.cta.primaryBooking,
      helperMessage:
        "Placeholder behavior: this form does not submit to backend yet. Final confirmation and intake flow will be connected in a later phase.",
      countryOptions: countries.map((country) => ({
        value: country.code,
        label: country.name,
      })),
      consultationTypeOptions,
    },
  };
}
