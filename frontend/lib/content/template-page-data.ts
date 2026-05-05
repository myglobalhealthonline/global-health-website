import type { CountryCode } from "@/data/countries";
import { countries, getCountryByCode } from "@/data/countries";
import { routeInventory } from "@/data/routes";
import { getSiteContext } from "@/lib/content/get-site-context";

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
};

type HomeTemplateData = {
  hero: {
    eyebrow: string;
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
    items: Array<{ title: string; description: string }>;
  };
  faqTitle: string;
  booking: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  };
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
        eyebrow: "Ireland Online Medical Clinic",
        title: "Medical Consultations Wherever You Are",
        description:
          "Irish Medical Council certified and specialized doctors available across Ireland, with multilingual consultations when you need them.",
        primaryCta: { label: "Schedule with a GP", href: paths.general },
        secondaryCta: { label: "Schedule with a Specialist", href: paths.specialist },
        trustBadges: ["Irish Medical Council", "Same-day consultation", "Multilingual care"],
        heroImage: {
          src: "/images/hero/ireland-home-hero-placeholder.svg",
          alt: "Ireland clinic homepage hero placeholder",
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
          src: "/images/ireland/about-placeholder.svg",
          alt: "Ireland clinic about section placeholder",
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
          src: "/images/ireland/home-delivery-placeholder.svg",
          alt: "Home delivery service placeholder",
        },
      },
      doctorSpotlight: {
        quote: "Telemedicine is changing the way we do medicine, and we are here for you.",
        name: "Dr. Khoiamul Islam",
        title: "Doctor in Medicine",
        credential: "IMC 542074",
        image: {
          src: "/images/ireland/doctor-spotlight-placeholder.svg",
          alt: "Doctor spotlight placeholder",
        },
      },
      trust: {
        title: "Trusted by thousands of patients across Europe",
        subtitle: "We follow strict European standards for your safety",
        items: [
          { title: "4.9/5 average rating", description: "Based on 2,000+ reviews across supported countries." },
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
    };
  }

  const countryLabel = countryLabels[countryCode];
  const genericServiceCards = buildGenericServiceCards(countryCode, paths);
  const heroAssetBase = countryCode === "pt" ? "portugal" : countryCode === "sp" ? "spain" : countryCode === "cz" ? "czechia" : "romania";
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
        src: `/images/hero/${heroAssetBase}-home-hero-placeholder.svg`,
        alt: `${countryLabel} clinic homepage hero placeholder`,
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
        src: `/images/${heroAssetBase}/about-placeholder.svg`,
        alt: `${countryLabel} clinic about section placeholder`,
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
        src: `/images/${heroAssetBase}/home-delivery-placeholder.svg`,
        alt: `${countryLabel} prescription support placeholder`,
      },
    },
    doctorSpotlight: {
      quote: `Online care in ${countryLabel} should feel accessible, safe, and straightforward.`,
      name: `${localeTag} Clinic Team`,
      title: "Licensed clinicians",
      credential: "Team profile migration pending",
      image: {
        src: `/images/${heroAssetBase}/doctor-spotlight-placeholder.svg`,
        alt: `${countryLabel} doctor spotlight placeholder`,
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

export async function getTemplatePageData(pathname: string, countryHint: CountryHint = "auto") {
  const site = await getSiteContext({ pathname });
  const countryCode = countryHint === "auto" ? fallbackByPath(pathname) : countryHint;
  const country = getCountryByCode(countryCode) ?? site.country;
  const paths = pathByCountry[country.code];

  const generalListing = routeInventory.irelandGeneralConsultation.map((route) => {
    const slug = route.replace("/ireland/", "");
    return {
      title: slugToLabel(slug),
      description: "TODO: Replace with verified service summary from CMS/backend content.",
      href: route,
    };
  });

  const specialistListing = routeInventory.irelandSpecialistConsultation.map((route) => {
    const slug = route.replace("/ireland-specialist-consultations/", "");
    return {
      title: slugToLabel(slug),
      description: "TODO: Replace with verified specialty summary from CMS/backend content.",
      href: route,
    };
  });

  const countryHome = buildCountryHomeData(country.code, country.name, paths, specialistListing);

  const doctors = [
    {
      name: country.code === "ie" ? "Dr. Khoiamul Islam" : `${country.name} Clinic Team`,
      title: country.code === "ie" ? "Doctor in Medicine" : "Licensed clinicians",
      bio:
        country.code === "ie"
          ? "Irish clinic doctor spotlight placeholder while team records are migrated into structured content."
          : `Team preview placeholder for ${country.name} while clinician records are migrated into structured content.`,
      href: country.code === "ie" ? "/ireland-team" : paths.team,
    },
  ];

  const faqItems = buildFaqItems(country.code, country.name);

  const blogPosts = routeInventory.blogPosts.slice(0, 9).map((route) => {
    const slug = route.replace("/post/", "");
    return {
      title: slugToLabel(slug),
      excerpt: "TODO: Replace with article excerpt from content system.",
      href: route,
    };
  });

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
  };
}

export function buildServiceDetailCopy(slug: string) {
  const title = slugToLabel(slug);
  return {
    title,
    description: "Informational placeholder while clinical copy is being migrated.",
    body: [
      "TODO: Replace this section with reviewed service copy from backend content administration.",
      "This template intentionally avoids medical claims until verified source content is integrated.",
    ],
  };
}

export function buildLegalCopy(title: string) {
  return {
    description: "Policy placeholder content pending legal copy migration and compliance review.",
    sections: [
      {
        heading: "Status",
        body: `TODO: Add reviewed legal text for ${title} from approved source documents.`,
      },
      {
        heading: "Scope",
        body: "This page template is wired and production-safe, but legal body copy remains pending migration.",
      },
    ],
  };
}
