import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/sections/DoctorsHero", () => ({
  DoctorsHero: ({
    titleLead,
    titleAccent,
    titleTrail,
    lede,
  }: {
    titleLead: string;
    titleAccent: string;
    titleTrail?: string;
    lede: string;
  }) => (
    <section>
      <h1>{[titleLead, titleAccent, titleTrail].filter(Boolean).join(" ")}</h1>
      <p>{lede}</p>
    </section>
  ),
}));

import {
  DoctorTeamHero,
  approvedCzechDoctorHeroCopy,
} from "@/components/sections/DoctorTeamHero";

const oldI18n = {
  theTeamBadge: "Tým",
  heroTitleLead: "Lékaři, kteří",
  heroTitleAccent: "skutečně",
  heroTitleTrail: "zvedají.",
  heroLedeTemplate: "Každý lékař níže je licencovaný v {country}.",
  heroAvailableSingular: "lékař",
  heroAvailablePlural: "lékaři",
  onboardingTitle: "",
  onboardingBodyTemplate: "",
  bottomCtaTitle: "",
  bottomCtaAccent: "",
  bottomCtaBody: "",
  bottomCtaButton: "",
  viewDoctors: "Lékaři",
  bookAppointment: "Rezervovat",
  noDoctorsTitle: "",
  noDoctorsBody: "",
  doctorSingular: "",
  doctorPlural: "",
  languagesSpoken: "",
  availableToday: "",
  nextAvailable: "",
  filterByLanguage: "",
  filterByType: "",
  allLanguages: "",
  allTypes: "",
  clearFilters: "",
  noMatches: "",
  generalPractitioner: "",
  specialist: "",
  verified: "",
  viewProfile: "",
} as const;

function render(heroCopy: ReturnType<typeof approvedCzechDoctorHeroCopy>) {
  return renderToStaticMarkup(
    <DoctorTeamHero
      countryName="Česko"
      bookingHref="/book"
      bookingLabel="Rezervovat"
      availableCount={2}
      i18n={oldI18n}
      heroCopy={heroCopy}
    />,
  );
}

describe("Czech doctor-directory approved hero activation", () => {
  it("keeps current copy while PageContent is pending or not exact", () => {
    const pending = approvedCzechDoctorHeroCopy("cz", "cs", null, null);
    const stale = approvedCzechDoctorHeroCopy(
      "cz",
      "cs",
      "Online lékaři v Česku",
      "stale description",
    );

    expect(render(pending)).toContain("<h1>Lékaři, kteří skutečně zvedají.</h1>");
    expect(render(stale)).toContain("Každý lékař níže je licencovaný v Česko.");
  });

  it("renders the exact approved Czech H1 and lede", () => {
    const approved = approvedCzechDoctorHeroCopy(
      "cz",
      "cs",
      "Online lékaři v Česku",
      "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.",
    );
    const html = render(approved);

    expect(html).toContain("<h1>Online lékaři v Česku</h1>");
    expect(html).toContain(
      "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.",
    );
  });

  it("never activates the Czech pair for another market or locale", () => {
    const title = "Online lékaři v Česku";
    const lede =
      "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.";

    expect(approvedCzechDoctorHeroCopy("ie", "cs", title, lede)).toBeNull();
    expect(approvedCzechDoctorHeroCopy("cz", "en", title, lede)).toBeNull();
  });
});
