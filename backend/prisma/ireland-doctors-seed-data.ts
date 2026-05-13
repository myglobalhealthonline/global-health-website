/**
 * Ireland clinic roster — public Doctor rows (directory/CMS), not login accounts.
 * Run via `pnpm --filter backend db:seed` after main seed creates Ireland country.
 */

export type IrelandDoctorSeed = {
  slug: string;
  fullName: string;
  title: string;
  /** IMC / PSI / other register number when applicable */
  registration?: string;
  registerLabel?: "IMC" | "PSI" | "N" | "OTHER";
  languages: string;
};

/** Specialty slug → display name (Ireland only). */
export const IRELAND_ROSTER_SPECIALTIES: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: "clinical-leadership", name: "Clinical leadership" },
  { slug: "general-practice", name: "General practice" },
  { slug: "neurology", name: "Neurology" },
  { slug: "nutrition", name: "Nutrition" },
  { slug: "psychiatry", name: "Psychiatry" },
  { slug: "psychology", name: "Psychology" },
  { slug: "oncology", name: "Oncology" },
  { slug: "paediatrics", name: "Paediatrics" },
  { slug: "cardiology", name: "Cardiology" },
  { slug: "physiotherapy", name: "Physiotherapy" },
];

function bioFromSeed(row: IrelandDoctorSeed): string {
  const regParts: string[] = [];
  if (row.registration && row.registration !== "0") {
    const label = row.registerLabel ?? "IMC";
    regParts.push(`${label} ${row.registration}`.trim());
  } else if (row.registerLabel === "N") {
    regParts.push("Registration: N (as provided for non-physician role)");
  }
  const regLine = regParts.length ? `${regParts.join(". ")}.` : "";
  const langLine = `Languages: ${row.languages}.`;
  return [regLine, langLine].filter(Boolean).join(" ");
}

function specialtySlugForTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("clinical director")) return "clinical-leadership";
  if (t.includes("neurologist")) return "neurology";
  if (t.includes("nutritionist")) return "nutrition";
  if (t.includes("psychiatrist")) return "psychiatry";
  if (t.includes("psychologist")) return "psychology";
  if (t.includes("oncologist")) return "oncology";
  if (t.includes("paediatric")) return "paediatrics";
  if (t.includes("cardiologist")) return "cardiology";
  if (t.includes("physiotherapist")) return "physiotherapy";
  return "general-practice";
}

