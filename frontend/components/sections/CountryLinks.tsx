"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";

const countries = [
  { name: "Ireland", code: "ie", flag: "/icons/countries/ie-menu.png", href: "/ireland-team" },
  { name: "Portugal", code: "pt", flag: "/icons/countries/pt-menu.png", href: "/portugal-team" },
  { name: "Spain", code: "sp", flag: "/icons/countries/sp-menu.png", href: "/spain-team" },
  { name: "Czechia", code: "cz", flag: "/icons/countries/cz-menu.png", href: "/czechia-team" },
  { name: "Romania", code: "rm", flag: "/icons/countries/rm-menu.png", href: "/romania-team" },
];

export function CountryLinks() {
  return (
    <section className="bg-[var(--color-background-soft)] pb-12 sm:pb-16">
      <Container>
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="text-sm font-bold text-[var(--color-text-primary)] mr-2">Available in:</span>
            {countries.map((country) => (
              <Link
                key={country.code}
                href={country.href}
                className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-brand-primary)]/30"
              >
                <Image
                  src={country.flag}
                  alt={country.name}
                  width={20}
                  height={20}
                  className="size-5 rounded-full object-cover"
                />
                {country.name}
                <ArrowRight className="size-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
