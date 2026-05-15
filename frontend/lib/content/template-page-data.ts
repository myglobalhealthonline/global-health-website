import type { CountryCode } from "@/data/countries";
import { countries, getCountryByCode } from "@/data/countries";
import { getSiteContext } from "@/lib/content/get-site-context";
import {
  getPublicDoctorsForCountry,
  parseImcFromDoctorBio,
  parseLanguagesFromDoctorBio,
  parseWhatsappFromDoctorBio,
  type PublicDoctorRecord,
} from "@/lib/content/get-public-doctors";
import type { PublicServiceRecord } from "@/lib/content/get-public-services";
import {
  formatOptionalPrice,
  getPublicServicesForCountry,
  getPublicServicesNormalized,
} from "@/lib/content/get-public-services";
import { getPublicSpecialtiesForCountry } from "@/lib/content/get-public-specialties";
import { resolveTrustedAssetUrl } from "@/lib/content/asset-media-url";
import { sanitizePublicContent } from "@/lib/content/publication-guard";

type CountryHint = CountryCode | "auto";

type CountryPaths = {
  home: string;
  team: string;
  general: string;
  specialist: string;
};

type ServiceCardData = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
  imageSrc?: string;
  themeColor?: string;
  stats?: string;
};

function buildPublicServiceHref(service: PublicServiceRecord, countryCode: CountryCode): string {
  const countryPaths = pathByCountry[countryCode];
  if (service.legacyPath) {
    if (service.kind === "GENERAL" && service.legacyPath === countryPaths.general) {
      return countryCode === "ie" ? `/ireland/${service.slug}` : `/service-page/${service.slug}`;
    }
    if (service.kind === "SPECIALIST" && service.legacyPath === countryPaths.specialist) {
      return countryCode === "ie" ? `/ireland-specialist-consultations/${service.slug}` : `/service-page/${service.slug}`;
    }
    return service.legacyPath;
  }
  if (service.kind === "SPECIALIST" && countryCode === "ie") {
    return `/ireland-specialist-consultations/${service.slug}`;
  }
  if (service.kind === "GENERAL" && countryCode === "ie") {
    return `/ireland/${service.slug}`;
  }
  return `/services/${countryCode}-${service.slug}`;
}

export type HomeTemplateData = {
  hero: {
    eyebrow: string | undefined;
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    trustBadges: string[];
    heroImage: { src: string; alt: string };
  };
  quickActions: Array<{ title: string; href: string }>;
  availability: {
    eyebrow: string;
    title: string;
    description: string;
    cta: { label: string; href: string };
  };
  about: {
    eyebrow: string;
    title: string;
    description: string[];
    highlight: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string };
  };
  specialties: {
    title: string;
    subtitle: string;
    cta: { label: string; href: string };
  };
  serviceCards: ServiceCardData[];
  steps: Array<{ title: string; description: string; ctaLabel?: string; ctaHref?: string }>;
  homeDelivery: {
    title: string;
    description: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string };
    /** Short trust points shown under the description (optional). */
    highlights?: string[];
  };
  doctorSpotlight: {
    quote: string;
    name: string;
    title: string;
    credential: string;
    image: { src: string; alt: string };
  };
  trust: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; description: string; image?: { src: string; alt: string } }>;
  };
  faqTitle: string;
  booking: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    /** Optional editorial photo beside final CTA (e.g. ireland-cta or footer-cta asset). */
    asideImage?: { src: string; alt: string };
  };
  /** Populated when partner logo assets exist — never synthetic placeholders. */
  partnerLogos?: Array<{ src: string; alt: string }>;
  /** Optional trust line shown when partner logos are empty. */
  partnerTrustLine?: string;
};

type GeneralConsultationTemplateData = {
  heroTitle: string;
  heroDescription: string;
  primaryCtaLabel: string;
  secondaryCta?: { label: string; href: string };
  explanation: { title: string; body: string };
  serviceCards: ServiceCardData[];
  pricing: {
    title: string;
    description: string;
    items: Array<{ name: string; price: string; description: string }>;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: Array<{ title: string; description: string; ctaLabel?: string; ctaHref?: string }>;
  };
  trust: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; description: string }>;
  };
  faq: { title: string; items: Array<{ question: string; answer: string }> };
};

type DoctorProfileData = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country: string;
  languages: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string;
  href?: string;
  ctaLabel?: string;
};

