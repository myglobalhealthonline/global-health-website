"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Check, Loader2 } from "lucide-react";
import { buildBookHref } from "@/lib/routing/book-href";
import { formatPriceRounded } from "@/lib/format-currency";

/**
 * Hero booking wizard — a compact 3-step quick-book panel that replaces the
 * static "open calendars" card on the country home page:
 *   1. Pick a doctor
 *   2. Pick a consultation (a service that doctor is bookable for)
 *   3. Pick an open time slot → routes into /book pre-filled to confirm.
 *
 * Slot availability is fetched same-origin from /api/public/booking-availability
 * (server-proxied to the public availability endpoint). Times are shown in the
 * clinic timezone, exactly as the booking flow + confirmation will charge them.
 */

export type WizardDoctor = {
  slug: string;
  name: string;
  role: string;
  imageSrc?: string | null;
  /** Service ids this doctor is bookable for (ServiceDoctor assignments). */
  serviceIds: string[];
};

export type WizardService = {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number | null;
  basePriceCents?: number | null;
  currencyCode?: string | null;
};

export type HeroWizardI18n = {
  eyebrow: string;
  stepDoctor: string;
  stepConsultation: string;
  stepTime: string;
  back: string;
  change: string;
  noConsultations: string;
  noSlots: string;
  loading: string;
  minSuffix: string;
  browseAll: string;
  priceFrom: string;
  reassure: string;
};

type Slot = {
  id: string;
  startAt: string;
  priceCents?: number | null;
  currencyCode?: string | null;
  pricingType?: string | null;
};

const DEFAULT_I18N: HeroWizardI18n = {
  eyebrow: "Book in 3 steps",
  stepDoctor: "Choose a doctor",
  stepConsultation: "Choose a consultation",
  stepTime: "Pick a time",
  back: "Back",
  change: "Change",
  noConsultations: "This doctor has no online consultations yet.",
  noSlots: "No open times in the next two weeks. Try another doctor.",
  loading: "Finding open times…",
  minSuffix: "min",
  browseAll: "Browse all doctors",
  priceFrom: "from",
  reassure: "Most appointments confirmed within minutes.",
};

