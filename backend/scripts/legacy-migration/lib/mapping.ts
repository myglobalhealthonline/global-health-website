/**
 * Hand-written Mongo -> Prisma field maps, finalized against the real audit
 * output. Source keys are human-readable AND fully localized per market
 * (IE English, PT/ES/CZ/RO/BR native), sometimes with stray leading/trailing
 * whitespace (CZ) — so matching is whitespace/case-insensitive and every field's
 * candidate list unions all six language variants. A doc only carries its own
 * market's keys, so unioning never collides. Anything not consumed lands in
 * `legacyExtra`; document arrays are detected structurally (any array whose
 * elements carry `filePath`), which catches the localized upload-array names.
 */
import type { SourceDoc } from "./source.js";
import type { Market } from "./markets.js";
import { marketToCountryCode } from "./markets.js";

// ── coercion ────────────────────────────────────────────────────────────────

export function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(",", ".").replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function strArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((x) => str(x)).filter((x): x is string => x !== null);
  }
  const s = str(v);
  if (!s) return [];
  return s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
}

export function parseBirthday(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    let year = Number(y);
    if (year < 100) year += year < 30 ? 2000 : 1900;
    const day = Number(d);
    const month = Number(mo);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
    return dt;
  }
  const iso = new Date(s);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

// ── whitespace/case-tolerant key access ─────────────────────────────────────

function norm(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, " ");
}

interface Idx {
  raw: SourceDoc;
  byNorm: Map<string, string>; // normalized key -> first actual key
}

function indexDoc(doc: SourceDoc): Idx {
  const byNorm = new Map<string, string>();
  for (const k of Object.keys(doc)) {
    const nk = norm(k);
    if (!byNorm.has(nk)) byNorm.set(nk, k);
  }
  return { raw: doc, byNorm };
}

/** First non-empty value among candidate keys; records consumed normalized keys. */
function pick(idx: Idx, keys: string[], consumed: Set<string>): unknown {
  let found: unknown = undefined;
  for (const k of keys) {
    const nk = norm(k);
    consumed.add(nk);
    const actual = idx.byNorm.get(nk);
    if (found === undefined && actual !== undefined) {
      const v = idx.raw[actual];
      if (v != null && v !== "") found = v;
    }
  }
  return found;
}

/** Everything not consumed (and not an empty value). */
function leftover(idx: Idx, consumed: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(idx.raw)) {
    if (consumed.has(norm(k))) continue;
    if (v == null || v === "") continue;
    out[k] = v;
  }
  return out;
}

// ── document arrays (structural detection) ──────────────────────────────────
// The upload arrays are named differently per market ("UPLOAD MEDICAL
// CERTIFICATES…", "UPLOAD PRESCRIPTIONS", "Certificados Médicos…",
// "Nahrát lékařská potvrzení…", "ÎNCĂRCARE CERTIFICATE…"). Rather than hardcode
// every localization, detect any array whose elements carry a `filePath`.

export const NOTES_FIELD = "medicalNotes"; // consistent across all markets

function isDocElement(v: unknown): v is SourceDoc {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "filePath" in (v as object) &&
    !!(v as SourceDoc).filePath
  );
}

export interface DocArray {
  arrayName: string;
  elements: SourceDoc[];
}

/** All top-level arrays that look like document-upload arrays. */
export function collectDocArrays(doc: SourceDoc): DocArray[] {
  const out: DocArray[] = [];
  for (const [k, v] of Object.entries(doc)) {
    if (Array.isArray(v) && v.some(isDocElement)) {
      out.push({ arrayName: k, elements: v.filter(isDocElement) });
    }
  }
  return out;
}

// ── patients ────────────────────────────────────────────────────────────────

