import { createHash } from "node:crypto";

export type PortugalFaqSafetyPatch = Readonly<{
  id: string;
  targetKind: "doctor" | "service";
  slug: string;
  question: string;
  originalAnswer: string;
  proposedAnswer: string;
  evidenceUrls: readonly string[];
}>;

export type PortugalDisclaimerSafetyPatch = Readonly<{
  id: string;
  targetKind: "legalDocument";
  locale: "pt";
  fragments: readonly Readonly<{
    original: string;
    proposed: string;
    expectedOccurrences: number;
  }>[];
  publication?: Readonly<{
    expectedVersion: number;
    proposedVersion: number;
    expectedPublishedAt: string;
    proposedPublishedAt: string;
  }>;
  evidenceUrls: readonly string[];
}>;

export type PortugalSafetyPatch = PortugalFaqSafetyPatch | PortugalDisclaimerSafetyPatch;

const EVIDENCE = [
  "https://portugal.gov.pt/gc25/comunicacao/noticias/nova-linha-de-prevencao-do-suicidio-entra-em-funcionamento",
] as const;

export const PORTUGAL_FAQ_SAFETY_PATCHES: readonly PortugalFaqSafetyPatch[] = [
  {
    id: "doctor:beatriz-carvalho:crisis-contact",
    targetKind: "doctor",
    slug: "beatriz-carvalho",
    question: "Como agendar uma sessão com a Beatriz?",
    originalAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com a Beatriz. O pagamento é processado de forma segura no momento do agendamento — a sessão é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As sessões são realizadas por videochamada segura e confidencial em português ou inglês. Se está a experienciar uma crise psicológica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 (1024) ou ligue ao 112 — não espere por uma sessão.",
    proposedAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com a Beatriz. O pagamento é processado de forma segura no momento do agendamento — a sessão é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As sessões são realizadas por videochamada segura e confidencial em português ou inglês. Se está a experienciar uma crise psicológica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112 — não espere por uma sessão.",
    evidenceUrls: EVIDENCE,
  },
  {
    id: "doctor:dr-joana-branco-maia:crisis-contact",
    targetKind: "doctor",
    slug: "dr-joana-branco-maia",
    question: "Como agendar uma consulta com a Dra. Joana Branco Maia?",
    originalAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com a Dra. Joana Branco Maia. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês ou espanhol. Se está a experienciar uma crise psicológica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 (1024) ou ligue ao 112.",
    proposedAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com a Dra. Joana Branco Maia. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês ou espanhol. Se está a experienciar uma crise psicológica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112.",
    evidenceUrls: EVIDENCE,
  },
  {
    id: "doctor:dr-ruben-pereira:crisis-contact",
    targetKind: "doctor",
    slug: "dr-ruben-pereira",
    question: "Como agendar uma consulta com o Dr. Rúben Pereira?",
    originalAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com o Dr. Rúben Pereira. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, contacte o SNS24 (1024) ou ligue ao 112 — não espere por uma consulta.",
    proposedAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com o Dr. Rúben Pereira. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112 — não espere por uma consulta.",
    evidenceUrls: EVIDENCE,
  },
  {
    id: "doctor:dr-telmo-coelho:crisis-contact",
    targetKind: "doctor",
    slug: "dr-telmo-coelho",
    question: "Como agendar uma consulta com o Dr. Telmo Coelho?",
    originalAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com o Dr. Telmo Coelho. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 (1024) ou ligue ao 112 — não espere por uma consulta.",
    proposedAnswer:
      "Selecione um horário disponível nesta página para agendar directamente com o Dr. Telmo Coelho. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112 — não espere por uma consulta.",
    evidenceUrls: EVIDENCE,
  },
  {
    id: "service:saude-mental:crisis-contact",
    targetKind: "service",
    slug: "saude-mental",
    question: "E se estiver em crise durante ou após a consulta?",
    originalAnswer:
      "Se está em crise, utilize os recursos de crise indicados no topo desta página — SNS 24 (808 24 24 24), Linha de Vida Segura (808 200 204), ou 112 em caso de perigo imediato. O nosso serviço não é um serviço de intervenção em crise.",
    proposedAnswer:
      "Se está em crise ou a ter pensamentos de suicídio ou autolesão, ligue 1411. Em caso de perigo imediato, ligue 112. O nosso serviço não é um serviço de intervenção em crise.",
    evidenceUrls: EVIDENCE,
  },
];

export const PORTUGAL_DISCLAIMER_SAFETY_PATCH: PortugalDisclaimerSafetyPatch = {
  id: "legal:medical-disclaimer:crisis-contact",
  targetKind: "legalDocument",
  locale: "pt",
  fragments: [
    {
      original:
        '<li>Linha de Vida Segura (prevenção do suicídio) — <a href="tel:808200204">808 200 204</a></li>',
      proposed:
        '<li>Linha Nacional de Prevenção do Suicídio e Apoio Psicológico — <a href="tel:1411">1411</a></li>',
      expectedOccurrences: 1,
    },
    {
      original:
        '<li>Linha de Vida Segura — <a href="tel:808200204">808 200 204</a></li>',
      proposed:
        '<li>Linha Nacional de Prevenção do Suicídio e Apoio Psicológico — <a href="tel:1411">1411</a></li>',
      expectedOccurrences: 2,
    },
    {
      original: "<p><em>Última atualização: Junho 2026</em></p>",
      proposed: "<p><em>Última atualização: Setembro 2026</em></p>",
      expectedOccurrences: 1,
    },
  ],
  publication: {
    expectedVersion: 1,
    proposedVersion: 2,
    expectedPublishedAt: "2026-07-01T17:39:29.439Z",
    proposedPublishedAt: "2026-09-01T17:58:44.337Z",
  },
  evidenceUrls: EVIDENCE,
};

export const PORTUGAL_SAFETY_PATCHES: readonly PortugalSafetyPatch[] = [
  ...PORTUGAL_FAQ_SAFETY_PATCHES,
  PORTUGAL_DISCLAIMER_SAFETY_PATCH,
];

export function portugalFaqSafetyPatchSha256(patch: PortugalSafetyPatch): string {
  return createHash("sha256").update(JSON.stringify(patch)).digest("hex");
}

export function portugalFaqSafetyPatchToken(patch: PortugalSafetyPatch): string {
  return `PT-FAQ-SAFETY-${portugalFaqSafetyPatchSha256(patch).slice(0, 12).toUpperCase()}`;
}
