import Image from "next/image";
import { ArrowRight, Calendar, Globe, ShieldCheck, Phone, IdCard } from "lucide-react";
import Link from "next/link";

const PLACEHOLDER_PORTRAIT = "/images/ireland/doctor-spotlight-ai.svg";

type DoctorCardProps = {
  name: string;
  title: string;
  imcRegistration?: string;
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
  languages = [],
  whatsappNumber,
  imageSrc,
  href,
  ctaLabel = "View Profile",
}: DoctorCardProps) {
  const src = imageSrc?.trim() ? imageSrc.trim() : PLACEHOLDER_PORTRAIT;
  const languageList = languages.length > 0 ? languages.join(", ") : "Not listed";
  const whatsappDigits = whatsappNumber?.replace(/[^\d+]/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits.replace("+", "")}` : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1">
      {/* Image area with specialty badge */}
      <div className="relative overflow-hidden">
        <Image
          src={src}
          alt={`Dr. ${name}`}
          width={400}
          height={480}
          className="h-64 w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        
        {/* Specialty badge */}
        <div className="absolute bottom-4 left-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <ShieldCheck className="size-4" />
            {title}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Name */}
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{name}</h3>
        
        {/* Details */}
        <div className="mt-4 space-y-3">
          {/* Registration */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-soft)] ring-1 ring-[var(--color-border)]">
              <IdCard className="size-4 text-[var(--color-brand-primary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Registration</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {imcRegistration ? (
                  <>
                    IMC <span className="text-[var(--color-text-muted)] font-normal mx-1">|</span> {imcRegistration}
                  </>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
          </div>

          {/* Languages */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-soft)] ring-1 ring-[var(--color-border)]">
              <Globe className="size-4 text-[var(--color-brand-primary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Languages</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{languageList}</p>
            </div>
          </div>
        </div>

        {/* Action buttons -- bio removed to avoid duplicate IMC/language info */}
        <div className="mt-5 flex items-center gap-3">
          <Link
            href={href ?? "/book-online"}
            className="gh-btn gh-btn-primary flex-1 gap-2"
          >
            <Calendar className="size-4" />
            Book Appointment
            <ArrowRight className="size-4" />
          </Link>
          
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-white text-[var(--color-brand-primary)] transition-all hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)]"
              aria-label="Call on WhatsApp"
            >
              <Phone className="size-4" />
            </a>
          ) : null}
        </div>

        {/* View Profile link */}
        {href ? (
          <Link
            href={href}
            className="mt-3 flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-border)] py-3 text-sm font-bold text-[var(--color-brand-primary)] transition-all hover:bg-[var(--color-background-soft)] hover:border-[var(--color-brand-primary)]/30"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