const pathByCountry: Record<CountryCode, CountryPaths> = {
  ie: { home: "/home", team: "/ireland-team", general: "/general-consultation-ie", specialist: "/specialty-ie" },
  pt: { home: "/home-pt", team: "/portugal-team", general: "/general-consultation-pt", specialist: "/specialty-pt" },
  sp: { home: "/home-sp", team: "/spain-team", general: "/general-consultation-sp", specialist: "/specialty-sp" },
  cz: { home: "/home-cz", team: "/czechia-team", general: "/general-consultation-cz", specialist: "/specialty-cz" },
  rm: { home: "/home-rm", team: "/romania-team", general: "/general-consultation-rm", specialist: "/specialty-rm" },
};

const countryLabels: Record<CountryCode, string> = {
  ie: "Ireland",
  pt: "Portugal",
  sp: "Spain",
  cz: "Czechia",
  rm: "Romania",
};

const countryHubDrafts: Record<
  Exclude<CountryCode, "ie">,
  {
    title: string;
    description: string;
    availability: string;
    supported: string;
    language: string;
    pricing: string;
    limitations: string;
    booking: string;
  }
> = {
  pt: {
    title: "Online Medical Consultations in Portugal",
    description:
      "Use the Portugal clinic hub to review current online consultation availability, language expectations, pricing notes, and booking guidance before choosing a route.",
    availability:
      "This page should act as a Portugal access hub, not a promise of full local coverage. Only routes with confirmed staffing and workflow should be treated as fully live.",
    supported:
      "Portugal should lead with active general consultations, selected specialist appointments, medication follow-up where permitted, and referral guidance where clinically appropriate.",
    language:
      "Portuguese or English support depends on the clinician schedule shown during booking. Do not assume every slot is bilingual.",
    pricing:
      "Prices should be shown in euro when configured. If a route is still being confirmed, the final cost should be described as visible before payment.",
    limitations:
      "Prescriptions, referrals, and certificates depend on clinical review and local workflow. Online care cannot replace urgent in-person assessment.",
    booking:
      "Choose Portugal, select the consultation type, complete intake, review the price and appointment details, then confirm the booking.",
  },
  sp: {
    title: "Online Medical Consultations in Spain",
    description:
      "Review current online doctor access in Spain, language expectations, booking flow, and country-specific limits on prescriptions and referrals.",
    availability:
      "The Spain page should explain what is currently available rather than implying a fully mature local service where operations are still being confirmed.",
    supported:
      "Feature only active pathways such as general consultation, selected specialist appointments, and follow-up review where online care is suitable.",
    language:
      "Spanish and English support should only be promised where clinician coverage exists.",
    pricing:
      "Display euro pricing when configured. If the route is not fully operational, the page should explain that pricing is shown before booking.",
    limitations:
      "Online care in Spain should clearly state that emergencies, severe symptoms, and problems needing examination or urgent tests must be redirected to in-person care.",
    booking:
      "Select Spain, choose the relevant service, complete intake, review availability and pricing, then confirm the appointment.",
  },
  cz: {
    title: "Online Medical Consultations in Czechia",
    description:
      "Visit the Czechia clinic hub for consultation availability, booking guidance, language notes, and clear online-care limits.",
    availability:
      "Czechia should be presented as a country-specific access hub with current availability, not as a fully mature local service unless operations support that claim.",
    supported:
      "Lead with first-contact consultations and any genuinely staffed specialist routes. Avoid a broad directory if only a few pathways are active.",
    language:
      "Czech and English support should be shown at booking stage based on the clinician rota.",
    pricing:
      "Use the configured currency shown in the booking flow. If pricing is incomplete, explain that the final cost is visible before payment.",
    limitations:
      "Explain that online care can help with many non-emergency concerns, but some prescriptions, referrals, and certificates may require a different route or in-person care.",
    booking:
      "Choose Czechia, select the consultation type, complete the intake, review price and timing, and then confirm the booking.",
  },
  rm: {
    title: "Online Medical Consultations in Romania",
    description:
      "Explore the Romania clinic hub for online consultation booking, language guidance, pricing notes, and country-specific limits on online care.",
    availability:
      "Romania should be positioned as a practical route overview with clear scope and limitations rather than a cloned marketing page.",
    supported:
      "Highlight the service categories that are genuinely available for Romania, starting with general consultations and any active specialist pathways.",
    language:
      "Romanian and English support should only be promised if supported by the live rota.",
    pricing:
      "Display the final appointment cost before payment. If structured pricing is not complete, the page should explain that the final price appears during booking.",
    limitations:
      "Medication requests, referrals, and supporting documents depend on clinician review and service-specific workflow.",
    booking:
      "Select Romania, choose the most suitable consultation type, complete intake, review timing and price, then confirm the appointment.",
  },
};

