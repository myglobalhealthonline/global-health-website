import { describe, expect, it } from "vitest";

import {
  buildDoctorProfileSeoReplacements,
  fillDoctorProfileSeoTemplate,
} from "./doctor-profile-seo.js";

describe("doctor profile seo templates", () => {
  it("fills doctor SEO templates with specialties and languages", () => {
    const context = {
      name: "Dr Fahad Farooq",
      title: "Neurology Registrar",
      country: "Ireland",
      languages: ["English", "Arabic", "Urdu"],
      specialties: ["Neurology", "Headache review", "Second opinion"],
    };

    expect(buildDoctorProfileSeoReplacements(context)).toEqual({
      name: "Dr Fahad Farooq",
      title: "Neurology Registrar",
      country: "Ireland",
      languages: "English, Arabic and more",
      specialties: "Neurology, Headache review and more",
    });

    expect(
      fillDoctorProfileSeoTemplate(
        "Book {name}, {title} in {country}. Specialties: {specialties}. Languages: {languages}.",
        context,
      ),
    ).toBe(
      "Book Dr Fahad Farooq, Neurology Registrar in Ireland. Specialties: Neurology, Headache review and more. Languages: English, Arabic and more.",
    );
  });

  it("falls back to the title when specialties or languages are missing", () => {
    const context = {
      name: "Priscila Figueiredo",
      title: "Rehabilitation & Wellness Consultant",
      country: "Ireland",
      languages: [],
      specialties: [],
    };

    expect(buildDoctorProfileSeoReplacements(context)).toEqual({
      name: "Priscila Figueiredo",
      title: "Rehabilitation & Wellness Consultant",
      country: "Ireland",
      languages: "Rehabilitation & Wellness Consultant",
      specialties: "Rehabilitation & Wellness Consultant",
    });
  });
});
