import { countries } from "@/data/countries";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";

const consultationTypeOptions = [
  { value: "general", label: "GP consultation" },
  { value: "specialist", label: "Specialist consultation" },
  { value: "prescription", label: "Prescription review" },
  { value: "health-test", label: "Health test" },
  { value: "follow-up", label: "Follow-up consultation" },
];

export function getBookingPageData(locale: LocaleCode = "en") {
  const common = getCommonLocale(locale);

  return {
    hero: {
      title: "Book an online consultation",
      description:
        "Choose your country, select the consultation type you need, and share your details so the clinic team can confirm your appointment quickly.",
      primaryCtaLabel: "Start consultation",
    },
    form: {
      title: "Booking request",
      description:
        "Complete this short form and our team will follow up with your final appointment confirmation by email or phone.",
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
          "By submitting, you confirm the information is accurate and agree to be contacted for booking follow-up and scheduling. Final legal wording will be replaced with approved compliance copy.",
      },
      submitLabel: common.cta.primaryBooking,
      helperMessage:
        "Submitting creates a booking request only when backend integration is available. Final appointment confirmation remains a manual clinic follow-up step.",
      countryOptions: countries.map((country) => ({
        value: country.code,
        label: country.name,
      })),
      consultationTypeOptions,
      nextSteps: {
        title: "What happens after you submit",
        items: [
          "The clinic team reviews your selected country and consultation type.",
          "You receive confirmation with next steps and appointment timing details.",
          "If needed, the team will contact you to clarify intake information.",
        ],
      },
    },
  };
}
