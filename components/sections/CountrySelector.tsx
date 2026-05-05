import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { countries } from "@/data/countries";

export function CountrySelector() {
  return (
    <Section
      id="countries"
      aria-labelledby="countries-heading"
      className="scroll-mt-24 bg-white"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="countries-heading"
            className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Choose your country
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Access your local clinic hub, team profiles, and consultations.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <li key={country.code}>
              <Link
                href={country.legacyHomePath}
                className="border-border bg-card text-card-foreground hover:border-primary/40 group flex min-h-[104px] flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                      {country.label}
                    </p>
                    <p className="text-lg font-semibold">{country.name}</p>
                  </div>
                  <span
                    className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full text-xs font-bold"
                    aria-hidden
                  >
                    {country.label}
                  </span>
                </div>
                <span className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                  Enter clinic
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

