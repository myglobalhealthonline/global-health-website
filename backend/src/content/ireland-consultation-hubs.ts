export type ConsultationHubFaq = Readonly<{
  question: string;
  answer: string;
}>;

export type IrelandConsultationHubContent = Readonly<{
  pageKey: "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION";
  canonicalPath: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroTitleLead: string | null;
  heroTitleAccent: string | null;
  heroSubtitle: string;
  ctaLabel: string;
  intro: string;
  whoForTitle: string;
  whoForIntro: string;
  whoForItems: readonly string[];
  whyChooseTitle: string;
  whyChooseItems: readonly string[];
  faq: readonly ConsultationHubFaq[];
  disclaimerParagraphs: readonly string[];
}>;

/**
 * Complete English CMS copy for Ireland's canonical GP hub.
 *
 * Prices, durations, doctor availability and appointment times intentionally
 * remain outside this object because the public page reads them from the live
 * service catalogue. This copy must not turn dynamic data into a guarantee.
 */
export const irelandGpHubContent: IrelandConsultationHubContent = {
  pageKey: "GENERAL_CONSULTATION",
  canonicalPath: "/ireland/en/gp-consultation-online",
  primaryKeyword: "online gp ireland",
  secondaryKeywords: [
    "online gp consultation ireland",
    "gp online appointment",
    "online doctor ireland",
    "same day doctor consultation ireland",
  ],
  seoTitle: "Online GP Ireland | Secure Video Consultations",
  seoDescription:
    "Book an online GP consultation in Ireland with a doctor registered with the Irish Medical Council. Secure video appointments for everyday health concerns.",
  heroTitle: "Online GP Consultation in Ireland",
  heroTitleLead: "Online GP Consultation in",
  heroTitleAccent: "Ireland",
  heroSubtitle:
    "Book the GP service that matches your concern and choose from the appointment times currently shown. IMC-registered doctors provide secure video consultations for general symptoms, sick cert assessments, prescription reviews, referrals and follow-up care.",
  ctaLabel: "Book GP consultation",
  intro:
    "Book an online GP consultation in Ireland for a non-emergency health concern, review current prices and durations, and choose an available doctor and appointment time. During the secure video call, the doctor reviews your symptoms and medical history and explains the appropriate next steps. Some concerns can be managed online; others need an in-person examination, testing or urgent care.",
  whoForTitle: "What an online GP can help with",
  whoForIntro:
    "Use this page for non-emergency GP concerns that can be assessed safely by video. The doctor decides after assessment whether online care, further tests or an in-person review is appropriate.",
  whoForItems: [
    "Cold, flu, cough, sore throat, sinus and other respiratory symptoms",
    "Urinary, digestive, skin, eye and minor infection concerns",
    "Headache, migraine, back pain and minor musculoskeletal concerns",
    "Women's health, men's health and general wellbeing questions",
    "Mental health concerns such as anxiety, low mood, stress or sleep difficulty",
    "Review of an ongoing condition or an existing treatment plan",
    "Sick certificate assessment when clinically appropriate",
    "Prescription, blood-test, imaging or specialist-referral review where indicated",
  ],
  whyChooseTitle: "Why book an online GP with Global Health",
  whyChooseItems: [
    "Doctors registered with the Irish Medical Council",
    "Secure video consultations available across Ireland",
    "Current appointment times shown during booking",
    "Doctor profiles show available languages and verified registration details",
    "Service prices and consultation durations shown before booking",
    "Clinical recommendations, documents and referrals issued only when appropriate",
  ],
  faq: [
    {
      question: "Can I book an online GP consultation in Ireland?",
      answer:
        "Yes. Choose a GP service, select an eligible doctor and book one of the appointment times shown. Consultations take place by secure video call with a doctor registered with the Irish Medical Council.",
    },
    {
      question: "How much does an online GP consultation cost?",
      answer:
        "Prices vary by service. Check the relevant service card and the final booking details before payment. The current price is shown before you confirm the appointment.",
    },
    {
      question: "Can I get a same-day online GP appointment?",
      answer:
        "Same-day online GP appointments may be available. Check the booking page for the latest times for each eligible doctor and service. Availability changes with clinician schedules and is not guaranteed.",
    },
    {
      question: "Can an online GP issue a prescription?",
      answer:
        "A doctor may issue or renew a prescription when it is clinically appropriate after assessment. A prescription is not automatic, and some medicines or conditions require in-person care or additional checks.",
    },
    {
      question: "Can an online GP provide a sick certificate?",
      answer:
        "A GP may issue a sick certificate after a clinical assessment when appropriate. Issuing a certificate is the treating doctor's decision, and different organisations or benefit applications may have their own documentation requirements.",
    },
    {
      question: "Can an online GP arrange tests or a specialist referral?",
      answer:
        "Yes, where clinically indicated. After assessment, the doctor may recommend blood tests, imaging, an in-person review or referral to an appropriate specialist. These outcomes are not guaranteed before the consultation.",
    },
    {
      question: "When is an online GP consultation not suitable?",
      answer:
        "Online care is not suitable for a medical emergency. It may also be unsuitable when you need a physical examination, immediate observations, a procedure or urgent testing. The doctor may direct you to in-person or emergency care.",
    },
    {
      question: "What should I prepare for the video consultation?",
      answer:
        "Have your current medicines, allergies, relevant medical history and any recent results or letters available. Join from a private place with a reliable connection and be ready to confirm your identity and location.",
    },
  ],
  disclaimerParagraphs: [
    "All GP services provided through Global Health in Ireland are delivered by doctors registered with the Irish Medical Council.",
    "The doctor conducts a remote clinical assessment and decides whether advice, treatment, a prescription, a referral or a medical certificate is appropriate. No particular clinical outcome or document is guaranteed before assessment.",
    "Some symptoms and conditions require a physical examination, urgent assessment, testing or another care setting. The doctor may advise you to seek in-person care.",
    "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 112 or attend the nearest emergency department.",
  ],
};

