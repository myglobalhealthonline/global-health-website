export type MarketingPageData = {
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
      body: "Global Health is built to make online care easier to understand and easier to access. Patients can compare services, choose their country route, and book consultations without navigating complex medical language.",
    },
    features: [
      {
        title: "Simple booking journey",
        description: "Choose country, consultation type, and preferred contact details in a few steps.",
        href: "/book-online",
        ctaLabel: "Book consultation",
      },
      {
        title: "Country-aware care routes",
        description: "Each country hub has route-specific teams, services, and consultation listings.",
        href: "/home",
        ctaLabel: "View country hubs",
      },
      {
        title: "Patient-first communication",
        description: "Content is written to be clear for non-technical users and mobile-friendly.",
      },
    ],
    relatedLinks: [
      { label: "Book online", href: "/book-online" },
      { label: "Ireland team", href: "/ireland-team" },
      { label: "General consultation", href: "/general-consultation-ie" },
    ],
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
      body: "We are building patient-friendly digital care pathways across countries. Role-specific hiring details will be managed in future content workflows.",
    },
    features: [
      {
        title: "Patient impact",
        description: "Work on services that help patients access care quickly and clearly.",
      },
      {
        title: "Remote-first workflows",
        description: "Support clinical and operations teams with scalable digital processes.",
      },
      {
        title: "Growing country coverage",
        description: "Contribute to reusable systems that support more countries over time.",
      },
    ],
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
      body: "Gift cards can be used toward eligible consultation bookings. Final redemption and policy details will be confirmed in approved legal and billing content.",
    },
    features: [
      {
        title: "Simple to share",
        description: "Send support to a family member or friend who needs care access.",
      },
      {
        title: "Applied at booking",
        description: "Gift card usage is validated during the booking and payment workflow.",
      },
      {
        title: "Country policy aware",
        description: "Availability can vary by country route and local clinic policy.",
      },
    ],
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
      body: "Consultation pricing is presented by service type so patients can compare options before booking. Exact per-country values and policy notes are maintained in structured pricing adapters.",
    },
    features: [
      {
        title: "Compare consultation types",
        description: "Review general and specialist consultation pathways side by side.",
        href: "/general-consultation-ie",
        ctaLabel: "View consultations",
      },
      {
        title: "Country-aware pricing",
        description: "Final prices are validated by country and service availability.",
      },
      {
        title: "Clear next action",
        description: "Every pricing block links directly to booking or service selection.",
        href: "/book-online",
        ctaLabel: "Start booking",
      },
    ],
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
      body: "This page summarizes starting-price ranges and consultation categories to help patients decide the next step quickly.",
    },
    features: [
      {
        title: "General consultation",
        description: "Entry-point appointments for common concerns, first assessment, and follow-up direction.",
        href: "/general-consultation-ie",
        ctaLabel: "See general consultations",
      },
      {
        title: "Specialist consultation",
        description: "Specialist-focused appointments available based on country route and service type.",
        href: "/specialty-ie",
        ctaLabel: "See specialist consultations",
      },
      {
        title: "Booking support",
        description: "If you are unsure which option fits, start booking and the clinic team can guide you.",
        href: "/book-online",
        ctaLabel: "Book consultation",
      },
    ],
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
      body: "Prescription-related requests are reviewed during consultation to determine the appropriate next step. Final prescribing guidance and eligibility text are managed per country.",
    },
    features: [
      {
        title: "Start with consultation",
        description: "A clinician reviews your request and medical context before confirming options.",
      },
      {
        title: "Country-specific process",
        description: "Prescription workflows depend on route, clinician availability, and local policy.",
      },
      {
        title: "Follow-up support",
        description: "Patients receive clear next-step communication after review.",
      },
    ],
    relatedLinks: [
      { label: "Book consultation", href: "/book-online" },
      { label: "Home delivery", href: "/home-delivery" },
      { label: "FAQ", href: "/frequent-asked-questions" },
    ],
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
      body: "Home-delivery support is coordinated after clinical review where available. Delivery options depend on country route and partner coverage.",
    },
    features: [
      {
        title: "Consultation-first process",
        description: "Delivery requests are processed after your consultation and eligibility checks.",
      },
      {
        title: "Coverage by country",
        description: "Availability can vary by city and country route configuration.",
      },
      {
        title: "Clear communication",
        description: "Patients receive practical next steps for pickup or delivery where supported.",
      },
    ],
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
      body: "Home health testing routes help patients understand available testing pathways and when consultation review is recommended.",
    },
    features: [
      {
        title: "Understand test options",
        description: "See what test categories are available in the current route setup.",
      },
      {
        title: "Clinical interpretation",
        description: "Results interpretation and follow-up decisions are discussed during consultation.",
      },
      {
        title: "Mobile-friendly workflow",
        description: "Patients can move from test interest to consultation booking without route changes.",
      },
    ],
    relatedLinks: [
      { label: "Health test details", href: "/home-health-tests/default-test" },
      { label: "Book consultation", href: "/book-online" },
    ],
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
      body: "Partner clinics help extend local support and continuity of care. Detailed partner listings will be managed through structured content and compliance review.",
    },
    features: [
      {
        title: "Local healthcare continuity",
        description: "Partner pathways help coordinate patient next steps when local follow-up is needed.",
      },
      {
        title: "Country route integration",
        description: "Partnership visibility can differ by country based on active local agreements.",
      },
      {
        title: "Patient guidance",
        description: "Patients receive clear guidance on whether to continue online or use local support options.",
      },
    ],
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
      body: "Corporate plans support employers with structured consultation access for teams. Final plan details and onboarding terms are managed in future pricing/content administration.",
    },
    features: [
      {
        title: "Team access pathways",
        description: "Employees can follow a clear booking journey with country-aware routing.",
      },
      {
        title: "Scalable rollout",
        description: "Corporate support is designed to expand with additional countries over time.",
      },
      {
        title: "Central coordination",
        description: "Employer and patient communication stays consistent with public route templates.",
      },
    ],
    relatedLinks: [
      { label: "Plans and pricing", href: "/plans-pricing" },
      { label: "Contact clinic", href: "/book-online" },
    ],
    bottomCta: defaultBottomCta,
  },
  "/frequent-asked-questions": {
    hero: {
      title: "Frequently Asked Questions",
      description: "Find quick answers about consultations, booking, and clinic support.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
    },
    faqs: {
      title: "Common patient questions",
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
    intro: {
      title: "Quick answers before you book",
      body: "These FAQs are designed to help patients understand booking flow, consultation types, and next steps before submitting a request.",
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