const specialtyCardSeeds: Record<CountryCode, Array<{ title: string; description: string }>> = {
  ie: [
    { title: "Cardiology Consultation", description: "Focused online support for heart-health concerns and follow-up planning." },
    { title: "Pediatric Consultation", description: "Specialist guidance for children and family care concerns." },
    { title: "Dermatology Consultation", description: "Specialist advice for skin conditions through secure online review." },
    { title: "Psychiatry Consultation", description: "Confidential mental health support with specialist review." },
    { title: "Nutrition Consultation", description: "Personalized nutrition planning and ongoing care discussions." },
    { title: "Physiotherapy Consultation", description: "Movement, rehabilitation, and pain-support planning online." },
  ],
  pt: [
    { title: "General Medicine", description: "Online consultations for common health questions and day-to-day medical needs." },
    { title: "Pediatrics", description: "Family-focused care support for children, parents, and guardians." },
    { title: "Dermatology", description: "Specialist-led review for skin concerns and treatment planning." },
    { title: "Psychology", description: "Private, structured support for emotional wellbeing and mental health." },
    { title: "Nutrition", description: "Dietary guidance and practical health planning through online care." },
    { title: "Women’s Health", description: "Supportive consultations for routine women’s health concerns." },
  ],
  sp: [
    { title: "General Medicine", description: "Accessible online appointments for everyday medical questions and follow-up." },
    { title: "Cardiology", description: "Heart-health advice, review, and referral planning where needed." },
    { title: "Dermatology", description: "Skin-health consultations with secure online intake and follow-up." },
    { title: "Psychology", description: "Private online support for mental health and emotional wellbeing." },
    { title: "Nutrition", description: "Nutrition-focused consultations that support long-term health goals." },
    { title: "Orthopedics", description: "Guidance for joint, bone, and movement-related concerns." },
  ],
  cz: [
    { title: "General Medicine", description: "Online first-contact care for common symptoms and ongoing support." },
    { title: "Pediatrics", description: "Child and family consultations with safe online access." },
    { title: "Neurology", description: "Specialist support for neurological concerns and next-step planning." },
    { title: "Psychiatry", description: "Confidential mental health review in a secure online setting." },
    { title: "Endocrinology", description: "Support for hormonal, thyroid, and metabolic health concerns." },
    { title: "Dermatology", description: "Remote review for skin concerns and treatment guidance." },
  ],
  rm: [
    { title: "General Medicine", description: "Flexible online consultations for common health concerns and advice." },
    { title: "Cardiology", description: "Specialist review for heart-health questions and follow-up needs." },
    { title: "Pediatrics", description: "Convenient online care for children and family-focused concerns." },
    { title: "Nutrition", description: "Guidance for healthy routines, dietary planning, and support." },
    { title: "Psychology", description: "Private consultations for mental health and emotional support." },
    { title: "Women’s Health", description: "Online consultations for routine women’s health needs." },
  ],
};

function fallbackByPath(pathname: string): CountryCode {
  const exact = countries.find(
    (country) =>
      pathByCountry[country.code].home === pathname ||
      pathByCountry[country.code].team === pathname ||
      pathByCountry[country.code].general === pathname ||
      pathByCountry[country.code].specialist === pathname,
  );
  if (exact) return exact.code;
  return "ie";
}

function slugToLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildGenericServiceCards(countryCode: CountryCode, paths: CountryPaths): ServiceCardData[] {
  return specialtyCardSeeds[countryCode].map((item) => ({
    ...item,
    href: paths.specialist,
  }));
}

