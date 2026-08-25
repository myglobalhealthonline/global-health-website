import { irelandGeneralServiceLocalizedCompletionSeoUpdates } from "./ireland-general-service-keywords-localized-completion.js";

export const IRELAND_GENERAL_SERVICE_KEYWORD_VERSION =
  "IE-GENERAL-SERVICE-KEYWORDS-2026-08-25" as const;

export type IrelandGeneralServiceKeywordEntry = Readonly<{
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  evidence: readonly string[];
  excludedKeywords: readonly string[];
}>;

export type IrelandGeneralServiceSeoUpdate = Readonly<{
  slug: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  seoKeywords: readonly string[];
}>;

export type IrelandGeneralServiceLocalizedSeoUpdate = Readonly<{
  slug: string;
  locale: "PT" | "ES" | "CS" | "RO" | "DE";
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
}>;

/**
 * One commercial intent owner for each active Ireland GENERAL service.
 *
 * Evidence was refreshed on 2026-08-25 from final GSC query/page rows,
 * OpenSEO Ireland keyword metrics, and WebDoctor exact-page/domain rankings.
 * Exclusions are part of the map: competitor terms are not targets when they
 * describe a medicine, physical clinic, specialist service, or guaranteed
 * clinical outcome that this GP-level service does not provide.
 */
