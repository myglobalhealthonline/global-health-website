import { describe, expect, it } from "vitest";
import {
  BRAZIL_STATES,
  bookingAddressCopy,
  collectsAddressState,
} from "./booking-address-copy";
import { countries } from "@/data/countries";

/** Stand-in for a locale bundle's `bookingForm` — pt-PT wording, as shipped. */
const PT_BASE = {
  patientAddress: "Morada do paciente",
  patientAddressNote: "Necessária para documentos médicos e materiais físicos.",
  streetAddress: "Morada",
  aptUnit: "Apartamento / unidade (opcional)",
  city: "Cidade",
  postalCode: "Código postal",
};

describe("bookingAddressCopy", () => {
  it("uses Brazilian Portuguese wording for br", () => {
    const copy = bookingAddressCopy("br", "pt", PT_BASE);
    expect(copy.streetAddress).toBe("Endereço");
    expect(copy.postalCode).toBe("CEP");
    expect(copy.state).toBe("Estado");
    expect(copy.patientAddress).toBe("Endereço do paciente");
    expect(copy.aptUnit).toBe("Complemento (opcional)");
  });

  it("leaves Portugal on the European Portuguese bundle", () => {
    const copy = bookingAddressCopy("pt", "pt", PT_BASE);
    expect(copy.streetAddress).toBe("Morada");
    expect(copy.postalCode).toBe("Código postal");
    // Null is what hides the Estado field — PT must never render it.
    expect(copy.state).toBeNull();
  });

  it("leaves every non-BR market untouched, in every language", () => {
    for (const code of ["pt", "ie", "es", "ro", "cz"]) {
      for (const lang of ["pt", "en", "es", "de", "cs", "ro"]) {
        const copy = bookingAddressCopy(code, lang, PT_BASE);
        expect(copy.state).toBeNull();
        expect(copy.postalCode).toBe(PT_BASE.postalCode);
        expect(copy.streetAddress).toBe(PT_BASE.streetAddress);
      }
    }
  });

  it("labels CEP and a state in every language on the BR site", () => {
    for (const lang of ["pt", "en", "es", "de", "cs", "ro"]) {
      const copy = bookingAddressCopy("br", lang, PT_BASE);
      expect(copy.postalCode).toMatch(/CEP/);
      expect(copy.state).toBeTruthy();
      expect(copy.statePlaceholder).toBeTruthy();
    }
  });

  it("falls back to the English overrides for an unknown language", () => {
    const copy = bookingAddressCopy("br", "fr", PT_BASE);
    expect(copy.state).toBe("State");
  });

  it("is case- and whitespace-insensitive on the country code", () => {
    expect(bookingAddressCopy(" BR ", "pt", PT_BASE).state).toBe("Estado");
  });

  it("treats a null/undefined country as non-BR", () => {
    expect(bookingAddressCopy(null, "pt", PT_BASE).state).toBeNull();
    expect(bookingAddressCopy(undefined, "pt", PT_BASE).state).toBeNull();
  });

  /**
   * Regression: the `[country]` URL segment is a SLUG ("brazil"), not a code.
   * Keying this map on the raw segment matched nothing, so the whole BR
   * address treatment silently no-op'd. Callers must resolve the code first
   * (`countryCodeFromSlug`) — this pins the contract that a slug does NOT work,
   * so the mistake fails a test instead of shipping as "nothing changed".
   */
  it("does NOT accept the URL slug in place of the country code", () => {
    expect(bookingAddressCopy("brazil", "pt", PT_BASE).state).toBeNull();
    expect(collectsAddressState("brazil")).toBe(false);
    expect(collectsAddressState("br")).toBe(true);
  });

  it("keeps Brazil's slug and code distinct, which is why the above matters", () => {
    const br = countries.find((c) => c.code === "br");
    expect(br?.slug).toBe("brazil");
    expect(br?.slug).not.toBe(br?.code);
  });
});

describe("BRAZIL_STATES", () => {
  it("has all 27 federative units, unique and two-letter uppercase", () => {
    expect(BRAZIL_STATES).toHaveLength(27);
    expect(new Set(BRAZIL_STATES).size).toBe(27);
    for (const uf of BRAZIL_STATES) expect(uf).toMatch(/^[A-Z]{2}$/);
  });

  it("includes the Distrito Federal and the most-populous states", () => {
    for (const uf of ["DF", "SP", "RJ", "MG", "BA"]) {
      expect(BRAZIL_STATES).toContain(uf);
    }
  });
});
