import type { LocaleCode } from "@/lib/i18n/types";
import { getCsServiceHubContent, getPtServiceHubContent } from "./service-hub-content-pt-cs";
import {
  getDeServiceHubContent,
  getEsServiceHubContent,
  getRoServiceHubContent,
} from "./service-hub-content-es-ro-de";

export type HubChecklist = {
  eyebrow: string;
  title: string;
  intro?: string;
  items: string[];
  note?: string;
};

export type HubProcess = {
  eyebrow: string;
  title: string;
  steps: Array<{ title: string; body: string }>;
};

export type ServiceHubContent = {
  resolvedLocale: LocaleCode;
  overview: { eyebrow: string; title: string; body: string };
  whoFor: HubChecklist;
  commonReasons?: HubChecklist;
  process: HubProcess;
  secondaryProcess?: HubProcess;
  results?: { eyebrow: string; title: string; paragraphs: string[] };
  whyChoose: HubChecklist;
  importantInformation: { eyebrow: string; title: string; paragraphs: string[] };
  faq: Array<{ question: string; answer: string }>;
  emptyState: { title: string; body: string };
};

export type HubContext = {
  countryName: string;
  locale: string;
  serviceNames: string[];
};

function specialistContent(context: HubContext): ServiceHubContent {
  const commonReasons = context.serviceNames.length > 0
    ? {
        eyebrow: "Available areas",
        title: "Reasons people choose a specialist consultation",
        intro: "The active specialist services currently listed for this country are:",
        items: context.serviceNames,
        note: "Choose a service to read its scope before booking. A clinician decides whether an online appointment is suitable for the concern discussed.",
      }
    : undefined;

  return {
    resolvedLocale: "en",
    overview: {
      eyebrow: "Overview",
      title: "Specialist care, matched to an active service",
      body: `Global Health lists online specialist consultation services currently available in ${context.countryName}. Availability depends on the service, clinician and appointment schedule. Some concerns need an in-person examination or another care setting.`,
    },
    whoFor: {
      eyebrow: "Who it may suit",
      title: "When you may consider booking",
      intro: "A specialist consultation may be useful when you want to discuss a concern with a clinician working in a particular area.",
      items: [
        "You have been advised to seek a specialist assessment",
        "You want to discuss an existing concern or planned follow-up",
        "You are seeking another clinical opinion where appropriate",
        "You want to understand whether an online specialist appointment is a suitable next step",
      ],
    },
    commonReasons,
    process: {
      eyebrow: "How it works",
      title: "From service selection to follow-up",
      steps: [
        { title: "Select a service", body: "Review the active specialist services and their published details." },
        { title: "Choose an eligible doctor", body: "Only clinicians assigned to the selected service are offered for booking." },
        { title: "Pick an appointment", body: "Choose from the times currently available for that doctor and service." },
        { title: "Complete booking", body: "Enter the required patient details and complete payment where applicable." },
        { title: "Attend online", body: "Use the appointment information provided in your booking confirmation." },
        { title: "Review next steps", body: "Any follow-up, documentation, tests or referrals depend on clinical judgement and the service provided." },
      ],
    },
    whyChoose: {
      eyebrow: "Why Global Health",
      title: "Clear information before you book",
      items: [
        "Country-scoped clinician and service availability",
        "Transparent doctor profiles and listed languages",
        "Registration details shown when verified data is available",
        "Prices and consultation duration shown when configured",
        "Secure online booking and appointment confirmation",
        "Doctor booking actions include a valid assigned specialist service",
      ],
    },
    importantInformation: {
      eyebrow: "Important information",
      title: "Online specialist care has limits",
      paragraphs: [
        "Online consultations are not suitable for emergencies. Contact the emergency service for your location if you need urgent help.",
        "Some symptoms and conditions require a physical examination, urgent assessment, or in-person testing. The clinician may recommend another care setting.",
        "Prescriptions, tests, referrals, certificates, treatment and other documentation are never guaranteed. They depend on clinical judgement and applicable local rules.",
        `Services, clinicians, prices and appointment times vary in ${context.countryName} and can change as the active catalogue is updated.`,
      ],
    },
    faq: [
      { question: "How does an online specialist consultation work?", answer: "Choose an active specialist service, select a clinician assigned to it, pick an available appointment and complete the booking steps. Appointment information is provided after booking." },
      { question: "Do I need a referral?", answer: "Referral requirements can differ by service and clinical situation. Check the individual service details and provide any relevant referral or medical information requested during booking." },
      { question: "Which specialist areas are available?", answer: "The service cards on this page are the active specialist services currently returned for the selected country. Availability can change." },
      { question: "How are doctors shown on this page selected?", answer: "A doctor appears when they are active for the selected country and have an active assignment to at least one specialist service shown here. Specialty labels are used for description, not as the booking eligibility rule." },
      { question: "How much does a consultation cost and how long is it?", answer: "Where configured, each service card shows its starting price and duration. Confirm the selected service, doctor and appointment details before payment." },
      { question: "Is an online consultation suitable for every concern?", answer: "No. A clinician may advise urgent or in-person assessment when an online consultation cannot safely address the concern." },
    ],
    emptyState: {
      title: "No specialist clinicians are available to book",
      body: "There are currently no active doctor-to-specialist-service assignments for this country. You can review the service catalogue or check again later.",
    },
  };
}