export const irelandGeneralServiceKeywordMap: readonly IrelandGeneralServiceKeywordEntry[] = [
  {
    slug: "acute-medical-consultation",
    primaryKeyword: "same day doctor consultation ireland",
    secondaryKeywords: [
      "online medical consultation ireland",
      "doctor advice online ireland",
      "online doctor appointment",
    ],
    evidence: ["GSC: 16 impressions for the primary term", "OpenSEO: online doctor appointment 110/mo, KD 19"],
    excludedKeywords: ["online gp ireland (owned by the GP hub)", "cheapest online doctor ireland"],
  },
  {
    slug: "aesthetic-medicine-consultation",
    primaryKeyword: "aesthetic medicine consultation ireland",
    secondaryKeywords: ["online aesthetic consultation", "pre-procedure medical advice", "post-procedure assessment"],
    evidence: ["OpenSEO service-specific expansion", "Existing page and service scope"],
    excludedKeywords: ["aesthetic treatment booking", "cosmetic procedure clinic"],
  },
  {
    slug: "chronic-disease-consultation",
    primaryKeyword: "chronic disease consultation ireland",
    secondaryKeywords: ["chronic disease management ireland", "online chronic care consultation", "long-term condition review"],
    evidence: ["GSC: primary term average position 9", "OpenSEO service-specific expansion"],
    excludedKeywords: ["HSE chronic disease programme", "chronic disease cure"],
  },
  {
    slug: "hair-loss-consultation",
    primaryKeyword: "online hair loss consultation",
    secondaryKeywords: ["hair loss consultation ireland", "hair thinning consultation", "alopecia assessment ireland"],
    evidence: ["GSC: primary term average position 17", "OpenSEO: primary term 10/mo"],
    excludedKeywords: ["hair transplant ireland", "guaranteed hair regrowth"],
  },
  {
    slug: "mens-health-consultation",
    primaryKeyword: "online men's health consultation ireland",
    secondaryKeywords: ["men's health doctor ireland", "erectile dysfunction consultation ireland", "testosterone assessment ireland"],
    evidence: ["GSC query already attributed to this URL", "OpenSEO: men's health Ireland 50/mo, KD 28"],
    excludedKeywords: ["erectile dysfunction pills", "testosterone prescription online"],
  },
  {
    slug: "mental-health-consultation",
    primaryKeyword: "online mental health consultation ireland",
    secondaryKeywords: ["GP mental health assessment ireland", "anxiety consultation online ireland", "depression consultation online ireland"],
    evidence: ["WebDoctor sampled #1 for online mental health consultation", "GSC query/page impressions for GP assessment intent"],
    excludedKeywords: ["mirtazapine ireland", "online psychiatrist ireland (owned by Psychiatry)"],
  },
  {
    slug: "musculoskeletal-pain-assessment",
    primaryKeyword: "online musculoskeletal assessment ireland",
    secondaryKeywords: ["back pain consultation online", "joint pain assessment online", "sciatica consultation online"],
    evidence: ["OpenSEO service-specific expansion", "Existing service scope"],
    excludedKeywords: ["pain specialist ireland", "physiotherapy consultation (separate Specialist service)"],
  },
  {
    slug: "paediatric-consultation",
    primaryKeyword: "online paediatric GP consultation ireland",
    secondaryKeywords: ["online doctor for children ireland", "children's doctor online ireland", "paediatric GP ireland"],
    evidence: ["GSC: 17 impressions for online paediatric consultation", "Existing GP-level service scope"],
    excludedKeywords: ["consultant paediatrician (separate Specialist service)", "paediatric emergency care"],
  },
  {
    slug: "referral-and-investigations",
    primaryKeyword: "online GP referral ireland",
    secondaryKeywords: ["referral letter online", "GP blood test referral", "MRI referral GP ireland", "specialist referral ireland"],
    evidence: ["GSC: referral letter online click at average position 14", "GSC: GP blood test referral impressions"],
    excludedKeywords: ["referral guaranteed", "private diagnostic testing without assessment"],
  },
  {
    slug: "second-opinion-consultation",
    primaryKeyword: "online medical second opinion ireland",
    secondaryKeywords: ["doctor second opinion online", "second opinion consultation", "independent GP review ireland"],
    evidence: ["GSC: 19 impressions for second opinion consultation", "Multiple exact long-tail GSC queries"],
    excludedKeywords: ["specialist second opinion (use the relevant Specialist service)", "diagnosis guaranteed"],
  },
  {
    slug: "sick-certificate-ireland",
    primaryKeyword: "sick cert online",
    secondaryKeywords: ["online sick cert ireland", "medical certificate online ireland", "sick note online ireland", "same day sick cert"],
    evidence: ["OpenSEO: 880/mo, KD 0", "GSC: 49 impressions for same day sick cert"],
    excludedKeywords: ["Illness Benefit certificate online", "sick certificate guaranteed"],
  },
  {
    slug: "skin-dermatology-consultation",
    primaryKeyword: "online skin consultation ireland",
    secondaryKeywords: ["skin consultation", "doctor for skin", "rash consultation online", "eczema consultation online"],
    evidence: ["OpenSEO: primary term 10/mo, KD 30", "WebDoctor: skin consultation 90/mo, rank 23"],
    excludedKeywords: ["dermatologist without referral", "private dermatologist ireland"],
  },
  {
    slug: "travel-health-consultation",
    primaryKeyword: "travel health consultation ireland",
    secondaryKeywords: ["travel health assessment", "pre-travel health check ireland", "travel doctor", "malaria risk advice ireland"],
    evidence: ["GSC: travel health assessment average position 16", "WebDoctor: travel doctor 90/mo, rank 17"],
    excludedKeywords: ["travel vaccinations Dublin", "where to get travel vaccines"],
  },
  {
    slug: "treatment-review",
    primaryKeyword: "repeat prescription review ireland",
    secondaryKeywords: ["repeat prescription ireland", "medication review online ireland", "ongoing treatment review ireland"],
    evidence: ["OpenSEO: repeat prescription Ireland 70/mo, KD 14", "Existing review-not-automatic service scope"],
    excludedKeywords: ["order repeat prescription", "prescription renewal guaranteed"],
  },
  {
    slug: "weight-management-consultation",
    primaryKeyword: "online weight management ireland",
    secondaryKeywords: ["medical weight management ireland", "weight loss consultation ireland", "doctor-led weight loss ireland"],
    evidence: ["WebDoctor: weight management 90/mo, rank 5", "WebDoctor: weight loss Ireland 260/mo, rank 2"],
    excludedKeywords: ["weight loss pills", "Ozempic", "Mounjaro", "medication guaranteed"],
  },
  {
    slug: "womens-health-consultation",
    primaryKeyword: "online women's health consultation ireland",
    secondaryKeywords: ["women's health doctor ireland", "menopause consultation ireland", "PCOS consultation ireland"],
    evidence: ["GSC queries for online hormone-care assessment", "OpenSEO: women's health 590/mo, KD 16 (broad context only)"],
    excludedKeywords: ["HRT prescription guaranteed", "gynaecologist ireland (specialist intent)"],
  },
] as const;

/**
 * Fresh page-level evidence supports English public snippet/H1 changes for all
 * 16 Ireland GENERAL services. Localized PT/ES/CS/RO/DE updates now cover the
 * same 16 services through the reviewed completion payload.
 */
