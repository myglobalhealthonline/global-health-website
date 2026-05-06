"use client";

import Image from "next/image";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function FeaturedDoctor({ doctor }: {
  doctor: {
    name: string;
    title: string;
    imcRegistration?: string;
    languages?: string[];
    bio: string;
    imageSrc?: string | null;
    href?: string;
  };
}) {
  const src = doctor.imageSrc?.trim() ? doctor.imageSrc.trim() : "/images/ireland/doctor-spotlight-ai.svg";
  const languageList = doctor.languages && doctor.languages.length > 0 
    ? doctor.languages.join(", ") 
    : "English";

  return (
    <section className="bg-[var(--color-background-soft)] pb-8 pt-4">
      <Container>
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-elevated)] border border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row">
              {/* Photo */}
              <div className="relative w-full sm:w-56 shrink-0 overflow-hidden">
                <Image
                  src={src}
                  alt={doctor.name}
                  width={224}
                  height={280}
                  className="h-64 sm:h-full w-full object-cover object-top"
                />
              </div>
              
              {/* Info */}
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div>
                  <p className="text-sm font-bold text-[var(--color-brand-primary)] uppercase tracking-wider">
                    {doctor.title}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold text-[var(--color-text-primary)]">
                    {doctor.name}
                  </h2>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {doctor.imcRegistration && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-[var(--color-brand-primary)]" />
                      <span className="text-[var(--color-text-muted)]">
                        IMC <span className="text-[var(--color-border-strong)] mx-1">|</span> <span className="font-semibold text-[var(--color-text-primary)]">{doctor.imcRegistration}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-[var(--color-brand-primary)]" />
                    <span className="text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">{languageList}</span>
                    </span>
                  </div>
                </div>
                
                <p className="mt-4 text-sm text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
                  {doctor.bio}
                </p>
                
                {doctor.href && (
                  <Link
                    href={doctor.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-brand-primary)] hover:underline"
                  >
                    Learn More
                    <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
