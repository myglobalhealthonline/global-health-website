import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { BadgeCheck, SearchCheck, UserCheck } from "lucide-react";
import type { CountryTrust } from "@/lib/content/get-country-trust";

/**
 * Clinical trust section for country homepages. The contract is:
 * input: country authority data from `/api/public/countries/:code/trust`;
 * output: patient-facing verification copy and a regulator link.
 */

type Copy = {
  eyebrow: string;
  heading: string;
  headingAccent: string;
  body: (regulator: string) => string;
  verifyAt: string;
  points: Array<{ title: string; body: string }>;
};

const COPY: Record<string, Copy> = {
  en: {
    eyebrow: "Verified medical professionals",
    heading: "The doctor you book is the doctor you",
    headingAccent: "see",
    body: (r) =>
      `Every clinician on the platform is named, photographed and registered with the ${r}. You book a specific doctor - not a call centre, not an anonymous rota - and that same doctor carries out your consultation.`,
    verifyAt: "Verify any registration at",
    points: [
      {
        title: "Named, not anonymous",
        body: "Each profile carries the doctor's real name, registration number and register division. No hidden rota behind the booking.",
      },
      {
        title: "Independently verifiable",
        body: "Every registration links straight to the official public register, so you can confirm it yourself before you book.",
      },
      {
        title: "Confirmed credentials only",
        body: "Credentials appear only once verified - no vague board-certified claims, no titles we cannot evidence.",
      },
    ],
  },
  pt: {
    eyebrow: "Profissionais medicos verificados",
    heading: "O medico que marca e o medico que o",
    headingAccent: "atende",
    body: (r) =>
      `Cada clinico na plataforma e identificado, fotografado e inscrito na ${r}. Marca com um medico especifico - nao um call center, nao uma escala anonima - e e esse medico que realiza a sua consulta.`,
    verifyAt: "Verifique qualquer registo em",
    points: [
      {
        title: "Identificado, nao anonimo",
        body: "Cada perfil mostra o nome real do medico, o numero de cedula e a divisao de registo. Sem escala oculta.",
      },
      {
        title: "Verificavel de forma independente",
        body: "Cada registo liga diretamente ao registo publico oficial, para que possa confirma-lo antes de marcar.",
      },
      {
        title: "Apenas credenciais confirmadas",
        body: "As credenciais so aparecem depois de verificadas - sem alegacoes vagas nem titulos sem prova.",
      },
    ],
  },
};

export function VerifiedProfessionals({
  trust,
  locale,
}: {
  trust: CountryTrust;
  locale?: string;
}) {
  const c = COPY[(locale ?? "en").toLowerCase()] ?? COPY.en;
  const regulatorName = trust.regulator?.name ?? "the national medical regulator";
  const regulatorUrl = trust.regulator?.url ?? null;

  return (
    <section
      aria-labelledby="verified-professionals-heading"
      className="relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel py-[clamp(64px,8vw,120px)]"
    >
      <SectionSeam theme="light" />
      <SectionSeam position="bottom" theme="light" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
          <RevealOnScroll delay={0}>
            <div className="lg:sticky lg:top-[calc(var(--header-height)_+_32px)]">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-primary)]">
                {c.eyebrow}
              </span>
              <h2
                id="verified-professionals-heading"
                className="mt-5 max-w-[16ch] text-[clamp(2.1rem,calc(4vw_+_0.5rem),3.6rem)] font-extrabold leading-[1.0] tracking-[-0.035em] text-[var(--color-text-primary)]"
              >
                {c.heading}{" "}
                <span className="text-[#8FB021]">{c.headingAccent}</span>.
              </h2>
              <p className="mt-6 max-w-[40ch] text-[length:var(--text-body-lg)] leading-relaxed text-[var(--color-text-muted)]">
                {c.body(regulatorName)}
              </p>
              {regulatorUrl ? (
                <p className="mt-5 text-[14px] text-[var(--color-text-muted)]">
                  {c.verifyAt}{" "}
                  <a
                    href={regulatorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-brand-primary)] underline decoration-[#8FB021] decoration-[1.5px] underline-offset-4"
                  >
                    {hostOf(regulatorUrl)} - external
                  </a>
                </p>
              ) : null}
            </div>
          </RevealOnScroll>

          <RevealOnScroll
            stagger
            delay={120}
            className="grid grid-cols-1 gap-5 sm:grid-cols-3"
          >
            {c.points.map((point, index) => {
              const Icon = [UserCheck, SearchCheck, BadgeCheck][index] ?? BadgeCheck;
              return (
                <div
                  key={point.title}
                  className="gh2-glass-forest gh2-glass-hover relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6"
                >
                  {/* Top accent hairline — lime, matches StatsBand card language */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--color-brand-accent), rgba(176,241,34,0.2))",
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex size-11 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(176,241,34,0.10)",
                        border: "1px solid rgba(176,241,34,0.18)",
                        color: "var(--color-brand-accent)",
                      }}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />
                    </span>
                    <span className="text-[13px] font-bold tracking-[0.1em] text-[var(--color-brand-accent)] [font-variant-numeric:tabular-nums]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-[1rem] font-extrabold tracking-[-0.01em] text-white/90">
                    {point.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-white/65">
                    {point.body}
                  </p>
                </div>
              );
            })}
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
