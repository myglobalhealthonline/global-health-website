import Image from "next/image";
import { Globe, ShieldCheck, Phone, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";

const PLACEHOLDER_PORTRAIT = "/images/ireland/doctor-spotlight-ai.svg";

type DoctorCardProps = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string | null;
  href?: string;
  ctaLabel?: string;
};

export function DoctorCard({
  name,
  title,
  imcRegistration,
  medicalRegistrationUrl,
  languages = [],
  whatsappNumber,
  imageSrc,
  href,
  ctaLabel = "View profile",
}: DoctorCardProps) {
  const src = imageSrc?.trim() ? imageSrc.trim() : PLACEHOLDER_PORTRAIT;
  const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");
  const whatsappDigits = whatsappNumber?.replace(/[^\d+]/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits.replace("+", "")}`
    : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/25 motion-reduce:transition-none motion-reduce:hover:translate-y-0">

      {/* Portrait with title badge overlay */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-background-panel)]">
        <Image
          src={src}
          alt={name}
          fill
          sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
          unoptimized={unoptimized}
          className="object-cover object-top"
        />
        {title ? (
          <div className="absolute bottom-3 left-3 right-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white"
              style={{ background: "var(--color-brand-primary)" }}
            >
              <ShieldCheck className="size-3 shrink-0" strokeWidth={2} aria-hidden />
              {title}
            </span>
          </div>
        ) : null}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[1.05rem] font-extrabold tracking-[-0.01em] leading-tight text-[var(--color-text-primary)]">
          {name}
        </h3>

        {/* Metadata — labeled rows */}
        <div className="mt-4 space-y-3">
          {imcRegistration ? (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)]">
                <ShieldCheck className="size-3.5 text-[var(--color-brand-primary)]" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Registration
                </p>
                {medicalRegistrationUrl ? (
                  <a
                    href={medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-[var(--color-text-body)] transition-colors hover:text-[var(--color-brand-primary)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {imcRegistration}
                  </a>
                ) : (
                  <p className="text-[13px] font-medium text-[var(--color-text-body)]">{imcRegistration}</p>
                )}
              </div>
            </div>
          ) : null}

          {languages.length > 0 ? (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)]">
                <Globe className="size-3.5 text-[var(--color-brand-primary)]" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Languages
                </p>
                <p className="text-[13px] font-medium text-[var(--color-text-body)]">
                  {languages.join(", ")}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2 pt-5">
          {/* Primary + phone row */}
          <div className="flex items-center gap-2">
            <Link
              href={href ?? "/book-online"}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-white transition-opacity duration-200 hover:opacity-90"
              style={{ background: "var(--color-brand-primary)", minHeight: 44 }}
            >
              <CalendarDays className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              Book Appointment
              <ArrowRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            </Link>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)] transition-[background-color,border-color] duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white motion-reduce:transition-none"
                aria-label="Contact on WhatsApp"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="size-4" strokeWidth={1.5} />
              </a>
            ) : null}
          </div>

          {/* Secondary — view profile */}
          <Link
            href={href ?? "/book-online"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors duration-200 hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
          >
            {ctaLabel}
            <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
