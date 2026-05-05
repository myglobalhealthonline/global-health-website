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

function buildCountryHomeData(
  countryCode: CountryCode,
  countryName: string,
  paths: CountryPaths,
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
      steps: [
        {
          title: "Choose Your Location and Specialty",
          description:
            "Select the country where you are located and the service that best fits your needs.",
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
          {
            title: "4.9/5 average rating",
            description: "Based on 2,000+ reviews across supported countries.",
          },
          {
            title: "Licensed Doctors",
            description:
              "All consultations are provided by qualified and registered doctors in your country.",
          },
          {
            title: "Secure & Confidential",
            description: "Your personal data is protected under strict GDPR standards.",
          },
          {
            title: "Fast Access",
            description: "Book in minutes and get the care you need, when you need it.",
          },
          {
            title: "Available across Europe",
            description:
              "Proudly serving patients in multiple EU countries with trusted healthcare.",
          },
        ],
      },
      faqTitle: "Ireland clinic FAQs",
      booking: {
        title: "Start Your Online Consultation",
        description:
          "Choose your country and connect with a licensed doctor in minutes. 100% online, no waiting rooms, confidential.",
        ctaLabel: "Start Consultation",
        ctaHref: paths.general,
      },
    };
  }

  return {
    hero: {
      eyebrow: `${countryName} Online Medical Clinic`,
      title: "Medical Consultations Wherever You Are",
      description: `Connect with licensed clinicians in ${countryName} through secure online consultations.`,
      primaryCta: { label: "Schedule with a GP", href: paths.general },
      secondaryCta: { label: "Schedule with a Specialist", href: paths.specialist },
      trustBadges: ["Licensed clinicians", "Secure consultations", `${countryName} clinic hub`],
      heroImage: {
        src: "/images/hero/homepage-hero-placeholder.svg",
        alt: `${countryName} clinic homepage placeholder`,
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
      description: "Choose a service and schedule your online consultation.",
      cta: { label: "Book now", href: paths.general },
    },
    about: {
      eyebrow: "About us",
      title: `Healthcare, without leaving home in ${countryName}`,
      description: [
        `Our ${countryName} clinic hub is being migrated into the new frontend.`,
        "You can already browse routes and book consultations through the existing public flows.",
      ],
      highlight: "Secure online care with local route coverage.",
      cta: { label: "Schedule an Appointment", href: paths.general },
      image: {
        src: "/images/hero/homepage-hero-placeholder.svg",
        alt: `${countryName} about section placeholder`,
      },
    },
    specialties: {
      title: "Consultations",
      subtitle: "Browse general and specialist services available online.",
      cta: { label: "View services", href: paths.specialist },
    },
    steps: [
      {
        title: "Choose your location and specialty",
        description: "Select your country and the consultation you need.",
      },
      {
        title: "Book the consultation",
        description: "Choose the service and complete the intake form.",
      },
      {
        title: "Check your email",
        description: "Receive the consultation confirmation and access details.",
      },
    ],
    homeDelivery: {
      title: "Prescription support",
      description: "Delivery and pharmacy details will be confirmed per country as assets and copy are migrated.",
      cta: { label: "Explore services", href: paths.general },
      image: {
        src: "/images/hero/homepage-hero-placeholder.svg",
        alt: `${countryName} prescription support placeholder`,
      },
    },
    doctorSpotlight: {
      quote: "Online care should feel accessible, safe, and straightforward.",
      name: `${countryName} Clinic Team`,
      title: "Licensed clinicians",
      credential: "Profile migration pending",
      image: {
        src: "/images/hero/homepage-hero-placeholder.svg",
        alt: `${countryName} doctor spotlight placeholder`,
      },
    },
    trust: {
      title: "Why patients choose us",
      subtitle: "Secure healthcare access built around local route coverage",
      items: [
        { title: "Licensed clinicians", description: `Local clinic routes are available for ${countryName}.` },
        { title: "Secure consultations", description: "Digital consultations are designed for privacy and convenience." },
        { title: "Fast booking", description: "Public booking flows remain available during migration." },
      ],
    },
    faqTitle: "FAQs",
    booking: {
      title: "Ready to get started?",
      description: "Book an online consultation with your local clinic team.",
      ctaLabel: "Book consultation",
      ctaHref: paths.general,
    },
  };
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

  const doctors = [
    {
      name: country.code === "ie" ? "Dr. Khoiamul Islam" : `${country.name} Clinic Team`,
      title: country.code === "ie" ? "Doctor in Medicine" : "Licensed clinicians",
      bio:
        country.code === "ie"
          ? "Irish clinic doctor spotlight placeholder while team records are migrated into structured content."
          : "TODO: Replace with doctor records from backend-admin managed profiles.",
      href: country.code === "ie" ? "/ireland-team" : undefined,
    },
  ];

  const faqItems = [
    {
      question: "How do online consultations work?",
      answer: "Book online, complete intake, and connect securely with a licensed clinician.",
    },
    {
      question: "Can I book a same-day consultation?",
      answer: "Availability depends on the clinician schedule and service type shown during booking.",
    },
    {
      question: "Can I choose my clinician?",
      answer: "Availability depends on clinic schedule and service type.",
    },
  ];

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
    countryHome: buildCountryHomeData(country.code, country.name, paths),
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