function buildCountryHomeData(
  countryCode: CountryCode,
  countryName: string,
  paths: CountryPaths,
  irelandSpecialistCards: ServiceCardData[],
): HomeTemplateData {
  if (countryCode === "ie") {
    return {
      hero: {
        eyebrow: undefined,
        title: "Ireland Online Medical Clinic",
        description:
          "Irish Medical Council certified and specialized doctors available across Ireland, with multilingual consultations when you need them.",
        primaryCta: { label: "Schedule with a GP", href: paths.general },
        secondaryCta: { label: "Schedule with a Specialist", href: paths.specialist },
        trustBadges: ["Irish Medical Council", "Same-day consultation", "Multilingual care"],
        heroImage: {
          src: "/images/hero/ireland-hero-photo.png",
          alt: "Patient at home on a video call with a licensed doctor for an online medical consultation",
        },
      },
      quickActions: [
        { title: "Home", href: paths.home },
        { title: "Specialist Consultation", href: paths.specialist },
        { title: "GP Consultation", href: paths.general },
      ],
      availability: {
        eyebrow: "Need Help?",
        title: "Same-Day Consultation",
        description: "Check our availability and book the date and time that works for you.",
        cta: { label: "Book Your Consultation", href: paths.general },
      },
      about: {
        eyebrow: "About us",
        title: "Quality Healthcare, Without Leaving Home",
        description: [
          "Global Health is an online medical clinic that connects you with qualified and specialized healthcare professionals through secure video consultations.",
          "No matter where you are in Ireland, you can access experienced doctors who speak multiple languages and focus on continuity of care.",
        ],
        highlight: "Excellent medical care, without leaving home.",
        cta: { label: "Schedule an Appointment", href: paths.general },
        image: {
          src: "/images/ireland/ireland-about-section.png",
          alt: "Global Health Ireland online clinic: quality healthcare from home",
        },
      },
      specialties: {
        title: "Specialist Consultations",
        subtitle: "Wide range of medical specialties available online.",
        cta: { label: "View All Our Areas", href: paths.specialist },
      },
      serviceCards: irelandSpecialistCards.slice(0, 6),
      steps: [
        {
          title: "Choose Your Location and Specialty",
          description: "Select the country where you are located and the service that best fits your needs.",
        },
        {
          title: "Choose the Type of Consultation",
          description: "Browse the consultation type you need and complete the booking form.",
          ctaLabel: "Schedule a consultation",
          ctaHref: paths.specialist,
        },
        {
          title: "Sent to Your Email",
          description: "Receive your email confirmation with the consultation day and time.",
          ctaLabel: "Schedule a consultation",
          ctaHref: paths.specialist,
        },
      ],
      homeDelivery: {
        title: "Home Delivery",
        description:
          "Prescription delivery is available across Dublin through partner pharmacies, handled safely and discreetly after your online consultation.",
        cta: { label: "Get Prescription Delivered", href: "/home-delivery" },
        image: {
          src: "/images/ireland/ireland-home-delivery.png",
          alt: "Prescription home delivery: pharmacy packaging, medication box, and delivery tracking on a phone for Dublin patients",
        },
        highlights: [
          "Secure & discreet",
          "Fast delivery across Dublin",
          "Partner pharmacies",
        ],
      },
      doctorSpotlight: {
        quote: "Telemedicine is changing the way we do medicine, and we are here for you.",
        name: "Dr. Khoiamul Islam",
        title: "Doctor in Medicine",
        credential: "IMC 542074",
        image: {
          src: "/images/ireland/doctor-spotlight-ai.svg",
          alt: "Illustrative doctor portrait used for clinic spotlight",
        },
      },
      trust: {
        title: "Trusted healthcare standards",
        subtitle: "We follow strict European standards for your safety",
        items: [
          { title: "Licensed Doctors", description: "All consultations are provided by qualified and registered doctors in your country." },
          { title: "Secure & Confidential", description: "Your personal data is protected under strict GDPR standards." },
          { title: "Fast Access", description: "Book in minutes and get the care you need, when you need it." },
          { title: "Available across Europe", description: "Proudly serving patients in multiple EU countries with trusted healthcare." },
        ],
      },
      faqTitle: "Ireland clinic FAQs",
      booking: {
        title: "Start Your Online Consultation",
        description: "Choose your country and connect with a licensed doctor in minutes. 100% online, no waiting rooms, confidential.",
        ctaLabel: "Start Consultation",
        ctaHref: paths.general,
      },
      partnerTrustLine: "Trusted by healthcare partners across Ireland",
    };
  }

  const countryLabel = countryLabels[countryCode];
  const genericServiceCards = buildGenericServiceCards(countryCode, paths);
  const localeTag = countryCode === "pt" ? "Portugal" : countryCode === "sp" ? "Spain" : countryCode === "cz" ? "Czechia" : "Romania";
  const hubDraft = countryHubDrafts[countryCode];

  return {
    hero: {
      eyebrow: `${countryLabel} clinic hub`,
      title: hubDraft.title,
      description: hubDraft.description,
      primaryCta: { label: "Schedule with a GP", href: paths.general },
      secondaryCta: { label: "Schedule with a Specialist", href: paths.specialist },
      trustBadges: ["Country-specific route", "Private intake", "Booking shown before payment"],
      heroImage: {
        src: "/images/hero/country-home-hero-ai.svg",
        alt: `Illustration of an online medical consultation for the ${countryLabel} clinic`,
      },
    },
    quickActions: [
      { title: "Home", href: paths.home },
      { title: "Specialist Consultation", href: paths.specialist },
      { title: "GP Consultation", href: paths.general },
    ],
    availability: {
      eyebrow: "Availability",
      title: `What to expect in ${countryLabel}`,
      description: hubDraft.availability,
      cta: { label: "Book Your Consultation", href: paths.general },
    },
    about: {
      eyebrow: "Supported services",
      title: `How the ${countryLabel} route should be used`,
      description: [
        hubDraft.supported,
        hubDraft.limitations,
      ],
      highlight: hubDraft.booking,
      cta: { label: "Schedule an Appointment", href: paths.general },
      image: {
        src: "/images/about/about-clinic-ai.svg",
        alt: `Illustration of clinicians collaborating for ${countryLabel} clinic care`,
      },
    },
    specialties: {
      title: "Specialist Consultations",
      subtitle: `Explore the specialist routes currently promoted for ${countryLabel}, then confirm live availability during booking.`,
      cta: { label: "View All Our Areas", href: paths.specialist },
    },
    serviceCards: genericServiceCards,
    steps: [
      {
        title: "Choose Your Location and Specialty",
        description: `Select ${countryLabel} and choose the consultation or specialty that best matches your concern.`,
      },
      {
        title: "Choose the Type of Consultation",
        description: hubDraft.pricing,
        ctaLabel: "Schedule a consultation",
        ctaHref: paths.specialist,
      },
      {
        title: "Sent to Your Email",
        description: hubDraft.booking,
        ctaLabel: "Schedule a consultation",
        ctaHref: paths.general,
      },
    ],
    homeDelivery: {
      title: "Prescription Support",
      description: hubDraft.limitations,
      cta: { label: "Explore GP consultations", href: paths.general },
      image: {
        src: "/images/services/home-delivery-ai.svg",
        alt: `Illustration of prescription support and safe home delivery for ${countryLabel}`,
      },
    },
    doctorSpotlight: {
        quote: `${countryLabel} patients should be able to see what is available, what is not, and what the next step is before they book.`,
        name: `${localeTag} Clinic Team`,
        title: "Country care team",
        credential: "Credential details shown on clinician profiles where available",
      image: {
        src: "/images/ireland/doctor-spotlight-ai.svg",
        alt: `Illustrative clinician portrait for the ${countryLabel} clinic team`,
      },
    },
    trust: {
        title: `Country-specific booking guidance for ${countryLabel}`,
        subtitle: "Use the hub to understand availability, language expectations, and online-care limits before you choose a route.",
        items: [
          { title: "Language expectations", description: hubDraft.language },
          { title: "Pricing notes", description: hubDraft.pricing },
          { title: "Prescription and referral limits", description: hubDraft.limitations },
          { title: "Booking flow", description: hubDraft.booking },
        ],
      },
    faqTitle: `${countryLabel} clinic FAQs`,
    booking: {
      title: "Start Your Online Consultation",
      description: `Choose your consultation type and connect with a licensed doctor in ${countryLabel} through our online clinic routes.`,
      ctaLabel: "Start Consultation",
      ctaHref: paths.general,
    },
    partnerTrustLine: `Trusted healthcare standards in ${countryLabel}`,
  };
}

