/**
 * Ireland (EN) long-form service copy — GP consultation hub + GP
 * sub-service detail pages (sick-leave certificate, …).
 *
 * Verbatim marketing/medical-legal copy approved by the clinic team.
 * This is the GP-only positioning shipped while the LegitScript
 * certificate is pending: no online-prescription claims, GP-level
 * services only. Keep the disclaimers EXACTLY as written — they are
 * the legal text the clinic signed off on.
 *
 * Consumed by:
 *   - /[country]/[lang]/gp-appointment        (GP consultation hub)
 *   - /[country]/[lang]/consult/[serviceSlug] (sub-service detail, e.g. sick-leave)
 *
 * Gated to Ireland (`ie`) only; other markets keep the generic copy.
 */

export type FaqItem = { question: string; answer: string };

/** GP consultation hub page (the /gp-appointment landing). */
export type GpHubContent = {
  seoTitle: string;
  seoDescription: string;
  /** Visible H1, split for the PageHero lead/accent composition. */
  h1Lead: string;
  h1Accent: string;
  intro: string;
  whoFor: {
    title: string;
    intro: string;
    items: string[];
  };
  whyChoose: {
    title: string;
    items: string[];
  };
  faq: FaqItem[];
  /** Full disclaimer — one entry per paragraph. */
  disclaimerFull: string[];
  disclaimerShort: string;
};

/** A GP sub-service detail page (rendered above the booking flow). */
export type ServiceDetailContent = {
  seoTitle: string;
  seoDescription: string;
  /** Visible H1 override for the consult hero. */
  h1: string;
  intro: string;
  covers?: {
    title: string;
    intro: string;
    items: string[];
    note?: string;
  };
  process?: {
    title: string;
    steps: Array<{ title: string; body: string }>;
  };
  importantInfo?: {
    title: string;
    paragraphs: string[];
  };
  whyChoose?: {
    title: string;
    items: string[];
  };
  faq: FaqItem[];
  disclaimerFull: string[];
  disclaimerShort: string;
};

// ── Ireland GP consultation hub ──────────────────────────────────────

