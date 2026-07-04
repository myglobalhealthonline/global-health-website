import Image from "next/image";
import {
  getCountryAuthorityLogos,
  type CountryCertificationLogo,
} from "@/lib/content/country-certification-logos";
import type { CountryTrust } from "@/lib/content/get-country-trust";

/**
 * Country medical-authority trust bar. Contract:
 * input: country legal/authority data from the public trust endpoint;
 * output: an ivory regulatory dossier with verification links and emergency
 * guidance. Unknown optional rows are omitted without changing route behavior.
 */

type Phrases = {
  eyebrow: string;
  headline: string;
  body: string;
  doctorsRegistered: (regulator: string) => string;
  gdpr: (law: string, authority: string) => string;
  standards: (authorities: string) => string;
  verify: string;
  emergencyTag: string;
  emergencyFallback: (n: string) => string;
  kMedical: string;
  kData: string;
  kStandards: string;
  kComplaints: string;
  kProvider: string;
};

const PHRASES: Record<string, Phrases> = {
  en: {
    eyebrow: "Regulated & verified care",
    headline: "Licensed care, checked locally.",
    body: "Registration, privacy and emergency guidance for patients booking in this market.",
    doctorsRegistered: (r) => `All doctors registered with the ${r}`,
    gdpr: (law, a) => `${law} compliant - supervised by the ${a}`,
    standards: (a) => `Clinical standards aligned with ${a}`,
    verify: "Verify",
    emergencyTag: "Emergency",
    emergencyFallback: (n) =>
      `In a medical emergency call ${n} immediately. Online consultations are not suitable for emergencies.`,
    kMedical: "Medical register",
    kData: "Data protection",
    kStandards: "Clinical standards",
    kComplaints: "Complaints",
    kProvider: "Provider registration",
  },
  pt: {
    eyebrow: "Cuidados regulados e verificados",
    headline: "Cuidados licenciados, verificados localmente.",
    body: "Registo, privacidade e orientacao de emergencia para doentes que marcam neste mercado.",
    doctorsRegistered: (r) => `Medicos inscritos na ${r}`,
    gdpr: (law, a) => `${law} conforme - supervisionado pela ${a}`,
    standards: (a) => `Padroes clinicos alinhados com ${a}`,
    verify: "Verificar",
    emergencyTag: "Emergencia",
    emergencyFallback: (n) => `Em caso de emergencia medica ligue ${n}.`,
    kMedical: "Registo medico",
    kData: "Protecao de dados",
    kStandards: "Padroes clinicos",
    kComplaints: "Reclamacoes",
    kProvider: "Registo do prestador",
  },
};

function labelOf(link: { abbreviation: string | null; name: string }): string {
  return link.abbreviation ?? link.name;
}

