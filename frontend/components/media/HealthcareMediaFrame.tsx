"use client";

import Image from "next/image";
import { Stethoscope, HeartPulse, Package, MessageCircle, Cross } from "lucide-react";

export type HealthcareMediaVariant = "hero" | "doctor" | "delivery" | "cta" | "generic";

type HealthcareMediaFrameProps = {
  /** Real image src if available */
  src?: string;
  /** Accessible alt text */
  alt?: string;
  /** Visual variant when no real image */
  variant?: HealthcareMediaVariant;
  /** Override the default label shown in fallback mode */
  label?: string;
  /** Additional classes on the outer frame */
  className?: string;
  /** Image fill mode (cover for photos, contain for logos) */
  objectFit?: "cover" | "contain";
  /** Priority loading for above-fold images */
  priority?: boolean;
};

function isFallbackPath(src?: string): boolean {
  if (!src) return true;
  if (src.endsWith(".svg")) return true;
  if (src.includes("-ai.") || src.includes("-placeholder.")) return true;
  if (src.includes("/images/") && src.includes("placeholder")) return true;
  return false;
}

function FallbackVisual({
  variant = "generic",
  label,
}: {
  variant: HealthcareMediaVariant;
  label?: string;
}) {
  const config: Record<
    HealthcareMediaVariant,
    {
      bg: string;
      accentBg: string;
      icon: React.ReactNode;
      defaultLabel: string;
      aspectClass: string;
    }
  > = {
    hero: {
      bg: "bg-[#1B4D3E]",
      accentBg: "bg-[#C8E6A0]/20",
      icon: <HeartPulse className="size-10 text-white/90" strokeWidth={1.5} />,
      defaultLabel: "Online Consultation",
      aspectClass: "aspect-[16/10]",
    },
    doctor: {
      bg: "bg-[#F6F9F6]",
      accentBg: "bg-[#1B4D3E]/8",
      icon: <Stethoscope className="size-10 text-[#1B4D3E]/80" strokeWidth={1.5} />,
      defaultLabel: "Doctor Profile",
      aspectClass: "aspect-[4/5]",
    },
    delivery: {
      bg: "bg-[#1B4D3E]",
      accentBg: "bg-[#C8E6A0]/15",
      icon: <Package className="size-10 text-white/90" strokeWidth={1.5} />,
      defaultLabel: "Home Delivery",
      aspectClass: "aspect-[4/3]",
    },
    cta: {
      bg: "bg-[#F6F9F6]",
      accentBg: "bg-[#C8E6A0]/30",
      icon: <MessageCircle className="size-8 text-[#1B4D3E]/80" strokeWidth={1.5} />,
      defaultLabel: "Get Started",
      aspectClass: "aspect-[16/10]",
    },
    generic: {
      bg: "bg-[#F6F9F6]",
      accentBg: "bg-[#1B4D3E]/6",
      icon: <Cross className="size-8 text-[#1B4D3E]/70" strokeWidth={1.5} />,
      defaultLabel: "Healthcare",
      aspectClass: "aspect-[16/10]",
    },
  };

  const c = config[variant];

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-[var(--radius-card)] ${c.bg} ${c.aspectClass}`}
    >
      {/* Layered decorative shapes */}
      <div className="pointer-events-none absolute inset-0">
        {/* Large soft circle top-right */}
        <div
          className={`absolute -right-[10%] -top-[20%] h-[70%] w-[60%] rounded-full ${c.accentBg}`}
        />
        {/* Medium circle bottom-left */}
        <div
          className={`absolute -bottom-[15%] -left-[10%] h-[55%] w-[50%] rounded-full ${c.accentBg}`}
        />
        {/* Small accent circle */}
        <div
          className={`absolute left-[15%] top-[20%] h-[25%] w-[20%] rounded-full ${c.accentBg}`}
        />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-sm backdrop-blur-sm">
          {c.icon}
        </span>
        <span
          className={`text-sm font-semibold tracking-wide ${
            variant === "hero" || variant === "delivery"
              ? "text-white/80"
              : "text-[#1B4D3E]/70"
          }`}
        >
          {label ?? c.defaultLabel}
        </span>
      </div>
    </div>
  );
}

export function HealthcareMediaFrame({
  src,
  alt = "",
  variant = "generic",
  label,
  className = "",
  objectFit = "cover",
  priority = false,
}: HealthcareMediaFrameProps) {
  const isFallback = isFallbackPath(src);

  if (isFallback || !src) {
    return (
      <div className={className}>
        <FallbackVisual variant={variant} label={label} />
      </div>
    );
  }

  // Real asset — render with premium frame
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-1 shadow-[var(--shadow-elevated)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[20px]">
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={900}
          className={`h-auto w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
          priority={priority}
        />
      </div>
    </div>
  );
}