/** Complete English CMS copy for Ireland's canonical specialist hub. */
export const irelandSpecialistHubContent: IrelandConsultationHubContent = {
  pageKey: "SPECIALIST_CONSULTATION",
  canonicalPath: "/ireland/en/see-a-specialist",
  primaryKeyword: "online specialist consultation ireland",
  secondaryKeywords: [
    "see a specialist online ireland",
    "online cardiologist",
    "online neurologist",
    "paediatric specialist consultation online",
  ],
  seoTitle: "Online Specialist Consultations Ireland | Book by Specialty",
  seoDescription:
    "Book an online specialist consultation in Ireland. Compare the specialties currently available, review clinician details and choose an appointment time.",
  heroTitle: "Online Specialist Consultations in Ireland",
  heroTitleLead: null,
  heroTitleAccent: null,
  heroSubtitle:
    "Choose from the specialist services currently listed for Ireland, review the clinicians assigned to that service and book an available secure video consultation.",
  ctaLabel: "Book specialist consultation",
  intro:
    "Book an online specialist consultation in Ireland by choosing the specialty that matches your concern, reviewing the current service details and selecting an available clinician. The specialist reviews your history, symptoms and relevant records or results, then explains the appropriate next steps. Online specialist care can support assessment, follow-up and second opinions, but it does not replace urgent or in-person care when an examination or procedure is needed.",
  whoForTitle: "When an online specialist consultation may help",
  whoForIntro:
    "Choose the service that best matches your concern. Available services can change, and after your assessment the clinician may recommend a different service or in-person care.",
  whoForItems: [
    "A concern that may benefit from review in one of the specialties currently listed",
    "A complex or ongoing condition that needs input from an appropriate specialist",
    "Review of existing test, imaging or investigation results",
    "Follow-up for a condition already managed by a specialist",
    "Questions about an existing diagnosis or treatment plan",
    "A second opinion when enough clinical information and records are available",
    "Advice on whether your concern can be assessed online",
    "Planning the next step when an examination, test or another service may be needed",
  ],
  whyChooseTitle: "Why book specialist care with Global Health",
  whyChooseItems: [
    "Available specialist services and clinicians matched to your booking",
    "Verified professional registration details displayed when available",
    "Secure video consultations available to patients in Ireland",
    "Current prices, durations and appointment times shown in the booking journey",
    "Referral and record requirements explained before or during clinical review",
    "Clear advice when an in-person examination, testing or urgent care is needed",
  ],
  faq: [
    {
      question: "Can I see a specialist online in Ireland?",
      answer:
        "Yes. Choose one of the active specialist services on this page, book the clinician shown for that service and attend by secure video call. The service cards list the specialties currently available.",
    },
    {
      question: "Do I need a GP referral to book?",
      answer:
        "Referral requirements can vary by service and clinical situation. Check the service details before booking and provide any GP notes, referral letters or investigation results requested for your consultation.",
    },
    {
      question: "Which online specialist services are available?",
      answer:
        "The service cards list the specialist consultations currently available in Ireland. Availability can change, so check those cards for the current specialty, price, duration and booking options.",
    },
    {
      question: "How much does an online specialist consultation cost?",
      answer:
        "The price depends on the specialty and clinician. Each active service card shows its current starting price and duration. Confirm the final service, clinician and appointment details before payment.",
    },
    {
      question: "What should I send before the consultation?",
      answer:
        "If available, prepare your medicine list, relevant medical history, referral letters and recent test or imaging reports. The booking or clinical team may request particular records for some services.",
    },
    {
      question: "Can a specialist give me a diagnosis or treatment plan online?",
      answer:
        "The clinician can assess the information suitable for a video consultation and explain possible next steps. Diagnosis, treatment, prescriptions, tests and referrals depend on clinical judgement and may require in-person assessment.",
    },
    {
      question: "Can I use an online consultation for a second opinion?",
      answer:
        "Yes, an online consultation may support a second-opinion discussion when you can provide enough information and relevant records. The clinician will explain the limits of the remote review and whether further examination or testing is needed.",
    },
    {
      question: "When is an online specialist consultation not suitable?",
      answer:
        "It is not suitable for a medical emergency. Some concerns also need a physical examination, procedure, urgent testing or another care setting. Call 112 for an emergency or follow the clinician's advice about in-person care.",
    },
  ],
  disclaimerParagraphs: [
    "Specialist services are provided by the clinician shown for the selected service. Professional registration details are displayed on profiles when verified data is available.",
    "A remote specialist consultation is a clinical assessment, not a guarantee of diagnosis, treatment, a prescription, testing, referral or other documentation. Decisions depend on clinical judgement and the information available.",
    "Some symptoms and conditions require a physical examination, urgent assessment, testing or a procedure. The clinician may recommend in-person care or another service.",
    "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 112 or attend the nearest emergency department.",
  ],
};
