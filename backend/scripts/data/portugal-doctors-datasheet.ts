/**
 * Portugal /portugal/pt/doctors profile content — per "Dr portugal seo.docx"
 * (July 2026). One entry per doctor currently live on the Portugal roster.
 *
 * `isMarketOnly: true` marks a doctor whose PRIMARY country is NOT Portugal
 * (Dr. Tiago Figueira — primary Ireland). For those, the patcher only writes
 * the `pt` DoctorCountry's DoctorMarketTranslation row (title/bio/seoTitle/
 * seoDescription) — never the base Doctor row or the shared DoctorTranslation,
 * since that would also change how the doctor's IRELAND profile renders.
 * DoctorMarketTranslation has no `qualifications` column, so `qualifications`
 * is omitted for market-only entries (base fields stay whatever the doctor's
 * primary-market brief already set).
 */

export type FaqEntry = { question: string; answer: string };

export type PortugalDoctorSheet = {
  dbSlug: string;
  /** Set only when the current base fullName is wrong (gender prefix / accent). */
  fullNameFix?: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  /** Patient-facing bio, HTML. */
  bio: string;
  qualifications?: string[];
  /** Language(s) to append to the base Doctor.languages array if missing. */
  languagesAdd?: string[];
  /** Set only when the current medicalRegistrationUrl points at the wrong registry. */
  medicalRegistrationUrlFix?: string;
  isMarketOnly?: boolean;
  faqs: FaqEntry[];
};

export const PORTUGAL_DOCTORS: PortugalDoctorSheet[] = [
  // ── 1. Dr. Tiago Figueira (primary country: Ireland — market-only) ───────
  {
    dbSlug: "dr-tiago-miguel-figueira",
    isMarketOnly: true,
    title: "Médico de Clínica Geral",
    seoTitle: "Dr. Tiago Figueira — Médico de Clínica Geral | OM 77986 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Tiago Figueira — médico registado na Ordem dos Médicos (OM 77986). MUDr. Universidade de Masaryk · Cirurgia Geral Irlanda · Diretor Clínico Global Health · Consulta no mesmo dia.",
    languagesAdd: ["Czech"],
    bio: `
<p>O Dr. Tiago Miguel Figueira é médico (MUDr.) formado em Medicina Geral pela Universidade de Masaryk, Faculdade de Medicina de Brno — uma das escolas médicas mais reconhecidas internacionalmente na Europa — com experiência clínica em Portugal, Irlanda e República Checa.</p>
<p>Antes de se dedicar integralmente à medicina online, o Dr. Figueira exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital, na Irlanda, onde adquiriu experiência prática em cuidados agudos, medicina perioperatória, assistência cirúrgica e resposta a emergências. Esta experiência hospitalar confere-lhe a base clínica para reconhecer quando uma situação requer atenção urgente — e quando não requer.</p>
<p>Atualmente, como Diretor Clínico da Global Health Irlanda e Portugal, o Dr. Figueira lidera a prestação de cuidados primários online em ambos os mercados — de Dublin a Lisboa e em todo o território nacional. Tornou-se médico online porque acredita que cuidados de saúde de qualidade devem estar disponíveis para todos — independentemente do local de residência, do idioma falado ou do tempo de espera disponível.</p>
<p>No âmbito da Global Health Portugal, o Dr. Figueira oferece consultas de clínica geral online disponíveis hoje — incluindo consultas no mesmo dia para doença aguda, renovação de receitas, atestados médicos e declarações. As suas consultas estão disponíveis para pacientes em todo o território português e as receitas emitidas são legalmente válidas em qualquer farmácia portuguesa.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infeções respiratórias, febre, gripe, dor de garganta, infeções do ouvido</li>
<li>Infeções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, problemas da tiróide, colesterol elevado</li>
<li>Problemas dermatológicos — eczema, acne, erupções cutâneas, reações alérgicas</li>
<li>Saúde da mulher e do homem — contraceção, preocupações hormonais, saúde masculina</li>
<li>Cuidados preventivos — avaliações de saúde, aconselhamento sobre estilo de vida, rastreios</li>
<li>Medicina de viagem — consultas pré-viagem, aconselhamento vacinal, prescrições para viagem</li>
<li>Gestão do peso — abordagem médica baseada em evidências, incluindo avaliação de GLP-1</li>
<li>Saúde mental — ansiedade, depressão, gestão do stress e referenciação a especialistas</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
</ul>
<p><strong>A sua abordagem:</strong> Cada consulta com o Dr. Figueira é personalizada, baseada em evidências e realizada com o mesmo padrão clínico que esperaria de uma consulta presencial. Dedica tempo a ouvir, explica de forma clara e assegura que sai da consulta com um plano concreto — não apenas com uma receita.</p>
`.trim(),
    faqs: [
      {
        question: "O Dr. Tiago Figueira está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Tiago Miguel Figueira está registado na Ordem dos Médicos (OM) com o número 77986. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Figueira é formado em Medicina pela Universidade de Masaryk, Brno, e está também registado no Irish Medical Council (IMC 523449) na Irlanda, onde exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital.",
      },
      {
        question: "O que trata o Dr. Tiago Figueira em consulta online?",
        answer:
          "O Dr. Figueira oferece consultas de clínica geral online para: doença aguda (infeções respiratórias, febre, gripe, dor de garganta, infeções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol elevado), problemas dermatológicos, saúde da mulher e do homem (contraceção, preocupações hormonais), cuidados preventivos, medicina de viagem, gestão do peso (incluindo avaliação de GLP-1), saúde mental (ansiedade, depressão, stress) e atestados médicos, declarações e renovação de receitas.",
      },
      {
        question: "As receitas emitidas em consulta online são válidas em farmácias portuguesas?",
        answer:
          "Sim. As receitas emitidas pelo Dr. Figueira em consulta de telemedicina são legalmente válidas em qualquer farmácia em Portugal. O Dr. Figueira está registado na Ordem dos Médicos (OM 77986) e as suas prescrições cumprem os requisitos legais para receita eletrónica em Portugal. A receita é enviada por e-mail após a consulta.",
      },
      {
        question: "O Dr. Figueira tem experiência em medicina de emergência e cirurgia?",
        answer:
          "Sim. O Dr. Figueira exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital, na Irlanda, com experiência em cuidados agudos, medicina perioperatória, assistência cirúrgica e resposta a emergências. Esta formação hospitalar em ambiente cirúrgico de alta exigência confere-lhe a capacidade de avaliar rapidamente a gravidade de um sintoma — distinguindo o que pode ser tratado online do que requer atenção presencial imediata.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Figueira?",
        answer:
          "Selecione um horário disponível nesta página para agendar diretamente com o Dr. Figueira. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês, espanhol, francês ou checo. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. Figueira?",
        answer:
          "O Dr. Tiago Miguel Figueira é médico (MUDr.) pela Universidade de Masaryk, Faculdade de Medicina de Brno. Exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital, Irlanda. É Diretor Clínico da Global Health Irlanda e Portugal, registado na Ordem dos Médicos (OM 77986) e no Irish Medical Council (IMC 523449). Detém certificação em Suporte Básico e Avançado de Vida (BLS e ALS) pelo European Resuscitation Council. Consulta em português, inglês, espanhol, francês e checo.",
      },
    ],
  },
];