export const IE_GP_HUB: GpHubContent = {
  seoTitle: "Online GP Consultation in Ireland | Global Health",
  seoDescription:
    "Online GP consultations with IMC-registered doctors in Ireland. Choose from open appointment slots where available.",
  h1Lead: "Online GP Consultation in",
  h1Accent: "Ireland",
  intro:
    "Global Health connects you with doctors registered with the Irish Medical Council for online GP consultations across Ireland. Clinicians review your symptoms, history, and current concern through secure online appointments. Consultations are available in English, Portuguese, Spanish, Arabic, Urdu and more, subject to clinician availability.",
  whoFor: {
    title: "Who this service is for",
    intro: "This consultation is suitable for assessment and management of:",
    items: [
      "Respiratory infections including cold, flu, sinusitis, bronchitis and persistent cough",
      "Sore throat, tonsillitis and ear infections",
      "Fever in adults and children",
      "Urinary tract infections and urinary symptoms",
      "Gastrointestinal symptoms including nausea, vomiting, diarrhoea and abdominal pain",
      "Headaches and migraine",
      "Skin conditions including rashes, eczema flare-ups and allergic reactions",
      "Eye infections including conjunctivitis",
      "Back pain, muscle pain and minor musculoskeletal concerns",
      "Fatigue, sleep difficulties and general health concerns",
      "Acute worsening of ongoing conditions such as hypertension, diabetes and asthma",
      "Medical certificates and sick notes when clinically appropriate",
      "Referrals for blood tests, imaging or specialist review where clinically indicated",
    ],
  },
  whyChoose: {
    title: "Why choose Global Health",
    items: [
      "Doctors registered with the Irish Medical Council — registration numbers displayed on every profile",
      "Secure video consultations conducted to Irish telemedicine standards",
      "Open appointment slots shown during booking, subject to clinician availability",
      "Consultations available in English, Portuguese, Spanish, Arabic, Urdu, Punjabi and more — the only multilingual online clinic in Ireland",
      "Clinical documentation and follow-up guidance provided by email after every consultation",
      "Transparent pricing — no hidden fees, no membership required",
    ],
  },
  faq: [
    {
      question: "Can I get an online GP consultation in Ireland?",
      answer:
        "Yes. Global Health provides online GP consultations in Ireland with doctors registered with the Irish Medical Council. Available appointment times are shown during booking.",
    },
    {
      question: "How much does an online GP consultation cost in Ireland?",
      answer:
        "Online GP consultations at Global Health cost from €39 for a 25-minute video consultation with an IMC-registered doctor. There are no hidden fees and no membership required.",
    },
    {
      question: "Is an online GP consultation as valid as an in-person one in Ireland?",
      answer:
        "Yes. All doctors at Global Health are registered with the Irish Medical Council. Online consultations are conducted under the same clinical standards as in-person consultations and are explicitly permitted under Irish Medical Council guidelines on telemedicine.",
    },
    {
      question: "Can I see a doctor online in a language other than English in Ireland?",
      answer:
        "Yes. Global Health is the only online clinic in Ireland offering consultations in English, Portuguese, Spanish, Arabic, Urdu, Punjabi, Czech and French. You can select a doctor by language when booking.",
    },
    {
      question: "How quickly can I see a doctor online in Ireland?",
      answer:
        "Open slots are shown during booking and depend on the selected service and clinician schedule. You will receive confirmation after completing your booking.",
    },
    {
      question: "What happens after my online GP consultation?",
      answer:
        "Following your consultation your doctor will send clinical notes and follow-up guidance to your email. Referrals for blood tests, imaging or specialist review will be arranged where clinically indicated.",
    },
    {
      question: "Can an online GP in Ireland provide referrals?",
      answer:
        "Yes. Our IMC-registered GPs can provide referrals to hospital consultants and arrange referrals for blood tests, scans including X-ray, ultrasound and MRI, and specialist review where clinically appropriate.",
    },
    {
      question: "Do I need to register or create an account to book?",
      answer:
        "You can book a consultation without a full account. Creating an account allows you to access your consultation history and clinical notes after your appointment.",
    },
  ],
  disclaimerFull: [
    "All GP services provided through Global Health in Ireland are delivered at GP level in accordance with Irish telehealth and medical practice standards, by doctors registered with the Irish Medical Council.",
    "Our online doctors conduct remote clinical assessments and may provide treatment recommendations, referrals, or medical certificates only where clinically appropriate and at the treating doctor's professional discretion. Clinical decisions remain entirely at the doctor's discretion following assessment.",
    "Our doctors do not routinely prescribe controlled substances through online consultations.",
    "Regarding sick notes and medical certificates: employers may require a medical certificate from a GP during sick leave. Whether a certificate is issued depends on the nature of your condition and the outcome of the clinical assessment — the doctor may or may not issue a certificate following consultation. Electronic sick leave certificates issued through our platform are not accepted by the Department of Social Protection in Ireland. Patients requiring documentation for Department of Social Protection purposes should attend an in-person GP consultation. Our doctors do not routinely issue backdated sick notes due to the absence of direct clinical assessment at the time of illness.",
    "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling 112 or attend your nearest emergency department.",
  ],
  disclaimerShort:
    "All services in Ireland are provided at GP level by IMC-registered doctors. Treatment recommendations, referrals and medical certificates may be issued only when clinically appropriate and at the doctor's discretion. Our doctors do not routinely prescribe controlled substances through online consultations. Electronic sick leave certificates are not accepted by the Department of Social Protection in Ireland. Backdated sick notes are not routinely issued. In a medical emergency call 112.",
};

// ── Ireland GP sub-services (by service slug) ────────────────────────

