import Image from "next/image";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import {
  getCountryPartnerLogos,
  type CountryCertificationLogo,
} from "@/lib/content/country-certification-logos";
import type { CountryTrust } from "@/lib/content/get-country-trust";

type Copy = {
  eyebrow: string;
  heading: string;
  body: string;
  partnersRow: string;
};

const COPY: Record<string, Copy> = {
  en: {
    eyebrow: "Operational partners",
    heading: "Partners supporting care in this market.",
    body: "These are the pharmacy, diagnostics and care partners connected to local service delivery.",
    partnersRow: "Trusted partners",
  },
  pt: {
    eyebrow: "Parceiros operacionais",
    heading: "Parceiros que apoiam os cuidados neste mercado.",
    body: "Farmacias, diagnostico e parceiros clinicos ligados a prestacao local de servicos.",
    partnersRow: "Parceiros de confianca",
  },
};

export function CountryCertificationLogos({
  trust,
  locale,
}: {
  trust: CountryTrust;
  locale?: string;
}) {
  // Commercial partners ONLY. Regulatory / accreditation badges render in
  // the "Regulated & verified care" trust bar above the footer — never mix
  // the two in one row (brand guideline). Countries without partners skip
  // this section entirely.
  const partnerLogos = getCountryPartnerLogos(trust.country.code);
  if (partnerLogos.length === 0) return null;

  const c = COPY[(locale ?? "en").toLowerCase()] ?? COPY.en;

  return (
    <section
      aria-label={`${trust.country.name} certification and partner logos`}
      className="relative overflow-hidden bg-[radial-gradient(circle_at_10%_12%,rgba(176,241,34,0.18),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(135deg,#08241a_0%,#123826_48%,#071f17_100%)] py-[clamp(44px,5vw,72px)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:58px_58px] opacity-35" />
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <RevealOnScroll delay={0}>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
              {c.eyebrow}
            </p>
            <h2 className="mt-3 max-w-[18ch] text-[clamp(1.9rem,3vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-white">
              {c.heading}
            </h2>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-white/70">
              {c.body}
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={130}>
          <LogoRow
            label={c.partnersRow}
            logos={partnerLogos}
            countryCode={trust.country.code}
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}

function LogoRow({
  label,
  logos,
  countryCode,
}: {
  label: string;
  logos: CountryCertificationLogo[];
  countryCode: string;
}) {
  const firstLogoIsDark = logos[0]?.tone === "dark";
  return (
    <div className="mt-8">
      <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/55">
        {label}
        <span aria-hidden className="h-px flex-1 bg-white/12" />
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {logos.map((logo, index) => (
          <li key={`${countryCode}-${logo.name}`}>
            <LogoLink logo={logo} index={index} firstLogoIsDark={firstLogoIsDark} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogoLink({ logo, index, firstLogoIsDark }: { logo: CountryCertificationLogo; index: number; firstLogoIsDark: boolean }) {
  // Alternate pattern based on first logo's tone:
  // If first is dark: dark-ivory-dark (indices 0,2 = dark; index 1 = ivory)
  // If first is ivory: ivory-dark-ivory (indices 0,2 = ivory; index 1 = dark)
  const shouldBeDark = firstLogoIsDark 
    ? index % 2 === 0  // positions 0, 2 = dark
    : index % 2 === 1; // position 1 = dark

  return (
    <a
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${logo.name}`}
      className={shouldBeDark
        ? "group flex h-[148px] items-center justify-center rounded-[22px] border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.055))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(0,0,0,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]"
        : "group flex h-[148px] items-center justify-center rounded-[22px] border border-[rgba(29,75,54,0.12)] bg-[#f6f8f1] px-6 py-5 shadow-[0_10px_28px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(0,0,0,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]"}
    >
      <span className="flex h-full w-full items-center justify-center">
        <Image
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          className="max-h-[72px] w-auto max-w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition duration-300 group-hover:scale-[1.05]"
        />
      </span>
    </a>
  );
}