export function CountryTrustBar({
  trust,
  locale,
}: {
  trust: CountryTrust;
  locale?: string;
}) {
  const t = PHRASES[(locale ?? "en").toLowerCase()] ?? PHRASES.en;
  const footerLinks = trust.authorityLinks.filter((l) => l.showInFooter);

  const registry =
    footerLinks.find((l) => l.category === "DOCTOR_REGISTRY") ??
    footerLinks.find((l) => l.category === "MEDICAL_REGULATOR") ??
    null;
  const dataAuthority = footerLinks.find((l) => l.category === "DATA_PROTECTION") ?? null;
  const healthAuthorities = footerLinks.filter((l) => l.category === "HEALTH_AUTHORITY");
  const complaints = footerLinks.find((l) => l.category === "COMPLAINTS") ?? null;
  const authorityLogos = getCountryAuthorityLogos(trust.country.code);

  const regulatorName = trust.regulator?.name ?? registry?.name ?? null;
  const regulatorUrl = trust.regulator?.url ?? registry?.url ?? null;

  const medicalLogos = authorityLogos.filter(isMedicalAuthorityLogo);
  const dataLogos = authorityLogos.filter(isDataAuthorityLogo);
  const euLogo = authorityLogos.find((logo) =>
    logo.name.toLowerCase().includes("european union") || logo.name.toLowerCase().includes("eu care")
  );
  const standardsLogos = authorityLogos.filter(
    (logo) => !isMedicalAuthorityLogo(logo) && !isDataAuthorityLogo(logo),
  );

  const rows: Array<{
    kicker: string;
    text: string;
    url: string | null;
    logos: CountryCertificationLogo[];
  }> = [];
  if (regulatorName) {
    rows.push({
      kicker: t.kMedical,
      text: t.doctorsRegistered(regulatorName),
      url: regulatorUrl,
      logos: medicalLogos,
    });
  }
  if (dataAuthority) {
    rows.push({
      kicker: t.kData,
      text: t.gdpr(trust.dataProtectionLawName, labelOf(dataAuthority)),
      url: dataAuthority.url,
      logos: dataLogos.filter((logo) => logo !== euLogo),
    });
  }
  if (healthAuthorities.length > 0) {
    rows.push({
      kicker: t.kStandards,
      text: t.standards(healthAuthorities.map(labelOf).join(" - ")),
      url: null,
      logos: standardsLogos,
    });
  }
  if (complaints) {
    rows.push({ kicker: t.kComplaints, text: complaints.name, url: complaints.url, logos: [] });
  }

  return (
    <aside
      aria-label={`${trust.country.name} medical authority trust signals`}
      className="relative overflow-hidden border-y border-[rgba(29,75,54,0.14)] bg-[linear-gradient(180deg,#fffdf1_0%,#f6f8f1_52%,#edf2e2_100%)] gh-medical-pattern gh-medical-pattern-panel"
    >
      <div className="relative z-[1] mx-auto max-w-[var(--container-width)] px-5 py-[clamp(48px,6vw,78px)] md:px-10">
        <div className="overflow-hidden rounded-[32px] border border-[rgba(29,75,54,0.14)] bg-[rgba(255,253,241,0.84)] shadow-[0_24px_70px_rgba(29,75,54,0.12)] backdrop-blur-md">
          <div className="grid items-center gap-0 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-[rgba(29,75,54,0.12)] bg-[linear-gradient(145deg,rgba(29,75,54,0.08),rgba(255,255,255,0.30))] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-r-[rgba(29,75,54,0.12)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[var(--color-brand-primary)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(29,75,54,0.20)]">
                  {trust.country.name}
                </span>
                <span className="h-px flex-1 bg-[rgba(29,75,54,0.18)]" />
              </div>
              <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--color-brand-primary)]">
                {t.eyebrow}
              </p>
              <h2 className="mt-3 max-w-[12ch] text-[clamp(2rem,3.6vw,3.5rem)] font-extrabold leading-[0.96] tracking-[-0.045em] text-[var(--color-text-primary)]">
                {t.headline}
              </h2>
              <p className="mt-5 max-w-[34ch] text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                {t.body}
              </p>
              {euLogo ? (
                <div className="mt-6">
                  <AuthorityLogoLink logo={euLogo} />
                </div>
              ) : null}
            </div>

            <div className="p-5 sm:p-7">
              {trust.providerRegistration?.number ? (
                <div className="mb-4 rounded-[24px] border border-[rgba(29,75,54,0.14)] bg-[var(--color-brand-primary)] p-5 text-white shadow-[0_18px_45px_rgba(29,75,54,0.22)]">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/60">
                    {t.kProvider}
                  </span>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <span className="text-[clamp(1.15rem,1.4vw+0.55rem,1.65rem)] font-extrabold tracking-[-0.02em] text-white">
                      {trust.providerRegistration.label}
                    </span>
                    <span className="text-[clamp(1.15rem,1.4vw+0.55rem,1.65rem)] font-extrabold text-[var(--color-brand-accent)] tabular-nums">
                      No {trust.providerRegistration.number}
                    </span>
                    {trust.providerRegistration.url ? (
                      <VerifyLink href={trust.providerRegistration.url} label={t.verify} variant="dark" />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {rows.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rows.map((row) => (
                    <div
                      key={row.kicker}
                      className="rounded-[20px] border border-[rgba(29,75,54,0.12)] bg-white/72 p-4 shadow-[0_10px_28px_rgba(29,75,54,0.07)] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                    >
                      <div className="flex min-h-[112px] gap-4">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[rgba(29,75,54,0.54)]">
                            {row.kicker}
                          </span>
                          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-snug text-[var(--color-text-primary)]">
                            <span>{row.text}</span>
                            {row.url ? <VerifyLink href={row.url} label={t.verify} /> : null}
                          </p>
                        </div>
                        {row.logos.length > 0 ? (
                          <div className="flex shrink-0 flex-col gap-2">
                            {row.logos.map((logo) => (
                              <AuthorityLogoLink key={`${row.kicker}-${logo.name}`} logo={logo} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 rounded-[22px] border border-[rgba(176,241,34,0.22)] bg-[linear-gradient(135deg,#123826,#071f17)] px-5 py-4 text-white shadow-[0_18px_42px_rgba(7,31,23,0.22)] sm:flex-row sm:items-center sm:gap-5">
                <span className="shrink-0 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                  {t.emergencyTag}
                </span>
                <p className="text-[13.5px] leading-snug text-white/80">
                  {trust.emergency.notice ?? t.emergencyFallback(trust.emergency.number)}
                  {trust.emergency.nonEmergencyLine ? (
                    <span className="text-white/60"> - {trust.emergency.nonEmergencyLine}</span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AuthorityLogoLink({ logo }: { logo: CountryCertificationLogo }) {
  return (
    <a
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${logo.name}`}
      className={`${authorityLogoCardClassName(logo.tone)} group flex h-[76px] w-[104px] items-center justify-center rounded-[16px] border px-3 py-3 transition duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]`}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        className="max-h-[48px] w-auto max-w-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.14)] transition duration-300 group-hover:scale-[1.04]"
      />
    </a>
  );
}

function authorityLogoCardClassName(tone: CountryCertificationLogo["tone"] = "light"): string {
  switch (tone) {
    case "dark":
      return "border-[rgba(29,75,54,0.18)] bg-[linear-gradient(135deg,#123826,#071f17)] shadow-[0_10px_26px_rgba(29,75,54,0.12)]";
    case "blue":
      return "border-[rgba(29,75,54,0.12)] bg-[linear-gradient(135deg,#fffdf1,#e8f0ff)] shadow-[0_10px_26px_rgba(29,75,54,0.08)]";
    case "rose":
      return "border-[rgba(29,75,54,0.12)] bg-[linear-gradient(135deg,#fff8ef,#ead0d0)] shadow-[0_10px_26px_rgba(29,75,54,0.08)]";
    case "light":
    default:
      return "border-[rgba(29,75,54,0.12)] bg-white/78 shadow-[0_10px_26px_rgba(29,75,54,0.08)]";
  }
}

function isDataAuthorityLogo(logo: CountryCertificationLogo): boolean {
  const name = logo.name.toLowerCase();
  return (
    name.includes("gdpr") ||
    name.includes("lgpd") ||
    name.includes("european union") ||
    name.includes("eu care")
  );
}

function isMedicalAuthorityLogo(logo: CountryCertificationLogo): boolean {
  const name = logo.name.toLowerCase();
  return (
    name.includes("medical council") ||
    name.includes("ordem") ||
    name.includes("medical chamber") ||
    name === "omc" ||
    name === "cmr"
  );
}

function VerifyLink({
  href,
  label,
  variant = "light",
}: {
  href: string;
  label: string;
  variant?: "light" | "dark";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant === "dark"
          ? "inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-accent)] transition-opacity hover:opacity-75"
          : "inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-brand-primary)] underline decoration-[rgba(29,75,54,0.28)] underline-offset-4 transition-colors hover:text-[var(--color-brand-primary-hover)]"
      }
    >
      {label} {"->"}
    </a>
  );
}
