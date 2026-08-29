import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DoctorCard } from "./DoctorCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const cardI18n = {
  registrationLabel: "Registration",
  verifiedSuffix: "Verified",
  verifyRegistrationAria: "Verify registration",
  languagesLabel: "Languages",
  viewProfileLabel: "View profile",
  pickTimeLabel: "Pick a time",
};

const baseProps = {
  name: "Dr Example",
  title: "General Practitioner",
  bio: "",
  href: "/ireland/en/doctors/dr-example",
  bookingHref: "/ireland/en/book?doctor=dr-example",
  cardI18n,
};

describe("DoctorCard booking action", () => {
  it("fails closed when a bookable card has no operational summary", () => {
    const html = renderToStaticMarkup(<DoctorCard {...baseProps} />);

    expect(html).toContain('disabled=""');
    expect(html).toContain("Not accepting online bookings");
    expect(html).not.toContain(">Pick a time<");
  });

  it("shows a verified RETURNING date as a disabled action", () => {
    const html = renderToStaticMarkup(
      <DoctorCard
        {...baseProps}
        bookability={{
          state: "RETURNING",
          reasonCode: "DOCTOR_PAUSED",
          nextAvailableAt: "2026-09-17T09:00:00.000Z",
        }}
        returningLabel="Available from 17 September"
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("Available from 17 September");
    expect(html).not.toContain(">Pick a time<");
  });

  it("keeps a BOOKABLE doctor on the normal active Pick a time action", () => {
    const html = renderToStaticMarkup(
      <DoctorCard
        {...baseProps}
        bookability={{
          state: "BOOKABLE",
          reasonCode: null,
          nextAvailableAt: "2026-09-03T09:00:00.000Z",
        }}
      />,
    );

    expect(html).not.toContain('disabled=""');
    expect(html).toContain("Pick a time");
  });
});