/** market -> [tax, national, passport] candidate source keys. */
const ID_KEYS: Record<Market, { tax: string[]; national: string[]; passport: string[] }> = {
  ireland: { tax: ["PPS Number"], national: ["ID Number"], passport: ["Passport Number"] },
  portugal: {
    tax: ["NIF"],
    national: ["Número do Cartão de Identidade"],
    passport: ["Número do Passaporte"],
  },
  spain: {
    tax: ["NIF"],
    national: ["Número de Identidad"],
    passport: ["Número de Pasaporte"],
  },
  czech: {
    tax: ["Daňové identifikační číslo (DIČ)"],
    national: ["Číslo občanského průkazu"],
    passport: ["Číslo pasu"],
  },
  romania: {
    tax: ["CIF"],
    national: ["Număr Carte de Identitate"],
    passport: ["Număr Pașaport"],
  },
  brazil: { tax: ["NIF"], national: [], passport: [] },
};

// Localized candidate lists (union of every market's real key names).
const K = {
  name: ["Patient Name", "Nome do Cliente", "Nombre del Paciente", "Jméno pacienta", "Numele Clientului", "name", "Full Name"],
  phone: ["Phone number", "Telemóvel", "Teléfono", "Telefonní číslo", "Telefon Mobil", "phone"],
  email: ["Email", "email", "E-mail", "Correo"],
  birthday: ["Birthday", "Data de Nascimento", "Fecha de nacimiento", "Datum Narození", "Data Nașterii", "Date of Birth", "dateOfBirth"],
  address: ["Address", "Address 1", "Morada", "Dirección", "Adresa", "Adresă", "Endereço"],
  weight: ["Weight (Kg)", "Peso (kg)", "Peso (Kg)", "Hmotnost (kg)", "Greutate (kg)"],
  height: ["Height (m)", "Altura (m)", "Výška (m)", "Înălțime (m)"],
  bmi: ["BMI", "Índice de Massa Corporal", "Indice de Masa Corporal", "Index tělesné hmotnosti (BMI)", "Indicele de Masă Corporală"],
  bloodType: ["Blood type", "Tipo Sanguíneo", "Grupo Sanguíneo", "Krevní skupina", "Grupa Sanguină"],
  allergies: ["Allergies", "Alergias", "Alergie", "Alergii"],
  chronic: ["Chronic Diseases", "Doenças Cronicas", "Enfermedades Crónicas", "Chronická Onemocnění", "Boli Cronice"],
  family: ["Family History", "Antecedentes Hereditários", "Antecedentes familiares", "Rodinná anamnéza", "Antecedente Ereditare"],
  social: ["Social Habits", "Habitos Sociais", "Hábitos Sociales", "Sociální návyky", "Obiceiuri Sociale"],
  surgeries: ["Surgeries", "Cirurgias", "Cirugias", "Chirurgické zákroky", "Intervenții Chirurgicale"],
  pharmacy: ["Pharmacy Name", "Nome da Farmácia", "Nombre de la farmacia", "Název lékárny", "Numele Farmaciei"],
};

export interface MappedPatient {
  data: {
    fullName: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    weightKg: number | null;
    heightM: number | null;
    bmi: number | null;
    bloodType: string | null;
    allergies: string[];
    chronicDiseases: string[];
    familyHistory: string[];
    socialHabits: string[];
    surgeries: string[];
    nationalIdNumber: string | null;
    taxIdNumber: string | null;
    passportNumber: string | null;
    addressLine1: string | null;
    addressCountryCode: string;
    preferredPharmacy: string | null;
    originCountryCode: string;
    countryFolderCode: string;
  };
  email: string | null;
  birthdayRaw: string | null;
  extra: Record<string, unknown>;
  docArrays: DocArray[];
  embeddedNotes: SourceDoc[];
}

