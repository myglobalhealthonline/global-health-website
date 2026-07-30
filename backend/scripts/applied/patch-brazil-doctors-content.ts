/**
 * Patch Brazil /brazil/pt/doctors (DOCTORS_INDEX) page content + Dr. Renato
 * Ziviani Sarmento's doctor profile per the July 2026 SEO briefs
 * ("Brazil doctors SEO.docx" + "GlobalHealth_Brazil_DoctorsPage_Brief.docx").
 *
 *   node --env-file=.env --import tsx scripts/patch-brazil-doctors-content.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-brazil-doctors-content.ts --apply    # write
 *
 * SAFE BY DESIGN: writes match on current values where possible; re-running is
 * a no-op. Dry-run (default) prints exactly what would change.
 *
 * Covers:
 *   - Doctor base row + PT DoctorTranslation + br DoctorMarketTranslation
 *     (title, bio, seoTitle/seoDescription, qualifications) — the market
 *     translation OVERRIDES base fields on /brazil/pt/doctors/dr-renato-sarmento,
 *     so all three must carry the same content (Tiago-brief lesson).
 *   - 6 PT DoctorFaq rows (doctor-profile FAQPage schema).
 *   - PageContent DOCTORS_INDEX/br: PT seoTitle/seoDescription, whyChooseTitle,
 *     whyChooseItems, intro, whoForItems (PT-BR normalization + CFM/CRM
 *     terminology), FAQ Q2 rewrite + Q3/Q4/Q5 append, disclaimer terminology.
 *   - Same DOCTORS_INDEX/br EN + ES translations: Q3/Q4/Q5 append (translated,
 *     not fabricated-new-content) + ES "colegiado/colegiación" terminology fix
 *     (Spain-specific vocabulary that doesn't apply to Brazil's CRM/CFM system).
 *
 * Deliberately NOT covered (see conversation notes):
 *   - Canonical/OG URL = NEXT_PUBLIC_SITE_URL Railway env (human, same blocker
 *     as every prior country brief).
 *   - OG locale:alternate "de_BR" -> "en_GB": NOT applied. hreflang.ts's
 *     ogLocales() lists every supported locale as an alternate by design
 *     (tested in hreflang.test.ts) — every country page is served in all 6
 *     site languages, so German is a legitimate alternate, not a bug tied to
 *     Brazil specifically. Hardcoding a single "en_GB" alternate would break
 *     that tested, site-wide convention for a claim the brief doesn't
 *     otherwise substantiate.
 *   - Footer "Marcar consulta" -> "Agendar consulta" / "Os nossos médicos" ->
 *     "Nossos médicos": these are LANGUAGE-scoped i18n keys shared by every
 *     pt-locale market (Portugal included) with no per-country override slot
 *     (unlike the doctors-page bundle, which country-doctors-copy.ts already
 *     overrides). Fixing them site-wide would change Portugal's copy too;
 *     out of scope for a single doctors-page brief.
 *   - CS/RO/DE PageContentTranslation rows for DOCTORS_INDEX/br: none exist
 *     yet and the brief supplies no content for them — not fabricated here.
 *     (country-doctors-copy.ts's br:cs/ro/de hero-card fix still applies
 *     regardless, since that's bundle-level, not PageContent-level.)
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const note = (m: string) => console.log(m);

// ── Doctor profile content (doc: "Brazil doctors SEO.docx") ────────────────

const TITLE = "Médico de Família e Comunidade";
const SEO_TITLE = "Dr. Renato Sarmento — Médico de Família | CRM-SP 170.837 | Global Health Brasil";
const SEO_DESCRIPTION =
  "Agende uma videoconsulta com Dr. Renato Sarmento — médico de família registrado no CRM-SP (nº 170.837). Cuidados Paliativos · Telemedicina · Mestrado UPSA · Residência Casa de Saúde Santa Marcelina. Consulta no mesmo dia.";

const QUALIFICATIONS = [
  "Residência Médica em Medicina de Família e Comunidade — Casa de Saúde Santa Marcelina, São Paulo",
  "Mestrado em Cuidados Paliativos — Universidad Pontificia de Salamanca, Espanha (2023–2024)",
  "MBA em Gestão, Inovação e Serviços em Saúde — PUC-RS (2024–2025)",
  "Especialização em Medicina Paliativa — Centro Universitário São Camilo, São Paulo",
  "Médico de Família na Telemedicina — modelo híbrido SUS/saúde suplementar, São Paulo (2023–atual)",
  "Coordenador Médico — Programa Melhor em Casa, Hospital Santa Marcelina OS, São Paulo",
  "Médico Visitador de Atenção Domiciliar — DASA, São Paulo",
  "Médico Paliativista — Ambulatório de Cuidados Paliativos, Hospital Santa Marcelina / AME Itaquera",
  "Médico da Estratégia Saúde da Família — 2013–2017",
  "Graduação em Medicina — Centro Universitário do Estado do Pará, Belém",
  "Registrado no CRM-SP nº 170.837 e CRM-PA nº 11.426",
  "Atendimentos prestados por meio da Pallium Cuidados Integrados LTDA (CNPJ: 35.020.828/0001-96)",
];

const BIO_HTML = `
<p>O Dr. Renato Ziviani Sarmento é médico de família e comunidade com mais de dez anos de experiência nos sistemas público e suplementar de saúde, com atuação consolidada em Atenção Primária à Saúde (APS), Cuidados Paliativos e Telemedicina — uma combinação rara que o posiciona como um dos profissionais mais completos disponíveis para consulta online no Brasil.</p>
<p>Graduado em Medicina pelo Centro Universitário do Estado do Pará, completou sua Residência Médica em Medicina de Família e Comunidade na Casa de Saúde Santa Marcelina, referência nacional em Saúde da Família em São Paulo. Aprofundou sua formação em Cuidados Paliativos com especialização no Centro Universitário São Camilo e, mais recentemente, concluiu um Mestrado em Cuidados Paliativos pela Universidad Pontificia de Salamanca (Espanha) — formação europeia de alto nível que enriquece sua prática com uma perspetiva internacional. É também MBA em Gestão, Inovação e Serviços em Saúde pela PUC-RS.</p>
<p>Atualmente atua em telemedicina integrada à Atenção Básica, com experiência em modelo híbrido de Consultório Digital dentro de Unidade Básica de Saúde da Estratégia Saúde da Família em São Paulo — um dos formatos mais inovadores de telemedicina no SUS — além de experiência em plataformas de Pronto Atendimento Digital para a saúde suplementar, atendendo pacientes de todas as idades e regiões do Brasil. Os atendimentos pela Global Health são realizados por meio da Pallium Cuidados Integrados LTDA (CNPJ: 35.020.828/0001-96).</p>
<p>Sua experiência como coordenador médico do Programa Melhor em Casa do Hospital Santa Marcelina — supervisionando equipes multiprofissionais de atenção domiciliar, conduzindo discussões clínicas, gerindo indicadores e integrando redes de cuidado — traduz-se em uma visão sistêmica da saúde que vai muito além da consulta individual. O Dr. Renato entende o cuidado como um processo longitudinal, e não como uma série de atendimentos isolados.</p>
<p>Para pacientes com doenças crônicas, condições complexas ou que enfrentam situações de fim de vida, a combinação de Medicina de Família e Cuidados Paliativos é especialmente valiosa: significa um médico que sabe cuidar da pessoa inteira — não apenas da doença — e que tem formação específica para acompanhar os momentos mais difíceis da vida com competência clínica e humanidade.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Medicina de família e atenção primária — doenças agudas, gestão de condições crônicas, promoção e prevenção em saúde</li>
<li>Doenças crônicas — hipertensão, diabetes, dislipidemia, hipotireoidismo, asma, DPOC</li>
<li>Cuidados Paliativos — suporte a pacientes com doenças avançadas, controle de sintomas, suporte à família, qualidade de vida</li>
<li>Acompanhamento de doenças oncológicas avançadas — suporte paliativo, controle de dor e sintomas</li>
<li>Saúde da mulher, do homem e do idoso — acompanhamento longitudinal e preventivo</li>
<li>Saúde mental — ansiedade, depressão, manejo do estresse e encaminhamento a especialistas</li>
<li>Pós-hospitalização e transição de cuidados — acompanhamento após alta hospitalar, prevenção de reintegrações</li>
<li>Saúde digital e teleconsulta — orientações sobre uso de tecnologias de saúde, monitoramento remoto</li>
<li>Atestados médicos, declarações e encaminhamentos</li>
<li>Renovação de receitas e revisão de medicações</li>
</ul>
<p><strong>Sua abordagem:</strong> O Dr. Renato pratica uma medicina centrada na pessoa — não no diagnóstico isolado, mas no contexto de vida, nas prioridades e nos valores de quem está sendo cuidado. Sua formação em Cuidados Paliativos aprofundou essa visão: independentemente da condição clínica, toda consulta deve terminar com o paciente sentindo que foi ouvido, que entendeu o que está acontecendo com ele e que tem um plano claro para os próximos passos.</p>
`.trim();

const DOCTOR_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "O Dr. Renato Sarmento é registrado no CRM?",
    answer:
      "Sim. O Dr. Renato Ziviani Sarmento é registrado no Conselho Regional de Medicina de São Paulo (CRM-SP) sob o número 170.837 e no CRM do Pará (CRM-PA) sob o número 11.426. Você pode verificar essa inscrição no portal do CFM em portal.cfm.org.br. Os atendimentos são prestados por meio da Pallium Cuidados Integrados LTDA (CNPJ: 35.020.828/0001-96). É médico de família e comunidade com mais de dez anos de experiência no SUS e na saúde suplementar, com Residência na Casa de Saúde Santa Marcelina e Mestrado em Cuidados Paliativos pela Universidad Pontificia de Salamanca.",
  },
  {
    question: "O que o Dr. Renato trata em consulta online?",
    answer:
      "O Dr. Renato oferece consultas de medicina de família e atenção primária para: doenças agudas (infeções respiratórias, febre, gripe, infeções urinárias), gestão de doenças crônicas (hipertensão, diabetes, dislipidemia, hipotireoidismo, asma, DPOC), Cuidados Paliativos (suporte a pacientes com doenças avançadas, controle de sintomas, suporte à família), saúde da mulher, do homem e do idoso, saúde mental (ansiedade, depressão, estresse), pós-hospitalização e transição de cuidados, atestados médicos, renovação de receitas e encaminhamentos.",
  },
  {
    question: "O que são os Cuidados Paliativos e por que são relevantes em uma consulta online?",
    answer:
      "Cuidados Paliativos é a área da medicina dedicada a melhorar a qualidade de vida de pacientes com doenças graves ou avançadas — oncológicas, neurológicas, cardíacas, pulmonares ou outras condições crônicas complexas — por meio do controle de sintomas, alívio do sofrimento físico, emocional, social e espiritual, e do suporte à família. O Dr. Renato tem Mestrado em Cuidados Paliativos pela Universidad Pontificia de Salamanca e experiência clínica como paliativista no Ambulatório do Hospital Santa Marcelina. Em uma consulta online, isso significa um médico capacitado para conversar sobre progressão de doença, qualidade de vida, tomada de decisões difíceis e suporte ao cuidador — com competência clínica e humanidade.",
  },
  {
    question: "O Dr. Renato tem experiência em telemedicina?",
    answer:
      "Sim. O Dr. Renato atua ativamente em telemedicina desde 2023, com experiência em modelo híbrido de Consultório Digital integrado a uma Unidade Básica de Saúde da Estratégia Saúde da Família em São Paulo — um dos formatos mais inovadores de telemedicina no SUS — e em plataformas de Pronto Atendimento Digital para a saúde suplementar, atendendo pacientes de todas as idades e regiões do Brasil. É um dos poucos médicos de família com experiência simultânea em telemedicina pública e suplementar, o que lhe dá uma visão abrangente das necessidades de diferentes perfis de pacientes.",
  },
  {
    question: "Como agendar uma consulta com o Dr. Renato?",
    answer:
      "Selecione um horário disponível nesta página para agendar diretamente com o Dr. Renato. O pagamento é processado com segurança no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Você receberá imediatamente um convite no calendário. As consultas são realizadas por videochamada segura em português, inglês ou espanhol. Consultas no mesmo dia geralmente estão disponíveis.",
  },
  {
    question: "Quais são as qualificações do Dr. Renato?",
    answer:
      "O Dr. Renato Ziviani Sarmento é graduado em Medicina pelo Centro Universitário do Estado do Pará e especialista em Medicina de Família e Comunidade com Residência na Casa de Saúde Santa Marcelina. Tem Especialização em Medicina Paliativa pelo Centro Universitário São Camilo, Mestrado em Cuidados Paliativos pela Universidad Pontificia de Salamanca (Espanha) e MBA em Gestão, Inovação e Serviços em Saúde pela PUC-RS. Atua em telemedicina no SUS e na saúde suplementar desde 2023, tem experiência como coordenador médico no Programa Melhor em Casa do Hospital Santa Marcelina e como médico paliativista no Ambulatório do Hospital Santa Marcelina. Registrado no CRM-SP nº 170.837 e CRM-PA nº 11.426. Atendimentos por meio da Pallium Cuidados Integrados LTDA.",
  },
];

// ── DOCTORS_INDEX page content (doc: "GlobalHealth_Brazil_DoctorsPage_Brief.docx") ──

const PAGE_SEO_TITLE_PT = "Médicos registrados no CRM | Consultas online no Brasil | Global Health";
const PAGE_SEO_DESCRIPTION_PT =
  "Consulte com médicos registrados no CRM/CFM disponíveis online no Brasil. Medicina de família, Cuidados Paliativos e telemedicina. Agende no mesmo dia.";
const PAGE_SEO_TITLE_EN = "CRM-Registered Doctors | Online Consultations in Brazil | Global Health";
const PAGE_SEO_DESCRIPTION_EN =
  "See CRM/CFM-registered doctors available online in Brazil. Family medicine, Palliative Care and telemedicine. Book same-day.";

const WHYCHOOSE_TITLE_PT = "Por que escolher nossos médicos";
const WHYCHOOSE_ITEMS_PT = [
  "Números de registro CRM e credenciais exibidos em cada perfil de médico",
  "Médicos registrados no CRM, sob supervisão do CFM",
  "Consultas por vídeo seguras, realizadas de acordo com as normas nacionais de telemedicina",
  "Consultas disponíveis em vários idiomas, de acordo com a disponibilidade do médico",
  "Preços transparentes — sem custos ocultos, sem assinatura obrigatória",
];
const INTRO_PT =
  "A nossa rede de médicos reúne clínicos registrados no CRM, sob supervisão do CFM, em medicina geral e numa vasta gama de especialidades. Consulte os perfis por especialidade, idioma e disponibilidade para encontrar o médico certo para a sua consulta.";
const WHOFOR_ITEMS_PT = [
  "Voltar a consultar um médico específico para dar continuidade aos cuidados",
  "Escolher um médico que fale o seu idioma preferido",
  "Encontrar um médico numa especialidade específica, como cardiologia, dermatologia ou pediatria",
  "Verificar o registro, as qualificações e as áreas de atuação de um médico antes de agendar",
  "Comparar horários disponíveis entre médicos",
  "Agendar uma consulta de seguimento com o mesmo médico que o atendeu anteriormente",
];

const FAQ2_MATCH_PT = "Como sei que um médico está devidamente qualificado?";
const FAQ2_ANSWER_PT =
  "Cada perfil exibe os dados de registro do médico. Todos os médicos da Global Health Brasil são registrados no Conselho Regional de Medicina (CRM) do seu estado, sob supervisão do Conselho Federal de Medicina (CFM). Você pode verificar qualquer registro de forma independente em portal.cfm.org.br.";

const NEW_FAQ_PT: Array<{ question: string; answer: string }> = [
  {
    question: "Os médicos da Global Health Brasil podem emitir atestados médicos e receitas?",
    answer:
      "Sim. Os médicos registrados no CRM na plataforma Global Health podem emitir atestados médicos, receitas e encaminhamentos onde clinicamente indicado, a critério profissional do médico após avaliação. As consultas de telemedicina seguem as normas do CFM para teleconsulta no Brasil (Resolução CFM nº 2.314/2022). Após cada consulta, você receberá por e-mail as anotações clínicas do médico com conclusões e recomendações.",
  },
  {
    question: "A telemedicina é regulamentada no Brasil?",
    answer:
      "Sim. A telemedicina no Brasil é regulamentada pelo Conselho Federal de Medicina (CFM) por meio da Resolução CFM nº 2.314/2022, que estabelece os critérios para a prática de teleconsulta médica no país. Todos os médicos da Global Health Brasil são registrados no CRM e seguem as diretrizes do CFM para atendimento remoto — garantindo que sua consulta online tenha o mesmo valor legal e clínico de uma consulta presencial.",
  },
  {
    question: "Posso consultar um médico da Global Health Brasil estando fora do Brasil?",
    answer:
      "Sim. Os médicos da Global Health Brasil podem atender pacientes brasileiros residentes ou em viagem ao exterior, desde que o médico esteja registrado no CRM e o atendimento siga as normas do CFM para teleconsulta. O Dr. Renato Sarmento consulta em português, inglês e espanhol — o que o torna acessível para brasileiros em qualquer país do mundo.",
  },
];

// English/Spanish translations of the same 3 new FAQs (site already serves
// this page in en/es; brief only wrote PT copy, so these are translations
// of the brief's own content, not new claims).
const NEW_FAQ_EN: Array<{ question: string; answer: string }> = [
  {
    question: "Can Global Health Brazil doctors issue medical certificates and prescriptions?",
    answer:
      "Yes. CRM-registered doctors on the Global Health platform can issue medical certificates, prescriptions and referrals where clinically indicated, at the treating doctor's professional discretion following assessment. Telemedicine consultations follow CFM rules for teleconsultation in Brazil (CFM Resolution No. 2,314/2022). After each consultation you'll receive the doctor's clinical notes by email, with conclusions and recommendations.",
  },
  {
    question: "Is telemedicine regulated in Brazil?",
    answer:
      "Yes. Telemedicine in Brazil is regulated by the Conselho Federal de Medicina (CFM) through CFM Resolution No. 2,314/2022, which sets the criteria for medical teleconsultation in the country. All Global Health Brazil doctors are registered with the CRM and follow CFM guidelines for remote care — so your online consultation carries the same legal and clinical weight as an in-person visit.",
  },
  {
    question: "Can I consult a Global Health Brazil doctor while outside Brazil?",
    answer:
      "Yes. Global Health Brazil doctors can see Brazilian patients living abroad or travelling, as long as the doctor is CRM-registered and the consultation follows CFM teleconsultation rules. Dr. Renato Sarmento consults in Portuguese, English and Spanish — making him accessible to Brazilians in any country.",
  },
];
const NEW_FAQ_ES: Array<{ question: string; answer: string }> = [
  {
    question: "¿Los médicos de Global Health Brasil pueden emitir atestados médicos y recetas?",
    answer:
      "Sí. Los médicos registrados en el CRM en la plataforma Global Health pueden emitir atestados médicos, recetas y derivaciones cuando esté clínicamente indicado, a criterio profesional del médico tras la evaluación. Las consultas de telemedicina siguen las normas del CFM para teleconsulta en Brasil (Resolución CFM n.º 2.314/2022). Tras cada consulta recibirá por correo electrónico las notas clínicas del médico con conclusiones y recomendaciones.",
  },
  {
    question: "¿La telemedicina está regulada en Brasil?",
    answer:
      "Sí. La telemedicina en Brasil está regulada por el Conselho Federal de Medicina (CFM) mediante la Resolución CFM n.º 2.314/2022, que establece los criterios para la teleconsulta médica en el país. Todos los médicos de Global Health Brasil están registrados en el CRM y siguen las directrices del CFM para la atención remota — garantizando que su consulta online tenga el mismo valor legal y clínico que una consulta presencial.",
  },
  {
    question: "¿Puedo consultar a un médico de Global Health Brasil estando fuera de Brasil?",
    answer:
      "Sí. Los médicos de Global Health Brasil pueden atender a pacientes brasileños residentes o de viaje en el extranjero, siempre que el médico esté registrado en el CRM y la consulta siga las normas del CFM para teleconsulta. El Dr. Renato Sarmento atiende en portugués, inglés y español, lo que lo hace accesible para brasileños en cualquier país.",
  },
];

// ES translation-quality fix: "colegiado/colegiación" is Spain's medical-
// college vocabulary (matches es:es on the Spain page) and doesn't apply to
// Brazil's CRM/CFM system — this is Brazil's own ES page, so editing here
// can't leak onto Spain's.
const WHYCHOOSE_ITEMS_ES = [
  "Números de registro CRM y credenciales mostrados en cada perfil de médico",
  "Médicos registrados en el CRM, bajo la supervisión del CFM",
  "Videoconsultas seguras conforme a los estándares nacionales de telemedicina",
  "Consultas disponibles en varios idiomas, según disponibilidad del médico",
  "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
];
const INTRO_ES =
  "Nuestra red de médicos reúne a profesionales registrados en el CRM, bajo la supervisión del CFM, en medicina general y en una amplia variedad de especialidades. Explore los perfiles por especialidad, idioma y disponibilidad para encontrar el médico adecuado para su consulta.";
const WHOFOR_ITEMS_ES = [
  "Volver a ver a un médico concreto para dar continuidad a su atención",
  "Elegir un médico que hable su idioma preferido",
  "Encontrar un médico en una especialidad concreta como cardiología, dermatología o pediatría",
  "Comprobar el registro, las cualificaciones y las áreas de práctica de un médico antes de reservar",
  "Comparar los horarios disponibles entre distintos médicos",
  "Reservar un seguimiento con el mismo médico que le atendió anteriormente",
];
const FAQ2_MATCH_ES = "¿Cómo sé que un médico está debidamente cualificado?";
const FAQ2_ANSWER_ES =
  "Cada perfil muestra los datos de registro del médico. Todos los médicos de Global Health Brasil están registrados en el Conselho Regional de Medicina (CRM) de su estado, bajo la supervisión del Conselho Federal de Medicina (CFM). Puede verificar cualquier registro de forma independiente en portal.cfm.org.br.";
const DISCLAIMER_PARAGRAPHS_ES = [
  "Todos los servicios médicos prestados a través de Global Health son proporcionados por médicos registrados en el CRM, bajo la supervisión del CFM.",
  "Nuestros médicos online realizan evaluaciones clínicas remotas y pueden proporcionar recomendaciones de tratamiento, derivaciones o certificados médicos únicamente cuando sea clínicamente apropiado, a criterio profesional del médico tratante. Las decisiones clínicas permanecen enteramente a criterio del médico tras la evaluación.",
  "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
  "Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al SAMU 192 o acuda a su servicio de urgencias más cercano.",
];
const DISCLAIMER_SHORT_ES =
  "Todos los servicios médicos en Global Health son proporcionados por médicos registrados en el CRM, bajo la supervisión del CFM. Las recomendaciones de tratamiento, derivaciones y certificados médicos solo se emiten cuando es clínicamente apropiado y a criterio del médico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al SAMU 192.";

const DISCLAIMER_PARAGRAPHS_PT = [
  "Todos os serviços médicos prestados através da Global Health são prestados por médicos registrados no CRM, sob supervisão do CFM.",
  "Os nossos médicos online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, referenciações ou atestados médicos apenas quando clinicamente apropriado, ao critério profissional do médico assistente. As decisões clínicas permanecem inteiramente ao critério do médico após a avaliação.",
  "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
  "As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número SAMU 192 ou dirija-se ao serviço de urgência mais próximo.",
];
const DISCLAIMER_SHORT_PT =
  "Todos os serviços médicos na Global Health são prestados por médicos registrados no CRM, sob supervisão do CFM. Recomendações de tratamento, referenciações e atestados médicos só são emitidos quando clinicamente apropriado e ao critério do médico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue SAMU 192.";

type Faq = { question: string; answer: string };

function appendMissing(faq: Faq[], additions: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  let next = [...faq];
  for (const f of additions) {
    if (!next.some((x) => x.question === f.question)) {
      next = [...next, f];
      changed.push(`FAQ appended: ${f.question}`);
    }
  }
  return { next, changed };
}

async function main() {
  note(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");

  // ── 1) Doctor profile ──────────────────────────────────────────────────
  const doctor = await prisma.doctor.findFirst({
    where: { slug: "dr-renato-sarmento" },
    include: {
      translations: true,
      faqs: true,
      additionalCountries: { where: { country: { code: "br" } }, include: { translations: true } },
    },
  });
  if (!doctor) throw new Error("Dr. Renato Sarmento not found (slug dr-renato-sarmento)");
  note(`Doctor: ${doctor.fullName} (${doctor.slug})`);

  const basePatch: Record<string, unknown> = {};
  if (doctor.title !== TITLE) basePatch.title = TITLE;
  if ((doctor.bio ?? "").trim() !== BIO_HTML.trim()) basePatch.bio = BIO_HTML;
  if (doctor.seoTitle !== SEO_TITLE) basePatch.seoTitle = SEO_TITLE;
  if (doctor.seoDescription !== SEO_DESCRIPTION) basePatch.seoDescription = SEO_DESCRIPTION;
  if (JSON.stringify(doctor.qualifications) !== JSON.stringify(QUALIFICATIONS)) {
    basePatch.qualifications = QUALIFICATIONS;
  }
  if (Object.keys(basePatch).length) {
    note(`Doctor base fields: ${Object.keys(basePatch).join(", ")}`);
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: basePatch });
  } else note("Doctor base fields: already correct");

  const ptTr = doctor.translations.find((t) => t.locale === LocaleCode.PT);
  if (ptTr) {
    const trPatch: Record<string, unknown> = {};
    if (ptTr.title !== TITLE) trPatch.title = TITLE;
    if ((ptTr.bio ?? "").trim() !== BIO_HTML.trim()) trPatch.bio = BIO_HTML;
    if (ptTr.seoTitle !== SEO_TITLE) trPatch.seoTitle = SEO_TITLE;
    if (ptTr.seoDescription !== SEO_DESCRIPTION) trPatch.seoDescription = SEO_DESCRIPTION;
    if (Object.keys(trPatch).length) {
      note(`DoctorTranslation(PT): ${Object.keys(trPatch).join(", ")}`);
      if (APPLY) await prisma.doctorTranslation.update({ where: { id: ptTr.id }, data: trPatch });
    } else note("DoctorTranslation(PT): already correct");
  } else note("⚠ No PT DoctorTranslation row — skipping (base fields still apply as fallback).");

  // br DoctorMarketTranslation(PT) OVERRIDES base fields on /brazil/pt/doctors/... (Tiago-brief lesson).
  const brDc = doctor.additionalCountries[0];
  if (!brDc) throw new Error("No br DoctorCountry row for Dr. Renato Sarmento");
  const brPtTr = brDc.translations.find((t) => t.locale === LocaleCode.PT);
  if (brPtTr) {
    const mtPatch: Record<string, unknown> = {};
    if (brPtTr.title !== TITLE) mtPatch.title = TITLE;
    if ((brPtTr.bio ?? "").trim() !== BIO_HTML.trim()) mtPatch.bio = BIO_HTML;
    if (brPtTr.seoTitle !== SEO_TITLE) mtPatch.seoTitle = SEO_TITLE;
    if (brPtTr.seoDescription !== SEO_DESCRIPTION) mtPatch.seoDescription = SEO_DESCRIPTION;
    if (Object.keys(mtPatch).length) {
      note(`br DoctorMarketTranslation(PT) [OVERRIDES base on /brazil/pt]: ${Object.keys(mtPatch).join(", ")}`);
      if (APPLY) await prisma.doctorMarketTranslation.update({ where: { id: brPtTr.id }, data: mtPatch });
    } else note("br DoctorMarketTranslation(PT): already correct");
  } else note("br DoctorMarketTranslation(PT): none — base fields apply directly");

  // Registration number — brief confirms "CRM 170837/SP" is already correct; report only.
  note(`br DoctorCountry: chamberEntity=${brDc.chamberEntity}, registrationNumber=${brDc.registrationNumber} (brief says keep — no change)`);

  // Doctor-profile FAQs (PT) — insert missing by question text.
  const existingQ = new Set(doctor.faqs.filter((f) => f.locale === LocaleCode.PT).map((f) => f.question));
  let sort = doctor.faqs.length;
  for (const f of DOCTOR_FAQS) {
    if (existingQ.has(f.question)) {
      note(`doctor faq exists: ${f.question}`);
      continue;
    }
    note(`doctor faq add: ${f.question}`);
    if (APPLY) {
      await prisma.doctorFaq.create({
        data: { doctorId: doctor.id, locale: LocaleCode.PT, question: f.question, answer: f.answer, sortOrder: sort++, isActive: true },
      });
    }
  }

  // ── 2) DOCTORS_INDEX page content ──────────────────────────────────────
  const country = await prisma.country.findUnique({ where: { code: "br" }, select: { id: true } });
  if (!country) throw new Error("Country br not found");

  const pc = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: country.id, pageKey: "DOCTORS_INDEX" } },
    include: { translations: true },
  });
  if (!pc) throw new Error("No PageContent row for br/DOCTORS_INDEX");

  const pt = pc.translations.find((t) => t.locale === LocaleCode.PT);
  if (pt) {
    const data: Record<string, unknown> = {};
    if (pt.seoTitle !== PAGE_SEO_TITLE_PT) data.seoTitle = PAGE_SEO_TITLE_PT;
    if (pt.seoDescription !== PAGE_SEO_DESCRIPTION_PT) data.seoDescription = PAGE_SEO_DESCRIPTION_PT;
    if (pt.whyChooseTitle !== WHYCHOOSE_TITLE_PT) data.whyChooseTitle = WHYCHOOSE_TITLE_PT;
    if (JSON.stringify(pt.whyChooseItems) !== JSON.stringify(WHYCHOOSE_ITEMS_PT)) data.whyChooseItems = WHYCHOOSE_ITEMS_PT;
    if (pt.intro !== INTRO_PT) data.intro = INTRO_PT;
    if (JSON.stringify(pt.whoForItems) !== JSON.stringify(WHOFOR_ITEMS_PT)) data.whoForItems = WHOFOR_ITEMS_PT;
    if (JSON.stringify(pt.disclaimerParagraphs) !== JSON.stringify(DISCLAIMER_PARAGRAPHS_PT)) data.disclaimerParagraphs = DISCLAIMER_PARAGRAPHS_PT;
    if (pt.disclaimerShort !== DISCLAIMER_SHORT_PT) data.disclaimerShort = DISCLAIMER_SHORT_PT;

    if (Array.isArray(pt.faq)) {
      let faq = pt.faq as unknown as Faq[];
      let faqChanged = false;
      const q2 = faq.find((f) => f.question === FAQ2_MATCH_PT);
      if (q2 && q2.answer !== FAQ2_ANSWER_PT) {
        faq = faq.map((f) => (f.question === FAQ2_MATCH_PT ? { ...f, answer: FAQ2_ANSWER_PT } : f));
        faqChanged = true;
        note("PT FAQ Q2 answer rewritten");
      } else if (!q2) {
        note(`⚠ PT FAQ question "${FAQ2_MATCH_PT}" not found — Q2 rewrite skipped`);
      }
      const { next, changed } = appendMissing(faq, NEW_FAQ_PT);
      changed.forEach((c) => note(`PT ${c}`));
      if (faqChanged || changed.length) data.faq = next as unknown as object;
    } else note("⚠ PT faq field empty/not an array — FAQ edits skipped");

    if (Object.keys(data).length) {
      note(`PageContentTranslation(PT) fields: ${Object.keys(data).join(", ")}`);
      if (APPLY) await prisma.pageContentTranslation.update({ where: { id: pt.id }, data });
    } else note("PageContentTranslation(PT): already correct");
  } else note("⚠ No PT PageContentTranslation for br/DOCTORS_INDEX");

  const en = pc.translations.find((t) => t.locale === LocaleCode.EN);
  if (en) {
    const data: Record<string, unknown> = {};
    if (en.seoTitle !== PAGE_SEO_TITLE_EN) data.seoTitle = PAGE_SEO_TITLE_EN;
    if (en.seoDescription !== PAGE_SEO_DESCRIPTION_EN) data.seoDescription = PAGE_SEO_DESCRIPTION_EN;
    if (Array.isArray(en.faq)) {
      const { next, changed } = appendMissing(en.faq as unknown as Faq[], NEW_FAQ_EN);
      changed.forEach((c) => note(`EN ${c}`));
      if (changed.length) data.faq = next as unknown as object;
    }
    if (Object.keys(data).length) {
      note(`PageContentTranslation(EN) fields: ${Object.keys(data).join(", ")}`);
      if (APPLY) await prisma.pageContentTranslation.update({ where: { id: en.id }, data });
    } else note("PageContentTranslation(EN): already correct");
  } else note("⚠ No EN PageContentTranslation for br/DOCTORS_INDEX");

  const es = pc.translations.find((t) => t.locale === LocaleCode.ES);
  if (es) {
    const data: Record<string, unknown> = {};
    if (JSON.stringify(es.whyChooseItems) !== JSON.stringify(WHYCHOOSE_ITEMS_ES)) data.whyChooseItems = WHYCHOOSE_ITEMS_ES;
    if (es.intro !== INTRO_ES) data.intro = INTRO_ES;
    if (JSON.stringify(es.whoForItems) !== JSON.stringify(WHOFOR_ITEMS_ES)) data.whoForItems = WHOFOR_ITEMS_ES;
    if (JSON.stringify(es.disclaimerParagraphs) !== JSON.stringify(DISCLAIMER_PARAGRAPHS_ES)) data.disclaimerParagraphs = DISCLAIMER_PARAGRAPHS_ES;
    if (es.disclaimerShort !== DISCLAIMER_SHORT_ES) data.disclaimerShort = DISCLAIMER_SHORT_ES;
    if (Array.isArray(es.faq)) {
      let faq = es.faq as unknown as Faq[];
      let faqChanged = false;
      const q2 = faq.find((f) => f.question === FAQ2_MATCH_ES);
      if (q2 && q2.answer !== FAQ2_ANSWER_ES) {
        faq = faq.map((f) => (f.question === FAQ2_MATCH_ES ? { ...f, answer: FAQ2_ANSWER_ES } : f));
        faqChanged = true;
        note("ES FAQ Q2 answer rewritten");
      }
      const { next, changed } = appendMissing(faq, NEW_FAQ_ES);
      changed.forEach((c) => note(`ES ${c}`));
      if (faqChanged || changed.length) data.faq = next as unknown as object;
    }
    if (Object.keys(data).length) {
      note(`PageContentTranslation(ES) fields: ${Object.keys(data).join(", ")}`);
      if (APPLY) await prisma.pageContentTranslation.update({ where: { id: es.id }, data });
    } else note("PageContentTranslation(ES): already correct");
  } else note("⚠ No ES PageContentTranslation for br/DOCTORS_INDEX");

  note(APPLY ? "== APPLIED ==" : "== DRY-RUN complete — nothing written ==");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