function buildFaqItems(countryCode: CountryCode, countryName: string) {
  return [
    {
      question: `How do online consultations work in ${countryName}?`,
      answer: "Book online, complete intake, and connect securely with a licensed clinician.",
    },
    {
      question: "Can I book a same-day consultation?",
      answer: "Availability depends on the clinician schedule and service type shown during booking.",
    },
    {
      question: countryCode === "pt" ? "Can I book in Portuguese?" : countryCode === "sp" ? "Can I book in Spanish?" : countryCode === "cz" ? "Can I book for care in Czechia?" : "Can I book for care in Romania?",
      answer: `Language and country-specific availability will depend on the clinic schedule shown for ${countryName}.`,
    },
  ];
}

function buildGeneralConsultationCards(countryCode: CountryCode, services: PublicServiceRecord[]): ServiceCardData[] {
  return services
    .filter((service) => service.kind === "GENERAL")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((service) => ({
      title: service.name,
      description:
        service.summary ??
        "Online consultation pathway for this health concern, with intake review and next-step guidance.",
      href: buildPublicServiceHref(service, countryCode),
      serviceType: "general",
      audience: "Adults and families",
      duration: service.durationMinutes != null ? `${service.durationMinutes} min` : undefined,
      startingPrice: formatOptionalPrice(service),
      imageSrc: service.imagePath ? (resolveTrustedAssetUrl(service.imagePath) ?? service.imagePath) : undefined,
      stats: [
        service.durationMinutes != null ? `${service.durationMinutes} min` : null,
        formatOptionalPrice(service) ?? null,
      ]
        .filter(Boolean)
        .join(" • "),
    }));
}