function testsContent(context: HubContext): ServiceHubContent {
  return {
    resolvedLocale: "en",
    overview: {
      eyebrow: "Overview",
      title: "Health tests with product-specific information",
      body: `This page lists health tests currently available in ${context.countryName}. Each test has its own price, stock status, sample information and expected results timeline when those details have been configured.`,
    },
    whoFor: {
      eyebrow: "Who it may suit",
      title: "When a health test may be useful",
      intro: "A test may help you gather information about a specific health question described on its product page.",
      items: [
        "You want to review the markers or areas covered by a listed test",
        "You have been advised to arrange a particular test",
        "You can follow the sample instructions provided for that product",
        "You understand that a test result does not replace urgent or comprehensive clinical assessment",
      ],
    },
    process: {
      eyebrow: "Ordering",
      title: "How ordering works",
      steps: [
        { title: "Review a test", body: "Open the product page and check what it covers, sample type, price, stock and any published timeline." },
        { title: "Add it to your cart", body: "Use the product action only when the test is available and the details match what you need." },
        { title: "Complete checkout", body: "Confirm the order information, patient details, price and any product-specific charges shown at checkout." },
        { title: "Follow the instructions", body: "Use the collection, return or appointment instructions supplied for the specific test you ordered." },
      ],
    },
    secondaryProcess: {
      eyebrow: "Sample collection",
      title: "The process depends on the test",
      steps: [
        { title: "Check the sample type", body: "The catalogue and product page show the configured sample type where available." },
        { title: "Read the product instructions", body: "Preparation, collection and transport requirements can differ, so follow the instructions supplied for that test." },
        { title: "Use the stated route", body: "Delivery, collection, clinic attendance or return arrangements are product- and country-specific and should be confirmed before ordering." },
      ],
    },
    results: {
      eyebrow: "Results and next steps",
      title: "Read the timeline and follow-up details for your test",
      paragraphs: [
        "When a results timeline is configured, it appears on the relevant test card and detail page. It is an estimate for that product rather than a guarantee for every order.",
        "How results are provided and whether clinician review is included must be stated for the individual test. This hub does not assume that every test includes a consultation or clinical review.",
        "A result may need interpretation alongside symptoms, medical history, examination or other tests. Seek appropriate clinical advice if you are unsure what a result means.",
      ],
    },
    whyChoose: {
      eyebrow: "Why Global Health",
      title: "A country-scoped test catalogue",
      items: [
        "Only active tests for the selected country are listed",
        "Current configured price and currency are displayed",
        "Stock status is respected before an item can be ordered",
        "Sample type and results timeline are shown when available",
        "Product pages can provide test-specific coverage and FAQ information",
        "Secure cart and checkout flow",
      ],
    },
    importantInformation: {
      eyebrow: "Important limitations",
      title: "A test is not a substitute for emergency or complete clinical care",
      paragraphs: [
        "Do not use an online test order when you need emergency assessment. Contact the emergency service for your location if you need urgent help.",
        "Tests have defined scopes and limitations. A normal result does not rule out every condition, and an abnormal result does not establish a diagnosis on its own.",
        "Collection method, availability, processing, delivery, result timing and follow-up can vary by test and country. Rely on the details provided for the specific product.",
        "If symptoms are new, severe, worsening or concerning, seek appropriate clinical assessment instead of relying only on a test result.",
      ],
    },
    faq: [
      { question: "Which tests are available in my country?", answer: "The product cards on this page are the active health tests currently returned for the selected country. If no cards appear, there is no active catalogue to order from at this time." },
      { question: "What sample will I need to provide?", answer: "Sample requirements differ. Check the sample type and full instructions on the individual test page before ordering." },
      { question: "How long do results take?", answer: "Where available, the expected timeline is shown for the individual test. Processing time can vary and should not be treated as an emergency service." },
      { question: "How will I receive results?", answer: "Result delivery is test-specific. Follow the information and instructions provided for the product and your order." },
      { question: "Does every test include clinician review?", answer: "Not necessarily. Clinician review or consultation should be treated as included only when the individual test details explicitly say so." },
      { question: "Can a health test replace a consultation?", answer: "No single test replaces assessment of symptoms, history and other clinical information. Seek appropriate clinical advice when you need interpretation or remain concerned." },
    ],
    emptyState: {
      title: "No health tests are currently available",
      body: `There are no active health-test products to order in ${context.countryName} at this time.`,
    },
  };
}

/**
 * Resolves the structured, medically neutral fallback used when no approved
 * country-specific structured CMS content exists. Approved locale modules
 * keep the render contract stable until structured CMS records replace them.
 */
export function getServiceHubContent(
  kind: "specialist" | "tests",
  context: HubContext,
): ServiceHubContent {
  switch (context.locale.toLowerCase().split("-")[0]) {
    case "pt":
      return getPtServiceHubContent(kind, context);
    case "cs":
      return getCsServiceHubContent(kind, context);
    case "es":
      return getEsServiceHubContent(kind, context);
    case "ro":
      return getRoServiceHubContent(kind, context);
    case "de":
      return getDeServiceHubContent(kind, context);
    default:
      return kind === "specialist" ? specialistContent(context) : testsContent(context);
  }
}
