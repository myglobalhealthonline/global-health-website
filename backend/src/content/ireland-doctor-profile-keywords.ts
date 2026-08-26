export const IRELAND_DOCTOR_PROFILE_KEYWORD_VERSION =
  "IE-DOCTOR-PROFILE-KEYWORDS-2026-08-26" as const;

export type IrelandDoctorProfileKeywordEntry = Readonly<{
  slug: string;
  displayName: string;
  verifiedRole: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  evidence: readonly string[];
  excludedKeywords: readonly string[];
}>;

export type IrelandDoctorProfileBlockedRecord = Readonly<{
  slug: string;
  reason: string;
}>;

export type IrelandDoctorProfileSeoUpdate = Readonly<{
  slug: string;
  locale: "EN" | "PT" | "ES" | "CS" | "RO" | "DE";
  displayName: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: readonly string[];
}>;

const irelandDoctorProfiles = [
  ["dr-abdelrahman-mustafa", "Dr Abdelrahman Mustafa", "General Practitioner"],
  ["dr-ahmed-maklad", "Dr Ahmed Maklad", "General Practitioner"],
  ["dr-emmanuel-dabup", "Dr Emmanuel Dabup", "Consultant Psychiatrist"],
  ["dr-fahad-farooq", "Dr Fahad Farooq", "Neurology Registrar"],
  ["dr-fatima-ali", "Dr Fatima Ali", "Medical Oncology Registrar"],
  ["dr-mariam-faiz", "Dr Mariam Faiz", "GP & Aesthetic Physician"],
  ["dr-mohamed-fadzly-bin-mohamed", "Dr Mohamed Fadzly Bin Mohamed", "General Practitioner"],
  ["dr-mohammed-omar", "Dr Mohammed Omar", "Consultant Cardiologist"],
  ["dr-muhammad-mataro", "Dr Muhammad Mataro", "General Practitioner"],
  ["dr-muhammad-tahir-arain", "Dr Muhammad Tahir Arain", "General Practitioner"],
  ["dr-muhammad-usman-yoosuf", "Dr Muhammad Usman Yoosuf", "General Practitioner"],
  ["dr-raafat-ibrahim", "Dr Raafat Ibrahim", "Consultant Paediatrician"],
  ["dr-raza-khan", "Dr Raza Khan", "General Practitioner"],
  ["dr-saadia-irfan", "Dr Saadia Irfan", "Paediatric Consultant"],
  ["dr-tiago-miguel-figueira", "Dr Tiago Miguel Figueira", "General Practitioner"],
  ["dr-yousif-mohamed", "Dr Yousif Mohamed", "General Practitioner"],
  ["khoiamul-islam", "MUDr. Khoiamul Islam", "General Practitioner"],
  ["maristela-ferro-nepomuceno", "Maristela Ferro Nepomuceno", "Psychologist"],
  ["priscila-figueiredo", "Priscila Figueiredo", "Rehabilitation & Wellness Consultant"],
  ["roney-carli", "Roney Carli", "Chiropractor & Manual Therapist"],
  ["silvia-alexandre-fernandes", "Silvia Alexandre Fernandes", "Nutritional Therapist"],
] as const;

export const irelandDoctorProfileBlockedRecords: readonly IrelandDoctorProfileBlockedRecord[] = [
  {
    slug: "dr-arooj-iqbal-lodhi",
    reason: "No substantive biography in the production Ireland roster",
  },
] as const;

export const irelandDoctorProfileKeywordMap: readonly IrelandDoctorProfileKeywordEntry[] =
  irelandDoctorProfiles.map(([slug, displayName, verifiedRole]) => ({
    slug,
    displayName,
    verifiedRole,
    primaryKeyword: displayName.toLowerCase(),
    secondaryKeywords: [
      `${displayName} ireland`.toLowerCase(),
      `${displayName} ${verifiedRole}`.toLowerCase(),
      `${displayName} online consultation`.toLowerCase(),
    ],
    evidence: [
      "GSC: Ireland doctor-name searches are the strongest profile-level traffic source",
      "Production roster: active public Ireland doctor profile confirmed on 2026-08-25",
    ],
    excludedKeywords: [
      "online doctors Ireland",
      "online specialist consultation Ireland",
      "best doctor ireland",
      "same-day appointment",
      "no referral needed",
    ],
  })) as readonly IrelandDoctorProfileKeywordEntry[];

function buildEnglishTitle(displayName: string, verifiedRole: string): string {
  const detailed = `${displayName} | ${verifiedRole} in Ireland`;
  if (detailed.length <= 80) return detailed;
  return `${displayName} | Ireland clinician profile`;
}

