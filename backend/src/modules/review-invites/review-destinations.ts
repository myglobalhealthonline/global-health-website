import { z } from "zod";

export type ReviewDestinationProvider = "GOOGLE" | "DOCTIFY" | "TRUSTPILOT";

export type CountryReviewSetting = {
  sendReviewRequests: boolean;
  googleReviewUrl: string | null;
  doctifyReviewUrl: string | null;
};

export type PatientReviewDestination = {
  provider: ReviewDestinationProvider;
  url: string;
};

const PROVIDER_HOSTS: Record<ReviewDestinationProvider, (host: string) => boolean> = {
  GOOGLE: (host) =>
    host === "g.page" ||
    host === "maps.app.goo.gl" ||
    host === "google.com" ||
    host.endsWith(".google.com"),
  DOCTIFY: (host) => host === "doctify.com" || host.endsWith(".doctify.com"),
  TRUSTPILOT: (host) => host === "trustpilot.com" || host.endsWith(".trustpilot.com"),
};

export function isTrustedReviewUrl(
  value: string,
  provider: ReviewDestinationProvider,
): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === "" &&
      PROVIDER_HOSTS[provider](parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function reviewUrlSchema(provider: ReviewDestinationProvider) {
  return z
    .string()
    .trim()
    .max(500)
    .refine((value) => isTrustedReviewUrl(value, provider), {
      message: `Must be a secure ${provider.toLowerCase()} review URL`,
    })
    .nullable();
}

export const countryReviewSettingSchema = z.object({
  sendReviewRequests: z.boolean().default(false),
  googleReviewUrl: reviewUrlSchema("GOOGLE"),
  doctifyReviewUrl: reviewUrlSchema("DOCTIFY"),
});

export function canSendReviewInvite(input: {
  countrySetting: CountryReviewSetting | null;
  trustpilotReviewUrl: string | null;
}): boolean {
  return (
    input.countrySetting?.sendReviewRequests === true &&
    toPatientReviewDestinations(input).length > 0
  );
}

export function parseCountryReviewSetting(value: unknown): CountryReviewSetting | null {
  const parsed = countryReviewSettingSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toPatientReviewDestinations(input: {
  countrySetting: CountryReviewSetting | null;
  trustpilotReviewUrl: string | null;
}): PatientReviewDestination[] {
  const destinations: PatientReviewDestination[] = [];
  if (input.countrySetting?.googleReviewUrl) {
    destinations.push({ provider: "GOOGLE", url: input.countrySetting.googleReviewUrl });
  }
  if (input.countrySetting?.doctifyReviewUrl) {
    destinations.push({ provider: "DOCTIFY", url: input.countrySetting.doctifyReviewUrl });
  }
  if (
    input.trustpilotReviewUrl &&
    isTrustedReviewUrl(input.trustpilotReviewUrl, "TRUSTPILOT")
  ) {
    destinations.push({ provider: "TRUSTPILOT", url: input.trustpilotReviewUrl });
  }
  return destinations;
}

export function countryReviewSettingKey(countryCode: string): string {
  return `review.destination:${countryCode.trim().toUpperCase()}`;
}

const COUNTRY_REVIEW_LOCALES: Record<string, string> = {
  IE: "en",
  CZ: "cs",
  PT: "pt",
  ES: "es",
  RO: "ro",
  BR: "pt-br",
};

export function defaultReviewLocaleForCountry(countryCode: string | null | undefined): string {
  return COUNTRY_REVIEW_LOCALES[(countryCode ?? "").trim().toUpperCase()] ?? "en";
}

export function resolveUniversalReviewInviteRouting(input: {
  countryCode: string | null | undefined;
  notificationLocale: string | null | undefined;
}): { channel: "INTERNAL"; scheduledFor: null; localeCode: string } {
  return {
    channel: "INTERNAL",
    scheduledFor: null,
    localeCode:
      input.notificationLocale?.trim().toLowerCase() ||
      defaultReviewLocaleForCountry(input.countryCode),
  };
}
