import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getSameDayEmptyMessage } from "./same-day-booking-state";
import { localizedLanguageLabel } from "./languages";

describe("getSameDayEmptyMessage", () => {
  it("uses policy-unavailable copy for country, service, and doctor restrictions", () => {
    for (const reasonCode of ["COUNTRY_PAUSED", "SERVICE_PAUSED", "NO_APPROVED_DOCTOR"] as const) {
      expect(
        getSameDayEmptyMessage(
          { state: "UNAVAILABLE", reasonCode, nextAvailableAt: null },
          { noSlots: "No times", unavailable: "Not accepting online bookings" },
        ),
      ).toBe("Not accepting online bookings");
    }
  });

  it("keeps ordinary no-slot copy for an active service without a matching time", () => {
    expect(
      getSameDayEmptyMessage(
        { state: "UNAVAILABLE", reasonCode: "NO_OPEN_SLOT", nextAvailableAt: null },
        { noSlots: "No times", unavailable: "Not accepting online bookings" },
      ),
    ).toBe("No times");
  });
});

describe("same-day service labels", () => {
  it("never renders the default-locale service name in localized GP flows", () => {
    const component = readFileSync(join(__dirname, "../../components/sections/SameDayBooking.tsx"), "utf8");
    const bookingPage = readFileSync(join(__dirname, "../../app/[country]/[lang]/book/page.tsx"), "utf8");
    const gpFlow = bookingPage.slice(
      bookingPage.indexOf("async function GpBookingFlow"),
      bookingPage.indexOf("async function SelectedServiceFlow"),
    );

    expect(component).not.toContain("{service.name}");
    expect(component).toContain("{t.title} · {service.durationMinutes}");
    expect(component).toContain("localizedLanguageLabel(selectedLanguage, lang)");
    expect(gpFlow).not.toContain("{service.name}");
    expect(gpFlow).toContain("const steps = [sameDay.languageLabel");
    expect(gpFlow).toContain("{sameDay.title} · {langName}");
    expect(gpFlow).toContain("{sameDay.reassure}");
  });

  it.each(["pt", "es", "cs", "ro", "de"])(
    "localizes consultation-language names for the %s interface",
    (locale) => {
      expect(localizedLanguageLabel("English", locale)).not.toBe("English");
    },
  );

  it("normalizes the legacy cz consultation-language token", () => {
    expect(localizedLanguageLabel("cz", "en")).toBe("Czech");
    expect(localizedLanguageLabel("cz", "cs")).not.toBe("Cz");
  });
});
