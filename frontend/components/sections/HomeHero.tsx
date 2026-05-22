/**
 * Editorial hero — type-first composition + a live-availability panel
 * that makes the abstract "online consultations" concept tactile by
 * showing real clinicians who are bookable right now.
 *
 * Layout (lg+):
 *   ┌──────────────────────────────────────────────┐
 *   │  eyebrow                                     │
 *   │  big headline                  ┌──────────┐  │
 *   │  short lede                    │ live now │  │
 *   │  cta row                       │ avatars  │  │
 *   │  ── pulse line ──              │ + book   │  │
 *   └──────────────────────────────────────────────┘
 *
 * Mobile stacks; live panel sits below the CTA row.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Clock } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { Flag } from "@/components/ui/Flag";

export type LiveDoctorItem = {
  name: string;
  role: string;
};

export function HomeHero({
  countryCode,
  countryName,
  doctorCount,
  languageLabel,
  bookHref,
  totalDoctorsAcrossEurope,
  liveDoctors,
  heroTitle,
  heroSubtitle,
  heroImageSrc,
  ctaLabel,
}: {
  countryCode: CountryCode;
  countryName: string;
  doctorCount: number;
  languageLabel: string;
  bookHref: string;
  totalDoctorsAcrossEurope: number;
  liveDoctors?: LiveDoctorItem[];
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageSrc?: string | null;
  ctaLabel?: string | null;
}) {
  const displayHeroTitle = heroTitle?.trim() || null;
  const displayHeroSubtitle = heroSubtitle?.trim() || null;
  const displayCtaLabel = ctaLabel?.trim() || `Book a consultation`;
  const doctorsForPanel = (liveDoctors ?? []).slice(0, 4);

  return (
    <section
      className="gh-section relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 1100px 700px at 110% -10%, rgba(176, 241, 34, 0.18), transparent 60%),
          radial-gradient(ellipse 900px 600px at -10% 110%, rgba(27, 77, 62, 0.10), transparent 60%),
          var(--color-background-page)
        `,
      }}
    >
      {/* Subtle dotted texture — adds visual warmth without competing
        * with the type. Strength tuned so a screenshot at 1x can't
        * read it as a pattern, only as paper texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 gh-hero-grain"
      />

      <div className="relative z-[1] mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="gh-hero-split grid items-center gap-12 lg:gap-16">
          {/* ── LEFT: type + CTAs ─────────────────────────── */}
          <div className="max-w-[560px]">
            <div className="inline-flex items-center gap-3">
              <span aria-hidden className="gh-pulse-dot !size-2" />
              <span className="gh-eyebrow text-[var(--color-brand-primary)]">
                {countryName} · Available today
              </span>
            </div>

            <h1
              className="
                gh-hero-title mt-5
                font-semibold
                tracking-[-0.035em]
                text-[var(--color-text-primary)]
              "
            >
              {displayHeroTitle ? (
                displayHeroTitle
              ) : (
                <>
                  See a doctor.
                  <br />
                  <span className="gh-hero-accent">From anywhere.</span>
                </>
              )}
            </h1>

            <p
              className="
                mt-6 max-w-[42ch]
                text-[length:var(--text-body-lg)]
                leading-relaxed
                text-[var(--color-text-body)]
              "
            >
              {displayHeroSubtitle ??
                "Licensed clinicians, single-form booking, no clinic queues. Pay after the call connects."}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={bookHref}
                className="gh-btn gh-btn-primary"
                style={{ minWidth: 200 }}
              >
                {displayCtaLabel}
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href="#services"
                className="gh-btn gh-btn-outline"
              >
                Browse services
              </Link>
            </div>

            {/* Quiet proof line — sits below the CTAs so it reinforces
              * the decision rather than competing for attention. */}
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[length:var(--text-meta)] text-[var(--color-text-muted)]">
              <li className="inline-flex items-center gap-2">
                <ShieldCheck
                  className="size-4 text-[var(--color-brand-primary)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Registered with {countryName === "Ireland" ? "the IMC" : "the local council"}
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock
                  className="size-4 text-[var(--color-brand-primary)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Same-day appointments
              </li>
            </ul>
          </div>

          {/* ── RIGHT: live availability panel ────────────── */}
          <aside
            aria-label="Doctors available today"
            className="
              relative
              rounded-[var(--radius-card)]
              border border-[var(--color-border)]
              bg-[var(--color-background-page)]
              shadow-[var(--shadow-elevated)]
              overflow-hidden
            "
          >
            {/* Mint-cream header strip + country tag. The lime pulse
              * carries the only motion in the hero (motion-reduce
              * guarded by .gh-pulse-dot in globals.css). */}
            <header
              className="
                flex items-center justify-between
                px-6 py-4
                border-b border-[var(--color-border)]
                bg-[var(--color-background-soft)]
              "
            >
              <div className="inline-flex items-center gap-3">
                <span
                  aria-hidden
                  className="
                    inline-flex size-9 items-center justify-center
                    rounded-full
                    bg-[var(--color-background-page)]
                    border border-[var(--color-border)]
                  "
                >
                  <Flag code={countryCode} size="md" />
                </span>
                <div>
                  <p className="gh-eyebrow text-[var(--color-text-muted)]">
                    Booking in
                  </p>
                  <p
                    className="
                      font-semibold tracking-[-0.01em]
                      text-[length:var(--text-h3)] leading-tight
                      text-[var(--color-text-primary)]
                    "
                  >
                    {countryName}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="gh-pulse-dot !size-2.5" />
                <span className="gh-eyebrow text-[var(--color-text-muted)]">
                  Live
                </span>
              </span>
            </header>

            {/* Doctor avatar strip — overlapping circles is the
              * universal "people are here right now" signal. Falls
              * back to a static count when liveDoctors is empty. */}
            <div className="px-6 pt-6 pb-2">
              {doctorsForPanel.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {doctorsForPanel.map((d) => (
                        <AvatarBubble key={d.name} name={d.name} />
                      ))}
                    </div>
                    <p className="text-[length:var(--text-meta)] text-[var(--color-text-body)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {doctorCount}{" "}
                        {doctorCount === 1 ? "doctor" : "doctors"}
                      </span>{" "}
                      online · consulting in {languageLabel}
                    </p>
                  </div>

                  <ul className="mt-5 divide-y divide-[var(--color-border)]">
                    {doctorsForPanel.slice(0, 3).map((d) => (
                      <li
                        key={d.name}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-1"
                      >
                        <AvatarBubble name={d.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[length:var(--text-meta)] font-semibold text-[var(--color-text-primary)]">
                            {d.name}
                          </p>
                          <p className="truncate text-xs text-[var(--color-text-muted)]">
                            {d.role}
                          </p>
                        </div>
                        <span
                          className="
                            shrink-0
                            rounded-full
                            bg-[var(--color-accent-dim)]
                            px-2.5 py-1
                            text-xs font-semibold
                            text-[var(--color-brand-primary)]
                          "
                        >
                          Free slot
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                // Empty-state — still useful: shows the cross-Europe
                // count so the user knows the platform isn't dead,
                // just no one from this country is online this minute.
                <div className="py-4">
                  <p className="text-[length:var(--text-meta)] text-[var(--color-text-body)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {totalDoctorsAcrossEurope} doctors
                    </span>{" "}
                    across our European network
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    No one from {countryName} online right now — book a slot and we'll
                    line one up.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom CTA — duplicates the primary CTA so the panel
              * stands alone as a booking surface. Forest pill, full
              * width. */}
            <div className="border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-6 py-5">
              <Link
                href={bookHref}
                className="gh-btn gh-btn-primary w-full justify-center"
              >
                Pick a time
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
                No card required to browse · payment after the call
              </p>
            </div>
          </aside>
        </div>

        {/* Admin-uploaded hero image — lives below the split as an
          * editorial wide image, doesn't compete with the panel. */}
        {heroImageSrc ? (
          <div
            className="
              mt-16 overflow-hidden
              rounded-[var(--radius-card)]
              border border-[var(--color-border)]
              shadow-[var(--shadow-soft)]
            "
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageSrc}
              alt={displayHeroTitle ?? `${countryName} clinic`}
              className="block w-full"
              style={{ maxHeight: 480, objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Two-letter avatar bubble. Forest gradient = visual identity, not
 *  generic gray. Initials are derived from the first two capital
 *  letters of the name so "Dr Hassaan Bin Ghayas" lands on HG. */
function AvatarBubble({ name }: { name: string }) {
  const initials =
    name.match(/[A-Z]/g)?.slice(0, 2).join("") || name.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className="
        inline-flex size-9 shrink-0
        items-center justify-center
        rounded-full
        text-[11px] font-bold
        text-white
        ring-2 ring-[var(--color-background-page)]
      "
      style={{
        background:
          "linear-gradient(135deg, var(--color-brand-primary), #2D6A4F 60%, var(--color-accent))",
      }}
    >
      {initials}
    </span>
  );
}
