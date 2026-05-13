import { sanitizePublicContent } from "@/lib/content/publication-guard";

type CategoryPageData = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  intro: { title: string; body: string };
  features: Array<{ title: string; description: string; href?: string; ctaLabel?: string }>;
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
};

const categoryCopy: Record<string, CategoryPageData> = {
  "all-products": {
    hero: {
      title: "All products and services",
      description: "Browse all consultation and care-related pathways available in the current route inventory.",
      primaryCta: { label: "Book consultation", href: "/book-online" },
      secondaryCta: { label: "View general consultations", href: "/general-consultation-ie" },
    },
    intro: {
      title: "Everything in one place",
      body: "This category helps patients quickly compare major consultation and support pathways before booking.",
    },
    features: [
      { title: "General consultations", description: "First-contact care routes for common health concerns.", href: "/general-consultation-ie", ctaLabel: "Explore" },
      { title: "Specialist consultations", description: "Specialist categories for focused clinical review.", href: "/specialty-ie", ctaLabel: "Explore" },
      { title: "Booking and follow-up", description: "Move from service discovery to booking without changing route structure.", href: "/book-online", ctaLabel: "Start booking" },
    ],
    bottomCta: {
      title: "Need help choosing?",
      description: "Start with booking and the clinic team will guide you to the right consultation path.",
      ctaLabel: "Book consultation",
      ctaHref: "/book-online",
    },
  },
  "health-education": {
    hero: {
      title: "Health education",
      description: "Find patient-friendly educational content and consultation guidance.",
      primaryCta: { label: "Read blog", href: "/blog" },
      secondaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "Understand your care options",
      body: "Educational content helps patients prepare for consultations and make informed next-step decisions.",
    },
    features: [
      { title: "Patient-focused articles", description: "Simple language articles about care pathways and booking preparation.", href: "/blog", ctaLabel: "Open blog" },
      { title: "Consultation guidance", description: "Learn what to expect before, during, and after an online consultation." },
      { title: "Country-aware navigation", description: "Use country routes to find relevant services and team pages." },
    ],
    bottomCta: {
      title: "Ready for your next step?",
      description: "After reviewing education content, book an online consultation for personalized guidance.",
      ctaLabel: "Book consultation",
      ctaHref: "/book-online",
    },
  },
  "telemedicine-devices": {
    hero: {
      title: "Telemedicine devices",
      description: "Understand how digital health tools can support remote consultations and follow-up care.",
      primaryCta: { label: "View services", href: "/services/default-device-support" },
      secondaryCta: { label: "Book consultation", href: "/book-online" },
    },
    intro: {
      title: "Remote-care support tools",
      body: "This category explains how device-supported care pathways may be used as part of consultation and monitoring workflows.",
    },
    features: [
      { title: "Consultation compatibility", description: "Discuss device usage and suitability during consultation where appropriate." },
      { title: "Follow-up planning", description: "Clinicians can recommend next steps based on your care context and route availability." },
      { title: "Safety-first communication", description: "Device and usage instructions should always be confirmed through clinical review." },
    ],
    bottomCta: {
      title: "Need guidance with device-supported care?",
      description: "Book a consultation to review options and get the right next-step plan.",
      ctaLabel: "Start consultation",
      ctaHref: "/book-online",
    },
  },
};

export function getCategoryPageData(slug: string): CategoryPageData {
  return sanitizePublicContent(
    categoryCopy[slug] ?? {
      hero: {
        title: "Category",
        description: "Browse category-specific care pathways and related content.",
        primaryCta: { label: "Book consultation", href: "/book-online" },
      },
      intro: {
        title: "Category content",
        body: "Use category pages to compare related services and educational resources when enough reviewed content is available.",
      },
      features: [],
      bottomCta: {
        title: "Need support now?",
        description: "Choose a consultation route and share the context needed for clinical review.",
        ctaLabel: "Book consultation",
        ctaHref: "/book-online",
      },
    },
  );
}
