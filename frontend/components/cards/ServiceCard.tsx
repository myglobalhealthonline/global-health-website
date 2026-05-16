"use client";

import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ServiceCardProps = {
  href: string;
  title: string;
  description: string;
  duration?: string;
  startingPrice?: string;
  ctaLabel?: string;
  className?: string;
  /** Optional uploaded hero image. Renders as a 16:9 banner at the top. */
  imageSrc?: string | null;
};

export function ServiceCard({
  href,
  title,
  description,
  duration,
  startingPrice,
  ctaLabel,
  className,
  imageSrc,
}: ServiceCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-all duration-200 hover:border-[var(--color-brand-primary)]/20 hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
    >
      {imageSrc ? (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16 / 9", background: "var(--color-background-soft)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : null}
      <div className="flex h-full flex-col p-6 sm:p-7">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {duration ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
            <Clock className="size-3.5 text-[var(--color-brand-primary)]" />
            {duration}
          </span>
        ) : null}
        {startingPrice ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-accent)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
            <Tag className="size-3.5" />
            {startingPrice}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)]">
        <span>{ctaLabel ?? "Learn More"}</span>
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
      </div>
    </Link>
  );
}
