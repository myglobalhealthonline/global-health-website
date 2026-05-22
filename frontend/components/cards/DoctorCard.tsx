import Image from "next/image";
import { Globe, ShieldCheck, Phone, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";

const PLACEHOLDER_PORTRAIT = "/images/ireland/doctor-spotlight-ai.svg";

/* ─── Mint icon box ──────────────────────────────────────────────────────── */
function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]"
      style={{
        background: "rgba(29,75,54,0.07)",
        border: "1px solid rgba(29,75,54,0.10)",
      }}
    >
      {children}
    </span>
  );
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
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

/* ─── Component ──────────────────────────────────────────────────────────── */
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
  const bookHref = href ?? "/book-online";

  return (
    <article
      className="group flex flex-col overflow-hidden bg-white"
      style={{
        borderRadius: 24,
        border: "1px solid rgba(29,75,54,0.10)",
        boxShadow: "0 2px 8px rgba(15,46,37,0.06), 0 8px 28px rgba(15,46,37,0.07)",
        transition: "transform 300ms cubic-bezier(0.16,1,0.3,1), box-shadow 300ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 6px 18px rgba(15,46,37,0.10), 0 16px 40px rgba(15,46,37,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(15,46,37,0.06), 0 8px 28px rgba(15,46,37,0.07)";
      }}
    >
      {/* ── Portrait ── */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1.1" }}>
        <Image
          src={src}
          alt={name}
          fill
          sizes="(min-width:1024px) 360px, (min-width:768px) 50vw, 100vw"
          unoptimized={unoptimized}
          className="object-cover object-top"
        />

        {/* Title badge — bottom-left overlay */}
        {title ? (
          <div className="absolute bottom-3 left-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{
                background: "var(--color-brand-primary)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              <ShieldCheck className="size-[13px] shrink-0" strokeWidth={2.2} aria-hidden />
              {title}
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">

        {/* Name — dark green, extrabold */}
        <h3
          className="text-[1.1rem] font-extrabold tracking-[-0.015em] leading-snug"
          style={{ color: "var(--color-brand-primary)" }}
        >
          {name}
        </h3>

        {/* Metadata rows */}
        <div className="mt-4 space-y-3">
          {imcRegistration ? (
            <div className="flex items-start gap-3">
              <IconBox>
                <ShieldCheck
                  className="size-[15px]"
                  style={{ color: "var(--color-brand-primary)" }}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </IconBox>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: "rgba(29,75,54,0.45)" }}
                >
                  Registration
                </p>
                {medicalRegistrationUrl ? (
                  <a
                    href={medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-semibold transition-opacity hover:opacity-75"
                    style={{ color: "var(--color-brand-primary)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {imcRegistration}
                  </a>
                ) : (
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--color-brand-primary)" }}
                  >
                    {imcRegistration}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {languages.length > 0 ? (
            <div className="flex items-start gap-3">
              <IconBox>
                <Globe
                  className="size-[15px]"
                  style={{ color: "var(--color-brand-primary)" }}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </IconBox>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: "rgba(29,75,54,0.45)" }}
                >
                  Languages
                </p>
                <p
                  className="text-[13px] font-semibold leading-snug"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  {languages.join(", ")}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Actions ── */}
        <div className="mt-5 space-y-2">

          {/* Row 1 — primary + phone */}
          <div className="flex items-center gap-2">
            <Link
              href={bookHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full text-[13.5px] font-bold text-white transition-[background-color,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "var(--color-brand-primary)",
                padding: "11px 16px",
                minHeight: 46,
              }}
            >
              <CalendarDays className="size-[15px] shrink-0" strokeWidth={1.8} aria-hidden />
              Book Appointment
              <ArrowRight className="size-[15px] shrink-0" strokeWidth={1.8} aria-hidden />
            </Link>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-[46px] shrink-0 items-center justify-center rounded-full transition-[background-color,border-color] duration-200"
                style={{
                  border: "1.5px solid rgba(29,75,54,0.20)",
                  background: "transparent",
                  color: "var(--color-brand-primary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-brand-primary)";
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-brand-primary)";
                }}
                aria-label="Contact on WhatsApp"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="size-4" strokeWidth={1.6} />
              </a>
            ) : null}
          </div>

          {/* Row 2 — secondary outline */}
          <Link
            href={bookHref}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-[background-color,border-color,color] duration-200"
            style={{
              border: "1.5px solid rgba(29,75,54,0.20)",
              padding: "9px 16px",
              color: "var(--color-brand-primary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--color-brand-primary)";
              (e.currentTarget as HTMLElement).style.background = "rgba(29,75,54,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(29,75,54,0.20)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {ctaLabel}
            <ArrowRight className="size-[14px] shrink-0" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>

      </div>
    </article>
  );
}