const localizedRoles: Readonly<Record<string, Readonly<Record<"PT" | "ES" | "CS" | "RO" | "DE", string>>>> = {
  "General Practitioner": { PT: "Médico de clínica geral", ES: "Médico de cabecera", CS: "Praktický lékař", RO: "Medic de familie", DE: "Allgemeinmediziner" },
  "Consultant Psychiatrist": { PT: "Psiquiatra consultor", ES: "Psiquiatra consultor", CS: "Konzultant psychiatr", RO: "Psihiatru consultant", DE: "Facharzt für Psychiatrie" },
  "Neurology Registrar": { PT: "Médico em formação em Neurologia", ES: "Médico residente de Neurología", CS: "Lékař v neurologické přípravě", RO: "Medic rezident în neurologie", DE: "Arzt in neurologischer Weiterbildung" },
  "Medical Oncology Registrar": { PT: "Médica em formação em Oncologia", ES: "Médica residente de Oncología", CS: "Lékařka v onkologické přípravě", RO: "Medic rezident în oncologie", DE: "Ärztin in onkologischer Weiterbildung" },
  "GP & Aesthetic Physician": { PT: "Médica de clínica geral e estética", ES: "Médica de cabecera y estética", CS: "Praktická a estetická lékařka", RO: "Medic de familie și estetică", DE: "Allgemeinmedizinerin und ästhetische Ärztin" },
  "Consultant Cardiologist": { PT: "Cardiologista consultor", ES: "Cardiólogo consultor", CS: "Konzultant kardiolog", RO: "Cardiolog consultant", DE: "Facharzt für Kardiologie" },
  "Consultant Paediatrician": { PT: "Pediatra consultor", ES: "Pediatra consultor", CS: "Konzultant pediatr", RO: "Pediatru consultant", DE: "Facharzt für Pädiatrie" },
  "Paediatric Consultant": { PT: "Consultora em pediatria", ES: "Consultora pediátrica", CS: "Konzultantka pediatrie", RO: "Consultant pediatric", DE: "Fachärztin für Pädiatrie" },
  Psychologist: { PT: "Psicóloga", ES: "Psicóloga", CS: "Psycholožka", RO: "Psiholog", DE: "Psychologin" },
  "Rehabilitation & Wellness Consultant": { PT: "Consultora de reabilitação e bem-estar", ES: "Consultora de rehabilitación y bienestar", CS: "Konzultantka rehabilitace a wellness", RO: "Consultant în recuperare și wellness", DE: "Beraterin für Rehabilitation und Wellness" },
  "Chiropractor & Manual Therapist": { PT: "Quiroprático e terapeuta manual", ES: "Quiropráctico y terapeuta manual", CS: "Chiropraktik a manuální terapeut", RO: "Chiropractician și terapeut manual", DE: "Chiropraktiker und Manualtherapeut" },
  "Nutritional Therapist": { PT: "Terapeuta nutricional", ES: "Terapeuta nutricional", CS: "Nutriční terapeutka", RO: "Terapeut nutrițional", DE: "Ernährungstherapeutin" },
};

function buildLocaleTitle(
  displayName: string,
  verifiedRole: string,
  locale: "PT" | "ES" | "CS" | "RO" | "DE",
): string {
  const roles = localizedRoles[verifiedRole] ?? {
    PT: verifiedRole,
    ES: verifiedRole,
    CS: verifiedRole,
    RO: verifiedRole,
    DE: verifiedRole,
  };
  const country = { PT: "Irlanda", ES: "Irlanda", CS: "Irsko", RO: "Irlanda", DE: "Irland" }[locale];
  const detailed = `${displayName} | ${roles[locale]} | ${country}`;
  return detailed.length <= 80 ? detailed : `${displayName} | ${roles[locale]}`;
}

function buildEnglishDescription(displayName: string, verifiedRole: string): string {
  return `Ireland profile for ${displayName}, ${verifiedRole}: professional background, languages and online services linked to this clinician.`;
}

function buildLocaleDescription(
  displayName: string,
  locale: "PT" | "ES" | "CS" | "RO" | "DE",
): string {
  const templateByLocale = {
    PT: `Perfil na Irlanda de ${displayName}: informações profissionais, idiomas, experiência clínica e serviços online associados a este profissional.`,
    ES: `Perfil en Irlanda de ${displayName}: información profesional, idiomas, experiencia clínica y servicios online asociados a este profesional.`,
    CS: `Irský profil ${displayName}: profesní informace, jazyky, klinické zkušenosti a online služby spojené s tímto odborníkem.`,
    RO: `Profilul din Irlanda al lui ${displayName}: informații profesionale, limbi vorbite, experiență clinică și servicii online asociate acestui profesionist.`,
    DE: `Irland-Profil von ${displayName}: berufliche Angaben, Sprachen, klinischer Hintergrund und diesem Behandler zugeordnete Online-Leistungen.`,
  } as const;
  return templateByLocale[locale];
}

function buildSeoKeywords(displayName: string, verifiedRole: string): readonly string[] {
  return [
    displayName.toLowerCase(),
    `${displayName} ireland`.toLowerCase(),
    `${displayName} ${verifiedRole}`.toLowerCase(),
  ];
}

const englishSeoUpdates = irelandDoctorProfiles.map(
  ([slug, displayName, verifiedRole]) =>
    ({
      slug,
      locale: "EN",
      displayName,
      seoTitle: buildEnglishTitle(displayName, verifiedRole),
      seoDescription: buildEnglishDescription(displayName, verifiedRole),
      seoKeywords: buildSeoKeywords(displayName, verifiedRole),
    }) satisfies IrelandDoctorProfileSeoUpdate,
);

const localizedLocales = ["PT", "ES", "CS", "RO", "DE"] as const;

const localizedSeoUpdates = localizedLocales.flatMap((locale) =>
  irelandDoctorProfiles.map(
    ([slug, displayName, verifiedRole]) =>
      ({
        slug,
        locale,
        displayName,
        seoTitle: buildLocaleTitle(displayName, verifiedRole, locale),
        seoDescription: buildLocaleDescription(displayName, locale),
        seoKeywords: buildSeoKeywords(displayName, verifiedRole),
      }) satisfies IrelandDoctorProfileSeoUpdate,
  ),
);

export const irelandDoctorProfileSeoUpdates: readonly IrelandDoctorProfileSeoUpdate[] = [
  ...englishSeoUpdates,
  ...localizedSeoUpdates,
] as const;
