/** Localized field labels + copy per template prefix (IR, PT, ES, CZ, RO). */
export type TemplateLabels = {
  patientName: string;
  birthDate: string;
  address: string;
  consultationDate: string;
  doctorName: string;
  registration: string;
  signatureLine: string;
  examsTitle: string;
  absenceTitle: string;
  prescriptionTitle: string;
  additionalNotes: string;
  pharmacy: string;
  from: string;
  to: string;
  reason: string;
};

export const TEMPLATE_LABELS: Record<string, TemplateLabels> = {
  IR: {
    patientName: "Patient name",
    birthDate: "Date of birth",
    address: "Address",
    consultationDate: "Consultation date",
    doctorName: "Doctor",
    registration: "Medical registration",
    signatureLine: "Prescriber signature",
    examsTitle: "Examinations requested",
    absenceTitle: "Medical absence period",
    prescriptionTitle: "Prescription",
    additionalNotes: "Additional notes",
    pharmacy: "Pharmacy",
    from: "From",
    to: "To",
    reason: "Reason",
  },
  PT: {
    patientName: "Nome do paciente",
    birthDate: "Data de nascimento",
    address: "Morada",
    consultationDate: "Data da consulta",
    doctorName: "Médico",
    registration: "Número de registo médico",
    signatureLine: "Assinatura do médico",
    examsTitle: "Exames solicitados",
    absenceTitle: "Período de incapacidade",
    prescriptionTitle: "Prescrição",
    additionalNotes: "Observações",
    pharmacy: "Farmácia",
    from: "De",
    to: "Até",
    reason: "Motivo",
  },
  ES: {
    patientName: "Nombre del paciente",
    birthDate: "Fecha de nacimiento",
    address: "Dirección",
    consultationDate: "Fecha de consulta",
    doctorName: "Doctor",
    registration: "Número de registro médico",
    signatureLine: "Firma del prescriptor",
    examsTitle: "Pruebas solicitadas",
    absenceTitle: "Período de baja médica",
    prescriptionTitle: "Prescripción",
    additionalNotes: "Notas adicionales",
    pharmacy: "Farmacia",
    from: "Desde",
    to: "Hasta",
    reason: "Motivo",
  },
  CZ: {
    patientName: "Jméno pacienta",
    birthDate: "Datum narození",
    address: "Adresa",
    consultationDate: "Datum konzultace",
    doctorName: "Lékař",
    registration: "Registrační číslo",
    signatureLine: "Podpis lékaře",
    examsTitle: "Požadovaná vyšetření",
    absenceTitle: "Pracovní neschopnost",
    prescriptionTitle: "Předpis",
    additionalNotes: "Poznámka",
    pharmacy: "Lékárna",
    from: "Od",
    to: "Do",
    reason: "Důvod",
  },
  RO: {
    patientName: "Numele pacientului",
    birthDate: "Data nașterii",
    address: "Adresă",
    consultationDate: "Data consultației",
    doctorName: "Medic",
    registration: "Număr de înregistrare medicală",
    signatureLine: "Semnătura medicului",
    examsTitle: "Investigații solicitate",
    absenceTitle: "Concediu medical",
    prescriptionTitle: "Rețetă medicală",
    additionalNotes: "Observații",
    pharmacy: "Farmacie",
    from: "De la",
    to: "Până la",
    reason: "Motiv",
  },
};

export function labelsForPrefix(prefix: string): TemplateLabels {
  return TEMPLATE_LABELS[prefix] ?? TEMPLATE_LABELS.IR;
}
