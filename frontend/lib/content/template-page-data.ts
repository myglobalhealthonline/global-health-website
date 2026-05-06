import type { CountryCode } from "@/data/countries";
import { countries, getCountryByCode } from "@/data/countries";
import { routeInventory } from "@/data/routes";
import { getSiteContext } from "@/lib/content/get-site-context";
import {
  getPublicDoctorsForCountry,
  parseLanguagesFromDoctorBio,
  type PublicDoctorRecord,
} from "@/lib/content/get-public-doctors";
import type { PublicServiceRecord } from "@/lib/content/get-public-services";
import {
  formatOptionalPrice,
  getPublicServicesForCountry,
  getPublicServicesNormalized,
} from "@/lib/content/get-public-services";

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
};

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
  country: string;
  languages: string[];
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
          src: "/images/hero/ireland-hero-ai.svg",
          alt: "Illustration of an online doctor consultation for the Ireland clinic",
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
          src: "/images/ireland/about-clinic-ai.svg",
          alt: "Illustration of a collaborative online healthcare team",
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
          src: "/images/ireland/home-delivery-ai.svg",
          alt: "Illustration of secure healthcare home delivery service",
        },
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

  return {
    hero: {
      eyebrow: `${countryLabel} Online Medical Clinic`,
      title: "Medical Consultations Wherever You Are",
      description: `Connect with licensed clinicians in ${countryLabel} through secure online consultations, with local booking routes and specialist access.`,
      primaryCta: { label: "Schedule with a GP", href: paths.general },
      secondaryCta: { label: "Schedule with a Specialist", href: paths.specialist },
      trustBadges: ["Licensed clinicians", "Secure consultations", `${countryLabel} clinic hub`],
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
      eyebrow: "Need Help?",
      title: "Book Your Consultation",
      description: `Choose a service and schedule your online consultation in ${countryLabel}.`,
      cta: { label: "Book Your Consultation", href: paths.general },
    },
    about: {
      eyebrow: "About us",
      title: `Quality Healthcare, Without Leaving Home in ${countryLabel}`,
      description: [
        `Global Health connects patients in ${countryLabel} with licensed clinicians through secure online consultations.`,
        "Use the existing booking routes to access general consultations, specialist support, and clinic information while visual asset migration continues.",
      ],
      highlight: "Secure online care with local route coverage.",
      cta: { label: "Schedule an Appointment", href: paths.general },
      image: {
        src: "/images/about/about-clinic-ai.svg",
        alt: `Illustration of clinicians collaborating for ${countryLabel} clinic care`,
      },
    },
    specialties: {
      title: "Specialist Consultations",
      subtitle: `Explore specialist care categories currently promoted for ${countryLabel}.`,
      cta: { label: "View All Our Areas", href: paths.specialist },
    },
    serviceCards: genericServiceCards,
    steps: [
      {
        title: "Choose Your Location and Specialty",
        description: `Select ${countryLabel} and choose the consultation or specialty that fits your needs.`,
      },
      {
        title: "Choose the Type of Consultation",
        description: "Review the service details and complete the booking form with your information.",
        ctaLabel: "Schedule a consultation",
        ctaHref: paths.specialist,
      },
      {
        title: "Sent to Your Email",
        description: "Receive your booking confirmation with consultation timing and next-step details.",
        ctaLabel: "Schedule a consultation",
        ctaHref: paths.general,
      },
    ],
    homeDelivery: {
      title: "Prescription Support",
      description: `Prescription and follow-up support for ${countryLabel} will continue to be refined as final clinic-specific artwork is approved.`,
      cta: { label: "Explore GP consultations", href: paths.general },
      image: {
        src: "/images/services/home-delivery-ai.svg",
        alt: `Illustration of prescription support and safe home delivery for ${countryLabel}`,
      },
    },
    doctorSpotlight: {
      quote: `Online care in ${countryLabel} should feel accessible, safe, and straightforward.`,
      name: `${localeTag} Clinic Team`,
      title: "Licensed clinicians",
      credential: "Team profile migration pending",
      image: {
        src: "/images/ireland/doctor-spotlight-ai.svg",
        alt: `Illustrative clinician portrait for the ${countryLabel} clinic team`,
      },
    },
    trust: {
      title: `Why patients in ${countryLabel} choose us`,
      subtitle: "Secure healthcare access built around local route coverage",
      items: [
        { title: "Licensed clinicians", description: `Local clinic routes are available for ${countryLabel}.` },
        { title: "Secure consultations", description: "Digital consultations are designed for privacy and convenience." },
        { title: "Flexible booking", description: "General and specialist booking routes remain available during migration." },
        { title: "Country-specific hub", description: `This page is configured as the dedicated ${countryLabel} homepage variant.` },
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

function buildGeneralConsultationCards(countryCode: CountryCode): ServiceCardData[] {
  if (countryCode === "ie") {
    return routeInventory.irelandGeneralConsultation.map((route) => {
      const slug = route.replace("/ireland/", "");
      return {
        title: slugToLabel(slug),
        description: "Online consultation pathway for this health concern, with intake review and next-step guidance.",
        href: route,
        serviceType: "general",
        audience: "Adults and families",
        duration: "20-30 min",
        startingPrice: "From EUR 45",
      };
    });
  }

  const seed = specialtyCardSeeds[countryCode].slice(0, 6);
  return seed.map((item) => ({
    title: item.title,
    description: "Country-adapted general consultation service with secure booking and clinician follow-up guidance.",
    href: `/service-page/${item.title.toLowerCase().replaceAll(" ", "-").replaceAll("’", "").replaceAll("'", "")}`,
    serviceType: "general",
    audience: "Adults and families",
    duration: "20-30 min",
    startingPrice: "From EUR 35",
  }));
}

function buildGeneralConsultationTemplateData(
  countryCode: CountryCode,
  countryName: string,
  paths: CountryPaths,
): GeneralConsultationTemplateData {
  return {
    heroTitle: `General Consultation - ${countryName}`,
    heroDescription: `Book online first-contact medical consultations for ${countryName}. Services and final localized copy are managed via content adapters.`,
    primaryCtaLabel: "Book consultation",
    secondaryCta: { label: "Meet doctors", href: paths.team },
    explanation: {
      title: `What general consultations include in ${countryName}`,
      body: "General consultations cover common health concerns, first assessments, and guidance on next steps. Service availability and final scope details are confirmed during booking and intake.",
    },
    serviceCards: buildGeneralConsultationCards(countryCode),
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
        { title: "Licensed clinicians", description: "Consultations are delivered by qualified medical professionals." },
        { title: "Secure booking journey", description: "Online booking and appointment flow is built with privacy in mind." },
        { title: "Country-specific routes", description: "This page is configured for dedicated country consultation routing." },
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
  const href = countryCode === "ie" ? `/ireland-doctors/${d.slug}` : paths.team;
  return {
    name: d.fullName,
    title: d.title,
    country: d.countryName,
    languages: languagesForDoctorCard(d.bio, countryCode),
    bio:
      d.bio ??
      `Supports patient consultations and follow-up care through ${d.countryName} clinic routes.`,
    ...(d.profileImageSrc ? { imageSrc: d.profileImageSrc } : {}),
    href,
    ctaLabel: countryCode === "ie" ? "View profile" : "Meet doctors",
  };
}

function mergeServiceCardsWithBackend(
  cards: ServiceCardData[],
  services: PublicServiceRecord[],
  countryCode: CountryCode,
): ServiceCardData[] {
  if (countryCode !== "ie") return cards;
  return cards.map((card) => {
    const match = services.find((s) => {
      if (s.countryCode !== "ie") return false;
      if (s.legacyPath && s.legacyPath === card.href) return true;
      return `/ireland/${s.slug}` === card.href;
    });
    if (!match) return card;
    return {
      ...card,
      title: match.name,
      description: match.summary ?? card.description,
      startingPrice: formatOptionalPrice(match) ?? card.startingPrice,
      duration:
        match.durationMinutes != null ? `${match.durationMinutes} min` : card.duration,
    };
  });
}

function mergeSpecialistListingCopy(
  listing: Array<{ title: string; description: string; href: string }>,
  services: PublicServiceRecord[],
): Array<{ title: string; description: string; href: string }> {
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

function buildDoctorProfiles(countryCode: CountryCode, countryName: string, paths: CountryPaths): DoctorProfileData[] {
  const defaultLanguages = defaultDoctorLanguages;

  if (countryCode === "ie") {
    return [
      {
        name: "Dr. Khoiamul Islam",
        title: "General Medicine",
        country: "Ireland",
        languages: ["English"],
        bio: "Provides first-contact online consultations and continuity care pathways for patients across Ireland.",
        href: paths.team,
        ctaLabel: "Meet doctor",
      },
      {
        name: "Ireland Clinic Team",
        title: "Primary Care Network",
        country: "Ireland",
        languages: ["English"],
        bio: "Supports triage, follow-up, and referral coordination for online consultations across the Ireland clinic routes.",
        href: paths.team,
        ctaLabel: "Meet doctors",
      },
    ];
  }

  return [
    {
      name: `${countryName} Clinic Team`,
      title: "General Medicine",
      country: countryName,
      languages: defaultLanguages[countryCode],
      bio: `First-contact online consultation support for ${countryName}, including initial assessment and care navigation.`,
      href: paths.team,
      ctaLabel: "Meet doctors",
    },
    {
      name: `${countryName} Care Team`,
      title: "Patient Support",
      country: countryName,
      languages: defaultLanguages[countryCode],
      bio: "Coordinates booking, follow-up pathways, and clear next-step guidance for patients.",
      href: paths.team,
      ctaLabel: "Contact clinic",
    },
  ];
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

  const generalListing = routeInventory.irelandGeneralConsultation.map((route) => {
    const slug = route.replace("/ireland/", "");
    const match = publicServices.find((s) => {
      if (s.countryCode !== "ie") return false;
      if (s.legacyPath && s.legacyPath === route) return true;
      return `/ireland/${s.slug}` === route;
    });
    return {
      title: match?.name ?? slugToLabel(slug),
      description:
        match?.summary ??
        "Online consultation with secure intake, clinician review, and clear follow-up guidance.",
      href: route,
    };
  });

  const specialistListingRaw = routeInventory.irelandSpecialistConsultation.map((route) => {
    const slug = route.replace("/ireland-specialist-consultations/", "");
    const seed = specialtyCardSeeds.ie.find((s) =>
      s.title.toLowerCase().includes(slug.replace(/-/g, " ").toLowerCase())
    );
    return {
      title: slugToLabel(slug),
      description:
        seed?.description ??
        "Specialist consultation with secure online booking and clinician follow-up guidance.",
      href: route,
    };
  });

  const specialistListing = mergeSpecialistListingCopy(specialistListingRaw, publicServices);

  const countryHome = buildCountryHomeData(country.code, country.name, paths, specialistListing);

  const fallbackDoctors = buildDoctorProfiles(country.code, country.name, paths);
  const doctors =
    publicDoctors.length > 0
      ? publicDoctors.map((d) => mapPublicDoctorToCard(d, country.code, paths))
      : fallbackDoctors;

  const faqItems = buildFaqItems(country.code, country.name);

  const blogPosts = routeInventory.blogPosts.slice(0, 9).map((route) => {
    const slug = route.replace("/post/", "");
    return {
      title: slugToLabel(slug),
      excerpt: "Patient-focused article introducing online consultation workflows, booking guidance, and care navigation.",
      href: route,
    };
  });

  const generalConsultationRaw = buildGeneralConsultationTemplateData(
    country.code,
    country.name,
    paths,
  );

  const generalConsultation = {
    ...generalConsultationRaw,
    serviceCards: mergeServiceCardsWithBackend(
      generalConsultationRaw.serviceCards,
      publicServices,
      country.code,
    ),
  };

  return {
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
  };
}

export function buildServiceDetailCopy(slug: string) {
  const title = slugToLabel(slug);
  return {
    title,
    description: "Secure online consultation with licensed clinicians. Booking confirms the right next steps for your care.",
    body: [
      "This consultation connects you with a licensed clinician through a secure online session. Prepare your symptoms, history, and any questions ahead of time.",
      "The clinician will review your intake, discuss your concerns, and provide guidance on follow-up care, prescriptions, or referrals as appropriate.",
    ],
  };
}

export async function buildServiceDetailCopyAsync(slug: string, mode: "general" | "specialist") {
  const fallback = buildServiceDetailCopy(slug);
  const defaultFacts = [
    {
      label: "Service type",
      value: mode === "general" ? "General consultation" : "Specialist consultation",
    },
    { label: "Country", value: "Ireland" },
    { label: "Est. duration", value: "20-30 min (placeholder)" },
    { label: "Starting price", value: "From EUR 45 (placeholder)" },
  ];

  const services = await getPublicServicesNormalized();
  const canonicalHref =
    mode === "general" ? `/ireland/${slug}` : `/ireland-specialist-consultations/${slug}`;
  const match = services.find((s) => {
    if (s.countryCode !== "ie") return false;
    if (s.slug === slug) return true;
    if (s.legacyPath && (s.legacyPath === canonicalHref || s.legacyPath.endsWith(slug))) return true;
    return false;
  });
  if (!match) {
    return { ...fallback, keyFacts: defaultFacts };
  }

  const secondParagraph =
    "Final clinical scope, pricing, and operational details are confirmed during booking and intake based on country route availability.";

  return {
    title: match.name,
    description: match.summary ?? fallback.description,
    body: match.summary ? [match.summary, secondParagraph] : fallback.body,
    keyFacts: [
      {
        label: "Service type",
        value: mode === "general" ? "General consultation" : "Specialist consultation",
      },
      { label: "Country", value: "Ireland" },
      {
        label: "Est. duration",
        value:
          match.durationMinutes != null ? `${match.durationMinutes} min (estimate)` : "20-30 min (placeholder)",
      },
      {
        label: "Starting price",
        value: formatOptionalPrice(match) ?? "From EUR 45 (placeholder)",
      },
    ],
  };
}

export function buildLegalCopy(title: string) {
  return {
    description: "Policy placeholder content pending legal copy migration and compliance review.",
    sections: [
      {
        heading: "Status",
        body: `${title} details are presented in this policy format and are maintained through structured legal content workflows.`,
      },
      {
        heading: "Scope",
        body: "This page template is wired and production-safe, but legal body copy remains pending migration.",
      },
    ],
  };
}
