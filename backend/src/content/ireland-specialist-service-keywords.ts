export const IRELAND_SPECIALIST_SERVICE_KEYWORD_VERSION =
  "IE-SPECIALIST-SERVICE-KEYWORDS-2026-08-26" as const;

export type IrelandSpecialistServiceKeywordEntry = Readonly<{
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  evidence: readonly string[];
  excludedKeywords: readonly string[];
}>;

export type IrelandSpecialistServiceSeoUpdate = Readonly<{
  slug: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  seoKeywords: readonly string[];
}>;

export type IrelandSpecialistServiceLocalizedSeoUpdate = Readonly<{
  slug: string;
  locale: "PT" | "ES" | "CS" | "RO" | "DE";
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
}>;

export const irelandSpecialistServiceKeywordMap: readonly IrelandSpecialistServiceKeywordEntry[] = [
  {
    slug: "cardiology-specialist-consultation",
    primaryKeyword: "cardiologist ireland",
    secondaryKeywords: [
      "online cardiologist ireland",
      "cardiology consultation ireland",
      "heart specialist ireland",
    ],
    evidence: [
      "GSC: heart specialist query impressions on the live service URL",
      "OpenSEO: cardiologist ireland 30/mo, KD 16",
      "OpenSEO SERP: Global Health ranking page 5 for online cardiologist ireland",
    ],
    excludedKeywords: [
      "same day cardiologist ireland",
      "cardiology clinic dublin",
      "emergency chest pain assessment",
    ],
  },
  {
    slug: "neurology-specialist-consultation",
    primaryKeyword: "neurologist ireland",
    secondaryKeywords: [
      "online neurologist ireland",
      "neurology consultation",
      "book a neurologist appointment",
    ],
    evidence: [
      "GSC: online neurologist and neurology consultation impressions on the live service URL",
      "OpenSEO: neurologist ireland 110/mo",
      "OpenSEO SERP: neurologist intent dominated by private neurology clinics and specialist directories",
    ],
    excludedKeywords: [
      "consultant neurologist",
      "stroke emergency",
      "same day neurologist ireland",
    ],
  },
  {
    slug: "nutrition-specialist-consultation",
    primaryKeyword: "online nutritionist ireland",
    secondaryKeywords: [
      "nutritionist ireland",
      "online nutritionist",
      "nutrition consultation ireland",
    ],
    evidence: [
      "GSC: online nutritionist and nutrition consultant impressions on the live service URL",
      "OpenSEO: nutritionist ireland 260/mo, KD 14",
      "OpenSEO: online nutritionist ireland 10/mo, KD 37",
    ],
    excludedKeywords: [
      "weight loss pills ireland",
      "dietician hospital referral",
      "guaranteed meal plan",
    ],
  },
  {
    slug: "paediatric-specialist-consultation",
    primaryKeyword: "paediatrician ireland",
    secondaryKeywords: [
      "online paediatrician ireland",
      "paediatric specialist consultation",
      "child specialist consultation ireland",
    ],
    evidence: [
      "GSC: what is a pediatric consultation impression on the live service URL",
      "OpenSEO: paediatrician ireland returns live demand with KD 11",
      "Direct-access child specialist intent differs from the GP paediatric page already mapped separately",
    ],
    excludedKeywords: [
      "paediatric GP ireland",
      "children's doctor online ireland",
      "paediatric emergency department",
    ],
  },
  {
    slug: "physiotherapy-specialist-consultation",
    primaryKeyword: "online physiotherapy consultation",
    secondaryKeywords: [
      "online physiotherapy ireland",
      "physiotherapist ireland",
      "rehabilitation consultation online",
    ],
    evidence: [
      "Live page copy and clinician roster support remote rehabilitation assessment intent",
      "OpenSEO: online physiotherapy ireland 10/mo",
      "OpenSEO SERP: online physiotherapy ireland led by telehealth physio services",
    ],
    excludedKeywords: [
      "CORU-registered physiotherapist",
      "hands-on physio dublin",
      "same day physiotherapy appointment",
    ],
  },
  {
    slug: "psychiatry-specialist-consultation",
    primaryKeyword: "online psychiatrist ireland",
    secondaryKeywords: [
      "consultant psychiatrist ireland",
      "psychiatry consultation ireland",
      "psychiatric assessment online",
    ],
    evidence: [
      "GSC: online psychiatrist ireland and consultant psychiatrist impressions on the live service URL",
      "OpenSEO SERP: dedicated private psychiatry pages lead this query family",
      "Service intent is specialist psychiatry, not the GP mental health page",
    ],
    excludedKeywords: [
      "GP mental health consultation",
      "ADHD assessment guaranteed",
      "no GP referral required",
    ],
  },
  {
    slug: "psychology-specialist-consultation",
    primaryKeyword: "online psychologist ireland",
    secondaryKeywords: [
      "psychologist ireland",
      "psychology consultation",
      "online therapy ireland",
    ],
    evidence: [
      "GSC: psychology consultation specialists impressions on the live service URL",
      "OpenSEO SERP: online psychologist ireland led by therapy and psychology providers",
      "Service intent is specialist psychology, distinct from GP mental-health assessment",
    ],
    excludedKeywords: [
      "GP mental health consultation",
      "CORU-registered psychologist",
      "free counselling ireland",
    ],
  },
] as const;