function buildGeneralConsultationTemplateData(
  countryCode: CountryCode,
  countryName: string,
  paths: CountryPaths,
  services: PublicServiceRecord[],
): GeneralConsultationTemplateData {
  return {
    heroTitle: `General Consultation - ${countryName}`,
    heroDescription: `Book online first-contact medical consultations for ${countryName}. Compare available GP-style consultation options before choosing a booking route.`,
    primaryCtaLabel: "Book consultation",
    secondaryCta: { label: "Meet doctors", href: paths.team },
    explanation: {
      title: `What general consultations include in ${countryName}`,
      body: "General consultations cover common health concerns, first assessments, and guidance on next steps. Service availability and final scope details are confirmed during booking and intake.",
    },
    serviceCards: buildGeneralConsultationCards(countryCode, services),
    pricing: {
      title: "Starting from",
      description:
        "Starting prices help patients compare options quickly. Final pricing and currency details are confirmed per country route during booking.",
      items: [
        {
          name: "Standard consultation",
          price: countryCode === "ie" ? "From EUR 45" : "From EUR 35",
          description: "Typical first-contact consultation including review of symptoms and recommended next steps.",
        },
        {
          name: "Extended consultation",
          price: countryCode === "ie" ? "From EUR 65" : "From EUR 55",
          description: "Longer appointment format when additional discussion and follow-up planning are needed.",
        },
      ],
    },
    howItWorks: {
      title: "How booking works",
      subtitle: "Simple flow designed for mobile and desktop",
      steps: [
        {
          title: "Choose consultation type",
          description: "Select the service that best matches your current concern.",
        },
        {
          title: "Book online",
          description: "Pick your preferred time and complete the intake form.",
          ctaLabel: "Book now",
          ctaHref: paths.general,
        },
        {
          title: "Attend secure consultation",
          description: "Join your appointment and receive guidance on next steps.",
        },
      ],
    },
    trust: {
      title: `Why patients trust consultations in ${countryName}`,
      subtitle: "Healthcare-focused, privacy-first, and country-ready",
      items: [
        { title: "Clinical review", description: "Consultations are handled by qualified medical professionals where service availability is confirmed." },
        { title: "Private booking journey", description: "Online booking and appointment flow is built with privacy in mind." },
        { title: "Country-specific options", description: "Consultation choices reflect the selected country route." },
      ],
    },
    faq: {
      title: `${countryName} general consultation FAQs`,
      items: buildFaqItems(countryCode, countryName),
    },
  };
}

const defaultDoctorLanguages: Record<CountryCode, string[]> = {
  ie: ["English"],
  pt: ["Portuguese", "English"],
  sp: ["Spanish", "English"],
  cz: ["Czech", "English"],
  rm: ["Romanian", "English"],
};

function languagesForDoctorCard(bio: string | null | undefined, countryCode: CountryCode): string[] {
  return parseLanguagesFromDoctorBio(bio) ?? defaultDoctorLanguages[countryCode];
}