export function mapPatient(doc: SourceDoc, market: Market): MappedPatient {
  const idx = indexDoc(doc);
  const consumed = new Set<string>([norm("_id"), norm("__v"), norm(NOTES_FIELD)]);
  const country = marketToCountryCode(market);

  // mark every detected document array as consumed
  const docArrays = collectDocArrays(doc);
  for (const a of docArrays) consumed.add(norm(a.arrayName));

  const ids = ID_KEYS[market];
  const birthdayRawVal = pick(idx, K.birthday, consumed);

  return {
    email: str(pick(idx, K.email, consumed)),
    birthdayRaw: str(birthdayRawVal),
    data: {
      fullName: str(pick(idx, K.name, consumed)),
      phone: str(pick(idx, K.phone, consumed)),
      dateOfBirth: parseBirthday(birthdayRawVal),
      weightKg: num(pick(idx, K.weight, consumed)),
      heightM: num(pick(idx, K.height, consumed)),
      bmi: num(pick(idx, K.bmi, consumed)),
      bloodType: str(pick(idx, K.bloodType, consumed)),
      allergies: strArray(pick(idx, K.allergies, consumed)),
      chronicDiseases: strArray(pick(idx, K.chronic, consumed)),
      familyHistory: strArray(pick(idx, K.family, consumed)),
      socialHabits: strArray(pick(idx, K.social, consumed)),
      surgeries: strArray(pick(idx, K.surgeries, consumed)),
      nationalIdNumber: str(pick(idx, ids.national, consumed)),
      taxIdNumber: str(pick(idx, ids.tax, consumed)),
      passportNumber: str(pick(idx, ids.passport, consumed)),
      addressLine1: str(pick(idx, K.address, consumed)),
      addressCountryCode: country,
      preferredPharmacy: str(pick(idx, K.pharmacy, consumed)),
      originCountryCode: country,
      countryFolderCode: country,
    },
    extra: leftover(idx, consumed),
    docArrays,
    embeddedNotes: Array.isArray(doc[NOTES_FIELD]) ? (doc[NOTES_FIELD] as SourceDoc[]) : [],
  };
}

// ── medical documents (embedded upload-array element) ───────────────────────

const DOC_TYPE_MAP: Record<string, string> = {
  "absence-certificate": "REPORT",
  "exams-prescription": "EXAM_REQUEST",
  prescription: "PRESCRIPTION",
  other: "OTHER",
};

export function mapDocumentType(v: unknown): string {
  const s = str(v)?.toLowerCase() ?? "";
  return DOC_TYPE_MAP[s] ?? "OTHER";
}

/** Fallback document type inferred from the (localized) array name. */
function typeFromArrayName(arrayName: string): string {
  const n = arrayName.toLowerCase();
  if (/(prescription|receit|recept|léky|léčiv|medicament|prescri)/.test(n)) return "PRESCRIPTION";
  if (/(clinical test|diagnostic|exam|análi|analyz|zkoušky|analize)/.test(n)) return "EXAM_REQUEST";
  if (/(certificate|justif|certific|potvrzen|omluvenk|încărcare)/.test(n)) return "REPORT";
  return "OTHER";
}

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function mimeFromKey(key: string, declared: unknown): string {
  const d = str(declared);
  if (d && d.includes("/")) return d;
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}

export interface MappedDocument {
  legacyMongoId: string;
  objectKey: string;
  fileName: string;
  mimetype: string;
  documentType: string;
  uploadedByRole: "DOCTOR" | "SYSTEM";
  visibleToPatient: boolean;
  uploadedByName: string | null;
  legacyUploadedBy: string | null;
  uploadedAt: Date | null;
  title: string;
}

export function mapDocument(
  el: SourceDoc,
  patientLegacyId: string,
  ordinal: number,
  arrayName: string,
): MappedDocument | null {
  const objectKey = str(el.filePath);
  if (!objectKey) return null;
  const fileName = str(el.fileName) ?? objectKey.split("/").pop() ?? "document";
  const elId = str(el._id);
  const docType = el.documentType ? mapDocumentType(el.documentType) : typeFromArrayName(arrayName);
  return {
    legacyMongoId: elId ?? `${patientLegacyId}:${norm(arrayName)}:${ordinal}`,
    objectKey,
    fileName,
    mimetype: mimeFromKey(objectKey, el.fileType),
    documentType: docType,
    uploadedByRole: toBool(el.generatedBySystem) ? "SYSTEM" : "DOCTOR",
    visibleToPatient: toBool(el.sentToPatient),
    uploadedByName: str(el.uploadedByName),
    legacyUploadedBy: str(el.uploadedBy),
    uploadedAt: toDate(el.uploadedAt),
    title: str(el.fileName) ?? docType,
  };
}

