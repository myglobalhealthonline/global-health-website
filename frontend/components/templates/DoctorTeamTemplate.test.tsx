import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DoctorTeamTemplate } from "./DoctorTeamTemplate";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const cardI18n = {
  registrationLabel: "Registration",
  verifiedSuffix: "Verified",
  verifyRegistrationAria: "Verify registration",
  languagesLabel: "Languages",
  viewProfileLabel: "View profile",
  viewProfileAria: "View profile for {name}",
  credentialsLabel: "Credentials",
  pickTimeLabel: "Pick a time",
};

describe("DoctorTeamTemplate bookability passthrough", () => {
  it("keeps a returning doctor disabled with the verified date from the view model", () => {
    const html = renderToStaticMarkup(
      <DoctorTeamTemplate
        countryName="Ireland"
        bookingHref="/ireland/en/book"
        bookingLabel="Book appointment"
        cardI18n={cardI18n}
        doctors={[
          {
            name: "Dr Returning",
            title: "General Practitioner",
            bio: "",
            href: "/ireland/en/doctors/dr-returning",
            bookingHref: "/ireland/en/book?doctor=dr-returning",
            bookLabel: "Pick a time",
            bookability: {
              state: "RETURNING",
              reasonCode: "DOCTOR_PAUSED",
              nextAvailableAt: "2026-09-17T09:00:00.000Z",
            },
            returningLabel: "Available from 17 September",
          },
        ]}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("Available from 17 September");
    expect(html).not.toContain(">Pick a time<");
  });
});