export const irelandGeneralServiceSeoUpdates: readonly IrelandGeneralServiceSeoUpdate[] = [
  {
    slug: "acute-medical-consultation",
    seoTitle: "Same-Day Doctor Consultation Ireland | See a Doctor Online",
    seoDescription:
      "Book a same-day online doctor consultation in Ireland for suitable non-emergency symptoms, clinical assessment and advice on appropriate next steps.",
    heroTitle: "Same-Day Online Doctor Consultation in Ireland",
    seoKeywords: ["same day doctor consultation ireland", "online medical consultation ireland", "doctor advice online ireland", "online doctor appointment"],
  },
  {
    slug: "aesthetic-medicine-consultation",
    seoTitle: "Aesthetic Medicine Consultation Ireland | Pre & Post Care",
    seoDescription:
      "Book an online aesthetic medicine consultation in Ireland for independent pre-procedure advice or medical assessment of suitable post-procedure concerns.",
    heroTitle: "Online Aesthetic Medicine Consultation in Ireland",
    seoKeywords: ["aesthetic medicine consultation ireland", "online aesthetic consultation", "pre-procedure medical advice", "post-procedure assessment"],
  },
  {
    slug: "chronic-disease-consultation",
    seoTitle: "Online Chronic Disease Consultation Ireland | Ongoing Care",
    seoDescription:
      "Book an online chronic disease consultation in Ireland for structured review of a diagnosed long-term condition, treatment safety and ongoing-care planning.",
    heroTitle: "Online Chronic Disease Consultation in Ireland",
    seoKeywords: ["chronic disease consultation ireland", "chronic disease management ireland", "online chronic care consultation", "long-term condition review"],
  },
  {
    slug: "hair-loss-consultation",
    seoTitle: "Online Hair Loss Consultation Ireland | Doctor Assessment",
    seoDescription:
      "Book an online hair loss consultation with an Irish-registered doctor for hair thinning or alopecia assessment and advice on appropriate next steps.",
    heroTitle: "Online Hair Loss Consultation in Ireland",
    seoKeywords: ["online hair loss consultation", "hair loss consultation ireland", "hair thinning consultation", "alopecia assessment ireland"],
  },
  {
    slug: "mens-health-consultation",
    seoTitle: "Online Men's Health Consultation Ireland | Confidential GP",
    seoDescription:
      "Book a confidential online men's health consultation in Ireland for GP assessment of sexual health, hormonal, prostate or general men's health concerns.",
    heroTitle: "Online Men's Health Consultation in Ireland",
    seoKeywords: ["online men's health consultation ireland", "men's health doctor ireland", "erectile dysfunction consultation ireland", "testosterone assessment ireland"],
  },
  {
    slug: "mental-health-consultation",
    seoTitle: "Online Mental Health Consultation Ireland | GP Assessment",
    seoDescription:
      "Book a confidential online mental health consultation with an Irish-registered GP for anxiety, low mood, stress or sleep concerns and appropriate next steps.",
    heroTitle: "Online Mental Health Consultation in Ireland",
    seoKeywords: ["online mental health consultation ireland", "GP mental health assessment ireland", "anxiety consultation online ireland", "depression consultation online ireland"],
  },
  {
    slug: "musculoskeletal-pain-assessment",
    seoTitle: "Online Musculoskeletal Assessment Ireland | Pain & Joint Care",
    seoDescription:
      "Book an online musculoskeletal assessment in Ireland for suitable back pain, joint pain, sciatica or soft-tissue concerns and advice on appropriate care.",
    heroTitle: "Online Musculoskeletal and Pain Assessment in Ireland",
    seoKeywords: ["online musculoskeletal assessment ireland", "back pain consultation online", "joint pain assessment online", "sciatica consultation online"],
  },
  {
    slug: "paediatric-consultation",
    seoTitle: "Online Paediatric GP Ireland | Children's Doctor Consultation",
    seoDescription:
      "Book an online paediatric GP consultation in Ireland for suitable non-emergency concerns affecting babies, children or teenagers, with referral advice when needed.",
    heroTitle: "Online Paediatric GP Consultation in Ireland",
    seoKeywords: ["online paediatric GP consultation ireland", "online doctor for children ireland", "children's doctor online ireland", "paediatric GP ireland"],
  },
  {
    slug: "referral-and-investigations",
    seoTitle: "Online GP Referral Ireland | Tests, Scans & Specialist Letters",
    seoDescription:
      "Book an online GP assessment for a referral letter, blood tests, MRI, scans or specialist review. Referrals are provided only when clinically indicated.",
    heroTitle: "Online GP Referral and Diagnostic Assessment in Ireland",
    seoKeywords: ["online GP referral ireland", "referral letter online", "GP blood test referral", "MRI referral GP ireland", "specialist referral ireland"],
  },
  {
    slug: "second-opinion-consultation",
    seoTitle: "Online Medical Second Opinion Ireland | Independent GP Review",
    seoDescription:
      "Book an online medical second opinion in Ireland for an independent GP-level review of a diagnosis, treatment plan, clinical letter or test result.",
    heroTitle: "Online Medical Second Opinion in Ireland",
    seoKeywords: ["online medical second opinion ireland", "doctor second opinion online", "second opinion consultation", "independent GP review ireland"],
  },
  {
    slug: "sick-certificate-ireland",
    seoTitle: "Sick Cert Online Ireland | Same-Day Doctor Assessment",
    seoDescription:
      "Book an online doctor assessment for a sick cert or sick note in Ireland. Any medical certificate depends on the clinical findings and the doctor's discretion.",
    heroTitle: "Online Sick Cert Assessment in Ireland",
    seoKeywords: ["sick cert online", "online sick cert ireland", "medical certificate online ireland", "sick note online ireland", "same day sick cert"],
  },
  {
    slug: "skin-dermatology-consultation",
    seoTitle: "Online Skin Consultation Ireland | GP Skin Assessment",
    seoDescription:
      "Book an online skin consultation with an Irish-registered GP for rashes, eczema, acne or other suitable skin concerns, with referral advice where needed.",
    heroTitle: "Online Skin Consultation in Ireland",
    seoKeywords: ["online skin consultation ireland", "skin consultation", "doctor for skin", "rash consultation online", "eczema consultation online"],
  },
  {
    slug: "travel-health-consultation",
    seoTitle: "Online Travel Health Consultation Ireland | Pre-Travel Doctor",
    seoDescription:
      "Book an online travel health consultation in Ireland for destination-specific risk assessment, vaccine guidance, malaria advice and pre-travel planning.",
    heroTitle: "Online Travel Health Consultation in Ireland",
    seoKeywords: ["travel health consultation ireland", "travel health assessment", "pre-travel health check ireland", "travel doctor", "malaria risk advice ireland"],
  },
  {
    slug: "treatment-review",
    seoTitle: "Repeat Prescription Review Ireland | Online GP Assessment",
    seoDescription:
      "Book an online GP review of an existing treatment or repeat-prescription request. Continuation is not automatic and depends on clinical assessment.",
    heroTitle: "Repeat Prescription and Medication Review in Ireland",
    seoKeywords: ["repeat prescription review ireland", "repeat prescription ireland", "medication review online ireland", "ongoing treatment review ireland"],
  },
  {
    slug: "weight-management-consultation",
    seoTitle: "Online Weight Management Ireland | Doctor-Led Consultation",
    seoDescription:
      "Book a doctor-led online weight management consultation in Ireland for a clinical assessment, personalised guidance and appropriate follow-up options.",
    heroTitle: "Online Medical Weight Management in Ireland",
    seoKeywords: ["online weight management ireland", "medical weight management ireland", "weight loss consultation ireland", "doctor-led weight loss ireland"],
  },
  {
    slug: "womens-health-consultation",
    seoTitle: "Online Women's Health Consultation Ireland | Confidential GP",
    seoDescription:
      "Book a confidential online women's health consultation in Ireland for GP assessment of menopause, PCOS, contraception, hormonal or reproductive concerns.",
    heroTitle: "Online Women's Health Consultation in Ireland",
    seoKeywords: ["online women's health consultation ireland", "women's health doctor ireland", "menopause consultation ireland", "PCOS consultation ireland"],
  },
] as const;