// ── appointments (Appointments — clean camelCase source) ────────────────────

function mapPaymentStatus(v: unknown): "UNPAID" | "PENDING" | "PAID" | "REFUNDED" | "FAILED" {
  const s = str(v)?.toLowerCase() ?? "";
  if (s.includes("paid") || s === "succeeded" || s === "complete") return "PAID";
  if (s.includes("pending") || s.includes("await")) return "PENDING";
  if (s.includes("refund")) return "REFUNDED";
  if (s.includes("fail")) return "FAILED";
  return "UNPAID";
}

function mapApptStatus(
  doc: SourceDoc,
  finalized: boolean,
): "REQUEST_RECEIVED" | "UNDER_REVIEW" | "CONTACTED" | "CANCELLED" | "COMPLETED" {
  const s = (str(doc.bookingStatus ?? doc.attendance) ?? "").toLowerCase();
  if (s.includes("cancel")) return "CANCELLED";
  if (s.includes("complete") || s.includes("attended") || finalized) return "COMPLETED";
  if (s.includes("contact")) return "CONTACTED";
  if (s.includes("review")) return "UNDER_REVIEW";
  return "REQUEST_RECEIVED";
}

export interface MappedAppointment {
  legacyMongoId: string;
  email: string | null;
  legacyDoctorId: string | null;
  legacyPatientId: string | null;
  orderNumber: string | null;
  data: {
    countryCode: string;
    consultationType: string;
    fullName: string;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
    notes: string | null;
    consentAccepted: boolean;
    status: "REQUEST_RECEIVED" | "UNDER_REVIEW" | "CONTACTED" | "CANCELLED" | "COMPLETED";
    paymentStatus: "UNPAID" | "PENDING" | "PAID" | "REFUNDED" | "FAILED";
    amountCents: number | null;
    currencyCode: string | null;
    paidAt: Date | null;
    scheduledAt: Date | null;
    meetingUrl: string | null;
    symptoms: string | null;
    pharmacy: string | null;
    finalized: boolean;
    notesUploaded: boolean;
    filesUploaded: boolean;
    manualEntry: boolean;
    serviceName: string | null;
    locationAddress: string | null;
    formResponses: unknown;
  };
  extra: Record<string, unknown>;
}

