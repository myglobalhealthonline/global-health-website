type MarketingPageData = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  intro?: { title: string; body: string };
  features?: Array<{ title: string; description: string; href?: string; ctaLabel?: string }>;
  faqs?: { title?: string; items: Array<{ question: string; answer: string }> };
  relatedLinks?: Array<{ label: string; href: string }>;
  bottomCta?: { title: string; description: string; ctaLabel: string; ctaHref: string };
};

const defaultBottomCta = {
  title: "Ready to start?",
  description: "Book online and the clinic team will guide you to the right next step.",
  ctaLabel: "Book consultation",
  ctaHref: "/book-online",
};

const marketingDataByRoute: Record<string, MarketingPageData> = {
  "/about": {
    hero: {
      title: "About Global Health",
      description:
        "Learn how Global Health delivers patient-friendly online consultations across multiple countries.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
      secondaryCta: { label: "Meet doctors", href: "/ireland-team" },
    },
    intro: {
      title: "Healthcare designed for clarity",
      body: "TODO: Replace with approved mission and clinic overview copy from content source.",
    },
    bottomCta: defaultBottomCta,
  },
  "/careers": {
    hero: {
      title: "Careers",
      description: "Explore opportunities to support patient-focused digital healthcare delivery.",
      primaryCta: { label: "Contact clinic", href: "/book-online" },
    },
    intro: {
      title: "Join the team",
      body: "TODO: Replace with approved open roles and hiring process details.",
    },
    bottomCta: defaultBottomCta,
  },
  "/gift-card": {
    hero: {
      title: "Gift Card",
      description: "Share access to convenient online healthcare consultations.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "How gift cards work",
      body: "TODO: Replace with approved gift card usage and redemption details.",
    },
    bottomCta: defaultBottomCta,
  },
  "/plans-pricing": {
    hero: {
      title: "Plans and pricing",
      description: "Review consultation pricing structure and choose what fits your needs.",
      primaryCta: { label: "View pricing list", href: "/pricing-plans/list" },
      secondaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "Pricing transparency",
      body: "TODO: Replace with approved per-country pricing and eligibility logic.",
    },
    bottomCta: defaultBottomCta,
  },
  "/pricing-plans/list": {
    hero: {
      title: "Pricing plans list",
      description: "Explore current consultation pricing options.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "Current pricing data",
      body: "TODO: Replace with country-aware pricing matrix from structured content.",
    },
    bottomCta: defaultBottomCta,
  },
  "/online-prescription": {
    hero: {
      title: "Online prescription support",
      description: "Learn how prescription-related consultations are handled online.",
      primaryCta: { label: "Start consultation", href: "/book-online" },
    },
    intro: {
      title: "Prescription pathway",
      body: "TODO: Replace with approved prescription handling guidance by country.",
    },
    bottomCta: defaultBottomCta,
  },
  "/home-delivery": {
    hero: {
      title: "Home delivery support",
      description: "Understand home-delivery availability after consultation.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "Delivery flow",
      body: "TODO: Replace with country-specific availability and logistics copy.",
    },
    bottomCta: defaultBottomCta,
  },
  "/home-health-test": {
    hero: {
      title: "Home health tests",
      description: "Discover health testing pathways and consultation guidance.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "Testing overview",
      body: "TODO: Replace with approved home-testing information by country.",
    },
    bottomCta: defaultBottomCta,
  },
  "/partner-clinics": {
    hero: {
      title: "Partner clinics",
      description: "Explore clinic partnerships supporting local patient care.",
      primaryCta: { label: "Contact clinic", href: "/book-online" },
    },
    intro: {
      title: "Clinic network",
      body: "TODO: Replace with approved partner clinic listing and coverage details.",
    },
    bottomCta: defaultBottomCta,
  },
  "/corporate-plans": {
    hero: {
      title: "Corporate plans",
      description: "Healthcare consultation support for organizations and teams.",
      primaryCta: { label: "Contact clinic", href: "/book-online" },
    },
    intro: {
      title: "Business healthcare support",
      body: "TODO: Replace with approved corporate plan details and onboarding flow.",
    },
    bottomCta: defaultBottomCta,
  },
  "/frequent-asked-questions": {
    hero: {
      title: "Frequently Asked Questions",
      description: "Find quick answers about consultations, booking, and clinic support.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
    },
    faqs: {
      items: [
        {
          question: "How quickly can I get an appointment?",
          answer: "Appointment availability depends on country, clinician schedule, and consultation type.",
        },
        {
          question: "Can I choose a general or specialist consultation?",
          answer: "Yes, you can select consultation type during booking based on available options.",
        },
      ],
    },
    bottomCta: defaultBottomCta,
  },
  "/terms-and-conditions": {
    hero: {
      title: "Terms and Conditions (Legacy URL)",
      description: "This legacy route is preserved for compatibility.",
      primaryCta: { label: "View canonical page", href: "/term-and-conditions" },
    },
    intro: {
      title: "Legacy compatibility route",
      body: "TODO: Replace with canonical-link notice or dedicated redirect policy if needed.",
    },
  },
  "/privacy-policy": {
    hero: {
      title: "Privacy Policy (Legacy URL)",
      description: "This legacy route is preserved for compatibility.",
      primaryCta: { label: "View canonical page", href: "/privacy" },
    },
    intro: {
      title: "Legacy compatibility route",
      body: "TODO: Replace with canonical-link notice or dedicated redirect policy if needed.",
    },
  },
  "/refund-policy": {
    hero: {
      title: "Refund Policy (Legacy URL)",
      description: "This legacy route is preserved for compatibility.",
      primaryCta: { label: "View canonical page", href: "/return-and-refund-policy" },
    },
    intro: {
      title: "Legacy compatibility route",
      body: "TODO: Replace with canonical-link notice or dedicated redirect policy if needed.",
    },
  },
  "/gdpr-compliance": {
    hero: {
      title: "GDPR Compliance (Legacy URL)",
      description: "This legacy route is preserved for compatibility.",
      primaryCta: { label: "View privacy policy", href: "/privacy" },
    },
    intro: {
      title: "Legacy compatibility route",
      body: "TODO: Replace with canonical-link notice or dedicated redirect policy if needed.",
    },
  },
  "/copy-of-privacy-policy": {
    hero: {
      title: "Privacy Policy Copy (Legacy URL)",
      description: "This legacy route is preserved for compatibility.",
      primaryCta: { label: "View canonical page", href: "/privacy" },
    },
    intro: {
      title: "Legacy compatibility route",
      body: "TODO: Replace with canonical-link notice or dedicated redirect policy if needed.",
    },
  },
};

export function getMarketingPageData(routePath: string): MarketingPageData {
  return (
    marketingDataByRoute[routePath] ?? {
      hero: {
        title: "Page placeholder",
        description: "TODO: Replace with approved marketing content.",
        primaryCta: { label: "Book consultation", href: "/book-online" },
      },
      intro: {
        title: "Content pending",
        body: "TODO: Replace with route-specific approved content.",
      },
      bottomCta: defaultBottomCta,
    }
  );
}
