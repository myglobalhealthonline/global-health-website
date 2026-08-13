import fs from "node:fs";
import path from "node:path";
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

/**
 * readyToIndex migration-gap backfill (2026-08-08). `editorialChecklist` is
 * only ever produced by two things: the "Third Pass: Editorial Completion"
 * migration's `baseChecklist()` helper (defaults `readyToIndex: false` unless
 * a record was explicitly reviewed) and the admin portal's own checklist UI.
 * A doctor never routed through either has `editorialChecklist === null` —
 * a different fact from `readyToIndex: false`, which is a real, intentional
 * editorial rejection. Confirmed empirically before the backfill ran: every
 * one of the 173 noindex doctor-locale rows on production had EITHER a
 * content-completeness failure OR `editorialChecklist === null`; zero had
 * `readyToIndex: false`.
 *
 * `isPublicDoctorRecordIndexable` itself does not distinguish null from
 * false — `editorialChecklist?.readyToIndex === true` is already strict
 * enough that either one blocks indexability identically. That strictness is
 * exactly what makes backfilling `null -> {readyToIndex: true}` a safe DATA
 * migration rather than a rule change: the content checks below run
 * unmodified before and after, so a backfilled doctor with a thin bio stays
 * exactly as noindexed as one who was never backfilled at all.
 */
describe("readyToIndex — null is not false, and neither bypasses content checks", () => {
  /** Passes every content requirement — nothing here should ever noindex it. */
  function completeDoctor(readyToIndex: unknown) {
    return {
      fullName: "Dr Vitor Hugo de Matos Pais",
      title: "Médico de Medicina Geral e Familiar",
      bio:
        "O Dr. Vítor Hugo de Matos Pais é médico especialista em Medicina Geral e " +
        "Familiar com vasta experiência clínica em cuidados primários, medicina de " +
        "emergência, telemedicina e cuidados de saúde comunitários em Portugal — " +
        "um médico de família com formação académica abrangente, interesse " +
        "profundo tanto na medicina preventiva como nos determinantes ambientais " +
        "da saúde, acompanhando doentes ao longo de décadas de prática clínica.",
      languages: ["Portuguese", "English"],
      specialties: ["General Practice"],
      imcRegistration: "64505",
      medicalRegistrationUrl: undefined,
      qualifications: ["Médico de Medicina Geral e Familiar — Ordem dos Médicos"],
      editorialChecklist:
        readyToIndex === undefined ? undefined : ({ readyToIndex } as { readyToIndex: boolean }),
    };
  }

  it("no editorialChecklist (never reviewed — DB null, normalized to undefined) is noindex, the pre-backfill state", () => {
    const doctor = completeDoctor(undefined);
    expect(doctor.editorialChecklist).toBeUndefined();
    expect(isPublicDoctorRecordIndexable(doctor)).toBe(false);
  });

  it("explicit readyToIndex: false (real editorial rejection) stays noindex after any backfill", () => {
    expect(isPublicDoctorRecordIndexable(completeDoctor(false))).toBe(false);
  });

  it("becomes indexable ONLY once readyToIndex is explicitly true — the post-backfill state", () => {
    expect(isPublicDoctorRecordIndexable(completeDoctor(true))).toBe(true);
  });

  it("a migration-gap doctor with a thin bio stays noindex even after readyToIndex is backfilled true", () => {
    // The independent-gates property the backfill script's safety argument
    // depends on: flipping the doctor-wide flag never unlocks a locale whose
    // content still fails on its own account.
    const thin = { ...completeDoctor(true), bio: "Too short." };
    expect(isPublicDoctorRecordIndexable(thin)).toBe(false);
  });

  it("a migration-gap doctor with no credential stays noindex even after readyToIndex is backfilled true", () => {
    const noCred = { ...completeDoctor(true), imcRegistration: undefined, medicalRegistrationUrl: undefined };
    expect(isPublicDoctorRecordIndexable(noCred)).toBe(false);
  });

  it("Dr Vitor Hugo de Matos Pais — the legacy-redirect-recovery regression", () => {
    // /portugal-doctors/dr-vitor-pais now redirects here in one hop. Before
    // the backfill this doctor was content-complete but editorialChecklist
    // was null, so the exact-match redirect terminated on noindex — the
    // defect legacy-redirect-recovery-2026-08-08.md flagged as unresolved.
    expect(isPublicDoctorRecordIndexable(completeDoctor(undefined))).toBe(false);
    expect(isPublicDoctorRecordIndexable(completeDoctor(true))).toBe(true);
  });
});

describe("sitemap and hreflang import the SAME predicate, not a lookalike", () => {
  // A source-level guard, not a behavioural one: the invariant this batch and
  // the doctor-hreflang batch both depend on is that "indexable" is decided
  // in exactly one place. If either site ever imports a second copy or
  // reimplements the check inline, this catches it — a passing test suite
  // alongside a silently-diverged predicate is exactly how sitemap/hreflang
  // drift from what the page itself renders.
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), "utf8");

  it("app/sitemap.ts imports isPublicDoctorRecordIndexable from this module", () => {
    const src = read("../../app/sitemap.ts");
    expect(src).toMatch(/from ["']@\/lib\/content\/publication-validation["']/);
    expect(src).toContain("isPublicDoctorRecordIndexable");
  });

  it("lib/seo/doctor-hreflang.ts imports isPublicDoctorRecordIndexable from this module", () => {
    const src = read("../seo/doctor-hreflang.ts");
    expect(src).toMatch(/from ["']@\/lib\/content\/publication-validation["']/);
    expect(src).toContain("isPublicDoctorRecordIndexable");
  });
});