export const irelandSpecialistServiceSeoUpdates: readonly IrelandSpecialistServiceSeoUpdate[] = [
  {
    slug: "cardiology-specialist-consultation",
    seoTitle: "Cardiology Consultation Ireland | Online Cardiologist Review",
    seoDescription:
      "Book an online cardiology consultation in Ireland for symptom review, test-result discussion and specialist advice on the appropriate next step.",
    heroTitle: "Online Cardiology Consultation in Ireland",
    seoKeywords: ["cardiologist ireland", "online cardiologist ireland", "cardiology consultation ireland"],
  },
  {
    slug: "neurology-specialist-consultation",
    seoTitle: "Neurology Consultation Ireland | Online Neurologist Review",
    seoDescription:
      "Book an online neurology consultation in Ireland for headache, nerve, movement or neurological symptom review and specialist follow-up advice.",
    heroTitle: "Online Neurology Consultation in Ireland",
    seoKeywords: ["neurologist ireland", "online neurologist ireland", "neurology consultation"],
  },
  {
    slug: "nutrition-specialist-consultation",
    seoTitle: "Nutrition Consultation Ireland | Online Nutrition Support",
    seoDescription:
      "Book an online nutrition consultation in Ireland for specialist dietary guidance, symptom review and practical nutrition support matched to your goals.",
    heroTitle: "Online Nutrition Consultation in Ireland",
    seoKeywords: ["online nutritionist ireland", "nutritionist ireland", "nutrition consultation ireland"],
  },
  {
    slug: "paediatric-specialist-consultation",
    seoTitle: "Paediatric Consultation Ireland | Child Specialist Review",
    seoDescription:
      "Book an online paediatric specialist consultation in Ireland for child-health review, follow-up guidance and advice on the next appropriate step.",
    heroTitle: "Online Paediatric Specialist Consultation in Ireland",
    seoKeywords: ["paediatrician ireland", "online paediatrician ireland", "paediatric specialist consultation"],
  },
  {
    slug: "physiotherapy-specialist-consultation",
    seoTitle: "Physiotherapy Consultation Ireland | Online Rehab Support",
    seoDescription:
      "Book an online physiotherapy consultation in Ireland for movement assessment, rehabilitation planning, exercise guidance and remote follow-up support.",
    heroTitle: "Online Physiotherapy Consultation in Ireland",
    seoKeywords: ["online physiotherapy consultation", "online physiotherapy ireland", "physiotherapist ireland"],
  },
  {
    slug: "psychiatry-specialist-consultation",
    seoTitle: "Psychiatry Consultation Ireland | Online Psychiatrist",
    seoDescription:
      "Book an online psychiatry consultation in Ireland for specialist mental-health review, medication assessment and clear advice on appropriate next steps.",
    heroTitle: "Online Psychiatry Consultation in Ireland",
    seoKeywords: ["online psychiatrist ireland", "consultant psychiatrist ireland", "psychiatry consultation ireland"],
  },
  {
    slug: "psychology-specialist-consultation",
    seoTitle: "Psychology Consultation Ireland | Online Psychologist",
    seoDescription:
      "Book an online psychology consultation in Ireland for structured assessment, therapeutic support and specialist guidance tailored to your concerns.",
    heroTitle: "Online Psychology Consultation in Ireland",
    seoKeywords: ["online psychologist ireland", "psychologist ireland", "psychology consultation"],
  },
] as const;

