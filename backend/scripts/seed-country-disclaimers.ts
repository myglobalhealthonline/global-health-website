/**
 * One-off seed: per-country medical disclaimers (short + full) onto
 * CountryLegalProfile.
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-country-disclaimers.ts
 *
 * Idempotent. Upserts the DEFAULT-locale base columns
 * CountryLegalProfile.shortDisclaimer / fullDisclaimer for each country code in
 * DISCLAIMERS. Per-locale overrides live in CountryDisclaimerTranslation and are
 * added by admins via the legal-profile language tabs — not seeded here.
 * Countries not yet in the DB are logged and skipped — never created here.
 *
 * Paragraphs are separated by a BLANK LINE (\n\n) so render sites can split the
 * stored text into a string[] for the <MedicalDisclaimer> component.
 *
 * Source copy: Ireland verbatim from the clinical brief (June 2026); the other
 * markets drafted from per-country regulatory research and STILL REQUIRE legal /
 * clinical sign-off before public launch. Native-language translations are a
 * follow-up — this seed stores the English baseline (matching Ireland).
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

type Disclaimer = { shortDisclaimer: string; fullDisclaimer: string };

const DISCLAIMERS: Record<string, Disclaimer> = {
  // ── Ireland ── (verbatim from the clinical brief; references Portugal) ──────
  ie: {
    fullDisclaimer: [
      "All GP services in Ireland are provided at GP level in accordance with Irish telehealth and medical practice standards. Services in Portugal are provided at Clínica Geral level in accordance with applicable local healthcare regulations.",
      "Our online doctors conduct medical assessments remotely and may provide treatment recommendations, prescriptions, referrals, or medical certificates only when clinically appropriate and at the doctor’s professional discretion.",
      "Please note that our doctors do not routinely prescribe controlled substances through online consultations.",
      "Employers may require a medical certificate from your GP during sick leave. Depending on the nature of your condition and the outcome of the consultation, the doctor may or may not issue a medical certificate, including electronic sick leave documentation.",
      "Electronic sick leave certificates issued through our platform are not accepted by the Department of Social Protection in Ireland. Patients requiring documentation for this purpose should attend an in-person GP consultation. Additional information can be obtained through the relevant Irish government services.",
      "To maintain safe and appropriate clinical standards, our doctors do not routinely issue backdated sick notes due to the absence of direct clinical assessment at the time of illness.",
      "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, contact emergency services or attend your nearest emergency department immediately.",
    ].join("\n\n"),
    shortDisclaimer: [
      "All services in Ireland are provided at GP level, and in Portugal at Clínica Geral level, in accordance with local healthcare regulations.",
      "Prescriptions, referrals, and medical certificates may be issued only when clinically appropriate and at the doctor’s discretion. Our doctors do not routinely prescribe controlled substances through online consultations.",
      "Electronic sick leave certificates are not accepted by the Department of Social Protection in Ireland. Backdated sick notes are not routinely issued due to the lack of direct clinical assessment at the time of illness.",
    ].join("\n\n"),
  },

  // ── Portugal ── (Clínica Geral / MGF · Ordem dos Médicos / ERS · CIT via
  //    Segurança Social · SNS 24 808 24 24 24) ─────────────────────────────────
  pt: {
    fullDisclaimer: [
      "All services in Portugal are provided at Clínica Geral (Medicina Geral e Familiar) level, in accordance with the standards of the Ordem dos Médicos and applicable Portuguese healthcare regulations.",
      "Our online doctors conduct medical assessments remotely and may provide treatment recommendations, prescriptions, referrals, or medical certificates only when clinically appropriate and at the doctor’s professional discretion.",
      "Please note that our doctors do not routinely prescribe controlled substances (estupefacientes e substâncias psicotrópicas) through online consultations.",
      "Employers may require a medical certificate during sick leave. Depending on the nature of your condition and the outcome of the consultation, the doctor may or may not issue a certificate.",
      "Sickness benefit in Portugal is paid by Segurança Social on the basis of a formal Certificado de Incapacidade Temporária (CIT, “baixa médica”) issued through the official electronic system, and only when clinically justified. A general private medical certificate is not a CIT and does not, on its own, entitle you to sickness benefit. Patients requiring documentation for this purpose who cannot be assessed remotely should consult their médico de família or attend an in-person consultation.",
      "To maintain safe and appropriate clinical standards, our doctors do not routinely issue backdated certificates due to the absence of direct clinical assessment at the time of illness.",
      "Online consultations are not suitable for medical emergencies. For non-urgent health advice you can contact SNS 24 on 808 24 24 24. If you are experiencing a medical emergency, call 112 or attend your nearest emergency department immediately.",
    ].join("\n\n"),
    shortDisclaimer: [
      "All services in Portugal are provided at Clínica Geral (Medicina Geral e Familiar) level, in accordance with Ordem dos Médicos standards and Portuguese healthcare regulations.",
      "Prescriptions, referrals, and medical certificates may be issued only when clinically appropriate and at the doctor’s discretion. Our doctors do not routinely prescribe controlled substances through online consultations.",
      "Sickness benefit is paid by Segurança Social only on a formal Certificado de Incapacidade Temporária (CIT) issued through the official electronic system when clinically justified; a general private certificate does not entitle you to sickness benefit. Backdated certificates are not routinely issued.",
    ].join("\n\n"),
  },

  // ── Spain ── (Medicina de Familia · OMC colegiación · official parte de baja
  //    only via public system / Mutua) ──────────────────────────────────────────
  es: {
    fullDisclaimer: [
      "All services in Spain are provided at Medicina de Familia (family doctor) level by physicians registered with their Colegio Oficial de Médicos (colegiación), in accordance with the Código de Deontología Médica and applicable Spanish healthcare regulations.",
      "Our online doctors conduct medical assessments remotely and may provide treatment recommendations, prescriptions, referrals, or medical reports only when clinically appropriate and at the doctor’s professional discretion.",
      "Please note that our doctors do not routinely prescribe controlled substances (estupefacientes y psicótropos) through online consultations.",
      "Employers may require evidence of illness during sick leave. Depending on the nature of your condition and the outcome of the consultation, the doctor may issue a private medical report (informe médico).",
      "Official sick leave in Spain — the parte de baja médica (Incapacidad Temporal) recognised by the INSS and Seguridad Social — can only be issued by a doctor of the public health service (Servicio Público de Salud) or, for work-related cases, the corresponding Mutua. A private medical report issued through our platform is not a valid parte de baja and does not trigger Seguridad Social benefits. Patients requiring official sick leave should attend their public-system médico de familia.",
      "To maintain safe and appropriate clinical standards, our doctors do not routinely issue backdated certificates due to the absence of direct clinical assessment at the time of illness.",
      "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 112 or attend your nearest emergency department immediately.",
    ].join("\n\n"),
    shortDisclaimer: [
      "All services in Spain are provided at Medicina de Familia level by colegiado physicians, in accordance with Spanish healthcare regulations.",
      "Prescriptions, referrals, and medical reports may be issued only when clinically appropriate and at the doctor’s discretion. Our doctors do not routinely prescribe controlled substances through online consultations.",
      "An official parte de baja médica (Incapacidad Temporal) can only be issued by the public health service or the relevant Mutua; a private report from our platform is not valid for Seguridad Social sick pay. Backdated certificates are not routinely issued.",
    ].join("\n\n"),
  },

  // ── Czechia ── (praktický lékař · Česká lékařská komora · eNeschopenka via
  //    ČSSZ — attending physician only · emergency 155/112, info line 1221) ──────
  cz: {
    fullDisclaimer: [
      "All services in the Czech Republic are provided at praktický lékař (general practitioner) level by physicians registered with the Česká lékařská komora (Czech Medical Chamber), in accordance with applicable Czech healthcare regulations.",
      "Our online doctors conduct medical assessments remotely and may provide treatment recommendations, prescriptions, referrals, or medical certificates only when clinically appropriate and at the doctor’s professional discretion.",
      "Please note that our doctors do not routinely prescribe controlled substances (omamné a psychotropní látky) through online consultations; by law these require a paper “blue-stripe” prescription and cannot be issued electronically.",
      "Employers may require confirmation of incapacity for work during sick leave. Depending on the nature of your condition and the outcome of the consultation, the doctor may or may not issue a certificate.",
      "An electronic sick note (eNeschopenka) recognised by the Czech Social Security Administration (ČSSZ) may only be issued by the attending physician who has personally examined and is treating the patient. A certificate cannot be issued on request alone without a genuine clinical assessment. Patients requiring documentation for sickness benefit who cannot be assessed remotely should attend an in-person consultation.",
      "To maintain safe and appropriate clinical standards, our doctors do not routinely issue backdated sick notes due to the absence of direct clinical assessment at the time of illness.",
      "Online consultations are not suitable for medical emergencies. For non-urgent health advice you can contact the Ministry of Health information line on 1221. If you are experiencing a medical emergency, call 155 or 112, or attend your nearest emergency department immediately.",
    ].join("\n\n"),
    shortDisclaimer: [
      "All services in the Czech Republic are provided at praktický lékař (GP) level by physicians registered with the Česká lékařská komora, in accordance with Czech healthcare regulations.",
      "Prescriptions, referrals, and medical certificates may be issued only when clinically appropriate and at the doctor’s discretion. Our doctors do not routinely prescribe controlled substances through online consultations.",
      "An eNeschopenka (electronic sick note) recognised by the ČSSZ may only be issued by the attending physician who has examined and is treating you, not on request alone. Backdated sick notes are not routinely issued.",
    ].join("\n\n"),
  },

  // ── Romania ── (medic de familie · Colegiul Medicilor din România · concediu
  //    medical via CNAS — objective evaluation + CAS-contracted doctor) ──────────
  ro: {
    fullDisclaimer: [
      "All services in Romania are provided at medic de familie (family doctor) level by physicians registered with the Colegiul Medicilor din România (Romanian College of Physicians), in accordance with Law no. 95/2006 and applicable Romanian telemedicine regulations.",
      "Our online doctors conduct medical assessments remotely and may provide treatment recommendations, prescriptions, referrals, or medical certificates only when clinically appropriate and at the doctor’s professional discretion.",
      "Please note that our doctors do not routinely prescribe controlled substances (substanțe stupefiante și psihotrope) through online consultations.",
      "Employers may require a medical leave certificate during sick leave. Depending on the nature of your condition and the outcome of the consultation, the doctor may or may not issue a certificate.",
      "A medical leave certificate (concediu medical) recognised for sickness indemnity is administered through the Casa Națională de Asigurări de Sănătate (CNAS) and may only be granted on the basis of an objective clinical evaluation by a treating physician under contract with the health insurance house — not on patient request alone. Patients requiring official medical leave who cannot be assessed remotely should attend an in-person consultation.",
      "To maintain safe and appropriate clinical standards, our doctors do not routinely issue backdated certificates due to the absence of direct clinical assessment at the time of illness.",
      "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 112 or attend your nearest emergency department immediately.",
    ].join("\n\n"),
    shortDisclaimer: [
      "All services in Romania are provided at medic de familie level by physicians registered with the Colegiul Medicilor din România, in accordance with Romanian healthcare regulations.",
      "Prescriptions, referrals, and medical certificates may be issued only when clinically appropriate and at the doctor’s discretion. Our doctors do not routinely prescribe controlled substances through online consultations.",
      "A concediu medical recognised for CNAS sickness indemnity requires an objective clinical evaluation by a contracted treating physician and is not issued on request alone. Backdated certificates are not routinely issued.",
    ].join("\n\n"),
  },

  // ── Brazil ── (Clínico Geral · CFM/CRM · Lei 14.510/2022 + Res. CFM 2.314/2022
  //    · atestado vs INSS benefit · LGPD · emergency SAMU 192) ───────────────────
  br: {
    fullDisclaimer: [
      "All services in Brazil are provided by physicians registered with their Conselho Regional de Medicina (CRM), under the Conselho Federal de Medicina (CFM), in accordance with Lei nº 14.510/2022 and Resolução CFM nº 2.314/2022 on telemedicine.",
      "Our online doctors conduct medical assessments remotely and may provide treatment recommendations, prescriptions, referrals, or medical certificates (atestados) only when clinically appropriate and at the doctor’s professional discretion. Documents are issued with the physician’s CRM and a digital signature.",
      "Please note that our doctors do not routinely prescribe controlled substances (substâncias sujeitas a controle especial, Portaria 344/1998) through online consultations, and not on a first teleconsultation.",
      "A medical certificate (atestado médico) issued through our platform may be used to justify an absence with your employer when clinically appropriate.",
      "Sickness benefit from the INSS (benefício por incapacidade temporária / auxílio-doença) is separate and is not granted by a doctor’s certificate alone. For incapacity beyond 15 days, the INSS conducts its own assessment (documentary review via AtestMed or a perícia médica) through Meu INSS. An online atestado may initiate, but does not replace, that process.",
      "To maintain safe and appropriate clinical standards, our doctors do not issue backdated or false certificates; an atestado must reflect the date of an actual consultation.",
      "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call SAMU on 192 (or 193 for the fire and rescue service), or attend your nearest emergency department immediately.",
    ].join("\n\n"),
    shortDisclaimer: [
      "All services in Brazil are provided by CRM-registered physicians under the CFM, in accordance with Lei nº 14.510/2022 and Resolução CFM nº 2.314/2022 on telemedicine.",
      "Prescriptions, referrals, and medical certificates (atestados) may be issued only when clinically appropriate and at the doctor’s discretion. Our doctors do not routinely prescribe controlled substances through online consultations.",
      "An online atestado may justify an absence with your employer, but INSS sickness benefit requires its own assessment (AtestMed or perícia médica) and is not granted by the certificate alone. Backdated certificates are not issued.",
    ].join("\n\n"),
  },
};

async function main(): Promise<void> {
  let upserted = 0;
  for (const [code, data] of Object.entries(DISCLAIMERS)) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true },
    });
    if (!country) {
      console.warn(`[disclaimer] skip ${code}: country not found`);
      continue;
    }
    await prisma.countryLegalProfile.upsert({
      where: { countryId: country.id },
      create: { countryId: country.id, ...data },
      update: data,
    });
    console.log(`[disclaimer] upserted ${code} short + full disclaimer`);
    upserted += 1;
  }
  console.log(`[disclaimer] done — ${upserted} country/countries updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
