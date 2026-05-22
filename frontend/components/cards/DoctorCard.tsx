import Image from "next/image";
import { ArrowUpRight, Globe, ShieldCheck, Phone } from "lucide-react";
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
      {/* Portrait — clean, no overlays */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-background-panel)]">
        <Image
          src={src}
          alt={name}
          fill
          sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
          unoptimized={unoptimized}
          className="object-cover object-top"
        />
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[1.05rem] font-extrabold tracking-[-0.01em] leading-tight text-[var(--color-text-primary)]">
              {name}
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{title}</p>
          </div>
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-text-primary)] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
        </div>

        {/* Metadata */}
        <div className="mt-4 space-y-2">
          {imcRegistration ? (
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-muted)]">
              <ShieldCheck className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" strokeWidth={1.5} aria-hidden />
              {medicalRegistrationUrl ? (
                <a
                  href={medicalRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-brand-primary)] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {imcRegistration}
                </a>
              ) : (
                <span>{imcRegistration}</span>
              )}
            </div>
          ) : null}

          {languages.length > 0 ? (
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-muted)]">
              <Globe className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" strokeWidth={1.5} aria-hidden />
              <span>{languages.join(" · ")}</span>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-5">
          <Link
            href={href ?? "/book-online"}
            className="gh-btn gh-btn-primary flex-1 justify-center text-sm"
            style={{ minHeight: 44, padding: "0 18px" }}
          >
            {ctaLabel}
          </Link>

          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)] transition-[background-color,border-color] duration-200 hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)] motion-reduce:transition-none"
              aria-label="Contact on WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="size-4" strokeWidth={1.5} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
