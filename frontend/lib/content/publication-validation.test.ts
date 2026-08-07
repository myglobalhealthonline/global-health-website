import { describe, expect, it } from "vitest";
import { isPublicCopySafe, sanitizePublicCopyString } from "@/lib/content/publication-guard";
import {
  isPublicDoctorRecordIndexable,
  validatePublicDoctorRecord,
} from "@/lib/content/publication-validation";

/**
 * Verbatim excerpts from the two live Spanish-language profiles that the
 * case-insensitive `\bTODO\b` rule noindexed and dropped from the sitemap.
 * Both use "todo" as the ordinary Spanish word ("everything" / "at all
 * times"), nowhere near a development placeholder.
 */
const SILVINA_BIO_EXCERPT =
  "Dra. Irale significa algo concreto: ha visto prácticamente todo en pediatría. " +
  "La fiebre que genera pánico a las 2 de la mañana, la erupción que preocupa a " +
  "los padres, el niño que no gana peso — dos décadas de urgencias pediátricas " +
  "en el Sanatorio de Niños de Rosario le dan el criterio para distinguir lo " +
  "urgente de lo que puede esperar a la mañana siguiente.";

const JAVIER_BIO_EXCERPT =
  "Su enfoque parte de una convicción: la terapia funciona cuando hay una " +
  "relación terapéutica genuina — y que el paciente debe entender en todo " +
  "momento qué estamos haciendo y por qué. Trabaja con adultos desde un " +
  "modelo transdiagnóstico basado en procesos, integrando TCC, ACT y TDC " +
  "según lo que cada persona necesita en cada fase del tratamiento.";

/** A record that passes every rule except the copy scan, so a copy failure is
 *  unambiguously the thing under test. */
function doctorWith(bio: string) {
  return {
    fullName: "Dra. Silvina Irale",
    title: "Médica — Pediatría y Medicina Estética",
    bio,
    languages: ["Español", "English"],
    specialties: ["Pediatría"],
    imcRegistration: "282889392",
    medicalRegistrationUrl: "https://www.cgcom.es/servicios/consulta-publica-de-colegiados",
    qualifications: ["Especialista en Pediatría — Sanatorio de Niños de Rosario"],
    editorialChecklist: { readyToIndex: true },
  };
}

describe("placeholder detection — Spanish/Portuguese 'todo' is not a placeholder", () => {
  it.each([
    ["dr-silvina-irale", SILVINA_BIO_EXCERPT],
    ["dr-javier-villarte-betancor", JAVIER_BIO_EXCERPT],
  ])("keeps %s publishable and indexable", (_slug, bio) => {
    const validation = validatePublicDoctorRecord(doctorWith(bio));
    expect(validation.issues.filter((issue) => issue.field === "copy")).toEqual([]);
    expect(validation.shouldNoindex).toBe(false);
    expect(isPublicDoctorRecordIndexable(doctorWith(bio))).toBe(true);
  });

  it.each([
    ["dr-silvina-irale", SILVINA_BIO_EXCERPT],
    ["dr-javier-villarte-betancor", JAVIER_BIO_EXCERPT],
  ])("renders %s's own words rather than the safe-replacement copy", (_slug, bio) => {
    expect(isPublicCopySafe(bio)).toBe(true);
    expect(sanitizePublicCopyString(bio)).toBe(bio);
  });

  it.each([
    "todo",
    "Todo",
    "en todo momento",
    "prácticamente todo en pediatría",
    "Atendemos todo tipo de consultas.",
  ])("treats %j as ordinary prose", (copy) => {
    expect(isPublicCopySafe(copy)).toBe(true);
  });
});

describe("placeholder detection — literal development placeholders still blocked", () => {
  it.each([
    "TODO",
    "TODO: write the real bio",
    "[TODO] credentials",
    "TODO(hassaan) confirm registration",
    "Bio TODO.",
  ])("blocks %j", (copy) => {
    expect(isPublicCopySafe(copy)).toBe(false);
    expect(validatePublicDoctorRecord(doctorWith(copy.padEnd(160, " . "))).shouldNoindex).toBe(true);
  });

  it("still blocks the other internal-copy tokens", () => {
    for (const copy of [
      "placeholder bio",
      "seeded content",
      "mock data",
      "pending review",
      "admin-managed copy",
    ]) {
      expect(isPublicCopySafe(copy)).toBe(false);
    }
  });
});
