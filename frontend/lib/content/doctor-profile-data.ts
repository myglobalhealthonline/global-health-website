type DoctorProfilePageData = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  profile: {
    name: string;
    title: string;
    country: string;
    languages: string[];
    bio: string;
    qualifications: string[];
    specialties: string[];
    imageLabel: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
};

function toLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const doctorSeed: Record<string, Omit<DoctorProfilePageData, "hero" | "bottomCta">> = {
  "dr-khoiamul-islam": {
    profile: {
      name: "Dr. Khoiamul Islam",
      title: "General Medicine",
      country: "Ireland",
      languages: ["English"],
      bio: "Supports first-contact online consultations and follow-up care planning for common health concerns.",
      qualifications: [
        "IMC registration details available in clinic onboarding records.",
        "Profile credentials and timeline will be expanded through content administration.",
      ],
      specialties: [
        "General consultation",
        "Follow-up consultation",
        "Referral and continuity planning",
      ],
      imageLabel: "Dr. Khoiamul Islam",
    },
  },
};

export function getDoctorProfileData(doctorSlug: string): DoctorProfilePageData {
  const fallbackName = toLabel(doctorSlug);
  const seeded = doctorSeed[doctorSlug];

  const profile =
    seeded?.profile ?? {
      name: fallbackName,
      title: "Clinic Doctor Profile",
      country: "Ireland",
      languages: ["English"],
      bio: "This doctor profile is available through the shared doctor template and will be synced with final admin-managed profile details.",
      qualifications: [
        "Qualifications and registration details are pending final content migration.",
        "All public profile fields are mapped for future backend/admin replacement.",
      ],
      specialties: ["General consultation", "Specialist referral guidance", "Follow-up support"],
      imageLabel: fallbackName,
    };

  return {
    hero: {
      title: profile.name,
      description:
        "Review doctor profile details, consultation areas, and booking options before scheduling your appointment.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
      secondaryCta: { label: "Back to Ireland team", href: "/ireland-team" },
    },
    profile,
    bottomCta: {
      title: "Need to schedule with this doctor?",
      description:
        "Book your consultation and the clinic team will confirm the right appointment route based on availability.",
      ctaLabel: "Start booking",
      ctaHref: "/book-online",
    },
  };
}