function mapPublicDoctorToCard(
  d: PublicDoctorRecord,
  countryCode: CountryCode,
  paths: CountryPaths,
): DoctorProfileData {
  const href = `${paths.team.replace(/\/$/, "")}/${d.slug}`;
  return {
    name: d.fullName,
    title: d.title,
    ...(d.imcRegistration
      ? { imcRegistration: d.imcRegistration }
      : parseImcFromDoctorBio(d.bio)
        ? { imcRegistration: parseImcFromDoctorBio(d.bio)! }
        : {}),
    ...(d.medicalRegistrationUrl ? { medicalRegistrationUrl: d.medicalRegistrationUrl } : {}),
    country: d.countryName,
    languages:
      d.languages && d.languages.length > 0
        ? d.languages
        : languagesForDoctorCard(d.bio, countryCode),
    ...(d.whatsappNumber
      ? { whatsappNumber: d.whatsappNumber }
      : parseWhatsappFromDoctorBio(d.bio)
        ? { whatsappNumber: parseWhatsappFromDoctorBio(d.bio)! }
        : {}),
    bio:
      d.bio ??
      `Supports patient consultations and follow-up care through ${d.countryName} clinic routes.`,
    ...(d.profileImageSrc ? { imageSrc: d.profileImageSrc } : {}),
    href,
    ctaLabel: "View profile",
  };
}

function mergeSpecialistListingCopy(
  listing: Array<ServiceCardData>,
  services: PublicServiceRecord[],
): Array<ServiceCardData> {
  return listing.map((item) => {
    const match = services.find((s) => {
      if (s.countryCode !== "ie") return false;
      if (s.legacyPath && s.legacyPath === item.href) return true;
      const slug = item.href.replace("/ireland-specialist-consultations/", "");
      return s.slug === slug;
    });
    if (!match) return item;
    return {
      ...item,
      title: match.name,
      description: match.summary ?? item.description,
    };
  });
}

export async function getTemplatePageData(pathname: string, countryHint: CountryHint = "auto") {
  const site = await getSiteContext({ pathname });
  const countryCode = countryHint === "auto" ? fallbackByPath(pathname) : countryHint;
  const country = getCountryByCode(countryCode) ?? site.country;
  const paths = pathByCountry[country.code];

  const [publicDoctors, publicServices] = await Promise.all([
    getPublicDoctorsForCountry(country.code),
    getPublicServicesForCountry(country.code),
  ]);
  const publicSpecialties = await getPublicSpecialtiesForCountry(country.code);

  const generalListing = publicServices
    .filter((service) => service.kind === "GENERAL")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((service) => ({
      title: service.name,
      description: service.summary ?? "",
      href: buildPublicServiceHref(service, country.code),
    }));

  const specialistListingRaw =
    publicSpecialties.length > 0
      ? publicSpecialties
          .filter((specialty) => specialty.primaryService)
          .map((specialty) => {
            const primaryService = specialty.primaryService!;
            const linkedService = publicServices.find((service) => service.id === primaryService.id);
            const href =
              primaryService.legacyPath ||
              `/ireland-specialist-consultations/${primaryService.slug}`;
            return {
              title: specialty.name,
              description: specialty.cardSummary || primaryService.summary || "",
              href,
              imageSrc: specialty.imagePath
                ? (resolveTrustedAssetUrl(specialty.imagePath) ?? specialty.imagePath)
                : linkedService?.imagePath
                  ? (resolveTrustedAssetUrl(linkedService.imagePath) ?? linkedService.imagePath)
                  : undefined,
              themeColor: specialty.cardThemeColor ?? undefined,
              stats: [
                primaryService.durationMinutes != null ? `${primaryService.durationMinutes} min` : null,
                primaryService.basePriceCents != null && primaryService.currencyCode
                    ? formatOptionalPrice({
                      ...primaryService,
                      kind: "SPECIALIST",
                      sortOrder: specialty.sortOrder,
                      countryCode: country.code,
                    heroTitle: null,
                    heroDescription: null,
                    detailBody: null,
                    seoTitle: null,
                    seoDescription: null,
                    ctaLabel: null,
                    specialtyId: specialty.id,
                    imagePath: null,
                    editorialChecklist: null,
                  })
                : null,
              ]
                .filter(Boolean)
                .join(" • "),
            };
          })
      : [];

  const specialistListing = mergeSpecialistListingCopy(specialistListingRaw, publicServices);

  const countryHome = buildCountryHomeData(country.code, country.name, paths, specialistListing);

  const doctors = publicDoctors.map((d) => mapPublicDoctorToCard(d, country.code, paths));

  const faqItems = buildFaqItems(country.code, country.name);

  // Blog rebuild is out of scope on this branch — emit an empty list so consumers
  // that expect a blogPosts field still typecheck without rendering anything.
  const blogPosts: { title: string; excerpt: string; href: string }[] = [];

  const generalConsultationRaw = buildGeneralConsultationTemplateData(
    country.code,
    country.name,
    paths,
    publicServices,
  );

  const generalConsultation = generalConsultationRaw;

  return sanitizePublicContent({
    site,
    country,
    paths,
    generalListing,
    specialistListing,
    doctors,
    faqItems,
    blogPosts,
    countryHome,
    generalConsultation,
  });
}

