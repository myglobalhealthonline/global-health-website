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
      `Cada clinico na plataforma e identificado, fotografado e inscrito no ${r}. Marca com um medico especifico - nao um call center, nao uma escala anonima - e e esse medico que realiza a sua consulta.`,
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
  es: {
    eyebrow: "Profesionales médicos verificados",
    heading: "El médico que reserva es el médico que",
    headingAccent: "le atiende",
    body: (r) =>
      `Cada médico de la plataforma tiene nombre, foto y colegiación en el ${r}. Reserva con un médico concreto - no con un call center, no con un turno anónimo - y es ese mismo médico quien realiza su consulta.`,
    verifyAt: "Verifique cualquier colegiación en",
    points: [
      {
        title: "Con nombre, no anónimo",
        body: "Cada perfil muestra el nombre real del médico, su número de colegiado y su especialidad. Sin turnos ocultos detrás de la reserva.",
      },
      {
        title: "Verificable de forma independiente",
        body: "Cada colegiación enlaza directamente al registro público oficial, para que pueda confirmarlo usted mismo antes de reservar.",
      },
      {
        title: "Solo credenciales confirmadas",
        body: "Las credenciales solo aparecen una vez verificadas - sin certificaciones vagas, sin títulos que no podamos acreditar.",
      },
    ],
  },
  cs: {
    eyebrow: "Ověření lékaři",
    heading: "Lékař, kterého si rezervujete, je lékař, který vás",
    headingAccent: "ošetří",
    body: (r) =>
      `Každý lékař na platformě má uvedené jméno, fotografii a registraci u ${r}. Rezervujete konkrétního lékaře - ne call centrum, ne anonymní rotaci - a stejný lékař provede vaši konzultaci.`,
    verifyAt: "Ověřte registraci na",
    points: [
      {
        title: "Jmenovitě, ne anonymně",
        body: "Každý profil obsahuje skutečné jméno lékaře, registrační číslo a obor registrace. Žádná skrytá rotace za rezervací.",
      },
      {
        title: "Nezávisle ověřitelné",
        body: "Každá registrace odkazuje přímo na oficiální veřejný registr, takže si ji můžete sami ověřit před rezervací.",
      },
      {
        title: "Pouze potvrzené kvalifikace",
        body: "Kvalifikace se zobrazují až po ověření - žádná vágní tvrzení, žádné tituly, které nemůžeme doložit.",
      },
    ],
  },
  ro: {
    eyebrow: "Profesioniști medicali verificați",
    heading: "Medicul pe care îl rezervați este medicul pe care îl",
    headingAccent: "vedeți",
    body: (r) =>
      `Fiecare clinician de pe platformă este nominal, fotografiat și înregistrat la ${r}. Rezervați un medic specific - nu un centru de apeluri, nu un program anonim - și același medic efectuează consultația dumneavoastră.`,
    verifyAt: "Verificați orice înregistrare la",
    points: [
      {
        title: "Nominal, nu anonim",
        body: "Fiecare profil conține numele real al medicului, numărul de înregistrare și divizia din registru. Niciun program ascuns în spatele rezervării.",
      },
      {
        title: "Verificabil independent",
        body: "Fiecare înregistrare face trimitere direct la registrul public oficial, ca să o puteți confirma singur înainte de a rezerva.",
      },
      {
        title: "Doar acreditive confirmate",
        body: "Acreditivele apar doar după verificare - fără afirmații vagi, fără titluri pe care nu le putem dovedi.",
      },
    ],
  },
  de: {
    eyebrow: "Verifizierte Ärzte",
    heading: "Der Arzt, den Sie buchen, ist der Arzt, der Sie",
    headingAccent: "behandelt",
    body: (r) =>
      `Jeder Kliniker auf der Plattform ist namentlich genannt, mit Foto und bei der ${r} registriert. Sie buchen einen bestimmten Arzt - kein Callcenter, keine anonyme Rotation - und derselbe Arzt führt Ihre Konsultation durch.`,
    verifyAt: "Registrierung überprüfen unter",
    points: [
      {
        title: "Namentlich, nicht anonym",
        body: "Jedes Profil zeigt den echten Namen des Arztes, die Registrierungsnummer und die Zulassungsabteilung. Keine versteckte Rotation hinter der Buchung.",
      },
      {
        title: "Unabhängig überprüfbar",
        body: "Jede Registrierung verlinkt direkt zum offiziellen öffentlichen Register, sodass Sie sie selbst vor der Buchung bestätigen können.",
      },
      {
        title: "Nur bestätigte Qualifikationen",
        body: "Qualifikationen erscheinen erst nach Verifizierung - keine vagen Behauptungen, keine Titel, die wir nicht belegen können.",
      },
    ],
  },
};