export function mapAppointment(doc: SourceDoc, market: Market): MappedAppointment {
  const idx = indexDoc(doc);
  const consumed = new Set<string>([norm("_id"), norm("__v")]);
  const country = marketToCountryCode(market);

  const first = str(pick(idx, ["firstName", "first_name"], consumed));
  const last = str(pick(idx, ["lastName", "last_name"], consumed));
  const fullNameRaw =
    str(pick(idx, ["fullName", "customerName", "name"], consumed)) ??
    [first, last].filter(Boolean).join(" ").trim();
  const serviceName = str(pick(idx, ["serviceName", "service_name"], consumed));

  const finalized = toBool(pick(idx, ["finalized"], consumed));
  const amount = num(pick(idx, ["orderTotal", "order_total", "amount", "total"], consumed));
  // consumed for status derivation (so they don't leak to extra)
  pick(idx, ["bookingStatus", "attendance"], consumed);

  return {
    legacyMongoId: str(doc._id) ?? "",
    email: str(pick(idx, ["email"], consumed)),
    legacyDoctorId: str(pick(idx, ["doctorId", "doctor_id"], consumed)),
    legacyPatientId: str(pick(idx, ["patientId", "patient_id"], consumed)),
    orderNumber: str(pick(idx, ["orderNumber", "order_number"], consumed)),
    data: {
      countryCode: country,
      consultationType:
        str(pick(idx, ["consultationType", "serviceType", "type"], consumed)) ??
        serviceName ??
        "general",
      fullName: fullNameRaw || "Unknown",
      email: "",
      phone: str(pick(idx, ["phone"], consumed)),
      dateOfBirth: parseBirthday(pick(idx, ["birthday", "dateOfBirth", "dob"], consumed)),
      notes: str(pick(idx, ["additionalNotes", "additional_notes", "notes"], consumed)),
      consentAccepted: toBool(pick(idx, ["consentAccepted", "gdprConsent", "consent"], consumed)),
      status: mapApptStatus(doc, finalized),
      paymentStatus: mapPaymentStatus(pick(idx, ["paymentStatus", "payment_status"], consumed)),
      amountCents: amount != null ? Math.round(amount * 100) : null,
      currencyCode: str(pick(idx, ["currency", "currencyCode"], consumed)),
      paidAt: toDate(pick(idx, ["paidAt", "paid_at"], consumed)),
      scheduledAt: toDate(pick(idx, ["bookingStartTime", "booking_start_time", "scheduledAt"], consumed)),
      meetingUrl: str(pick(idx, ["meetingLink", "meeting_link", "meetingUrl"], consumed)),
      symptoms: str(pick(idx, ["symptoms"], consumed)),
      pharmacy: str(pick(idx, ["pharmacy"], consumed)),
      finalized,
      notesUploaded: toBool(pick(idx, ["notesUploaded", "notes_uploaded"], consumed)),
      filesUploaded: toBool(pick(idx, ["filesUploaded", "files_uploaded"], consumed)),
      manualEntry: toBool(pick(idx, ["manualEntry", "manual_entry"], consumed)),
      serviceName,
      locationAddress: str(pick(idx, ["locationAddress", "location_address"], consumed)),
      formResponses: pick(idx, ["formResponses", "form_responses"], consumed) ?? null,
    },
    extra: leftover(idx, consumed),
  };
}

// ── embedded medical notes (patients_*.medicalNotes[]) ───────────────────────

export interface MappedNote {
  legacyId: string | null;
  content: string | null;
  consultationType: string | null;
  legacyAuthorId: string | null;
  authorName: string | null;
  createdAt: Date | null;
}

export function mapNote(el: SourceDoc): MappedNote {
  return {
    legacyId: str(el._id),
    content: str(el.content),
    consultationType: str(el.consultationType),
    legacyAuthorId: str(el.createdBy),
    authorName: str(el.createdByName),
    createdAt: toDate(el.createdAt),
  };
}

// ── review invites (reviewinvites) ──────────────────────────────────────────

export interface MappedReviewInvite {
  legacyMongoId: string;
  rawToken: string | null;
  orderNumber: string | null;
  orderId: string | null;
  customerName: string | null;
  serviceName: string | null;
  doctorName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  localeCode: string | null;
  expiresAt: Date | null;
  submittedAt: Date | null;
  ratings: {
    overallSatisfaction: number | null;
    doctorProfessionalism: number | null;
    communicationClarity: number | null;
    timelinessOfService: number | null;
    valueForMoney: number | null;
    likeliness: number | null;
    bookingExperience: number | null;
  };
}

function rating(v: unknown): number | null {
  const n = num(v);
  return n != null && n >= 1 && n <= 5 ? Math.round(n) : null;
}

