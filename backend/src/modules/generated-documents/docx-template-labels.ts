/**
 * Localized field labels + copy per label prefix (IR, PT, ES, CZ, RO, BR).
 *
 * A prefix is not always a Word-template prefix: BR has no .docx of its own and
 * renders through the HTML pipeline, but its documents still have to be written
 * in Portuguese. `labelPrefixForCountry` resolves the two independently.
 */
export type TemplateLabels = {
  patientName: string;
  birthDate: string;
  address: string;
  consultationDate: string;
  doctorName: string;
  /** Honorific printed before the doctor's name on generated documents. */
  doctorHonorific: string;
  registration: string;
  /** Value printed after the registration label when none is on file. */
  registrationNotOnFile: string;
  /** Parenthesised suffix when the registration number is not yet verified.
   *  Localized because it prints inside the document body — a hardcoded
   *  "(unverified)" was leaking English onto every non-English document. */
  registrationUnverified: string;
  signatureLine: string;
  examsTitle: string;
  absenceTitle: string;
  prescriptionTitle: string;
  additionalNotes: string;
  pharmacy: string;
  from: string;
  to: string;
  reason: string;
  // ── HTML (Variant K) template labels ──
  patient: string;
  consultation: string;
  prescriber: string;
  attendingDoctor: string;
  clinicalDocument: string;
  issued: string;
  signed: string;
  stamp: string;
  id: string;
  date: string;
  certificateDetails: string;
  documentSection: string;
  certificateId: string;
  documentId: string;
  verifyHint: string;
  uploadTitle: string;
  uploadHint: string;
  confidentialNote: string;
  docTitleAbsence: string;
  docTitleExams: string;
  docTitlePrescription: string;
  absenceCertifiesPre: string;
  absenceCertifiesPost: string;
};