export const irelandSpecialistServiceLocalizedSeoUpdates: readonly IrelandSpecialistServiceLocalizedSeoUpdate[] = [
  {
    slug: "cardiology-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta de Cardiologia na Irlanda | Cardiologista Online",
    seoDescription: "Marque uma consulta de cardiologia online na Irlanda para rever sintomas, exames e receber orientação especializada sobre o próximo passo adequado.",
    heroTitle: "Consulta de Cardiologia Online na Irlanda",
  },
  {
    slug: "neurology-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta de Neurologia na Irlanda | Neurologia Online",
    seoDescription: "Marque uma consulta de neurologia online na Irlanda para rever dores de cabeça, sintomas neurológicos e receber orientação especializada de seguimento.",
    heroTitle: "Consulta de Neurologia Online na Irlanda",
  },
  {
    slug: "nutrition-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta de Nutrição na Irlanda | Apoio Nutricional Online",
    seoDescription: "Marque uma consulta de nutrição online na Irlanda para orientação alimentar especializada, revisão de sintomas e apoio prático ajustado aos seus objetivos.",
    heroTitle: "Consulta de Nutrição Online na Irlanda",
  },
  {
    slug: "paediatric-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta Pediátrica na Irlanda | Avaliação Especializada",
    seoDescription: "Marque uma consulta pediátrica especializada online na Irlanda para rever sintomas infantis, seguimento clínico e orientação sobre o próximo passo adequado.",
    heroTitle: "Consulta Pediátrica Especializada Online na Irlanda",
  },
  {
    slug: "physiotherapy-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta de Fisioterapia na Irlanda | Reabilitação Online",
    seoDescription: "Marque uma consulta de fisioterapia online na Irlanda para avaliação do movimento, plano de reabilitação, exercícios e acompanhamento remoto especializado.",
    heroTitle: "Consulta de Fisioterapia Online na Irlanda",
  },
  {
    slug: "psychiatry-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta de Psiquiatria na Irlanda | Psiquiatra Online",
    seoDescription: "Marque uma consulta de psiquiatria online na Irlanda para avaliação especializada de saúde mental, revisão de medicação e orientação clínica sobre os próximos passos.",
    heroTitle: "Consulta de Psiquiatria Online na Irlanda",
  },
  {
    slug: "psychology-specialist-consultation",
    locale: "PT",
    seoTitle: "Consulta de Psicologia na Irlanda | Psicólogo Online",
    seoDescription: "Marque uma consulta de psicologia online na Irlanda para avaliação estruturada, apoio terapêutico e orientação especializada adaptada à sua situação.",
    heroTitle: "Consulta de Psicologia Online na Irlanda",
  },
  {
    slug: "cardiology-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta de Cardiología en Irlanda | Cardiólogo Online",
    seoDescription: "Reserve una consulta de cardiología online en Irlanda para revisar síntomas, resultados y recibir orientación especializada sobre el siguiente paso adecuado.",
    heroTitle: "Consulta de Cardiología Online en Irlanda",
  },
  {
    slug: "neurology-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta de Neurología en Irlanda | Neurología Online",
    seoDescription: "Reserve una consulta de neurología online en Irlanda para revisar dolores de cabeza, síntomas neurológicos y recibir orientación especializada de seguimiento.",
    heroTitle: "Consulta de Neurología Online en Irlanda",
  },
  {
    slug: "nutrition-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta de Nutrición en Irlanda | Apoyo Nutricional Online",
    seoDescription: "Reserve una consulta de nutrición online en Irlanda para orientación alimentaria especializada, revisión de síntomas y apoyo práctico según sus objetivos.",
    heroTitle: "Consulta de Nutrición Online en Irlanda",
  },
  {
    slug: "paediatric-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta Pediátrica en Irlanda | Valoración Especializada",
    seoDescription: "Reserve una consulta pediátrica especializada online en Irlanda para revisar síntomas infantiles, seguimiento clínico y orientación sobre el siguiente paso adecuado.",
    heroTitle: "Consulta Pediátrica Especializada Online en Irlanda",
  },
  {
    slug: "physiotherapy-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta de Fisioterapia en Irlanda | Rehabilitación Online",
    seoDescription: "Reserve una consulta de fisioterapia online en Irlanda para evaluación del movimiento, plan de rehabilitación, ejercicios y seguimiento remoto especializado.",
    heroTitle: "Consulta de Fisioterapia Online en Irlanda",
  },
  {
    slug: "psychiatry-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta de Psiquiatría en Irlanda | Psiquiatra Online",
    seoDescription: "Reserve una consulta de psiquiatría online en Irlanda para valoración especializada de salud mental, revisión de medicación y orientación clínica sobre los siguientes pasos.",
    heroTitle: "Consulta de Psiquiatría Online en Irlanda",
  },
  {
    slug: "psychology-specialist-consultation",
    locale: "ES",
    seoTitle: "Consulta de Psicología en Irlanda | Psicólogo Online",
    seoDescription: "Reserve una consulta de psicología online en Irlanda para evaluación estructurada, apoyo terapéutico y orientación especializada adaptada a su situación.",
    heroTitle: "Consulta de Psicología Online en Irlanda",
  },
  {
    slug: "cardiology-specialist-consultation",
    locale: "CS",
    seoTitle: "Kardiologická konzultace v Irsku | Online kardiologie",
    seoDescription: "Objednejte si online kardiologickou konzultaci v Irsku kvůli zhodnocení příznaků, výsledků vyšetření a doporučení vhodného dalšího postupu.",
    heroTitle: "Online kardiologická konzultace v Irsku",
  },
  {
    slug: "neurology-specialist-consultation",
    locale: "CS",
    seoTitle: "Neurologická konzultace v Irsku | Online neurologie",
    seoDescription: "Objednejte si online neurologickou konzultaci v Irsku kvůli bolestem hlavy, neurologickým příznakům a odbornému doporučení k dalšímu postupu.",
    heroTitle: "Online neurologická konzultace v Irsku",
  },
  {
    slug: "nutrition-specialist-consultation",
    locale: "CS",
    seoTitle: "Nutriční konzultace v Irsku | Online výživové poradenství",
    seoDescription: "Objednejte si online nutriční konzultaci v Irsku pro odborné dietní vedení, zhodnocení obtíží a praktickou podporu podle vašich cílů.",
    heroTitle: "Online nutriční konzultace v Irsku",
  },
  {
    slug: "paediatric-specialist-consultation",
    locale: "CS",
    seoTitle: "Pediatrická konzultace v Irsku | Odborné dětské posouzení",
    seoDescription: "Objednejte si online pediatrickou odbornou konzultaci v Irsku kvůli dětským obtížím, následnému sledování a doporučení vhodného dalšího kroku.",
    heroTitle: "Online pediatrická odborná konzultace v Irsku",
  },
  {
    slug: "physiotherapy-specialist-consultation",
    locale: "CS",
    seoTitle: "Fyzioterapeutická konzultace v Irsku | Online rehabilitace",
    seoDescription: "Objednejte si online fyzioterapeutickou konzultaci v Irsku pro zhodnocení pohybu, rehabilitační plán, cvičení a odborné dálkové sledování.",
    heroTitle: "Online fyzioterapeutická konzultace v Irsku",
  },
  {
    slug: "psychiatry-specialist-consultation",
    locale: "CS",
    seoTitle: "Psychiatrická konzultace v Irsku | Online psychiatrie",
    seoDescription: "Objednejte si online psychiatrickou konzultaci v Irsku pro odborné posouzení duševního zdraví, revizi léčby a doporučení vhodných dalších kroků.",
    heroTitle: "Online psychiatrická konzultace v Irsku",
  },
  {
    slug: "psychology-specialist-consultation",
    locale: "CS",
    seoTitle: "Psychologická konzultace v Irsku | Online psycholog",
    seoDescription: "Objednejte si online psychologickou konzultaci v Irsku pro strukturované zhodnocení, terapeutickou podporu a odborné vedení podle vaší situace.",
    heroTitle: "Online psychologická konzultace v Irsku",
  },
  {
    slug: "cardiology-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație de cardiologie în Irlanda | Cardiolog online",
    seoDescription: "Programați o consultație de cardiologie online în Irlanda pentru evaluarea simptomelor, discutarea rezultatelor și recomandarea următorului pas potrivit.",
    heroTitle: "Consultație de cardiologie online în Irlanda",
  },
  {
    slug: "neurology-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație de neurologie în Irlanda | Neurologie online",
    seoDescription: "Programați o consultație de neurologie online în Irlanda pentru dureri de cap, simptome neurologice și recomandări de specialitate pentru următorul pas.",
    heroTitle: "Consultație de neurologie online în Irlanda",
  },
  {
    slug: "nutrition-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație de nutriție în Irlanda | Sprijin nutrițional online",
    seoDescription: "Programați o consultație de nutriție online în Irlanda pentru ghidaj alimentar specializat, evaluarea simptomelor și sprijin practic conform obiectivelor dumneavoastră.",
    heroTitle: "Consultație de nutriție online în Irlanda",
  },
  {
    slug: "paediatric-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație pediatrică în Irlanda | Evaluare specializată",
    seoDescription: "Programați o consultație pediatrică online în Irlanda pentru simptome la copii, monitorizare clinică și recomandări privind următorul pas adecvat.",
    heroTitle: "Consultație pediatrică specializată online în Irlanda",
  },
  {
    slug: "physiotherapy-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație de fizioterapie în Irlanda | Reabilitare online",
    seoDescription: "Programați o consultație de fizioterapie online în Irlanda pentru evaluarea mișcării, plan de recuperare, exerciții și monitorizare la distanță.",
    heroTitle: "Consultație de fizioterapie online în Irlanda",
  },
  {
    slug: "psychiatry-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație de psihiatrie în Irlanda | Psihiatru online",
    seoDescription: "Programați o consultație de psihiatrie online în Irlanda pentru evaluare specializată a sănătății mintale, revizuirea tratamentului și recomandări clinice clare.",
    heroTitle: "Consultație de psihiatrie online în Irlanda",
  },
  {
    slug: "psychology-specialist-consultation",
    locale: "RO",
    seoTitle: "Consultație de psihologie în Irlanda | Psiholog online",
    seoDescription: "Programați o consultație de psihologie online în Irlanda pentru evaluare structurată, sprijin terapeutic și orientare specializată potrivită situației dumneavoastră.",
    heroTitle: "Consultație de psihologie online în Irlanda",
  },
  {
    slug: "cardiology-specialist-consultation",
    locale: "DE",
    seoTitle: "Kardiologie-Beratung in Irland | Online-Kardiologe",
    seoDescription: "Buchen Sie eine Online-Kardiologie-Beratung in Irland zur Prüfung von Symptomen, Ergebnissen und zur fachärztlichen Empfehlung des passenden nächsten Schritts.",
    heroTitle: "Online-Kardiologie-Beratung in Irland",
  },
  {
    slug: "neurology-specialist-consultation",
    locale: "DE",
    seoTitle: "Neurologie-Beratung in Irland | Online-Neurologie",
    seoDescription: "Buchen Sie eine Online-Neurologie-Beratung in Irland bei Kopfschmerzen, neurologischen Beschwerden und für fachärztliche Empfehlungen zur weiteren Abklärung.",
    heroTitle: "Online-Neurologie-Beratung in Irland",
  },
  {
    slug: "nutrition-specialist-consultation",
    locale: "DE",
    seoTitle: "Ernährungsberatung in Irland | Online-Ernährungshilfe",
    seoDescription: "Buchen Sie eine Online-Ernährungsberatung in Irland für fachliche Ernährungsunterstützung, Symptomprüfung und praktische Hilfe passend zu Ihren Zielen.",
    heroTitle: "Online-Ernährungsberatung in Irland",
  },
  {
    slug: "paediatric-specialist-consultation",
    locale: "DE",
    seoTitle: "Pädiatrische Beratung in Irland | Fachärztliche Kinderprüfung",
    seoDescription: "Buchen Sie eine pädiatrische Online-Beratung in Irland für Kinderbeschwerden, Verlaufskontrolle und klare Hinweise zum passenden nächsten Schritt.",
    heroTitle: "Pädiatrische Online-Beratung in Irland",
  },
  {
    slug: "physiotherapy-specialist-consultation",
    locale: "DE",
    seoTitle: "Physiotherapie-Beratung in Irland | Online-Rehabilitation",
    seoDescription: "Buchen Sie eine Online-Physiotherapie-Beratung in Irland für Bewegungsanalyse, Rehaplan, Übungsanleitung und fachliche Betreuung aus der Ferne.",
    heroTitle: "Online-Physiotherapie-Beratung in Irland",
  },
  {
    slug: "psychiatry-specialist-consultation",
    locale: "DE",
    seoTitle: "Psychiatrie-Beratung in Irland | Online-Psychiater",
    seoDescription: "Buchen Sie eine Online-Psychiatrie-Beratung in Irland für die fachärztliche Prüfung psychischer Beschwerden, Medikationsbewertung und klare nächste Schritte.",
    heroTitle: "Online-Psychiatrie-Beratung in Irland",
  },
  {
    slug: "psychology-specialist-consultation",
    locale: "DE",
    seoTitle: "Psychologie-Beratung in Irland | Online-Psychologe",
    seoDescription: "Buchen Sie eine Online-Psychologie-Beratung in Irland für strukturierte Einschätzung, therapeutische Unterstützung und fachliche Begleitung Ihrer Situation.",
    heroTitle: "Online-Psychologie-Beratung in Irland",
  },
] as const;
