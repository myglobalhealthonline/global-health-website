/**
 * One-off seed: country medical-authority trust signals for Ireland + Portugal.
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-trust-authorities.ts
 *
 * Idempotent. Upserts:
 *   - CountryLegalProfile regulator + provider-registration + emergency fields
 *   - CountryAuthorityLink rows (regulators, registries, helplines, complaints)
 *   - DoctorCountry per-country registration numbers + chamber (matched by name)
 *   - DoctorCredential rows for confirmed extra credentials (FRCP, SPC, …)
 *
 * Source values come from the Trust Authority Requirements brief
 * (Ireland + Portugal, June 2026). Doctors are matched by a distinctive
 * surname token; if zero or multiple doctors match, the registration is
 * logged and SKIPPED — never fabricated against the wrong row.
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1 — these
 * are real published values, so a deliberate opt-in is required on prod.
 */
import "dotenv/config";
import { AuthorityCategory, type Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

type LegalProfileSeed = Partial<Prisma.CountryLegalProfileCreateInput>;

const LEGAL_PROFILES: Record<string, LegalProfileSeed> = {
  ie: {
    regulatorName: "Irish Medical Council",
    regulatorWebsite: "https://www.medicalcouncil.ie",
    medicalRegulatorUrl: "https://www.medicalcouncil.ie",
    healthcareAuthorityUrl: "https://www.hiqa.ie",
    dataProtectionAuthorityUrl: "https://www.dataprotection.ie",
    dataProtectionLawName: "GDPR",
    emergencyNumber: "112",
    emergencyNotice:
      "In a medical emergency call 112 immediately. Online consultations are not suitable for emergencies.",
  },
  pt: {
    regulatorName: "Ordem dos Médicos",
    regulatorWebsite: "https://www.ordemdosmedicos.pt",
    medicalRegulatorUrl: "https://www.ordemdosmedicos.pt",
    healthcareAuthorityUrl: "https://www.ers.pt",
    dataProtectionAuthorityUrl: "https://www.cnpd.pt",
    dataProtectionLawName: "RGPD",
    providerRegistrationLabel: "Registado na Entidade Reguladora da Saúde",
    providerRegistrationNumber: "E179287",
    providerRegistrationUrl: "https://www.ers.pt",
    emergencyNumber: "112",
    emergencyNotice: "Em caso de emergência médica ligue 112.",
    nonEmergencyHealthLine: "SNS 24: 1414",
  },
};

type AuthoritySeed = {
  name: string;
  abbreviation?: string;
  url: string;
  category: AuthorityCategory;
  description?: string;
  showInFooter?: boolean;
};

const AUTHORITY_LINKS: Record<string, AuthoritySeed[]> = {
  ie: [
    { name: "Irish Medical Council", abbreviation: "IMC", url: "https://www.medicalcouncil.ie", category: AuthorityCategory.MEDICAL_REGULATOR, description: "Statutory regulator for all doctors practising in Ireland.", showInFooter: true },
    { name: "Data Protection Commission", abbreviation: "DPC", url: "https://www.dataprotection.ie", category: AuthorityCategory.DATA_PROTECTION, description: "Ireland's GDPR supervisory authority.", showInFooter: true },
    { name: "Health Service Executive", abbreviation: "HSE", url: "https://www.hse.ie", category: AuthorityCategory.HEALTH_AUTHORITY, description: "Ireland's national public health authority.", showInFooter: true },
    { name: "Health Information and Quality Authority", abbreviation: "HIQA", url: "https://www.hiqa.ie", category: AuthorityCategory.HEALTH_AUTHORITY, description: "National Standards for Safer Better Healthcare.", showInFooter: true },
    { name: "Health Products Regulatory Authority", abbreviation: "HPRA", url: "https://www.hpra.ie", category: AuthorityCategory.MEDICINES, description: "Ireland's medicines and medical-devices regulator." },
    { name: "Royal College of Physicians of Ireland", abbreviation: "RCPI", url: "https://www.rcpi.ie", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "Irish College of General Practitioners", abbreviation: "ICGP", url: "https://www.icgp.ie", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "College of Psychiatrists of Ireland", url: "https://www.irishpsychiatry.ie", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "Neurological Alliance of Ireland", abbreviation: "NAI", url: "https://www.nai.ie", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "Irish Heart Foundation", url: "https://irishheart.ie", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "Citizens Information", url: "https://www.citizensinformation.ie", category: AuthorityCategory.CONSUMER_PROTECTION },
    { name: "Department of Social Protection", url: "https://www.gov.ie/en/organisation/department-of-social-protection/", category: AuthorityCategory.CONSUMER_PROTECTION },
    { name: "Samaritans Ireland", url: "https://www.samaritans.org/ireland", category: AuthorityCategory.MENTAL_HEALTH, description: "Freephone 116 123, any time." },
    { name: "Pieta", url: "https://www.pieta.ie", category: AuthorityCategory.MENTAL_HEALTH, description: "Freephone 1800 247 247 or text 116 123." },
  ],
  pt: [
    { name: "Entidade Reguladora da Saúde", abbreviation: "ERS", url: "https://www.ers.pt", category: AuthorityCategory.HEALTH_AUTHORITY, description: "Regulador independente dos prestadores de saúde em Portugal.", showInFooter: true },
    { name: "Ordem dos Médicos", abbreviation: "OM", url: "https://www.ordemdosmedicos.pt", category: AuthorityCategory.MEDICAL_REGULATOR, description: "Organismo regulador dos médicos em Portugal.", showInFooter: true },
    { name: "Comissão Nacional de Proteção de Dados", abbreviation: "CNPD", url: "https://www.cnpd.pt", category: AuthorityCategory.DATA_PROTECTION, description: "Autoridade de controlo do RGPD em Portugal.", showInFooter: true },
    { name: "Livro de Reclamações Electrónico", url: "https://www.livroreclamacoes.pt", category: AuthorityCategory.COMPLAINTS, description: "Obrigatório nos termos do Decreto-Lei n.º 74/2017.", showInFooter: true },
    { name: "INFARMED — Autoridade Nacional do Medicamento", abbreviation: "INFARMED", url: "https://www.infarmed.pt", category: AuthorityCategory.MEDICINES },
    { name: "SNS 24", url: "https://www.sns24.gov.pt", category: AuthorityCategory.HEALTH_AUTHORITY, description: "Aconselhamento de saúde não urgente: 1414." },
    { name: "Direção-Geral da Saúde", abbreviation: "DGS", url: "https://www.dgs.pt", category: AuthorityCategory.HEALTH_AUTHORITY },
    { name: "Instituto Nacional de Saúde Doutor Ricardo Jorge", abbreviation: "INSA", url: "https://www.insa.min-saude.pt", category: AuthorityCategory.HEALTH_AUTHORITY },
    { name: "Sociedade Portuguesa de Cardiologia", abbreviation: "SPC", url: "https://www.spc.pt", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "Instituto de Higiene e Medicina Tropical", abbreviation: "IHMT", url: "https://www.ihmt.unl.pt", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "Associação Portuguesa de Medicina Geral e Familiar", abbreviation: "APMGF", url: "https://www.apmgf.pt", category: AuthorityCategory.PROFESSIONAL_BODY },
    { name: "DECO — Defesa do Consumidor", abbreviation: "DECO", url: "https://www.deco.pt", category: AuthorityCategory.CONSUMER_PROTECTION },
    { name: "Portal do Utente", url: "https://www.utente.min-saude.pt", category: AuthorityCategory.CONSUMER_PROTECTION },
    { name: "SOS Voz Amiga", url: "https://www.sosvozamiga.org", category: AuthorityCategory.MENTAL_HEALTH, description: "Apoio emocional: 213 544 545." },
    { name: "Fundação Portuguesa de Cardiologia", url: "https://www.fpcardiologia.pt", category: AuthorityCategory.PROFESSIONAL_BODY },
  ],
};

type RegistrationSeed = {
  surname: string;
  countryCode: string;
  chamberEntity: string;
  registrationNumber: string;
};

const DOCTOR_REGISTRATIONS: RegistrationSeed[] = [
  // Ireland — Irish Medical Council
  { surname: "Figueira", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "523449" },
  { surname: "Ahern", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "408777" },
  { surname: "Irfan", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "419347" },
  { surname: "Faiz", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "429554" },
  { surname: "Mirza", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "429743" },
  { surname: "Yousif", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "424103" },
  { surname: "Yoosuf", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "502797" },
  { surname: "Farooq", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "421252" },
  { surname: "Maklad", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "523450" },
  { surname: "Dabup", countryCode: "ie", chamberEntity: "IMC", registrationNumber: "409877" },
  // Portugal — Ordem dos Médicos (Cédula)
  { surname: "Figueira", countryCode: "pt", chamberEntity: "OM", registrationNumber: "77986" },
  { surname: "Neto", countryCode: "pt", chamberEntity: "OM", registrationNumber: "60410" },
  { surname: "Oliveira", countryCode: "pt", chamberEntity: "OM", registrationNumber: "68445" },
  { surname: "Delgado", countryCode: "pt", chamberEntity: "OM", registrationNumber: "70349" },
];

type CredentialSeed = {
  surname: string;
  countryCode: string;
  label: string;
  bodyName: string;
  bodyUrl: string;
};

const DOCTOR_CREDENTIALS: CredentialSeed[] = [
  { surname: "Omar", countryCode: "ie", label: "FRCP", bodyName: "Royal College of Physicians of Ireland", bodyUrl: "https://www.rcpi.ie" },
  { surname: "Dabup", countryCode: "ie", label: "Member, College of Psychiatrists of Ireland", bodyName: "College of Psychiatrists of Ireland", bodyUrl: "https://www.irishpsychiatry.ie" },
  { surname: "Neto", countryCode: "pt", label: "Sociedade Portuguesa de Cardiologia", bodyName: "Sociedade Portuguesa de Cardiologia", bodyUrl: "https://www.spc.pt" },
];

async function seedLegalProfiles(): Promise<void> {
  for (const [code, data] of Object.entries(LEGAL_PROFILES)) {
    const country = await prisma.country.findFirst({ where: { code: { equals: code, mode: "insensitive" } }, select: { id: true } });
    if (!country) {
      console.warn(`[legal] skip ${code}: country not found`);
      continue;
    }
    await prisma.countryLegalProfile.upsert({
      where: { countryId: country.id },
      create: { countryId: country.id, ...data },
      update: data,
    });
    console.log(`[legal] upserted ${code} legal profile`);
  }
}

async function seedAuthorityLinks(): Promise<void> {
  for (const [code, links] of Object.entries(AUTHORITY_LINKS)) {
    const country = await prisma.country.findFirst({ where: { code: { equals: code, mode: "insensitive" } }, select: { id: true } });
    if (!country) {
      console.warn(`[authority] skip ${code}: country not found`);
      continue;
    }
    let i = 0;
    for (const link of links) {
      const data = {
        name: link.name,
        abbreviation: link.abbreviation ?? null,
        url: link.url,
        category: link.category,
        description: link.description ?? null,
        showInFooter: link.showInFooter ?? false,
        sortOrder: i,
        isActive: true,
      };
      const existing = await prisma.countryAuthorityLink.findFirst({
        where: { countryId: country.id, name: link.name },
        select: { id: true },
      });
      if (existing) {
        await prisma.countryAuthorityLink.update({ where: { id: existing.id }, data });
      } else {
        await prisma.countryAuthorityLink.create({ data: { countryId: country.id, ...data } });
      }
      i += 1;
    }
    console.log(`[authority] upserted ${links.length} links for ${code}`);
  }
}

/** Find exactly one active doctor whose fullName contains the surname token. */
async function findDoctorBySurname(surname: string): Promise<{ id: string } | null> {
  const matches = await prisma.doctor.findMany({
    where: { fullName: { contains: surname, mode: "insensitive" } },
    select: { id: true, fullName: true },
  });
  if (matches.length === 0) {
    console.warn(`[doctor] skip "${surname}": no matching doctor`);
    return null;
  }
  if (matches.length > 1) {
    console.warn(`[doctor] skip "${surname}": ${matches.length} doctors match (${matches.map((m) => m.fullName).join(", ")})`);
    return null;
  }
  return { id: matches[0].id };
}

async function seedRegistrations(): Promise<void> {
  for (const reg of DOCTOR_REGISTRATIONS) {
    const country = await prisma.country.findFirst({ where: { code: { equals: reg.countryCode, mode: "insensitive" } }, select: { id: true } });
    if (!country) {
      console.warn(`[reg] skip ${reg.surname}/${reg.countryCode}: country not found`);
      continue;
    }
    const doctor = await findDoctorBySurname(reg.surname);
    if (!doctor) continue;
    await prisma.doctorCountry.upsert({
      where: { doctorId_countryId: { doctorId: doctor.id, countryId: country.id } },
      create: {
        doctorId: doctor.id,
        countryId: country.id,
        chamberEntity: reg.chamberEntity,
        registrationNumber: reg.registrationNumber,
        active: true,
      },
      update: {
        chamberEntity: reg.chamberEntity,
        registrationNumber: reg.registrationNumber,
        active: true,
      },
    });
    console.log(`[reg] ${reg.surname} → ${reg.chamberEntity} ${reg.registrationNumber} (${reg.countryCode})`);
  }
}

async function seedCredentials(): Promise<void> {
  for (const cred of DOCTOR_CREDENTIALS) {
    const doctor = await findDoctorBySurname(cred.surname);
    if (!doctor) continue;
    const existing = await prisma.doctorCredential.findFirst({
      where: { doctorId: doctor.id, label: cred.label, countryCode: cred.countryCode.toUpperCase() },
      select: { id: true },
    });
    const data = {
      label: cred.label,
      bodyName: cred.bodyName,
      bodyUrl: cred.bodyUrl,
      countryCode: cred.countryCode.toUpperCase(),
      isActive: true,
    };
    if (existing) {
      await prisma.doctorCredential.update({ where: { id: existing.id }, data });
    } else {
      await prisma.doctorCredential.create({ data: { doctorId: doctor.id, ...data } });
    }
    console.log(`[cred] ${cred.surname} → ${cred.label}`);
  }
}

async function main(): Promise<void> {
  await seedLegalProfiles();
  await seedAuthorityLinks();
  await seedRegistrations();
  await seedCredentials();
  console.log("Trust authorities seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