export const IRELAND_DOCTOR_ROSTER: IrelandDoctorSeed[] = [
  {
    slug: "dr-tiago-miguel-figueira",
    fullName: "Dr Tiago Miguel Figueira",
    title: "Clinical Director",
    registration: "523449",
    registerLabel: "IMC",
    languages: "English, Portuguese, Spanish, Czech, French",
  },
  {
    slug: "dr-grainne-ahern",
    fullName: "Dr Grainne Ahern",
    title: "General Practitioner",
    registration: "408777",
    languages: "English",
  },
  {
    slug: "dr-saadia-irfan",
    fullName: "Dr Saadia Irfan",
    title: "Medical Doctor",
    registration: "419347",
    languages: "English, Urdu, Punjabi",
  },
  {
    slug: "dr-mariam-faiz",
    fullName: "Dr Mariam Faiz",
    title: "Medical Doctor",
    registration: "429554",
    languages: "English, Urdu, Punjabi",
  },
  {
    slug: "dr-mirza-aun-mohammad",
    fullName: "Dr Mirza Aun Mohammad",
    title: "Medical Doctor",
    registration: "429743",
    languages: "English",
  },
  {
    slug: "dr-yousif-mohamed",
    fullName: "Dr Yousif Mohamed",
    title: "Medical Doctor",
    registration: "424103",
    languages: "English",
  },
  {
    slug: "dr-muhammad-usman-yoosuf",
    fullName: "Dr Muhammad Usman Yoosuf",
    title: "Medical Doctor",
    registration: "502797",
    languages: "English, Urdu, Punjabi",
  },
  {
    slug: "dr-fahad-farooq",
    fullName: "Dr Fahad Farooq",
    title: "Neurologist Registrar",
    registration: "421252",
    languages: "English, Arabic, Urdu, Punjabi",
  },
  {
    slug: "silvia-alexandra-raminhos-fernandes",
    fullName: "Silvia Alexandra Raminhos Fernandes",
    title: "Nutritionist",
    registration: "0",
    registerLabel: "N",
    languages: "English, Portuguese",
  },
  {
    slug: "dr-ahmed-maklad",
    fullName: "Dr Ahmed Maklad",
    title: "Medical Doctor",
    registration: "523450",
    languages: "English, Arabic, Czech",
  },
  {
    slug: "dr-emmanuel-dabup",
    fullName: "Dr Emmanuel Dabup",
    title: "Consultant Psychiatrist",
    registration: "409877",
    languages: "English",
  },
  {
    slug: "dr-muhammad-mataro",
    fullName: "Dr Muhammad Mataro",
    title: "General Practitioner",
    registration: "425239",
    languages: "English, Arabic, Urdu, Siraiki, Sindhi",
  },
  {
    slug: "dr-arooj-iqbal-lodhi",
    fullName: "Dr Arooj Iqbal Lodhi",
    title: "Medical Doctor",
    registration: "434132",
    languages: "English",
  },
  {
    slug: "dr-mala-vili-rajan",
    fullName: "Dr Mala Vili Rajan",
    title: "Medical Doctor",
    registration: "512862",
    languages: "English",
  },
  {
    slug: "dr-maristela-ferro-nepomuceno",
    fullName: "Dr Maristela Ferro Nepomuceno",
    title: "Psychologist",
    registration: "13655",
    registerLabel: "PSI",
    languages: "English, Portuguese",
  },
  {
    slug: "dr-andra-cristea",
    fullName: "Dr Andra Cristea",
    title: "Oncologist Registrar",
    registration: "508372",
    languages: "English, Romanian",
  },
  {
    slug: "dr-raafat-ibrahim",
    fullName: "Dr Raafat Ibrahim",
    title: "Paediatric Consultant",
    registration: "19801",
    languages: "English",
  },
  {
    slug: "dr-muhammad-tahir-arain",
    fullName: "Dr Muhammad Tahir Arain",
    title: "Medical Doctor",
    registration: "509406",
    languages: "English, Arabic, Urdu, Punjabi, Sindhi",
  },
  {
    slug: "dr-mohammed-omar",
    fullName: "Dr Mohammed Omar",
    title: "Consultant Cardiologist",
    registration: "412532",
    languages: "English, Arabic",
  },
  {
    slug: "dr-abdelrahman-mustafa",
    fullName: "Dr Abdelrahman Mustafa",
    title: "Medical Doctor",
    registration: "431361",
    languages: "English, Arabic",
  },
  {
    slug: "dr-khoiamul-islam",
    fullName: "Dr Khoiamul Islam",
    title: "Medical Doctor",
    registration: "542074",
    languages: "English, Czech, Urdu, Hindi, Bangla",
  },
  {
    slug: "dr-raza-khan",
    fullName: "Dr Raza Khan",
    title: "Medical Doctor",
    registration: "520164",
    languages: "English, Urdu, Arabic, Pashto, Punjabi",
  },
  {
    slug: "priscila-figueiredo",
    fullName: "Priscila Figueiredo",
    title: "Physiotherapist",
    registration: "0",
    registerLabel: "N",
    languages: "English, Portuguese",
  },
  {
    slug: "dr-fatima-ali",
    fullName: "Dr Fatima Ali",
    title: "Oncologist Registrar",
    registration: "505231",
    languages: "English",
  },
  {
    slug: "dr-mohamed-fadzly-mustafar",
    fullName: "Dr Mohamed Fadzly Mustafar",
    title: "Medical Doctor",
    registration: "505886",
    languages: "English",
  },
];

export function buildIrelandDoctorBio(row: IrelandDoctorSeed): string {
  return bioFromSeed(row);
}

export function specialtySlugForIrelandDoctor(row: IrelandDoctorSeed): string {
  return specialtySlugForTitle(row.title);
}