export function buildServiceDetailCopy(slug: string) {
  const title = slugToLabel(slug);
  return {
    title,
    description: "Online consultation for non-emergency health concerns with clinician review and practical follow-up guidance.",
    body: [
      "This consultation connects you with a licensed clinician through a secure online session. Prepare your symptoms, history, and any questions ahead of time.",
      "The clinician will review your intake, discuss your concerns, and provide guidance on follow-up care, prescriptions, or referrals as appropriate.",
    ],
  };
}

export type ServiceDetailCopyData = {
  title: string;
  description: string;
  body: string[];
  bodyHtml?: string | null;
  imageSrc?: string;
  bookingLabel?: string;
  keyFacts: Array<{ label: string; value: string }>;
};

export async function buildServiceDetailCopyAsync(
  slug: string,
  mode: "general" | "specialist" | "prescription" | "health-test" | "home-delivery",
  countryCode?: CountryCode,
): Promise<ServiceDetailCopyData> {
  const expectedKind =
    mode === "specialist"
      ? "SPECIALIST"
      : mode === "prescription"
        ? "PRESCRIPTION"
        : mode === "health-test"
          ? "HEALTH_TEST"
          : mode === "home-delivery"
            ? "HOME_DELIVERY"
            : "GENERAL";
  const defaultFacts = [
    { label: "Est. duration", value: "Confirmed during booking" },
    { label: "Starting price", value: "Shown before booking" },
  ];

  const services = await getPublicServicesNormalized();
  const match = services.find((service) => {
    if (countryCode && service.countryCode !== countryCode) return false;
    if (service.kind !== expectedKind) return false;
    if (service.slug === slug) return true;
    return Boolean(service.legacyPath && service.legacyPath.endsWith(slug));
  });
  if (!match) {
    return sanitizePublicContent({ ...buildServiceDetailCopy(slug), keyFacts: defaultFacts });
  }

  return sanitizePublicContent({
    title: match.heroTitle ?? match.name,
    description: match.heroDescription ?? match.summary ?? "",
    body: match.detailBody ? [match.detailBody] : match.summary ? [match.summary] : [],
    bodyHtml: match.detailBody ?? null,
    imageSrc: match.imagePath ? (resolveTrustedAssetUrl(match.imagePath) ?? match.imagePath) : undefined,
    bookingLabel: match.ctaLabel ?? "Book Online",
    keyFacts: [
      {
        label: "Est. duration",
        value:
          match.durationMinutes != null ? `${match.durationMinutes} min (estimate)` : "Confirmed during booking",
      },
      {
        label: "Starting price",
        value: formatOptionalPrice(match) ?? "Shown before booking",
      },
    ],
  });
}

export function buildLegalCopy(title: string) {
  return sanitizePublicContent({
    description: "Plain-language legal and policy information for Global Health patients and website visitors.",
    sections: [
      {
        heading: "Plain-language summary",
        body: `${title} explains the rules, rights, and limits that apply to this website and related Global Health services.`,
      },
      {
        heading: "Legal review status",
        body: "This page is pending final legal approval. Entity details, effective date, and any jurisdiction-specific wording must be confirmed by the legal team before indexing.",
      },
      {
        heading: "Required legal details",
        body: "Last updated date, legal entity name, company details, and any statutory references must be added by the legal team rather than inferred from marketing copy.",
      },
      {
        heading: "Contact route",
        body: "For questions about this policy, contact the clinic team before booking or using the relevant service.",
      },
    ],
  });
}