const IE_SICK_LEAVE: ServiceDetailContent = {
  seoTitle: "Sick Leave Certificate Online Ireland | IMC-Registered GP | Global Health",
  seoDescription:
    "Speak to an IMC-registered GP online about sick leave certification. Certificates are issued only where clinically appropriate. From EUR 45.",
  h1: "Sick Leave Certificate Consultation in Ireland",
  intro:
    "Global Health provides online sick leave consultations across Ireland with doctors registered with the Irish Medical Council. If you are unwell and unable to attend work, a GP will assess your symptoms and determine whether a medical certificate is clinically appropriate for your situation.",
  covers: {
    title: "What the consultation covers",
    intro:
      "Our doctors assess each patient individually. Conditions commonly assessed for sick leave certification include:",
    items: [
      "Flu, cold and viral infections",
      "Fever and acute illness",
      "Chest infections and severe persistent cough",
      "Gastroenteritis including vomiting and diarrhoea",
      "Migraine and severe headaches",
      "Back pain, muscle pain and minor musculoskeletal injuries affecting ability to work",
      "Acute stress, anxiety and mental health concerns",
      "COVID-19 and respiratory illness",
      "Skin conditions and allergic reactions causing functional impairment",
      "Exacerbations of ongoing conditions including asthma, hypertension and diabetes",
      "Minor injuries affecting your capacity to carry out your job",
    ],
    note: "Each case is assessed individually. The doctor will review your symptoms, medical history, occupational requirements and overall health status before making any clinical decision.",
  },
  process: {
    title: "What happens during your consultation",
    steps: [
      {
        title: "Clinical assessment",
        body: "Your GP will review your symptoms, the nature of your illness, how long you have been unwell, and whether your condition affects your ability to work.",
      },
      {
        title: "Fitness to work decision",
        body: "Your doctor will determine whether you are medically unfit to work, require modified duties, or need extended recovery time. This decision rests entirely with the treating doctor following clinical assessment.",
      },
      {
        title: "Certificate issued where appropriate",
        body: "If the doctor determines that certification is clinically warranted, a medical certificate will be issued and sent to you digitally following the consultation. If a certificate is not clinically appropriate, the doctor will explain the reasons and advise on the most suitable next step.",
      },
    ],
  },
  importantInfo: {
    title: "Important information about sick leave in Ireland",
    paragraphs: [
      "Since 1 January 2024, all eligible employees in Ireland have the statutory right to 5 paid sick days per year under the Sick Leave Act 2022. Statutory sick pay is paid by your employer at 70% of your normal daily earnings up to a maximum of €110 per day. You must have completed 13 weeks of continuous service with your employer to qualify.",
      "Most employers require a medical certificate for absences longer than two consecutive days, though your employment contract may specify a different threshold. Your employer's HR policy governs their own requirements — we recommend checking your contract before booking.",
    ],
  },
  whyChoose: {
    title: "Why choose Global Health",
    items: [
      "Doctors registered with the Irish Medical Council — IMC registration numbers displayed on every doctor profile",
      "Open appointment slots shown during booking, subject to clinician availability",
      "Certificates issued digitally where clinically appropriate after assessment",
      "Available in English, Portuguese, Spanish, Arabic, Urdu, Punjabi and more — the only multilingual online clinic in Ireland",
      "Transparent pricing — €45 per consultation, no hidden fees",
      "Your medical information is handled in strict confidence and will never be shared with your employer without your explicit consent",
    ],
  },
  faq: [
    {
      question: "Can I get a sick note online in Ireland?",
      answer:
        "Yes. Global Health provides online sick leave consultations in Ireland with IMC-registered GPs. If your condition is assessed as clinically warranting certification, your doctor can issue a medical certificate digitally after the consultation.",
    },
    {
      question: "How much does an online sick leave certificate cost in Ireland?",
      answer:
        "A sick leave consultation at Global Health costs EUR 45. This covers a video consultation with an IMC-registered GP and, where clinically appropriate, the issue of a medical certificate.",
    },
    {
      question: "Is an online sick certificate accepted by employers in Ireland?",
      answer:
        "Yes. Medical certificates issued by IMC-registered GPs following a clinical assessment are accepted by most Irish employers. Your employer's HR policy governs their specific requirements — we recommend checking your employment contract. The certificate is issued on the same basis as any GP-issued sick note.",
    },
    {
      question:
        "Can I get a sick cert for Illness Benefit from the Department of Social Protection online?",
      answer:
        "No. Electronic sick leave certificates issued through online consultations are not accepted by the Department of Social Protection for Illness Benefit purposes. Patients requiring MED1 certification for Illness Benefit must attend an in-person GP. Further information is available at gov.ie.",
    },
    {
      question: "How many sick days am I entitled to in Ireland?",
      answer:
        "Since 1 January 2024 all eligible employees in Ireland are entitled to 5 paid sick days per year under the Sick Leave Act 2022. Statutory sick pay is paid by your employer at 70% of your normal daily earnings up to a maximum of €110 per day. You must have completed 13 weeks of continuous service to qualify.",
    },
    {
      question: "Can I get a backdated sick note online?",
      answer:
        "Our doctors do not routinely issue backdated sick notes. A medical certificate can only cover the period from the date of clinical assessment onward, as the doctor cannot certify illness at a time when no assessment was conducted.",
    },
    {
      question: "How quickly will I receive my sick certificate after the consultation?",
      answer:
        "Where a certificate is clinically appropriate, it will be issued digitally after the consultation according to the service workflow.",
    },
    {
      question: "Can I get a sick note in a language other than English in Ireland?",
      answer:
        "Yes. Global Health offers sick leave consultations in English, Portuguese, Spanish, Arabic, Urdu, Punjabi, Czech and French. You can select a doctor by language when booking.",
    },
  ],
  disclaimerFull: [
    "All sick leave consultation services provided through Global Health in Ireland are delivered at GP level by doctors registered with the Irish Medical Council, in accordance with Irish telehealth and medical practice standards.",
    "The decision to issue a medical certificate rests entirely with the treating doctor following clinical assessment. A certificate is not guaranteed and will only be issued where clinically appropriate. Global Health and its doctors have complete clinical autonomy and cannot be directed to issue certificates where the clinical basis does not support it.",
    "Regarding statutory sick leave and illness benefit: Medical certificates issued through Global Health are accepted by most Irish employers for the purpose of statutory sick pay under the Sick Leave Act 2022. However, employer acceptance may vary depending on your employment contract and internal HR policy. Global Health cannot guarantee acceptance by any specific employer.",
    "Electronic sick leave certificates issued through our platform are not accepted by the Department of Social Protection in Ireland for Illness Benefit purposes. Patients requiring a MED1 certificate for Illness Benefit claims must attend an in-person GP consultation. Further information is available at gov.ie and citizensinformation.ie.",
    "Our doctors do not routinely issue backdated medical certificates. Certification covers the period from the date of assessment onward, as the doctor cannot clinically certify illness at a time when no assessment was conducted.",
    "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 112 or attend your nearest emergency department immediately.",
  ],
  disclaimerShort:
    "Sick leave certificates are issued only where clinically appropriate, at the treating doctor's discretion following assessment. Certificates are not accepted by the Department of Social Protection for Illness Benefit purposes — an in-person GP visit is required for MED1 certification. Backdated certificates are not routinely issued. In a medical emergency call 112.",
};

