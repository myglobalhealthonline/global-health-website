import type { CountryTrust } from "@/lib/content/get-country-trust";

/**
 * Country medical-authority trust bar - a dark "regulatory ledger" that leads
 * into the site footer (same forest gradient + medical pattern). Renders the
 * legally-required rows for the country: provider registration, doctor
 * registry, data-protection authority, clinical standards, complaints book and
 * the emergency notice. All values come from the backend; this component
 * supplies the localized connective copy and the editorial treatment.
 */

type Phrases = {
  eyebrow: string;
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

  const regulatorName = trust.regulator?.name ?? registry?.name ?? null;
  const regulatorUrl = trust.regulator?.url ?? registry?.url ?? null;

  const rows: Array<{ kicker: string; text: string; url: string | null }> = [];
  if (regulatorName) {
    rows.push({ kicker: t.kMedical, text: t.doctorsRegistered(regulatorName), url: regulatorUrl });
  }
  if (dataAuthority) {
    rows.push({
      kicker: t.kData,
      text: t.gdpr(trust.dataProtectionLawName, labelOf(dataAuthority)),
      url: dataAuthority.url,
    });
  }
  if (healthAuthorities.length > 0) {
    rows.push({
      kicker: t.kStandards,
      text: t.standards(healthAuthorities.map(labelOf).join(" - ")),
      url: null,
    });
  }
  if (complaints) {
    rows.push({ kicker: t.kComplaints, text: complaints.name, url: complaints.url });
  }

  return (
    <aside
      aria-label={`${trust.country.name} medical authority trust signals`}
      className="relative overflow-hidden border-t border-white/8 bg-[linear-gradient(180deg,#12342A_0%,#0F2E25_100%)] gh-medical-pattern gh-medical-pattern-dark"
    >
      <div className="relative z-[1] mx-auto max-w-[var(--container-width)] px-5 py-[clamp(40px,5vw,64px)] md:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
            {t.eyebrow}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 tabular-nums">
            {trust.country.name}
          </span>
        </div>

        {trust.providerRegistration?.number ? (
          <div className="mt-6 border-t border-white/12 pt-5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/50">
              {t.kProvider}
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[clamp(1.1rem,1.4vw+0.6rem,1.5rem)] font-extrabold tracking-[-0.01em] text-white/92">
                {trust.providerRegistration.label}
              </span>
              <span className="text-[clamp(1.1rem,1.4vw+0.6rem,1.5rem)] font-extrabold text-[var(--color-brand-accent)] tabular-nums">
                No {trust.providerRegistration.number}
              </span>
              {trust.providerRegistration.url ? (
                <VerifyLink href={trust.providerRegistration.url} label={t.verify} />
              ) : null}
            </div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="mt-2 grid gap-x-12 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.kicker} className="border-t border-white/12 py-4">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/50">
                  {row.kicker}
                </span>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-snug text-white/92">
                  <span>{row.text}</span>
                  {row.url ? <VerifyLink href={row.url} label={t.verify} /> : null}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-1.5 rounded-r-lg border-l-2 border-l-[var(--color-brand-accent)] bg-black/20 py-3 pl-4 pr-4 sm:flex-row sm:items-center sm:gap-4">
          <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
            {t.emergencyTag}
          </span>
          <p className="text-[13.5px] leading-snug text-white/92">
            {trust.emergency.notice ?? t.emergencyFallback(trust.emergency.number)}
            {trust.emergency.nonEmergencyLine ? (
              <span className="text-white/50"> - {trust.emergency.nonEmergencyLine}</span>
            ) : null}
          </p>
        </div>
      </div>
    </aside>
  );
}

function VerifyLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-accent)] transition-opacity hover:opacity-75"
    >
      {label} {"->"}
    </a>
  );
}
