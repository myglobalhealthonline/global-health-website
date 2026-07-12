import Link from "next/link";
import { Globe2 } from "lucide-react";
import { fetchDoctorMe } from "@/lib/api/doctor-api";
import { PageHeader, Pill } from "@/components/portal-atoms";
import { ProfileSections, activeMarkets, type ProfileStrings } from "./_components/profile-sections";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorProfilePage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
        <Link href="/doctor/profile" className="gh-btn gh-btn-soft text-sm mt-3 inline-flex">
          {d.common.tryAgain}
        </Link>
      </div>
    );
  }
  const { doctor } = result.data;
  const markets = activeMarkets(doctor);

  // Multi-country doctors: show a country picker instead of silently
  // redirecting to the "primary" market (a prior auto-redirect gave no
  // explanation of why the doctor landed on one country's editor).
  // Single-country doctors keep the direct editor — no picker needed.
  if (markets.length >= 2) {
    return (
      <>
        <PageHeader
          className="mb-6"
          eyebrow={d.profile.eyebrow}
          title={d.profile.title}
          description={d.profile.pickerDescription}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {markets.map((m) => (
            <Link
              key={m.countryId}
              href={`/doctor/profile/${m.country.slug}`}
              className="gh-card flex items-center gap-3 p-4 transition hover:bg-[var(--portal-well)]"
            >
              <Globe2 className="size-5 text-[var(--portal-primary)]" aria-hidden />
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-semibold text-[var(--portal-text)]">
                  {m.country.name}
                </span>
                <span className="text-xs text-[var(--portal-muted)]">
                  {m.country.slug === doctor.country.slug
                    ? d.profile.primaryMarket
                    : d.profile.additionalMarket}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={m.isVerified ? "active" : "pending"}>
                    {m.isVerified ? d.profile.verified : d.profile.needsVerification}
                  </Pill>
                  <Pill tone={m.bank.ibanSet ? "active" : "pending"}>
                    {d.profile.payout}: {m.bank.ibanSet ? d.profile.onFile : d.profile.missing}
                  </Pill>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    // ponytail: cast — cs/ro/de doctor.json still lag en's profile keys (separate backfill task); drop cast once locales match
    <ProfileSections doctor={doctor} activeMarket={markets[0] ?? null} strings={d.profile as ProfileStrings} />
  );
}
