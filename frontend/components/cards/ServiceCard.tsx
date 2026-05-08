"use client";

import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

const serviceImages: Record<string, string> = {
  "medical consultation": "/images/services/medical-consultation.jpg",
  "sick leave": "/images/services/sick-leave.jpg",
  "treatment refill": "/images/services/treatment-refill.jpg",
  "pain management": "/images/services/pain-management.jpg",
  "paediatric": "/images/services/paediatric.jpg",
  "weight loss": "/images/services/weight-loss.jpg",
  "travel": "/images/services/travel.jpg",
  "general practice": "/images/services/general-practice.jpg",
  "mental health": "/images/services/mental-health.jpg",
  "sexual health": "/images/services/sexual-health.jpg",
  "respiratory": "/images/services/respiratory.jpg",
  "referral": "/images/services/referral.jpg",
  "self referral": "/images/services/self-referral.jpg",
  "hypertension": "/images/services/hypertension.jpg",
  "migraine": "/images/services/migraine.jpg",
  "diabetes": "/images/services/diabetes.jpg",
  "driving license": "/images/services/driving-license.jpg",
  "aesthetic": "/images/services/aesthetic.jpg",
};

function getServiceImage(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, src] of Object.entries(serviceImages)) {
    if (lower.includes(key)) return src;
  }
  return "/images/services/default-medical.svg";
}

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
  ctaLabel?: string;
};

export function ServiceCard({
  title,
  description,
  href,
  duration,
  startingPrice,
  ctaLabel = "Learn more",
}: ServiceCardProps) {
  const imageSrc = getServiceImage(title);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
    >
      {/* Image - larger area */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
          {title}
        </h3>
        
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {duration}
            </span>
          )}
          {startingPrice && (
            <span className="font-semibold text-[var(--color-brand-primary)]">
              {startingPrice}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
          {description}
        </p>

        <div className="mt-auto pt-4 flex items-center gap-1 text-sm font-bold text-[var(--color-brand-primary)]">
          {ctaLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