export function mapReviewInvite(doc: SourceDoc): MappedReviewInvite {
  const r = (doc.ratings && typeof doc.ratings === "object" ? doc.ratings : doc) as SourceDoc;
  return {
    legacyMongoId: str(doc._id) ?? "",
    rawToken: str(doc.token ?? doc.tokenHash),
    orderNumber: str(doc.orderNumber),
    orderId: str(doc.orderId),
    customerName: str(doc.customerName),
    serviceName: str(doc.serviceName),
    doctorName: str(doc.doctorName),
    contactEmail: str(doc.contactEmail ?? doc.email),
    contactPhone: str(doc.contactPhone ?? doc.phone),
    localeCode: str(doc.localeCode),
    expiresAt: toDate(doc.expiresAt),
    submittedAt: toDate(doc.submittedAt),
    ratings: {
      overallSatisfaction: rating(r.overallSatisfaction ?? r.overall),
      doctorProfessionalism: rating(r.doctorProfessionalism),
      communicationClarity: rating(r.communicationClarity),
      timelinessOfService: rating(r.timelinessOfService),
      valueForMoney: rating(r.valueForMoney),
      likeliness: rating(r.likeliness),
      bookingExperience: rating(r.bookingExperience),
    },
  };
}

// ── brazil consent submissions ──────────────────────────────────────────────

export interface MappedBrazilConsent {
  legacyMongoId: string;
  legacyAppointmentId: string | null;
  fullName: string | null;
  dob: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  pharmacy: string | null;
  message: string;
  gdprConsent: boolean;
  stripeSessionId: string | null;
  paymentStatus: "PENDING" | "PAID";
  paidAt: Date | null;
}

export function mapBrazilConsent(doc: SourceDoc): MappedBrazilConsent {
  const pay = (str(doc.paymentStatus) ?? "").toLowerCase();
  return {
    legacyMongoId: str(doc._id) ?? "",
    legacyAppointmentId: str(doc.appointmentId),
    fullName: str(doc.fullName ?? doc.name),
    dob: str(doc.dob),
    address: str(doc.address),
    email: str(doc.email),
    phone: str(doc.phone),
    pharmacy: str(doc.pharmacy),
    message: str(doc.message) ?? "",
    gdprConsent: toBool(doc.gdprConsent ?? true),
    stripeSessionId: str(doc.stripeSessionId),
    paymentStatus: pay.includes("paid") ? "PAID" : "PENDING",
    paidAt: toDate(doc.paidAt),
  };
}

// ── doctors (GlobalDoctors) ─────────────────────────────────────────────────

export interface MappedDoctor {
  legacyMongoId: string;
  fullName: string | null;
  title: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  barCode: string | null;
  sourceCountry: string | null;
  canCreateManualAppointments: boolean;
  registrations: Record<string, unknown>;
  passwordWasHashed: boolean;
  extra: Record<string, unknown>;
}

export function mapDoctor(doc: SourceDoc): MappedDoctor {
  const idx = indexDoc(doc);
  const consumed = new Set<string>([
    norm("_id"),
    norm("__v"),
    norm("PASSWORD"),
    norm("password"),
    norm("medicalRegistrations"),
  ]);
  const pwd = str(doc.PASSWORD ?? doc.password);
  const registrations =
    doc.medicalRegistrations && typeof doc.medicalRegistrations === "object"
      ? (doc.medicalRegistrations as Record<string, unknown>)
      : {};
  return {
    legacyMongoId: str(doc._id) ?? "",
    fullName: str(pick(idx, ["Doctor Name", "name", "fullName", "Name"], consumed)),
    title: str(pick(idx, ["title", "Title"], consumed)) ?? "Doctor",
    email: str(pick(idx, ["Email", "email", "E-mail"], consumed)),
    phone: str(pick(idx, ["Phone number", "Phone", "phone"], consumed)),
    status: str(pick(idx, ["STATUS", "status"], consumed)),
    barCode: str(pick(idx, ["Bar Code", "barCode", "Barcode"], consumed)),
    sourceCountry: str(pick(idx, ["country", "Country"], consumed)),
    canCreateManualAppointments: toBool(pick(idx, ["canCreateManualAppointments"], consumed)),
    registrations,
    passwordWasHashed: !!pwd && /^\$2[aby]\$/.test(pwd),
    extra: leftover(idx, consumed),
  };
}