/**
 * GP sub-service detail content, keyed by normalized service slug.
 * Add a new entry here to give another GP sub-service its own
 * long-form landing copy above the booking flow.
 */
const IE_SERVICE_DETAIL: Record<string, ServiceDetailContent> = {
  "sick-leave": IE_SICK_LEAVE,
  "sick-leave-certificate": IE_SICK_LEAVE,
};

/** Normalize a slug for matching (lowercase, strip apostrophes/quotes). */
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/['’]/g, "");
}

/** Resolve the GP hub content for a country, or null when not authored. */
export function getGpHubContent(countryCode: string): GpHubContent | null {
  return countryCode.toLowerCase() === "ie" ? IE_GP_HUB : null;
}

/** Resolve long-form detail content for a (country, service slug) pair. */
export function getServiceDetailContent(
  countryCode: string,
  serviceSlug: string,
): ServiceDetailContent | null {
  if (countryCode.toLowerCase() !== "ie") return null;
  const direct = IE_SERVICE_DETAIL[serviceSlug.toLowerCase()];
  if (direct) return direct;
  const target = normalizeSlug(serviceSlug);
  for (const [key, value] of Object.entries(IE_SERVICE_DETAIL)) {
    if (normalizeSlug(key) === target) return value;
  }
  return null;
}
