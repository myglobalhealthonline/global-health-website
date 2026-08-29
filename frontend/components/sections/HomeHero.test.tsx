import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HomeHero } from "./HomeHero";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("HomeHero booking CTA", () => {
  it("removes the homepage booking href when online booking is unavailable", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        countryCode="ie"
        countryName="Ireland"
        doctorCount={12}
        languageLabel="English"
        bookHref="/ireland/en/book"
        totalDoctorsAcrossEurope={45}
        liveDoctors={[{ name: "Dr Example", role: "GP" }]}
        bookability={{
          state: "UNAVAILABLE",
          reasonCode: "COUNTRY_PAUSED",
          nextAvailableAt: null,
        }}
        unavailableLabel="Not accepting online bookings"
      />,
    );

    expect(html).toContain("Not accepting online bookings");
    expect(html).not.toContain('href="/ireland/en/book"');
    expect(html).toContain('href="#services"');
  });
});