/**
 * Localized equivalents for all 16 services. Google Ireland exposes English
 * keyword metrics only, so these use native phrasing validated against the
 * corresponding home-language OpenSEO market as a phrasing proxy. Those proxy
 * volumes must never be reported as Ireland demand.
 */
export const irelandGeneralServiceLocalizedSeoUpdates: readonly IrelandGeneralServiceLocalizedSeoUpdate[] = [
  ...irelandGeneralServiceLocalizedCompletionSeoUpdates,
  {
    slug: "hair-loss-consultation",
    locale: "PT",
    seoTitle: "Consulta Online para Queda de Cabelo na Irlanda | Avaliação Médica",
    seoDescription: "Marque uma consulta online com um médico registado na Irlanda para avaliar queda de cabelo, cabelo fino ou alopecia e receber orientação sobre os próximos passos.",
    heroTitle: "Consulta Online para Queda de Cabelo na Irlanda",
  },
  {
    slug: "mental-health-consultation",
    locale: "PT",
    seoTitle: "Consulta de Saúde Mental Online na Irlanda | Avaliação Médica",
    seoDescription: "Marque uma consulta confidencial de saúde mental online com um médico registado na Irlanda para ansiedade, humor baixo, stress ou dificuldades de sono.",
    heroTitle: "Consulta de Saúde Mental Online na Irlanda",
  },
  {
    slug: "referral-and-investigations",
    locale: "PT",
    seoTitle: "Encaminhamento Médico Online na Irlanda | Exames e Especialistas",
    seoDescription: "Marque uma avaliação médica online para carta de encaminhamento, análises, ressonância, exames ou especialista, apenas quando clinicamente indicado.",
    heroTitle: "Encaminhamento Médico e Avaliação Diagnóstica Online na Irlanda",
  },
  {
    slug: "skin-dermatology-consultation",
    locale: "PT",
    seoTitle: "Consulta de Pele Online na Irlanda | Avaliação Médica",
    seoDescription: "Marque uma consulta de pele online com um médico registado na Irlanda para erupções, eczema, acne ou outras queixas adequadas e orientação sobre encaminhamento.",
    heroTitle: "Consulta de Pele Online na Irlanda",
  },
  {
    slug: "treatment-review",
    locale: "PT",
    seoTitle: "Revisão de Receita na Irlanda | Avaliação Médica Online",
    seoDescription: "Marque uma revisão médica online de um tratamento existente ou pedido de renovação de receita. A continuação não é automática e depende da avaliação clínica.",
    heroTitle: "Revisão de Receita e Medicação na Irlanda",
  },
  {
    slug: "weight-management-consultation",
    locale: "PT",
    seoTitle: "Gestão de Peso Online na Irlanda | Consulta Médica",
    seoDescription: "Marque uma consulta médica online de gestão de peso na Irlanda para avaliação clínica, orientação personalizada e opções de acompanhamento adequadas.",
    heroTitle: "Gestão Médica de Peso Online na Irlanda",
  },
  {
    slug: "hair-loss-consultation",
    locale: "ES",
    seoTitle: "Consulta Online por Caída del Cabello en Irlanda | Evaluación Médica",
    seoDescription: "Reserve una consulta online con un médico registrado en Irlanda para evaluar la caída o el debilitamiento del cabello y recibir orientación sobre los próximos pasos.",
    heroTitle: "Consulta Online por Caída del Cabello en Irlanda",
  },
  {
    slug: "mental-health-consultation",
    locale: "ES",
    seoTitle: "Consulta de Salud Mental Online en Irlanda | Evaluación Médica",
    seoDescription: "Reserve una consulta confidencial de salud mental online con un médico registrado en Irlanda para ansiedad, ánimo bajo, estrés o dificultades para dormir.",
    heroTitle: "Consulta de Salud Mental Online en Irlanda",
  },
  {
    slug: "referral-and-investigations",
    locale: "ES",
    seoTitle: "Derivación Médica Online en Irlanda | Pruebas y Especialistas",
    seoDescription: "Reserve una evaluación médica online para una carta de derivación, análisis, resonancia, pruebas o revisión especializada, solo cuando esté clínicamente indicado.",
    heroTitle: "Derivación Médica y Evaluación Diagnóstica Online en Irlanda",
  },
  {
    slug: "skin-dermatology-consultation",
    locale: "ES",
    seoTitle: "Consulta de Piel Online en Irlanda | Evaluación Médica",
    seoDescription: "Reserve una consulta de piel online con un médico registrado en Irlanda para erupciones, eccema, acné u otros problemas adecuados y orientación sobre derivación.",
    heroTitle: "Consulta de Piel Online en Irlanda",
  },
  {
    slug: "treatment-review",
    locale: "ES",
    seoTitle: "Revisión de Receta en Irlanda | Evaluación Médica Online",
    seoDescription: "Reserve una revisión médica online de un tratamiento existente o una solicitud de renovación de receta. La continuación no es automática y depende de la evaluación clínica.",
    heroTitle: "Revisión de Receta y Medicación en Irlanda",
  },
  {
    slug: "weight-management-consultation",
    locale: "ES",
    seoTitle: "Control de Peso Online en Irlanda | Consulta Médica",
    seoDescription: "Reserve una consulta médica online de control de peso en Irlanda para una evaluación clínica, orientación personalizada y opciones de seguimiento adecuadas.",
    heroTitle: "Control Médico de Peso Online en Irlanda",
  },
  {
    slug: "hair-loss-consultation",
    locale: "CS",
    seoTitle: "Online konzultace vypadávání vlasů v Irsku | Lékařské posouzení",
    seoDescription: "Objednejte si online konzultaci s lékařem registrovaným v Irsku kvůli vypadávání nebo řídnutí vlasů a získejte doporučení k vhodným dalším krokům.",
    heroTitle: "Online konzultace vypadávání vlasů v Irsku",
  },
  {
    slug: "mental-health-consultation",
    locale: "CS",
    seoTitle: "Online konzultace duševního zdraví v Irsku | Posouzení lékařem",
    seoDescription: "Objednejte si důvěrnou online konzultaci duševního zdraví s lékařem registrovaným v Irsku kvůli úzkosti, nízké náladě, stresu nebo potížím se spánkem.",
    heroTitle: "Online konzultace duševního zdraví v Irsku",
  },
  {
    slug: "referral-and-investigations",
    locale: "CS",
    seoTitle: "Online doporučení od lékaře v Irsku | Vyšetření a specialisté",
    seoDescription: "Objednejte si online lékařské posouzení pro doporučující dopis, krevní testy, MRI, další vyšetření nebo specialistu, pouze pokud je to klinicky indikováno.",
    heroTitle: "Online lékařské doporučení a diagnostické posouzení v Irsku",
  },
  {
    slug: "skin-dermatology-consultation",
    locale: "CS",
    seoTitle: "Online konzultace kožních potíží v Irsku | Lékařské posouzení",
    seoDescription: "Objednejte si online konzultaci s lékařem registrovaným v Irsku kvůli vyrážce, ekzému, akné nebo jiným vhodným kožním potížím a dalšímu doporučení.",
    heroTitle: "Online konzultace kožních potíží v Irsku",
  },
  {
    slug: "treatment-review",
    locale: "CS",
    seoTitle: "Kontrola opakovaného receptu v Irsku | Online posouzení lékařem",
    seoDescription: "Objednejte si online lékařskou kontrolu stávající léčby nebo žádosti o opakovaný recept. Pokračování léčby není automatické a závisí na klinickém posouzení.",
    heroTitle: "Kontrola opakovaného receptu a medikace v Irsku",
  },
  {
    slug: "weight-management-consultation",
    locale: "CS",
    seoTitle: "Online kontrola hmotnosti v Irsku | Konzultace s lékařem",
    seoDescription: "Objednejte si online lékařskou konzultaci ke kontrole hmotnosti v Irsku, která zahrnuje klinické posouzení, individuální doporučení a vhodné další možnosti.",
    heroTitle: "Online lékařská kontrola hmotnosti v Irsku",
  },
  {
    slug: "hair-loss-consultation",
    locale: "RO",
    seoTitle: "Consultație online pentru căderea părului în Irlanda | Evaluare medicală",
    seoDescription: "Programați o consultație online cu un medic înregistrat în Irlanda pentru evaluarea căderii sau subțierii părului și recomandări privind pașii următori.",
    heroTitle: "Consultație online pentru căderea părului în Irlanda",
  },
  {
    slug: "mental-health-consultation",
    locale: "RO",
    seoTitle: "Consultație online de sănătate mintală în Irlanda | Evaluare medicală",
    seoDescription: "Programați o consultație confidențială online cu un medic înregistrat în Irlanda pentru anxietate, dispoziție scăzută, stres sau dificultăți de somn.",
    heroTitle: "Consultație online de sănătate mintală în Irlanda",
  },
  {
    slug: "referral-and-investigations",
    locale: "RO",
    seoTitle: "Trimitere medicală online în Irlanda | Analize și specialiști",
    seoDescription: "Programați o evaluare medicală online pentru scrisoare de trimitere, analize, RMN, investigații sau specialist, numai atunci când este indicat clinic.",
    heroTitle: "Trimitere medicală și evaluare diagnostică online în Irlanda",
  },
  {
    slug: "skin-dermatology-consultation",
    locale: "RO",
    seoTitle: "Consultație online pentru probleme ale pielii în Irlanda | Evaluare medicală",
    seoDescription: "Programați o consultație online cu un medic înregistrat în Irlanda pentru erupții, eczemă, acnee sau alte probleme adecvate și recomandări de trimitere.",
    heroTitle: "Consultație online pentru probleme ale pielii în Irlanda",
  },
  {
    slug: "treatment-review",
    locale: "RO",
    seoTitle: "Evaluare pentru reînnoirea rețetei în Irlanda | Medic online",
    seoDescription: "Programați o evaluare medicală online a unui tratament existent sau a unei cereri de reînnoire a rețetei. Continuarea nu este automată și depinde de evaluarea clinică.",
    heroTitle: "Evaluarea rețetei și a medicației în Irlanda",
  },
  {
    slug: "weight-management-consultation",
    locale: "RO",
    seoTitle: "Managementul greutății online în Irlanda | Consultație medicală",
    seoDescription: "Programați o consultație medicală online pentru managementul greutății în Irlanda, cu evaluare clinică, recomandări personalizate și opțiuni adecvate de monitorizare.",
    heroTitle: "Management medical al greutății online în Irlanda",
  },
  {
    slug: "hair-loss-consultation",
    locale: "DE",
    seoTitle: "Online-Haarausfall-Beratung in Irland | Ärztliche Beurteilung",
    seoDescription: "Buchen Sie eine Online-Beratung bei einem in Irland registrierten Arzt zur Beurteilung von Haarausfall oder dünner werdendem Haar und zu geeigneten nächsten Schritten.",
    heroTitle: "Online-Haarausfall-Beratung in Irland",
  },
  {
    slug: "mental-health-consultation",
    locale: "DE",
    seoTitle: "Online-Beratung zur psychischen Gesundheit in Irland | Ärztliche Beurteilung",
    seoDescription: "Buchen Sie eine vertrauliche Online-Beratung bei einem in Irland registrierten Arzt zu Angst, gedrückter Stimmung, Stress oder Schlafproblemen.",
    heroTitle: "Online-Beratung zur psychischen Gesundheit in Irland",
  },
  {
    slug: "referral-and-investigations",
    locale: "DE",
    seoTitle: "Online-Überweisung vom Hausarzt in Irland | Untersuchungen & Fachärzte",
    seoDescription: "Buchen Sie eine ärztliche Online-Beurteilung für Überweisungsschreiben, Bluttests, MRT, Untersuchungen oder Fachärzte, sofern dies klinisch angezeigt ist.",
    heroTitle: "Online-Überweisung und diagnostische Beurteilung in Irland",
  },
  {
    slug: "skin-dermatology-consultation",
    locale: "DE",
    seoTitle: "Online-Hautberatung in Irland | Ärztliche Beurteilung",
    seoDescription: "Buchen Sie eine Online-Hautberatung bei einem in Irland registrierten Arzt zu Ausschlag, Ekzem, Akne oder anderen geeigneten Hautproblemen und zur weiteren Abklärung.",
    heroTitle: "Online-Hautberatung in Irland",
  },
  {
    slug: "treatment-review",
    locale: "DE",
    seoTitle: "Folgerezept-Prüfung in Irland | Ärztliche Online-Beurteilung",
    seoDescription: "Buchen Sie eine ärztliche Online-Prüfung einer bestehenden Behandlung oder Folgerezeptanfrage. Eine Fortsetzung erfolgt nicht automatisch, sondern nach klinischer Beurteilung.",
    heroTitle: "Folgerezept- und Medikamentenprüfung in Irland",
  },
  {
    slug: "weight-management-consultation",
    locale: "DE",
    seoTitle: "Online-Gewichtsmanagement in Irland | Ärztliche Beratung",
    seoDescription: "Buchen Sie eine ärztlich geleitete Online-Beratung zum Gewichtsmanagement in Irland mit klinischer Beurteilung, individueller Beratung und geeigneter Nachsorge.",
    heroTitle: "Ärztliches Online-Gewichtsmanagement in Irland",
  },
] as const;
