import Image from "next/image";
import { ArrowRight, Globe, ShieldCheck, Phone } from "lucide-react";
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
  ctaLabel = "Book Appointment",
}: DoctorCardProps) {
  const src = imageSrc?.trim() ? imageSrc.trim() : PLACEHOLDER_PORTRAIT;
  const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");
  const languageList = languages.length > 0 ? languages.join(", ") : "Not listed";
  const whatsappDigits = whatsappNumber?.replace(/[^\d+]/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits.replace("+", "")}`
    : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Portrait */}
      <div className="relative overflow-hidden">
        <Image
          src={src}
          alt={`Dr. ${name}`}
          width={400}
          height={480}
          unoptimized={unoptimized}
          className="h-64 w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {/* Specialty badge — bottom-left over portrait */}
        <div className="absolute bottom-4 left-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm">
            <ShieldCheck className="size-4" strokeWidth={1.5} />
            {title}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{name}</h3>

        {/* Metadata — registration + languages */}
        <div className="mt-4 space-y-2.5">
          {imcRegistration ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <ShieldCheck className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" strokeWidth={1.5} aria-hidden />
              {medicalRegistrationUrl ? (
                <a
                  href={medicalRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-brand-primary)] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  IMC {imcRegistration}
                </a>
              ) : (
                <span>IMC {imcRegistration}</span>
              )}
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Globe className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" strokeWidth={1.5} aria-hidden />
            <span>{languageList}</span>
          </div>
        </div>

        {/* Single primary action + optional WhatsApp in same row */}
        <div className="mt-5 flex items-center gap-2">
          <Link
            href={href ?? "/book-online"}
            className="gh-btn gh-btn-primary flex-1 gap-2 text-sm"
            style={{ minHeight: 44, padding: "0 18px" }}
          >
            <ArrowRight className="size-4" strokeWidth={1.5} />
            {ctaLabel}
          </Link>

          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex h-11 w-11 shrink-0 items-center justify-center
                rounded-full
                border border-[var(--color-border)]
                bg-[var(--color-background-soft)]
                text-[var(--color-brand-primary)]
                transition-[background-color,border-color] duration-200
                hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)]
                motion-reduce:transition-none
              "
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