export const TEMPLATE_LABELS: Record<string, TemplateLabels> = {
  IR: {
    patientName: "Patient name",
    birthDate: "Date of birth",
    address: "Address",
    consultationDate: "Consultation date",
    doctorName: "Doctor",
    doctorHonorific: "Dr",
    registration: "Medical registration",
    registrationNotOnFile: "not on file",
    registrationUnverified: "unverified",
    signatureLine: "Prescriber signature",
    examsTitle: "Examinations requested",
    absenceTitle: "Medical absence period",
    prescriptionTitle: "Prescription",
    additionalNotes: "Additional notes",
    pharmacy: "Pharmacy",
    from: "From",
    to: "To",
    reason: "Reason",
    patient: "Patient",
    consultation: "Consultation",
    prescriber: "Prescriber",
    attendingDoctor: "Attending doctor",
    clinicalDocument: "Clinical document",
    issued: "Issued",
    signed: "Signed",
    stamp: "Stamp",
    id: "ID",
    date: "Date",
    certificateDetails: "Certificate details",
    documentSection: "Document",
    certificateId: "Certificate ID",
    documentId: "Document ID",
    verifyHint: "Scan to verify authenticity at myglobalhealth.online",
    uploadTitle: "Upload your results",
    uploadHint: "Scan to securely upload examination results to Global Health",
    confidentialNote:
      "This document contains confidential medical information intended for the named patient only.",
    docTitleAbsence: "Medical Absence Certificate",
    docTitleExams: "Examinations Prescription",
    docTitlePrescription: "Medical Prescription",
    absenceCertifiesPre: "This certifies that",
    absenceCertifiesPost: "is unfit for work or study for the period below.",
  },
  PT: {
    patientName: "Nome do paciente",
    birthDate: "Data de nascimento",
    address: "Morada",
    consultationDate: "Data da consulta",
    doctorName: "Médico",
    doctorHonorific: "Dr.",
    registration: "Número de registo médico",
    registrationNotOnFile: "não consta",
    registrationUnverified: "não verificado",
    signatureLine: "Assinatura do médico",
    examsTitle: "Exames solicitados",
    absenceTitle: "Período de incapacidade",
    prescriptionTitle: "Prescrição",
    additionalNotes: "Observações",
    pharmacy: "Farmácia",
    from: "De",
    to: "Até",
    reason: "Motivo",
    patient: "Paciente",
    consultation: "Consulta",
    prescriber: "Médico prescritor",
    attendingDoctor: "Médico assistente",
    clinicalDocument: "Documento clínico",
    issued: "Emitido",
    signed: "Assinado",
    stamp: "Carimbo",
    id: "ID",
    date: "Data",
    certificateDetails: "Detalhes do certificado",
    documentSection: "Documento",
    certificateId: "ID do certificado",
    documentId: "ID do documento",
    verifyHint: "Digitalize para verificar a autenticidade em myglobalhealth.online",
    uploadTitle: "Envie os seus resultados",
    uploadHint: "Digitalize para enviar com segurança os resultados dos exames à Global Health",
    confidentialNote:
      "Este documento contém informação médica confidencial destinada exclusivamente ao paciente indicado.",
    docTitleAbsence: "Certificado de Incapacidade Médica",
    docTitleExams: "Prescrição de Exames",
    docTitlePrescription: "Receita Médica",
    absenceCertifiesPre: "Certifica-se que",
    absenceCertifiesPost: "se encontra incapacitado(a) para o trabalho ou estudo durante o período abaixo indicado.",
  },
  ES: {
    patientName: "Nombre del paciente",
    birthDate: "Fecha de nacimiento",
    address: "Dirección",
    consultationDate: "Fecha de consulta",
    doctorName: "Doctor",
    doctorHonorific: "Dr.",
    registration: "Número de registro médico",
    registrationNotOnFile: "no consta",
    registrationUnverified: "no verificado",
    signatureLine: "Firma del prescriptor",
    examsTitle: "Pruebas solicitadas",
    absenceTitle: "Período de baja médica",
    prescriptionTitle: "Prescripción",
    additionalNotes: "Notas adicionales",
    pharmacy: "Farmacia",
    from: "Desde",
    to: "Hasta",
    reason: "Motivo",
    patient: "Paciente",
    consultation: "Consulta",
    prescriber: "Médico prescriptor",
    attendingDoctor: "Médico responsable",
    clinicalDocument: "Documento clínico",
    issued: "Emitido",
    signed: "Firmado",
    stamp: "Sello",
    id: "ID",
    date: "Fecha",
    certificateDetails: "Detalles del certificado",
    documentSection: "Documento",
    certificateId: "ID del certificado",
    documentId: "ID del documento",
    verifyHint: "Escanee para verificar la autenticidad en myglobalhealth.online",
    uploadTitle: "Suba sus resultados",
    uploadHint: "Escanee para subir de forma segura los resultados de sus pruebas a Global Health",
    confidentialNote:
      "Este documento contiene información médica confidencial destinada únicamente al paciente indicado.",
    docTitleAbsence: "Certificado de Baja Médica",
    docTitleExams: "Prescripción de Pruebas",
    docTitlePrescription: "Receta Médica",
    absenceCertifiesPre: "Se certifica que",
    absenceCertifiesPost: "no está en condiciones de trabajar o estudiar durante el período indicado a continuación.",
  },
  CZ: {
    patientName: "Jméno pacienta",
    birthDate: "Datum narození",
    address: "Adresa",
    consultationDate: "Datum konzultace",
    doctorName: "Lékař",
    // Czech physicians carry the MUDr. academic title, not a bare "Dr.".
    doctorHonorific: "MUDr.",
    registration: "Registrační číslo",
    registrationNotOnFile: "neuvedeno",
    registrationUnverified: "neověřeno",
    signatureLine: "Podpis lékaře",
    examsTitle: "Požadovaná vyšetření",
    absenceTitle: "Pracovní neschopnost",
    prescriptionTitle: "Předpis",
    additionalNotes: "Poznámka",
    pharmacy: "Lékárna",
    from: "Od",
    to: "Do",
    reason: "Důvod",
    patient: "Pacient",
    consultation: "Konzultace",
    prescriber: "Předepisující lékař",
    attendingDoctor: "Ošetřující lékař",
    clinicalDocument: "Klinický dokument",
    issued: "Vystaveno",
    signed: "Podepsáno",
    stamp: "Razítko",
    id: "ID",
    date: "Datum",
    certificateDetails: "Údaje o potvrzení",
    documentSection: "Dokument",
    certificateId: "ID potvrzení",
    documentId: "ID dokumentu",
    verifyHint: "Naskenujte pro ověření pravosti na myglobalhealth.online",
    uploadTitle: "Nahrajte své výsledky",
    uploadHint: "Naskenujte pro bezpečné nahrání výsledků vyšetření do Global Health",
    confidentialNote:
      "Tento dokument obsahuje důvěrné zdravotní informace určené výhradně uvedenému pacientovi.",
    docTitleAbsence: "Potvrzení o pracovní neschopnosti",
    docTitleExams: "Žádanka na vyšetření",
    docTitlePrescription: "Lékařský předpis",
    absenceCertifiesPre: "Potvrzuje se, že",
    absenceCertifiesPost: "není schopen/schopna práce ani studia po níže uvedené období.",
  },
  RO: {
    patientName: "Numele pacientului",
    birthDate: "Data nașterii",
    address: "Adresă",
    consultationDate: "Data consultației",
    doctorName: "Medic",
    doctorHonorific: "Dr.",
    registration: "Număr de înregistrare medicală",
    registrationNotOnFile: "nespecificat",
    registrationUnverified: "neverificat",
    signatureLine: "Semnătura medicului",
    examsTitle: "Investigații solicitate",
    absenceTitle: "Concediu medical",
    prescriptionTitle: "Rețetă medicală",
    additionalNotes: "Observații",
    pharmacy: "Farmacie",
    from: "De la",
    to: "Până la",
    reason: "Motiv",
    patient: "Pacient",
    consultation: "Consultație",
    prescriber: "Medic prescriptor",
    attendingDoctor: "Medic curant",
    clinicalDocument: "Document clinic",
    issued: "Emis",
    signed: "Semnat",
    stamp: "Ștampilă",
    id: "ID",
    date: "Data",
    certificateDetails: "Detaliile certificatului",
    documentSection: "Document",
    certificateId: "ID certificat",
    documentId: "ID document",
    verifyHint: "Scanați pentru a verifica autenticitatea la myglobalhealth.online",
    uploadTitle: "Încărcați rezultatele",
    uploadHint: "Scanați pentru a încărca în siguranță rezultatele investigațiilor la Global Health",
    confidentialNote:
      "Acest document conține informații medicale confidențiale destinate exclusiv pacientului menționat.",
    docTitleAbsence: "Certificat de Concediu Medical",
    docTitleExams: "Bilet de Trimitere pentru Investigații",
    docTitlePrescription: "Rețetă Medicală",
    absenceCertifiesPre: "Se certifică faptul că",
    absenceCertifiesPost: "este inapt(ă) de muncă sau studiu pentru perioada de mai jos.",
  },
  // Brazilian Portuguese. Not an alias of PT: the clinical vocabulary genuinely
  // differs — a sick note is an "atestado médico" in BR and a "certificado de
  // incapacidade" in PT, an address is "endereço" not "morada", and the
  // registration is the CRM. BR has no Word template, so these labels drive the
  // HTML documents (see labelPrefixForCountry).
  BR: {
    patientName: "Nome do paciente",
    birthDate: "Data de nascimento",
    address: "Endereço",
    consultationDate: "Data da consulta",
    doctorName: "Médico",
    doctorHonorific: "Dr.",
    registration: "Registro médico (CRM)",
    registrationNotOnFile: "não informado",
    registrationUnverified: "não verificado",
    signatureLine: "Assinatura do médico",
    examsTitle: "Exames solicitados",
    absenceTitle: "Período de afastamento",
    prescriptionTitle: "Prescrição",
    additionalNotes: "Observações",
    pharmacy: "Farmácia",
    from: "De",
    to: "Até",
    reason: "Motivo",
    patient: "Paciente",
    consultation: "Consulta",
    prescriber: "Médico prescritor",
    attendingDoctor: "Médico assistente",
    clinicalDocument: "Documento clínico",
    issued: "Emitido em",
    signed: "Assinado",
    stamp: "Carimbo",
    id: "ID",
    date: "Data",
    certificateDetails: "Dados do atestado",
    documentSection: "Documento",
    certificateId: "ID do atestado",
    documentId: "ID do documento",
    verifyHint: "Escaneie para verificar a autenticidade em myglobalhealth.online",
    uploadTitle: "Envie seus resultados",
    uploadHint: "Escaneie para enviar com segurança os resultados dos exames à Global Health",
    confidentialNote:
      "Este documento contém informações médicas confidenciais destinadas exclusivamente ao paciente identificado.",
    docTitleAbsence: "Atestado Médico",
    docTitleExams: "Solicitação de Exames",
    docTitlePrescription: "Receita Médica",
    absenceCertifiesPre: "Atesto que",
    absenceCertifiesPost:
      "esteve impossibilitado(a) de exercer suas atividades laborais ou escolares durante o período abaixo.",
  },
};

export function labelsForPrefix(prefix: string): TemplateLabels {
  return TEMPLATE_LABELS[prefix] ?? TEMPLATE_LABELS.IR;
}
