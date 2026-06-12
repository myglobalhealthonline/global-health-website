import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { CountryTrust } from "@/lib/content/get-country-trust";

/**
 * "Verified medical professionals" — clinical-editorial section matching the
 * country homepage system (indexed eyebrow, Manrope headline with a lime
 * accent, open hairline-rule columns, no boxes). Reassures patients the same
 * named, registered doctor on the profile carries out the consultation — not a
 * call centre or anonymous rota — and places the country regulator link in
 * prose as a genuine reference.
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
      `Every clinician on the platform is named, photographed and registered with the ${r}. You book a specific doctor — not a call centre, not an anonymous rota — and that same doctor carries out your consultation.`,
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
        body: "Credentials appear only once verified — no vague “board-certified” claims, no titles we can't evidence.",
      },
    ],
  },
  pt: {
    eyebrow: "Profissionais médicos verificados",
    heading: "O médico que marca é o médico que o",
    headingAccent: "atende",
    body: (r) =>
      `Cada clínico na plataforma é identificado, fotografado e inscrito na ${r}. Marca com um médico específico — não um call center, não uma escala anónima — e é esse médico que realiza a sua consulta.`,
    verifyAt: "Verifique qualquer registo em",
    points: [
      {
        title: "Identificado, não anónimo",
        body: "Cada perfil mostra o nome real do médico, o número de cédula e a divisão de registo. Sem escala oculta.",
      },
      {
        title: "Verificável de forma independente",
        body: "Cada registo liga diretamente ao registo público oficial, para que possa confirmá-lo antes de marcar.",
      },
      {
        title: "Apenas credenciais confirmadas",
        body: "As credenciais só aparecem depois de verificadas — sem alegações vagas nem títulos sem prova.",
      },
    ],
  },
};

const ACCENT = "#8FB021"; // mint — the light-theme accent used across editorial sections

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
  const hairline = "rgba(29,75,54,0.16)";

  return (
    <section
      aria-labelledby="verified-professionals-heading"
      style={{
        background: "var(--color-background-soft)",
        borderTop: "1px solid rgba(29,75,54,0.10)",
        borderBottom: "1px solid rgba(29,75,54,0.10)",
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <div
        className="mx-auto grid items-start gap-14 px-5 md:px-10 lg:grid-cols-[1fr_1.35fr] lg:gap-20"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Left — headline */}
        <RevealOnScroll delay={0}>
          <div className="lg:sticky lg:top-[calc(var(--header-height)+32px)]">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {c.eyebrow}
            </span>
            <h2
              id="verified-professionals-heading"
              className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
              style={{
                fontSize: "clamp(2.1rem, 4vw + 0.5rem, 3.6rem)",
                color: "var(--color-text-primary)",
                maxWidth: "16ch",
              }}
            >
              {c.heading} <span style={{ color: ACCENT }}>{c.headingAccent}</span>.
            </h2>
            <p
              className="mt-6 leading-relaxed"
              style={{
                fontSize: "var(--text-body-lg)",
                color: "var(--color-text-muted)",
                maxWidth: "40ch",
              }}
            >
              {c.body(regulatorName)}
            </p>
            {regulatorUrl ? (
              <p className="mt-5 text-[14px]" style={{ color: "var(--color-text-muted)" }}>
                {c.verifyAt}{" "}
                <a
                  href={regulatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-4 decoration-[1.5px]"
                  style={{ color: "var(--color-brand-primary)", textDecorationColor: ACCENT }}
                >
                  {hostOf(regulatorUrl)} ↗
                </a>
              </p>
            ) : null}
          </div>
        </RevealOnScroll>

        {/* Right — open editorial columns on hairline rules */}
        <RevealOnScroll stagger delay={120} className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-3">
          {c.points.map((p, i) => (
            <div
              key={p.title}
              className="flex flex-col gap-3 pt-6"
              style={{ borderTop: `2px solid ${i === 0 ? "var(--color-brand-primary)" : hairline}` }}
            >
              <span
                className="font-bold tabular-nums"
                style={{ fontSize: 13, letterSpacing: "0.1em", color: ACCENT }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[1rem] font-extrabold tracking-[-0.01em]" style={{ color: "var(--color-text-primary)" }}>
                {p.title}
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {p.body}
              </p>
            </div>
          ))}
        </RevealOnScroll>
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