// Country-scoped eyebrow overrides — keyed by `${countryCode}:${locale}` so
// a market-specific regulator claim never leaks onto another market's page
// (same no-leak rule as country-home-copy.ts / country-doctors-copy.ts).
const EYEBROW_OVERRIDE: Record<string, string> = {
  "IE:en": "IMC-verified doctors and clinicians",
  "IE:es": "Médicos y clínicos verificados por el IMC",
  "IE:pt": "Médicos e clínicos verificados pelo IMC",
  "IE:cs": "Lékaři a klinici ověření IMC",
  "IE:ro": "Medici și clinicieni verificați de IMC",
  "IE:de": "Von IMC verifizierte Ärzte und Kliniker",
};

// Brazil's default locale (pt) shares the `pt` entry in COPY above, which is
// Portugal's own PT-PT market copy ("marca", "escala", "registo") — wrong
// dialect for Brazil (PT-BR: "agenda", "plantão", "registro") and wrong
// regulator vocabulary (Brazil uses CRM/CFM, not a single "Ordem"-style
// register). Full standalone override, not a merge into COPY.pt, so
// Portugal's copy is untouched — same no-leak rule as EYEBROW_OVERRIDE.
const BR_PT_COPY: Copy = {
  eyebrow: "Profissionais médicos verificados",
  heading: "O médico que você agenda é o médico que te",
  headingAccent: "atende",
  body: (r) =>
    `Cada clínico na plataforma é identificado pelo nome, tem foto e está registrado no ${r} do seu estado. Você agenda com um médico específico — não um call center, não uma escala anônima — e é esse médico que realiza a sua consulta.`,
  verifyAt: "Verifique qualquer registro em",
  points: [
    {
      title: "Identificado, não anônimo",
      body: "Cada perfil contém o nome real do médico, seu número de registro no CRM e o estado de registro. Nenhum plantão oculto por trás do agendamento.",
    },
    {
      title: "Verificável de forma independente",
      body: "Cada registro linka diretamente para o portal público oficial do CFM, para que você possa confirmar antes de agendar.",
    },
    {
      title: "Apenas credenciais confirmadas",
      body: "As credenciais aparecem somente após verificação — sem alegações vagas, sem títulos que não possamos comprovar.",
    },
  ],
};

export function VerifiedProfessionals({
  trust,
  locale,
  country,
}: {
  trust: CountryTrust;
  locale?: string;
  /** Country code (e.g. "IE") — scopes eyebrow overrides to one market. */
  country?: string;
}) {
  const isBrPt = (country ?? "").toUpperCase() === "BR" && (locale ?? "en").toLowerCase() === "pt";
  const c = isBrPt ? BR_PT_COPY : (COPY[(locale ?? "en").toLowerCase()] ?? COPY.en);
  const regulatorName = trust.regulator?.name ?? "the national medical regulator";
  const regulatorUrl = trust.regulator?.url ?? null;
  const eyebrow =
    EYEBROW_OVERRIDE[`${(country ?? "").toUpperCase()}:${(locale ?? "en").toLowerCase()}`] ??
    c.eyebrow;

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
                {eyebrow}
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