export function HeroBookingWizard({
  doctors,
  services,
  countryCode,
  countrySlug,
  lang,
  bookHref,
  i18n,
}: {
  doctors: WizardDoctor[];
  services: WizardService[];
  countryCode: string;
  countrySlug: string;
  lang: string;
  bookHref: string;
  i18n?: Partial<HeroWizardI18n>;
}) {
  const t = { ...DEFAULT_I18N, ...i18n };
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [doctor, setDoctor] = useState<WizardDoctor | null>(null);
  const [service, setService] = useState<WizardService | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clinicTz, setClinicTz] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [routing, setRouting] = useState(false);

  const serviceById = new Map(services.map((s) => [s.id, s]));

  function pickDoctor(d: WizardDoctor) {
    setDoctor(d);
    setService(null);
    setStep(2);
  }

  async function pickService(d: WizardDoctor, s: WizardService) {
    setService(s);
    setStep(3);
    setSlots([]);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/booking-availability?country=${encodeURIComponent(countryCode)}&service=${encodeURIComponent(s.slug)}&doctor=${encodeURIComponent(d.slug)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { slots?: Slot[]; clinicTimezone?: string };
      };
      setSlots(json.ok && json.data?.slots ? json.data.slots : []);
      setClinicTz(json.data?.clinicTimezone ?? "UTC");
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  function pickSlot(slot: Slot) {
    if (!doctor || !service) return;
    setRouting(true);
    router.push(
      buildBookHref({
        country: countrySlug,
        lang,
        service: service.slug,
        doctor: doctor.slug,
        slot: slot.id,
      }),
    );
  }

  const doctorServices = doctor
    ? doctor.serviceIds.map((id) => serviceById.get(id)).filter((s): s is WizardService => Boolean(s))
    : [];
  const slotsByDay = groupByDay(slots, clinicTz);
  const stepLabel = step === 1 ? t.stepDoctor : step === 2 ? t.stepConsultation : t.stepTime;

  return (
    <div
      className="gh-hero-wizard relative flex w-[480px] flex-col overflow-hidden rounded-[26px]"
      style={{
        background: "rgba(8, 33, 27, 0.82)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Screen-reader-only step announcer — visible step/loading state is
          conveyed by layout alone, so this is the only signal a screen
          reader gets when the wizard advances or a slot fetch starts. */}
      <span role="status" aria-live="polite" className="sr-only">
        {loading ? t.loading : stepLabel}
      </span>

      {/* Consultation image banner + step header */}
      <div className="relative h-[150px] w-full shrink-0">
        <Image
          src="/images/stock/book.jpg"
          alt=""
          fill
          sizes="480px"
          className="object-cover object-[center_30%]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,33,27,0.30) 0%, rgba(8,33,27,0.55) 55%, rgba(8,33,27,0.94) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 pb-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
            <CalendarClock className="size-4" strokeWidth={1.8} aria-hidden />
            {t.eyebrow}
          </span>
          {/* Purely decorative — aria-hidden, so aria-current has no
              accessible-tree effect here. The step name is announced via
              the sr-only live region above instead. */}
          <span className="flex items-center gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="size-1.5 rounded-full transition-colors"
                style={{ background: step >= n ? "var(--color-brand-accent)" : "rgba(255,255,255,0.3)" }}
              />
            ))}
          </span>
        </div>
      </div>

      <div className="flex flex-col p-6">

      {/* Breadcrumb of choices */}
      {(doctor || service) && step > 1 ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
          {doctor ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 font-semibold text-white hover:bg-white/[0.12]"
            >
              <Check className="size-3 text-[var(--color-brand-accent)]" strokeWidth={2.5} aria-hidden />
              {firstName(doctor.name)}
            </button>
          ) : null}
          {service ? (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => doctor && setStep(2)}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 font-semibold text-white hover:bg-white/[0.12]"
              >
                <Check className="size-3 text-[var(--color-brand-accent)]" strokeWidth={2.5} aria-hidden />
                {service.name}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* STEP 1 — doctor */}
      {step === 1 ? (
        <>
          <p className="mb-2.5 text-[15px] font-bold text-white">{t.stepDoctor}</p>
          <ul className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1">
            {doctors.map((d) => (
              <li key={d.slug}>
                <button
                  type="button"
                  onClick={() => pickDoctor(d)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left transition-colors hover:border-[var(--color-brand-accent)]/45 hover:bg-white/[0.08]"
                >
                  <Avatar name={d.name} imageSrc={d.imageSrc} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-bold text-white">{d.name}</span>
                    <span className="block truncate text-[12px] text-white/55">{d.role}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.8} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* STEP 2 — consultation */}
      {step === 2 && doctor ? (
        <>
          <StepHeader label={t.stepConsultation} onBack={() => setStep(1)} backLabel={t.back} />
          {doctorServices.length === 0 ? (
            <p className="py-4 text-[12.5px] text-white/60">{t.noConsultations}</p>
          ) : (
            <ul className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1">
              {doctorServices.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pickService(doctor, s)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-brand-accent)]/45 hover:bg-white/[0.08]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-bold text-white">{s.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-white/55">
                        {s.durationMinutes ? (
                          <span>
                            {s.durationMinutes} {t.minSuffix}
                          </span>
                        ) : null}
                        {s.durationMinutes && typeof s.basePriceCents === "number" ? (
                          <span aria-hidden className="opacity-40">·</span>
                        ) : null}
                        {typeof s.basePriceCents === "number" ? (
                          <span className="font-semibold text-[var(--color-brand-accent)]">
                            {t.priceFrom} {formatPriceRounded(s.basePriceCents, s.currencyCode)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.8} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {/* STEP 3 — time slot */}
      {step === 3 && doctor && service ? (
        <>
          <StepHeader label={t.stepTime} onBack={() => setStep(2)} backLabel={t.back} />
          {loading ? (
            <p className="flex items-center gap-2 py-5 text-[12.5px] text-white/65">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t.loading}
            </p>
          ) : slots.length === 0 ? (
            <p className="py-4 text-[12.5px] text-white/60">{t.noSlots}</p>
          ) : (
            <div className="flex max-h-[330px] flex-col gap-3 overflow-y-auto pr-1">
              {slotsByDay.map((day) => (
                <div key={day.key}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">
                    {day.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {day.slots.map((slot) => {
                      const isPeak = slot.pricingType === "PEAK";
                      const price =
                        typeof slot.priceCents === "number"
                          ? formatPriceRounded(slot.priceCents, slot.currencyCode)
                          : null;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={routing}
                          onClick={() => pickSlot(slot)}
                          title={isPeak ? "Peak time" : undefined}
                          className="group/slot inline-flex min-h-11 min-w-[84px] flex-col items-center justify-center gap-0.5 rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-white transition-colors hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent)] hover:text-[var(--color-background-dark)] disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1 text-[13.5px] font-bold leading-none">
                            {fmtTime(slot.startAt, clinicTz)}
                            {isPeak ? (
                              <span
                                aria-hidden
                                className="size-1 rounded-full bg-[var(--color-brand-accent)] group-hover/slot:bg-[var(--color-background-dark)]"
                              />
                            ) : null}
                          </span>
                          {price ? (
                            <span className="text-[11.5px] font-semibold leading-none text-[var(--color-brand-accent)] group-hover/slot:text-[var(--color-background-dark)]">
                              {price}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Positive reassurance — set expectations before the patient commits */}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] font-medium text-white/55">
        <Check className="size-3.5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={2.2} aria-hidden />
        {t.reassure}
      </p>

      {/* Footer — browse-all escape hatch */}
      <a
        href={bookHref}
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 py-2.5 text-[12px] font-bold text-white/80 transition-colors hover:bg-white/10"
      >
        {routing ? <Check className="size-3.5" aria-hidden /> : null}
        {t.browseAll}
        <ArrowRight className="size-3.5" strokeWidth={1.6} aria-hidden />
      </a>
      </div>
    </div>
  );
}

function StepHeader({ label, onBack, backLabel }: { label: string; onBack: () => void; backLabel: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="-m-2.5 inline-flex size-11 items-center justify-center rounded-full bg-white/[0.07] text-white hover:bg-white/[0.14]"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.8} aria-hidden />
      </button>
      <p className="text-[15px] font-bold text-white">{label}</p>
    </div>
  );
}

function Avatar({ name, imageSrc }: { name: string; imageSrc?: string | null }) {
  const initials = name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const src = imageSrc?.trim();
  if (src) {
    const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");
    return (
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
        <Image src={src} alt={name} fill sizes="44px" unoptimized={unoptimized} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className="grid size-11 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white"
      style={{ background: "rgba(255,255,255,0.12)" }}
    >
      {initials || "·"}
    </span>
  );
}

function firstName(name: string): string {
  return name.replace(/^(Dr\.?|Prof\.?)\s+/i, "").split(/\s+/)[0] ?? name;
}

type DayGroup = { key: string; label: string; slots: Slot[] };

/** Group slots by clinic-local day, capped so the hero panel stays compact. */
function groupByDay(slots: Slot[], tz: string): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const slot of slots) {
    const key = dayKey(slot.startAt, tz);
    let group = map.get(key);
    if (!group) {
      group = { key, label: dayLabel(slot.startAt, tz), slots: [] };
      map.set(key, group);
    }
    if (group.slots.length < 8) group.slots.push(slot);
  }
  return Array.from(map.values()).slice(0, 4);
}

function dayKey(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function dayLabel(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtTime(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}
