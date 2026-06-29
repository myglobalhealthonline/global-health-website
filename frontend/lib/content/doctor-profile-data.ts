import {
  getPublicDoctorBySlug,
  normalizePublicDoctorRecord,
  parseLanguagesFromDoctorBio,
} from "@/lib/content/get-public-doctors";
import { fetchDoctorByCountryAndSlug } from "@/lib/api/site-content-api";
import { resolveDoctorProfileImageUrl } from "@/lib/content/get-public-assets";

export type DoctorProfilePageData = {
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
    imcRegistration?: string;
    medicalRegistrationUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    faqs?: Array<{ id: string; question: string; answer: string; category?: string | null }>;
    editorialChecklist?: Record<string, unknown>;
    imageAltText?: string;
    imageTitle?: string;
    imageCaption?: string;
    imageDescription?: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  /** Local public-folder path from CMS asset when safe (same-origin relative path). */
  profileImageSrc?: string;
  /** Optional image shown inside the booking CTA banner. */
  bookingCtaImage?: { src: string; alt: string };
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
        "Additional credentials are added when verified profile details are available.",
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
      bio: "This clinician supports online consultations and follow-up guidance through Global Health.",
      qualifications: [
        "Qualifications and registration details are shown when verified by the clinic team.",
        "Patients can confirm clinician fit during the booking intake.",
      ],
      specialties: ["General consultation", "Specialist referral guidance", "Follow-up support"],
      imageLabel: fallbackName,
    };

  return {
    hero: {
      title: profile.name,
      description:
        "Review doctor profile details, consultation areas, and booking options before scheduling your appointment.",
      primaryCta: { label: "Book consultation", href: "/ireland/en/book" },
      secondaryCta: { label: "Back to Ireland team", href: "/ireland-team" },
    },
    profile,
    bottomCta: {
      title: "Need to schedule with this doctor?",
      description:
        "Book your consultation and the clinic team will confirm the right appointment route based on availability.",
      ctaLabel: "Start booking",
      ctaHref: "/ireland/en/book",
    },
  };
}

export async function resolveDoctorProfilePageData(
  doctorSlug: string,
  locale?: string,
  countryCode?: string,
): Promise<DoctorProfilePageData> {
  const base = getDoctorProfileData(doctorSlug);
  const [countryScopedDoctor, globalDoctor, profileImageSrc] = await Promise.all([
    countryCode
      ? fetchDoctorByCountryAndSlug(countryCode, doctorSlug, locale).then((res) =>
          res.ok ? normalizePublicDoctorRecord(res.data.doctor) : undefined,
        )
      : Promise.resolve(undefined),
    getPublicDoctorBySlug(doctorSlug, locale),
    resolveDoctorProfileImageUrl(doctorSlug),
  ]);
  const backend = countryScopedDoctor ?? globalDoctor;

  if (!backend) {
    const out: DoctorProfilePageData = profileImageSrc ? { ...base, profileImageSrc } : { ...base };
    if (profileImageSrc) {
      out.bookingCtaImage = { src: profileImageSrc, alt: base.profile.name };
    }
    return out;
  }

  const out: DoctorProfilePageData = {
    ...base,
    ...(profileImageSrc ? { profileImageSrc } : {}),
    hero: {
      ...base.hero,
      title: backend.fullName,
      secondaryCta: {
        label: `Back to ${backend.countryName} team`,
        href: backend.teamPath,
      },
    },
    profile: {
      ...base.profile,
      name: backend.fullName,
      title: backend.title,
      country: backend.countryName,
      bio: backend.bio ?? "",
      languages:
        backend.languages && backend.languages.length > 0
          ? backend.languages
          : (parseLanguagesFromDoctorBio(backend.bio) ?? []),
      qualifications: backend.qualifications ?? [],
      specialties: backend.specialties,
      imageLabel: backend.fullName,
      ...(backend.imcRegistration ? { imcRegistration: backend.imcRegistration } : {}),
      ...(backend.medicalRegistrationUrl ? { medicalRegistrationUrl: backend.medicalRegistrationUrl } : {}),
      ...(backend.seoTitle ? { seoTitle: backend.seoTitle } : {}),
      ...(backend.seoDescription ? { seoDescription: backend.seoDescription } : {}),
      ...(backend.seoKeywords ? { seoKeywords: backend.seoKeywords } : {}),
      ...(backend.faqs ? { faqs: backend.faqs } : {}),
      ...(backend.editorialChecklist ? { editorialChecklist: backend.editorialChecklist } : {}),
      imageAltText: backend.profileImageAltText ?? backend.fullName,
      ...(backend.profileImageTitle ? { imageTitle: backend.profileImageTitle } : {}),
      ...(backend.profileImageCaption ? { imageCaption: backend.profileImageCaption } : {}),
      ...(backend.profileImageDescription
        ? { imageDescription: backend.profileImageDescription }
        : {}),
    },
  };

  const resolvedImageSrc = backend.profileImageSrc ?? profileImageSrc;
  if (resolvedImageSrc) {
    out.profileImageSrc = resolvedImageSrc;
    out.bookingCtaImage = {
      src: resolvedImageSrc,
      alt: backend.profileImageAltText ?? backend.fullName,
    };
  }

  return out;
}
