/**
 * Portugal — article 2 of 2.
 *
 * Target keyword: "consulta do viajante" — 5,400/mo, KD 3 (OpenSEO /
 * DataForSEO, location 2620, language pt, expansion run 2026-08-04).
 * Cluster: consulta do viajante online 1,000 KD 5 · marcar consulta do
 * viajante sns 880 KD 5 · consulta do viajante porto 880 KD 0 · consulta do
 * viajante braga 390 KD 0 · centro de vacinação internacional de braga 390
 * KD 0 · consulta do viajante lisboa 260 KD 0 · consulta do viajante coimbra
 * 260 KD 0 · consulta do viajante matosinhos 110 KD 0 · marcar consulta do
 * viajante online 110 KD 7 · consulta do viajante gratuita 70.
 *
 * Target unchanged by the expansion — the head term is already the cluster
 * head and sits below the KD ceiling. What the expansion did change is the
 * article's shape: the long tail is overwhelmingly *where* (Porto, Lisboa,
 * Coimbra, Braga, Matosinhos, Centro de Vacinação Internacional) and *how to
 * book*, not "what is travel medicine". The article is built around that.
 *
 * SERP read (get_serp_results, pt/2620, 2026-08-04): rank 1 is the SNS 24
 * guide, then ARS Norte's CVI Porto page, then private hospital groups (CUF,
 * Hospital da Luz, JCS, Affidea), IHMT NOVA, and two pure-play telemedicine
 * sites (consultadoviajante.com, consultadoviajanteonline.pt). Nothing on page
 * one states plainly which parts of a travel consultation a video appointment
 * can actually deliver and which parts require a physical vaccination centre.
 * That boundary is this article's reason to exist.
 *
 * Facts anchored to verified SERP snippets, 2026-08-04:
 *  - SNS 24: "Nesta consulta é informado sobre medidas preventivas (ou
 *    curativas) a adotar antes, durante e depois da viagem, em função do
 *    destino"; documents to bring are identification, número de utente and the
 *    boletim individual de saúde/vacinas.
 *  - ARS Algarve: "todos os Centros de Vacinação Internacional devem
 *    administrar a vacina contra a febre amarela".
 *  - ARS Norte publishes the CVI list and booking hours for the Região Norte.
 *
 * HONESTY CONSTRAINT. Our Portuguese service is "consulta-do-viajante"
 * ("Consulta de Saúde do Viajante"), delivered by video. A video consultation
 * cannot administer a vaccine and cannot issue the international certificate
 * of vaccination, which is a Centro de Vacinação Internacional act. The
 * article says so in its own section rather than blurring it.
 *
 * No figures: lead time before departure, waiting times for a CVI appointment,
 * vaccine prices and which vaccines a given destination requires all change by
 * destination and by season. Each one points at SNS 24, the CVI or the WHO
 * instead of being stated here.
 *
 * Copy trap: the bare word "todo" trips the /\bTODO\b/i pattern in
 * frontend/lib/content/publication-validation.ts. Written around throughout.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const SNS24_VIAJANTE = "https://www.sns24.gov.pt/guia/consulta-do-viajante/";
const CVI_NORTE = "https://www.arsnorte.min-saude.pt/consulta-do-viajante/no-1-centro-de-vacinacao-internacional-do-porto/";
const CVI_ALGARVE = "https://www.arsalgarve.min-saude.pt/saude-publica/consulta-de-saude-do-viajante/";
const SNS_ESTRANGEIRO = "https://www.sns.gov.pt/cuidados-de-saude-no-estrangeiro/";
const WHO_TRAVEL = "https://www.who.int/travel-advice";
const DGS = "https://www.dgs.pt/";
/** IHMT (NOVA) — the reference centre for tropical medicine in Portugal; its
 *  traveller clinic is where complex or high-risk itineraries end up. */
const IHMT_VIAJANTE = "https://www.ihmt.unl.pt/consulta-do-viajante/";
/** NaTHNaC's TravelHealthPro — UK guidance, but the best country-by-country
 *  reference in English and updated constantly. */
const TRAVELHEALTHPRO = "https://travelhealthpro.org.uk/countries";
/** Ministry of Foreign Affairs traveller registry — lets the consulate reach
 *  you if something happens where you are going. */
const REGISTO_VIAJANTE = "https://portaldascomunidades.mne.gov.pt/pt/vai-viajar/registo-do-viajante";
const ORDEM_MEDICOS = "https://ordemdosmedicos.pt/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/portugal/${lang}${path}`;

const pt: LocalePost = {
  locale: "PT",
  slug: "consulta-do-viajante-quando-marcar",
  title: "Consulta do viajante: onde se faz, quando marcar e o que levar",
  excerpt:
    "A consulta do viajante avalia o risco da sua viagem em função do destino e prepara-o antes de partir. Explicamos onde se faz, o que levar, o que só um Centro de Vacinação Internacional pode fazer e o que uma consulta por vídeo resolve.",
  seoTitle: "Consulta do viajante: onde marcar e o que levar",
  seoDescription:
    "Consulta do viajante: o que é avaliado, onde se faz, que documentos levar, o papel dos Centros de Vacinação Internacional e o que a consulta online faz.",
  category: "Medicina de Viagem",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Medicina de Viagem",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Portugal · Guia antes de viajar",
    h1: "Consulta do viajante",
    deck: "Uma avaliação de risco feita a pensar no seu destino, na sua viagem e na sua saúde — não uma lista genérica de vacinas tirada da internet.",
    intro:
      "A <strong>consulta do viajante</strong> é uma consulta pré-viagem em que um médico avalia o risco associado ao seu destino e ao tipo de viagem que vai fazer, e indica as medidas preventivas a adotar antes, durante e depois. Faz-se no SNS, através dos <strong>Centros de Vacinação Internacional (CVI)</strong> e das unidades de saúde pública, e também no privado. Uma parte da consulta — avaliação de risco, revisão do boletim de vacinas, profilaxia da malária, medicação para levar consigo, doença crónica em viagem — pode ser feita <strong>por vídeo</strong>. A administração de vacinas e o <strong>certificado internacional de vacinação</strong> não podem: são atos presenciais, e a vacina da febre amarela em particular só é dada em Centro de Vacinação Internacional.",
    facts: [
      "Avaliação de risco por destino",
      "Vacinas: presencial, em CVI",
      "Febre amarela: só em CVI",
    ],
    primaryCta: { label: "Marcar consulta de saúde do viajante", href: href("pt", "/services/consulta-do-viajante") },
    secondaryCta: { label: "Consulta do viajante no SNS 24", href: SNS24_VIAJANTE },
    panelChip: "O que este guia cobre",
    panelParas: [
      "O que é avaliado numa consulta do viajante e por que razão o destino muda tudo.",
      "Onde se faz — CVI, unidades de saúde pública, privado — e que documentos levar consigo.",
      "A fronteira entre o que uma consulta por vídeo resolve e o que obriga a deslocação.",
      "A antecedência recomendada, as vacinas exigidas por cada país e os tempos de espera mudam com o destino e com a época do ano. Não são citados aqui: cada um remete para o SNS 24, para o CVI, para o IHMT ou para a OMS.",
    ],
    author: {
      initials: "VP",
      name: "Dr Vitor Hugo de Matos Pais",
      line: "Médico de Medicina Geral e Familiar · Global Health Portugal",
    },
    reviewLine:
      "Revisto clinicamente pela Dra. Nádia Cavaco, médica de Clínica Geral, Global Health Portugal.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "o-que-e",
        nav: "O que é",
        eyebrow: "Ponto de partida",
        h2: "O que é, afinal, a consulta do viajante",
        blocks: [
          lead("Não é uma consulta sobre vacinas. É uma consulta sobre a sua viagem, em que as vacinas são apenas uma das saídas possíveis."),
          p("O SNS 24 descreve-a como a consulta em que o viajante é informado sobre as <em>medidas preventivas (ou curativas) a adotar antes, durante e depois da viagem, em função do destino</em>. A frase importante é a última: <strong>em função do destino</strong>. A mesma pessoa, a viajar para Amesterdão ou para o interior de Moçambique, sai da consulta com recomendações que não se parecem uma com a outra."),
          p("O que muda a avaliação não é apenas o país. É a região dentro do país, a época do ano, o tipo de alojamento, a duração, se vai a zona rural ou urbana, se vai visitar familiares, se leva crianças, se está grávida, se tem doença crónica ou está imunossuprimido, e se pratica alguma atividade de risco. Duas pessoas com o mesmo bilhete de avião podem ter avaliações muito diferentes."),
          ul([
            "<strong>Destino e itinerário</strong> — país, região, meio rural ou urbano, altitude.",
            "<strong>Época</strong> — estação das chuvas, época de transmissão, surtos ativos.",
            "<strong>Perfil de viagem</strong> — turismo, trabalho, mochila, visita a família, missão humanitária.",
            "<strong>O seu estado de saúde</strong> — gravidez, idade, doença crónica, imunossupressão, medicação habitual.",
            "<strong>Histórico de vacinação</strong> — o que já tem, o que caducou, o que falta.",
          ]),
          cite(`Descrição oficial: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24</a>. Para itinerários complexos, o <a href="${IHMT_VIAJANTE}" rel="nofollow noopener" target="_blank">IHMT</a> é o centro de referência; por país, o <a href="${TRAVELHEALTHPRO}" rel="nofollow noopener" target="_blank">TravelHealthPro</a>.`),
        ],
      },
      {
        id: "onde",
        nav: "Onde se faz",
        eyebrow: "Locais",
        h2: "Onde se faz e o que levar consigo",
        blocks: [
          lead("Há três circuitos possíveis, e não são intermutáveis para tudo."),
          p("No SNS, a consulta do viajante e a vacinação internacional fazem-se nos <strong>Centros de Vacinação Internacional</strong> e nas unidades de saúde pública das unidades locais de saúde, com marcação prévia. Cada região publica os seus locais e horários. No privado, a consulta é oferecida por hospitais e clínicas, e por serviços de telemedicina. São circuitos diferentes com competências diferentes — o ponto seguinte deste guia explica onde está a fronteira."),
          ul([
            "<strong>Centro de Vacinação Internacional</strong> — a consulta e, sobretudo, a vacinação internacional e o certificado internacional de vacinação.",
            "<strong>Unidade de saúde pública / centro de saúde</strong> — aconselhamento e vacinação que não seja exclusiva do CVI, conforme a região.",
            "<strong>Consulta privada, presencial ou por vídeo</strong> — avaliação de risco, prescrição e preparação; a vacinação continua a exigir deslocação.",
          ]),
          p("O SNS 24 indica os documentos a levar: <strong>documento de identificação</strong>, <strong>documento com o número de utente</strong> e o <strong>boletim individual de saúde/vacinas</strong>. Vale a pena acrescentar dois: a lista da sua medicação habitual e o itinerário da viagem com datas. Sem itinerário, a consulta perde metade do valor, porque a avaliação de risco depende exatamente disso."),
          warn("Marque antes de comprar tudo", "Ideal é marcar a consulta assim que a viagem estiver decidida, e não na semana anterior. Algumas vacinas precisam de tempo para produzir proteção e algumas exigem mais do que uma dose. A marcação em Centro de Vacinação Internacional pode também ter lista de espera — confirme a disponibilidade da sua região antes de contar com uma data."),
          cite(`Locais e horários por região: <a href="${CVI_NORTE}" rel="nofollow noopener" target="_blank">ARS Norte — CVI</a> · <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve — saúde do viajante</a> · <a href="${SNS_ESTRANGEIRO}" rel="nofollow noopener" target="_blank">SNS — cuidados de saúde no estrangeiro</a>.`),
        ],
      },
      {
        id: "vacinas",
        nav: "Vacinas",
        eyebrow: "Prevenção",
        h2: "Vacinas, febre amarela e o certificado internacional",
        blocks: [
          lead("Há uma distinção que resolve a maior parte das dúvidas: vacinas recomendadas, vacinas exigidas, e vacinas que só um CVI dá."),
          p("<strong>Recomendadas</strong> são as que protegem contra riscos presentes no destino. <strong>Exigidas</strong> são as que um país impõe como condição de entrada, e cuja prova é o certificado internacional de vacinação. A vacina contra a <strong>febre amarela</strong> é o caso mais conhecido das duas coisas ao mesmo tempo: as autoridades de saúde determinam que a sua administração se faz nos <strong>Centros de Vacinação Internacional</strong>, e é aí que o certificado é emitido."),
          ul([
            "A revisão do <strong>Plano Nacional de Vacinação</strong> faz parte da consulta: muitas viagens revelam apenas que há vacinas de rotina em atraso.",
            "Algumas vacinas de viagem exigem <strong>mais do que uma dose</strong>, com intervalo entre elas.",
            "As exigências de entrada mudam e são fixadas por cada país — confirme junto da autoridade do destino e da <strong>OMS</strong>, não num artigo.",
            "O <strong>certificado internacional de vacinação</strong> é um documento oficial emitido no ato da vacinação em CVI. Não é passado à distância, por ninguém.",
          ]),
          p("A vacinação não substitui as medidas não vacinais, que numa boa parte dos destinos pesam mais: proteção contra picadas de mosquito, cuidados com água e alimentos, prevenção da doença do viajante, comportamento sexual seguro, cuidados com a exposição solar e com o trânsito — que é, na prática, uma das causas mais comuns de problemas graves em viagem."),
          cite(`Sobre a administração da vacina da febre amarela em CVI: <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve</a>. Exigências por país: <a href="${WHO_TRAVEL}" rel="nofollow noopener" target="_blank">OMS — travel advice</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Transparência",
        h2: "O que uma consulta por vídeo pode — e não pode — fazer",
        blocks: [
          lead("Esta é a parte que a maioria dos sites de telemedicina não escreve, por isso escrevemo-la primeiro."),
          p("Uma consulta por vídeo <strong>não administra vacinas</strong> e <strong>não emite o certificado internacional de vacinação</strong>. Se a sua viagem exige febre amarela, vai ter de se deslocar a um Centro de Vacinação Internacional, independentemente de quem faça a avaliação prévia. Qualquer serviço que sugira o contrário está a prometer o que não pode cumprir."),
          p("Dito isso, a parte da consulta do viajante que não é injeção é considerável — e é precisamente a parte para a qual as pessoas costumam não ter tempo:"),
          ul([
            "<strong>Avaliação de risco</strong> do itinerário concreto, com a sua história clínica à frente.",
            "<strong>Revisão do boletim de vacinas</strong> e identificação do que está em falta antes de marcar o CVI — para chegar lá uma vez e não duas.",
            "<strong>Profilaxia da malária</strong> quando indicada: escolha do fármaco, esquema e efeitos a vigiar.",
            "<strong>Medicação a levar</strong>: diarreia do viajante, náusea, dor, alergia, e o que fazer se adoecer longe de casa.",
            "<strong>Doença crónica em viagem</strong>: ajuste de horários com fusos, conservação de medicamentos, quantidades e declaração de medicação para a bagagem.",
            "<strong>Depois da viagem</strong>: que sintomas obrigam a procurar avaliação médica ao regressar, e em que prazo.",
          ]),
          p(`Pode confirmar a inscrição de qualquer médico junto da <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, connosco como em qualquer outro lado.`),
          warn("Nenhuma consulta garante uma vacina ou um certificado", "A prescrição de profilaxia depende da avaliação clínica e da sua história. A vacinação e o certificado internacional dependem do circuito presencial de vacinação internacional. Uma consulta séria diz-lhe qual é o seu caso; não promete um documento antes de o observar."),
        ],
      },
      {
        id: "regresso",
        nav: "Ao regressar",
        eyebrow: "Depois da viagem",
        h2: "Ao regressar: os sintomas que não se ignoram",
        blocks: [
          lead("A consulta do viajante não acaba no aeroporto de partida. Uma parte importante do risco aparece semanas depois de chegar."),
          p("O sinal mais importante é simples de memorizar: <strong>febre depois de uma viagem a zona de risco de malária é uma urgência médica</strong>, mesmo que tenha feito profilaxia corretamente e mesmo que se sinta razoavelmente bem entre picos de febre. A malária pode agravar-se depressa e o tratamento precoce muda o desfecho."),
          ul([
            "Febre, arrepios ou suores após viagem a zona de risco — procure avaliação médica e diga sempre onde esteve.",
            "Diarreia que persiste, com sangue, ou acompanhada de febre alta.",
            "Icterícia — pele ou olhos amarelados.",
            "Erupção cutânea que aparece depois do regresso.",
            "Ferida de mordedura ou arranhadela de animal durante a viagem — este é um caso a avaliar <strong>de imediato</strong>, ainda em viagem se possível.",
          ]),
          p("Diga sempre a quem o atende que viajou, para onde e quando. É a informação que muda o raciocínio clínico, e é a que mais frequentemente fica por dizer."),
          warn("Quando não é altura de marcar consulta", "Dor no peito, falta de ar em repouso, fraqueza súbita de um lado do corpo, dificuldade em falar, confusão, rigidez da nuca com febre, ou manchas na pele que não desaparecem à pressão: ligue <strong>112</strong>. Em caso de dúvida sobre a gravidade, contacte o <strong>SNS 24</strong>."),
        ],
      },
      {
        id: "checklist",
        nav: "Antes de partir",
        eyebrow: "Prático",
        h2: "O que resolver antes de partir",
        blocks: [
          lead("Uma sequência curta que evita quase todos os problemas evitáveis."),
          ul([
            "Marque a consulta <strong>assim que a viagem estiver decidida</strong>, não na véspera.",
            "Reúna o boletim de vacinas, a lista de medicação habitual e o itinerário com datas.",
            "Confirme se o destino exige certificado internacional de vacinação e, em caso afirmativo, marque o CVI cedo.",
            "Leve a medicação habitual na <strong>bagagem de mão</strong>, na embalagem original, com a receita ou declaração médica.",
            "Verifique a cobertura de saúde no destino, incluindo repatriamento, e leve os contactos de emergência.",
            "Guarde o contacto do consulado ou embaixada e inscreva-se no <strong>Registo do Viajante</strong> do MNE, que permite às autoridades chegar até si numa emergência.",
          ]),
          p("Nada disto exige uma tarde inteira. Exige apenas ser feito antes, e não a caminho do aeroporto — que é quando, na prática, a maioria das pessoas se lembra."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Passos seguintes",
    linksLead:
      "Os nossos médicos em Portugal fazem a avaliação pré-viagem por vídeo e dizem-lhe com clareza o que pode ficar resolvido na consulta e o que obriga a deslocação a um Centro de Vacinação Internacional.",
    links: [
      { label: "Consulta de Saúde do Viajante", href: href("pt", "/services/consulta-do-viajante") },
      { label: "Os nossos médicos em Portugal", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Portugal", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Vai viajar e não sabe por onde começar?",
      text: "Uma consulta por vídeo revê o seu boletim de vacinas, avalia o risco do seu itinerário, prescreve o que estiver indicado e diz-lhe exatamente o que ainda tem de tratar presencialmente.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/consulta-do-viajante") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar as regras",
    sourcesLead:
      "Locais e horários, exigências de entrada por país e vacinas recomendadas mudam. Confirme sempre na fonte, e o mais perto possível da data de partida.",
    sources: [
      { label: "SNS 24 — consulta do viajante", href: SNS24_VIAJANTE },
      { label: "ARS Norte — Centros de Vacinação Internacional", href: CVI_NORTE },
      { label: "ARS Algarve — saúde do viajante", href: CVI_ALGARVE },
      { label: "SNS — cuidados de saúde no estrangeiro", href: SNS_ESTRANGEIRO },
      { label: "OMS — travel advice", href: WHO_TRAVEL },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "IHMT — consulta do viajante", href: IHMT_VIAJANTE },
      { label: "TravelHealthPro — informação por país", href: TRAVELHEALTHPRO },
      { label: "Registo do Viajante — MNE", href: REGISTO_VIAJANTE },
    ],
    sourcesNote:
      "As ligações abrem nos sites das entidades competentes. A Global Health não é um Centro de Vacinação Internacional, não administra vacinas e não emite certificados internacionais de vacinação.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "O que é a consulta do viajante?",
        a: "É uma consulta pré-viagem em que um médico avalia o risco do seu destino e do seu tipo de viagem e indica as medidas preventivas a adotar antes, durante e depois. Inclui a revisão do boletim de vacinas, a indicação de vacinas e de profilaxia quando aplicável, e as medidas não vacinais — água, alimentos, picadas, medicação a levar.",
      },
      {
        q: "Onde se faz a consulta do viajante em Portugal?",
        a: "No SNS, nos Centros de Vacinação Internacional e nas unidades de saúde pública, com marcação prévia; cada região publica os seus locais e horários, incluindo Porto, Lisboa, Coimbra e Braga. Também é feita no privado, presencialmente ou por vídeo. A vacinação internacional e o certificado, esses, são atos dos Centros de Vacinação Internacional.",
      },
      {
        q: "Posso fazer a consulta do viajante online?",
        a: "A avaliação de risco, a revisão do boletim de vacinas, a profilaxia da malária, a medicação a levar consigo e a gestão de doença crónica em viagem podem ser feitas por vídeo. A administração das vacinas e o certificado internacional de vacinação não podem: exigem deslocação a um Centro de Vacinação Internacional.",
      },
      {
        q: "Com quanto tempo de antecedência devo marcar?",
        a: "Assim que a viagem estiver decidida. Algumas vacinas precisam de tempo para produzir proteção e algumas exigem mais do que uma dose, e a marcação em Centro de Vacinação Internacional pode ter lista de espera. Confirme a disponibilidade da sua região em vez de contar com uma data.",
      },
      {
        q: "Que documentos devo levar?",
        a: "O SNS 24 indica documento de identificação, documento com o número de utente e boletim individual de saúde/vacinas. Leve também a lista da sua medicação habitual e o itinerário com datas — sem itinerário não é possível fazer uma avaliação de risco a sério.",
      },
      {
        q: "Preciso da vacina da febre amarela e do certificado?",
        a: "Depende do destino e do itinerário, e as exigências de entrada são fixadas por cada país. A vacina da febre amarela é administrada nos Centros de Vacinação Internacional, que emitem o certificado internacional de vacinação no ato. Confirme sempre junto da autoridade do país de destino e da Organização Mundial da Saúde.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr Vitor Hugo de Matos Pais, médico de Medicina Geral e Familiar da Global Health Portugal, e revisto clinicamente pela Dra. Nádia Cavaco, médica de Clínica Geral. Este artigo contém informação geral sobre medicina de viagem em Portugal e não constitui aconselhamento médico personalizado. As recomendações de vacinação e de profilaxia dependem do destino, do itinerário e da sua história clínica, e só podem ser feitas em consulta. A Global Health não administra vacinas nem emite certificados internacionais de vacinação. Em caso de emergência médica, ligue imediatamente 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "travel-health-consultation-portugal",
  title: "Travel health consultation in Portugal: where to go, when to book and what to bring",
  excerpt:
    "The consulta do viajante assesses the risk of your trip against your destination and prepares you before you leave. Where it is done, what to bring, what only an International Vaccination Centre can do, and what a video consultation settles.",
  seoTitle: "Travel health consultation in Portugal",
  seoDescription:
    "Travel health consultation in Portugal: what is assessed, where it is done, what to bring and the role of the International Vaccination Centres.",
  category: "Travel Medicine",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Travel Medicine",
    categoryHref: href("en", "/blog"),
    eyebrow: "Portugal · Before you travel",
    h1: "Travel health consultation",
    deck: "A risk assessment built around your destination, your trip and your health — not a generic vaccine list pulled off the internet.",
    intro:
      "A <strong>travel health consultation</strong> (consulta do viajante) is a pre-travel appointment where a doctor assesses the risk attached to your destination and the kind of trip you are taking, and sets out the preventive measures to take before, during and after. In Portugal it is provided through the SNS by the <strong>International Vaccination Centres (CVI)</strong> and public health units, and privately as well. Part of it — risk assessment, reviewing your vaccination record, malaria prophylaxis, medicines to carry, managing chronic illness while travelling — can be done <strong>by video</strong>. Administering vaccines and issuing the <strong>international certificate of vaccination</strong> cannot: those are in-person acts, and the yellow fever vaccine in particular is given only at an International Vaccination Centre.",
    facts: ["Risk assessed by destination", "Vaccines in person, at a CVI", "Yellow fever: CVI only"],
    primaryCta: { label: "Book a travel health consultation", href: href("en", "/services/consulta-do-viajante") },
    secondaryCta: { label: "Travel consultation on SNS 24", href: SNS24_VIAJANTE },
    panelChip: "What this guide covers",
    panelParas: [
      "What a travel consultation actually assesses, and why the destination changes everything.",
      "Where it is done — CVI, public health units, private — and which documents to bring.",
      "The line between what a video consultation settles and what requires travelling to a centre.",
      "Recommended lead time, the vaccines each country requires and waiting times all change by destination and season. They are not quoted here: each points at SNS 24, the CVI, the IHMT or the WHO.",
    ],
    author: {
      initials: "VP",
      name: "Dr Vitor Hugo de Matos Pais",
      line: "General Practitioner · Global Health Portugal",
    },
    reviewLine: "Clinically reviewed by Dra. Nádia Cavaco, General Practitioner, Global Health Portugal.",
    navLabel: "In this article",
    sections: [
      {
        id: "o-que-e",
        nav: "What it is",
        eyebrow: "Starting point",
        h2: "What a travel consultation actually is",
        blocks: [
          lead("It is not a consultation about vaccines. It is a consultation about your trip, in which vaccines are only one of the possible outputs."),
          p("SNS 24 describes it as the consultation in which the traveller is informed about the <em>preventive (or curative) measures to adopt before, during and after the journey, according to the destination</em>. The important part is the last clause: <strong>according to the destination</strong>. The same person, travelling to Amsterdam or to rural Mozambique, leaves with recommendations that look nothing like each other."),
          p("What changes the assessment is not only the country. It is the region within it, the season, the type of accommodation, the length of stay, whether you are going rural or urban, whether you are visiting relatives, whether you are taking children, whether you are pregnant, whether you have a chronic illness or are immunosuppressed, and whether you plan any high-risk activity. Two people holding the same plane ticket can have very different assessments."),
          ul([
            "<strong>Destination and itinerary</strong> — country, region, rural or urban, altitude.",
            "<strong>Season</strong> — rainy season, transmission periods, active outbreaks.",
            "<strong>Type of trip</strong> — tourism, work, backpacking, visiting family, humanitarian mission.",
            "<strong>Your health</strong> — pregnancy, age, chronic illness, immunosuppression, regular medication.",
            "<strong>Vaccination history</strong> — what you already have, what has lapsed, what is missing.",
          ]),
          cite(`Official description: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24 — consulta do viajante</a>. For complex itineraries or higher-risk destinations the <a href="${IHMT_VIAJANTE}" rel="nofollow noopener" target="_blank">IHMT</a> is Portugal's reference centre for tropical medicine, and the fullest country-by-country guidance in English is on <a href="${TRAVELHEALTHPRO}" rel="nofollow noopener" target="_blank">TravelHealthPro</a>.`),
        ],
      },
      {
        id: "onde",
        nav: "Where to go",
        eyebrow: "Locations",
        h2: "Where it is done and what to bring",
        blocks: [
          lead("There are three possible routes, and they are not interchangeable for everything."),
          p("Within the SNS, travel consultations and international vaccination are carried out at <strong>International Vaccination Centres</strong> and at the public health units of the local health authorities, by prior appointment. Each region publishes its own locations and opening hours. Privately, the consultation is offered by hospitals and clinics, and by telemedicine services. These are different circuits with different competences — the next section sets out exactly where the line falls."),
          ul([
            "<strong>International Vaccination Centre</strong> — the consultation and, above all, international vaccination and the certificate.",
            "<strong>Public health unit / health centre</strong> — advice and vaccination that is not CVI-exclusive, depending on the region.",
            "<strong>Private consultation, in person or by video</strong> — risk assessment, prescription and preparation; vaccination still requires attending in person.",
          ]),
          p("SNS 24 lists the documents to bring: <strong>identification</strong>, a <strong>document showing your número de utente</strong> and your <strong>vaccination record</strong>. Two more are worth adding: the list of your regular medication, and the itinerary with dates. Without the itinerary the consultation loses half its value, because the risk assessment depends on exactly that."),
          warn("Book before everything else is arranged", "Ideally book as soon as the trip is decided, not in the final week. Some vaccines need time to produce protection and some require more than one dose. Appointments at International Vaccination Centres can also carry a waiting list — check availability in your region rather than assuming a date."),
          cite(`Locations and hours by region: <a href="${CVI_NORTE}" rel="nofollow noopener" target="_blank">ARS Norte — CVI</a> · <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve — traveller health</a> · <a href="${SNS_ESTRANGEIRO}" rel="nofollow noopener" target="_blank">SNS — healthcare abroad</a>.`),
        ],
      },
      {
        id: "vacinas",
        nav: "Vaccines",
        eyebrow: "Prevention",
        h2: "Vaccines, yellow fever and the international certificate",
        blocks: [
          lead("One distinction settles most of the confusion: vaccines that are recommended, vaccines that are required, and vaccines only a CVI can give."),
          p("<strong>Recommended</strong> vaccines protect against risks present at the destination. <strong>Required</strong> vaccines are those a country imposes as a condition of entry, proven by the international certificate of vaccination. <strong>Yellow fever</strong> is the best-known case of both at once: health authorities determine that it is administered at <strong>International Vaccination Centres</strong>, and that is where the certificate is issued."),
          ul([
            "Reviewing the <strong>national vaccination schedule</strong> is part of the consultation: many trips reveal only that routine vaccines are overdue.",
            "Some travel vaccines require <strong>more than one dose</strong>, with an interval between them.",
            "Entry requirements change and are set by each country — confirm with the destination's authority and the <strong>WHO</strong>, not in an article.",
            "The <strong>international certificate of vaccination</strong> is an official document issued at the moment of vaccination in a CVI. Nobody issues it remotely.",
          ]),
          p("Vaccination does not replace the non-vaccine measures, which matter more at a good number of destinations: protection against mosquito bites, care with water and food, prevention of traveller's diarrhoea, safe sexual behaviour, sun exposure, and road safety — which is, in practice, one of the most common causes of serious harm while travelling."),
          cite(`On yellow fever vaccination at CVIs: <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve</a>. Country requirements: <a href="${WHO_TRAVEL}" rel="nofollow noopener" target="_blank">WHO — travel advice</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Video consultation",
        eyebrow: "Transparency",
        h2: "What a video consultation can — and cannot — do",
        blocks: [
          lead("We put this early and plainly, because almost no telemedicine service writes it down."),
          p("A video consultation <strong>does not administer vaccines</strong> and <strong>does not issue the international certificate of vaccination</strong>. If your trip requires yellow fever, you will have to attend an International Vaccination Centre, regardless of who performs the prior assessment. Any service suggesting otherwise is promising what it cannot deliver."),
          p("That said, the part of a travel consultation that is not an injection is considerable — and it is precisely the part people tend not to make time for:"),
          ul([
            "<strong>Risk assessment</strong> of your actual itinerary, with your clinical history in front of the doctor.",
            "<strong>Review of your vaccination record</strong> and identification of what is missing before you book the CVI — so you go once rather than twice.",
            "<strong>Malaria prophylaxis</strong> where indicated: choice of drug, regimen and effects to watch for.",
            "<strong>Medicines to carry</strong>: traveller's diarrhoea, nausea, pain, allergy, and what to do if you fall ill far from home.",
            "<strong>Chronic illness while travelling</strong>: adjusting timing across time zones, storing medication, quantities, and a medication letter for your luggage.",
            "<strong>After the trip</strong>: which symptoms require medical assessment on your return, and within what timeframe.",
          ]),
          p(`You can confirm any doctor's registration with the <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, with us as anywhere else.`),
          warn("No consultation guarantees a vaccine or a certificate", "Prescribing prophylaxis depends on the clinical assessment and your history. Vaccination and the international certificate depend on the in-person international vaccination circuit. A serious consultation tells you which case is yours; it does not promise a document before examining you."),
        ],
      },
      {
        id: "regresso",
        nav: "On return",
        eyebrow: "After the trip",
        h2: "On your return: the symptoms not to ignore",
        blocks: [
          lead("A travel consultation does not end at the departure gate. An important part of the risk appears weeks after you arrive."),
          p("The most important signal is simple to remember: <strong>fever after travel to a malaria-risk area is a medical emergency</strong>, even if you took prophylaxis correctly and even if you feel reasonably well between fever spikes. Malaria can deteriorate quickly, and early treatment changes the outcome."),
          ul([
            "Fever, chills or sweats after travel to a risk area — seek medical assessment and always say where you have been.",
            "Diarrhoea that persists, contains blood, or comes with high fever.",
            "Jaundice — yellowing of the skin or eyes.",
            "A rash appearing after your return.",
            "An animal bite or scratch during the trip — this one is assessed <strong>immediately</strong>, while still travelling if possible.",
          ]),
          p("Always tell whoever sees you that you have travelled, where, and when. It is the information that changes the clinical reasoning, and the one most often left unsaid."),
          warn("When it is not time to book an appointment", "Chest pain, breathlessness at rest, sudden weakness on one side of the body, difficulty speaking, confusion, neck stiffness with fever, or skin blotches that do not fade under pressure: call <strong>112</strong>. If you are unsure how serious it is, contact <strong>SNS 24</strong>."),
        ],
      },
      {
        id: "checklist",
        nav: "Before you go",
        eyebrow: "Practical",
        h2: "What to settle before you leave",
        blocks: [
          lead("A short sequence that avoids almost every avoidable problem."),
          ul([
            "Book the consultation <strong>as soon as the trip is decided</strong>, not the night before.",
            "Gather your vaccination record, your regular medication list and the itinerary with dates.",
            "Check whether the destination requires an international certificate of vaccination and, if so, book the CVI early.",
            "Carry regular medication in your <strong>hand luggage</strong>, in its original packaging, with the prescription or a medical letter.",
            "Check your health cover at the destination, including repatriation, and carry emergency contacts.",
            "Keep the consulate or embassy contact details, know how to seek medical help in the country you are visiting, and sign up to the Portuguese Ministry of Foreign Affairs <strong>traveller registry</strong>, which lets the consulate reach you in an emergency.",
          ]),
          p("None of this takes an afternoon. It only has to be done beforehand, rather than on the way to the airport — which is, in practice, when most people remember."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Next steps",
    linksLead:
      "Our doctors in Portugal carry out the pre-travel assessment by video and tell you plainly what the consultation can settle and what requires attending an International Vaccination Centre.",
    links: [
      { label: "Travel health consultation", href: href("en", "/services/consulta-do-viajante") },
      { label: "Our doctors in Portugal", href: href("en", "/doctors") },
      { label: "Contact Global Health Portugal", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Travelling and not sure where to start?",
      text: "A video consultation reviews your vaccination record, assesses the risk of your itinerary, prescribes what is indicated and tells you exactly what still has to be dealt with in person.",
      primary: { label: "Book a consultation", href: href("en", "/services/consulta-do-viajante") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to confirm the rules",
    sourcesLead:
      "Locations and hours, entry requirements by country and recommended vaccines all change. Always confirm at the source, and as close to departure as possible.",
    sources: [
      { label: "SNS 24 — travel consultation", href: SNS24_VIAJANTE },
      { label: "ARS Norte — International Vaccination Centres", href: CVI_NORTE },
      { label: "ARS Algarve — traveller health", href: CVI_ALGARVE },
      { label: "SNS — healthcare abroad", href: SNS_ESTRANGEIRO },
      { label: "WHO — travel advice", href: WHO_TRAVEL },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "IHMT — consulta do viajante", href: IHMT_VIAJANTE },
      { label: "TravelHealthPro — informação por país", href: TRAVELHEALTHPRO },
      { label: "Registo do Viajante — MNE", href: REGISTO_VIAJANTE },
    ],
    sourcesNote:
      "Links open on the competent bodies' own websites. Global Health is not an International Vaccination Centre, does not administer vaccines and does not issue international certificates of vaccination.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "What is a travel health consultation?",
        a: "A pre-travel appointment in which a doctor assesses the risk of your destination and the type of trip you are taking and sets out the preventive measures to adopt before, during and after. It includes reviewing your vaccination record, indicating vaccines and prophylaxis where applicable, and the non-vaccine measures — water, food, bites, medicines to carry.",
      },
      {
        q: "Where is the travel consultation done in Portugal?",
        a: "Within the SNS at International Vaccination Centres and public health units, by prior appointment; each region publishes its own locations and hours, including Porto, Lisbon, Coimbra and Braga. It is also offered privately, in person or by video. International vaccination and the certificate, however, are acts of the International Vaccination Centres.",
      },
      {
        q: "Can I have the travel consultation online?",
        a: "Risk assessment, review of your vaccination record, malaria prophylaxis, medicines to carry and managing chronic illness while travelling can all be done by video. Administering vaccines and the international certificate of vaccination cannot: they require attending an International Vaccination Centre.",
      },
      {
        q: "How far in advance should I book?",
        a: "As soon as the trip is decided. Some vaccines need time to produce protection and some require more than one dose, and appointments at International Vaccination Centres can carry a waiting list. Check availability in your region rather than assuming a date.",
      },
      {
        q: "What documents should I bring?",
        a: "SNS 24 lists identification, a document showing your número de utente and your vaccination record. Bring your regular medication list and the itinerary with dates as well — without the itinerary a serious risk assessment is not possible.",
      },
      {
        q: "Do I need the yellow fever vaccine and the certificate?",
        a: "It depends on the destination and the itinerary, and entry requirements are set by each country. The yellow fever vaccine is administered at International Vaccination Centres, which issue the international certificate of vaccination at the time. Always confirm with the destination country's authority and the World Health Organization.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Vitor Hugo de Matos Pais, General Practitioner at Global Health Portugal, and clinically reviewed by Dra. Nádia Cavaco, General Practitioner. This article contains general information about travel medicine in Portugal and is not personalised medical advice. Vaccination and prophylaxis recommendations depend on the destination, the itinerary and your clinical history, and can only be made in consultation. Global Health does not administer vaccines and does not issue international certificates of vaccination. In a medical emergency, call 112 immediately.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "consulta-del-viajero-portugal",
  title: "Consulta del viajero en Portugal: dónde se hace, cuándo pedirla y qué llevar",
  excerpt:
    "La consulta del viajero evalúa el riesgo de su viaje según el destino y le prepara antes de salir. Dónde se hace, qué llevar, qué solo puede hacer un Centro de Vacunación Internacional y qué resuelve una consulta por vídeo.",
  seoTitle: "Consulta del viajero en Portugal: dónde y cuándo",
  seoDescription:
    "Consulta del viajero en Portugal: qué se evalúa, dónde se hace, qué documentos llevar y el papel de los Centros de Vacunación Internacional.",
  category: "Medicina del Viajero",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina del Viajero",
    categoryHref: href("es", "/blog"),
    eyebrow: "Portugal · Antes de viajar",
    h1: "Consulta del viajero",
    deck: "Una evaluación de riesgo pensada para su destino, su viaje y su salud, no una lista genérica de vacunas sacada de internet.",
    intro:
      "La <strong>consulta del viajero</strong> (consulta do viajante) es una consulta previa al viaje en la que un médico evalúa el riesgo asociado a su destino y al tipo de viaje que va a hacer, e indica las medidas preventivas que debe adoptar antes, durante y después. En Portugal se realiza en el SNS a través de los <strong>Centros de Vacunación Internacional (CVI)</strong> y de las unidades de salud pública, y también en el ámbito privado. Una parte —evaluación de riesgo, revisión del carné de vacunas, profilaxis de la malaria, medicación que llevar, enfermedad crónica en viaje— puede hacerse <strong>por vídeo</strong>. La administración de vacunas y el <strong>certificado internacional de vacunación</strong> no: son actos presenciales, y la vacuna de la fiebre amarilla en particular solo se administra en un Centro de Vacunación Internacional.",
    facts: ["Riesgo evaluado por destino", "Vacunas: presencial, en CVI", "Fiebre amarilla: solo en CVI"],
    primaryCta: { label: "Reservar consulta del viajero", href: href("es", "/services/consulta-do-viajante") },
    secondaryCta: { label: "Consulta del viajero en SNS 24", href: SNS24_VIAJANTE },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Qué se evalúa realmente en una consulta del viajero y por qué el destino determina el resto.",
      "Dónde se hace —CVI, unidades de salud pública, privado— y qué documentos llevar.",
      "La frontera entre lo que resuelve una consulta por vídeo y lo que obliga a desplazarse.",
      "La antelación recomendada, las vacunas que exige cada país y los tiempos de espera cambian según el destino y la época. Aquí no se citan: cada punto remite a SNS 24, al CVI, al IHMT o a la OMS.",
    ],
    author: {
      initials: "VP",
      name: "Dr Vitor Hugo de Matos Pais",
      line: "Médico de familia · Global Health Portugal",
    },
    reviewLine: "Revisado clínicamente por la Dra. Nádia Cavaco, médica de familia, Global Health Portugal.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "o-que-e",
        nav: "Qué es",
        eyebrow: "Punto de partida",
        h2: "Qué es realmente la consulta del viajero",
        blocks: [
          lead("No es una consulta sobre vacunas. Es una consulta sobre su viaje, en la que las vacunas son solo una de las salidas posibles."),
          p("SNS 24 la describe como la consulta en la que se informa al viajero sobre las <em>medidas preventivas (o curativas) a adoptar antes, durante y después del viaje, en función del destino</em>. La parte importante es la última: <strong>en función del destino</strong>. La misma persona, viajando a Ámsterdam o al interior de Mozambique, sale con recomendaciones que no se parecen en nada."),
          p("Lo que cambia la evaluación no es solo el país. Es la región dentro del país, la época del año, el tipo de alojamiento, la duración, si va a zona rural o urbana, si visita a familiares, si lleva niños, si está embarazada, si tiene una enfermedad crónica o está inmunodeprimido, y si practica alguna actividad de riesgo. Dos personas con el mismo billete de avión pueden tener evaluaciones muy distintas."),
          ul([
            "<strong>Destino e itinerario</strong> — país, región, medio rural o urbano, altitud.",
            "<strong>Época</strong> — estación de lluvias, periodos de transmisión, brotes activos.",
            "<strong>Perfil del viaje</strong> — turismo, trabajo, mochila, visita familiar, misión humanitaria.",
            "<strong>Su estado de salud</strong> — embarazo, edad, enfermedad crónica, inmunosupresión, medicación habitual.",
            "<strong>Historial de vacunación</strong> — lo que ya tiene, lo que ha caducado, lo que falta.",
          ]),
          cite(`Descripción oficial: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24 — consulta do viajante</a>. Para itinerarios complejos o destinos de mayor riesgo, el <a href="${IHMT_VIAJANTE}" rel="nofollow noopener" target="_blank">IHMT</a> es el centro de referencia portugués en medicina tropical, y la información por país más completa en inglés está en <a href="${TRAVELHEALTHPRO}" rel="nofollow noopener" target="_blank">TravelHealthPro</a>.`),
        ],
      },
      {
        id: "onde",
        nav: "Dónde se hace",
        eyebrow: "Lugares",
        h2: "Dónde se hace y qué llevar",
        blocks: [
          lead("Hay tres circuitos posibles, y no son intercambiables en todos los casos."),
          p("En el SNS, la consulta del viajero y la vacunación internacional se realizan en los <strong>Centros de Vacunación Internacional</strong> y en las unidades de salud pública de las unidades locales de salud, con cita previa. Cada región publica sus lugares y horarios. En el ámbito privado la ofrecen hospitales y clínicas, y servicios de telemedicina. Son circuitos distintos con competencias distintas: el siguiente apartado explica dónde está la frontera."),
          ul([
            "<strong>Centro de Vacunación Internacional</strong> — la consulta y, en especial, la vacunación internacional y el certificado.",
            "<strong>Unidad de salud pública / centro de salud</strong> — asesoramiento y vacunación no exclusiva del CVI, según la región.",
            "<strong>Consulta privada, presencial o por vídeo</strong> — evaluación de riesgo, prescripción y preparación; la vacunación sigue exigiendo desplazamiento.",
          ]),
          p("SNS 24 indica los documentos a llevar: <strong>documento de identificación</strong>, <strong>documento con el número de utente</strong> y el <strong>carné de vacunas</strong>. Merece la pena añadir dos: la lista de su medicación habitual y el itinerario del viaje con fechas. Sin itinerario, la consulta pierde la mitad de su valor, porque la evaluación de riesgo depende exactamente de eso."),
          warn("Pida cita antes que el resto de reservas", "Lo ideal es pedirla en cuanto el viaje esté decidido, y no la semana anterior. Algunas vacunas necesitan tiempo para producir protección y algunas exigen más de una dosis. La cita en un Centro de Vacunación Internacional puede además tener lista de espera: confirme la disponibilidad de su región antes de contar con una fecha."),
          cite(`Lugares y horarios por región: <a href="${CVI_NORTE}" rel="nofollow noopener" target="_blank">ARS Norte — CVI</a> · <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve — salud del viajero</a> · <a href="${SNS_ESTRANGEIRO}" rel="nofollow noopener" target="_blank">SNS — asistencia sanitaria en el extranjero</a>.`),
        ],
      },
      {
        id: "vacinas",
        nav: "Vacunas",
        eyebrow: "Prevención",
        h2: "Vacunas, fiebre amarilla y el certificado internacional",
        blocks: [
          lead("Una distinción resuelve la mayor parte de las dudas: vacunas recomendadas, vacunas exigidas y vacunas que solo un CVI administra."),
          p("<strong>Recomendadas</strong> son las que protegen frente a riesgos presentes en el destino. <strong>Exigidas</strong> son las que un país impone como condición de entrada, y cuya prueba es el certificado internacional de vacunación. La vacuna de la <strong>fiebre amarilla</strong> es el caso más conocido de ambas cosas a la vez: las autoridades sanitarias determinan que se administra en los <strong>Centros de Vacunación Internacional</strong>, y es allí donde se emite el certificado."),
          ul([
            "La revisión del <strong>calendario nacional de vacunación</strong> forma parte de la consulta: muchos viajes revelan únicamente que hay vacunas de rutina atrasadas.",
            "Algunas vacunas del viajero exigen <strong>más de una dosis</strong>, con intervalo entre ellas.",
            "Las exigencias de entrada cambian y las fija cada país: confírmelas ante la autoridad del destino y la <strong>OMS</strong>, no en un artículo.",
            "El <strong>certificado internacional de vacunación</strong> es un documento oficial emitido en el acto de la vacunación en un CVI. Nadie lo expide a distancia.",
          ]),
          p("La vacunación no sustituye a las medidas no vacunales, que en buena parte de los destinos pesan más: protección frente a picaduras de mosquito, cuidado con el agua y los alimentos, prevención de la diarrea del viajero, comportamiento sexual seguro, exposición solar y seguridad vial, que en la práctica es una de las causas más frecuentes de problemas graves en viaje."),
          cite(`Sobre la administración de la vacuna de la fiebre amarilla en CVI: <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve</a>. Exigencias por país: <a href="${WHO_TRAVEL}" rel="nofollow noopener" target="_blank">OMS — travel advice</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Transparencia",
        h2: "Qué puede y qué no puede hacer una consulta por vídeo",
        blocks: [
          lead("Lo ponemos pronto y sin rodeos, porque casi ningún servicio de telemedicina lo escribe."),
          p("Una consulta por vídeo <strong>no administra vacunas</strong> y <strong>no emite el certificado internacional de vacunación</strong>. Si su viaje exige fiebre amarilla, tendrá que desplazarse a un Centro de Vacunación Internacional, con independencia de quién haga la evaluación previa. Cualquier servicio que sugiera lo contrario promete algo que no puede cumplir."),
          p("Dicho esto, la parte de la consulta del viajero que no es inyección es considerable, y es justamente la parte para la que la gente no suele tener tiempo:"),
          ul([
            "<strong>Evaluación de riesgo</strong> del itinerario concreto, con su historia clínica delante.",
            "<strong>Revisión del carné de vacunas</strong> e identificación de lo que falta antes de pedir cita en el CVI, para ir una vez y no dos.",
            "<strong>Profilaxis de la malaria</strong> cuando está indicada: elección del fármaco, pauta y efectos a vigilar.",
            "<strong>Medicación que llevar</strong>: diarrea del viajero, náuseas, dolor, alergia, y qué hacer si enferma lejos de casa.",
            "<strong>Enfermedad crónica en viaje</strong>: ajuste de horarios con los husos, conservación de medicamentos, cantidades y justificante médico de la medicación para el equipaje.",
            "<strong>Después del viaje</strong>: qué síntomas obligan a buscar valoración médica al regresar, y en qué plazo.",
          ]),
          p(`Puede confirmar la colegiación de cualquier médico en la <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, con nosotros y con cualquier otro.`),
          warn("Ninguna consulta garantiza una vacuna ni un certificado", "La prescripción de profilaxis depende de la valoración clínica y de su historia. La vacunación y el certificado internacional dependen del circuito presencial de vacunación internacional. Una consulta seria le dice cuál es su caso; no promete un documento antes de explorarle."),
        ],
      },
      {
        id: "regresso",
        nav: "Al regresar",
        eyebrow: "Después del viaje",
        h2: "Al regresar: los síntomas que no se ignoran",
        blocks: [
          lead("La consulta del viajero no termina en el aeropuerto de salida. Una parte importante del riesgo aparece semanas después de llegar."),
          p("La señal más importante es fácil de memorizar: <strong>la fiebre después de un viaje a zona de riesgo de malaria es una urgencia médica</strong>, aunque haya hecho la profilaxis correctamente y aunque se encuentre razonablemente bien entre picos de fiebre. La malaria puede agravarse deprisa y el tratamiento precoz cambia el desenlace."),
          ul([
            "Fiebre, escalofríos o sudores tras viajar a zona de riesgo: busque valoración médica y diga siempre dónde ha estado.",
            "Diarrea que persiste, con sangre, o acompañada de fiebre alta.",
            "Ictericia: piel u ojos amarillentos.",
            "Erupción que aparece después del regreso.",
            "Herida por mordedura o arañazo de animal durante el viaje: este caso se valora <strong>de inmediato</strong>, aún en viaje si es posible.",
          ]),
          p("Diga siempre a quien le atienda que ha viajado, adónde y cuándo. Es la información que cambia el razonamiento clínico, y la que más a menudo se queda sin decir."),
          warn("Cuándo no es momento de pedir cita", "Dolor en el pecho, falta de aire en reposo, debilidad súbita de un lado del cuerpo, dificultad para hablar, confusión, rigidez de nuca con fiebre, o manchas en la piel que no desaparecen al presionar: llame al <strong>112</strong>. Ante dudas sobre la gravedad, contacte con <strong>SNS 24</strong>."),
        ],
      },
      {
        id: "checklist",
        nav: "Antes de salir",
        eyebrow: "Práctico",
        h2: "Qué resolver antes de salir",
        blocks: [
          lead("Una secuencia corta que evita casi todos los problemas evitables."),
          ul([
            "Pida la consulta <strong>en cuanto el viaje esté decidido</strong>, no la víspera.",
            "Reúna el carné de vacunas, la lista de medicación habitual y el itinerario con fechas.",
            "Confirme si el destino exige certificado internacional de vacunación y, en tal caso, pida cita pronto en el CVI.",
            "Lleve la medicación habitual en el <strong>equipaje de mano</strong>, en su envase original, con la receta o un justificante médico.",
            "Compruebe la cobertura sanitaria en el destino, incluida la repatriación, y lleve los contactos de emergencia.",
            "Guarde el contacto del consulado o embajada, sepa cómo pedir ayuda médica en el país donde va a estar e inscríbase en el <strong>registro del viajero</strong> del Ministerio de Asuntos Exteriores portugués, que permite al consulado localizarle en una emergencia.",
          ]),
          p("Nada de esto exige una tarde entera. Solo exige hacerlo antes, y no camino del aeropuerto, que es cuando en la práctica se acuerda la mayoría."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros médicos en Portugal hacen la evaluación previa al viaje por vídeo y le dicen con claridad qué se resuelve en la consulta y qué obliga a acudir a un Centro de Vacunación Internacional.",
    links: [
      { label: "Consulta de salud del viajero", href: href("es", "/services/consulta-do-viajante") },
      { label: "Nuestros médicos en Portugal", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Portugal", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Va a viajar y no sabe por dónde empezar?",
      text: "Una consulta por vídeo revisa su carné de vacunas, evalúa el riesgo de su itinerario, prescribe lo que esté indicado y le dice exactamente qué le queda por resolver presencialmente.",
      primary: { label: "Reservar consulta", href: href("es", "/services/consulta-do-viajante") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar las reglas",
    sourcesLead:
      "Lugares y horarios, exigencias de entrada por país y vacunas recomendadas cambian. Confirme siempre en la fuente, y lo más cerca posible de la fecha de salida.",
    sources: [
      { label: "SNS 24 — consulta del viajero", href: SNS24_VIAJANTE },
      { label: "ARS Norte — Centros de Vacunación Internacional", href: CVI_NORTE },
      { label: "ARS Algarve — salud del viajero", href: CVI_ALGARVE },
      { label: "SNS — asistencia sanitaria en el extranjero", href: SNS_ESTRANGEIRO },
      { label: "OMS — travel advice", href: WHO_TRAVEL },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "IHMT — consulta do viajante", href: IHMT_VIAJANTE },
      { label: "TravelHealthPro — informação por país", href: TRAVELHEALTHPRO },
      { label: "Registo do Viajante — MNE", href: REGISTO_VIAJANTE },
    ],
    sourcesNote:
      "Los enlaces abren en los sitios de los organismos competentes. Global Health no es un Centro de Vacunación Internacional, no administra vacunas y no emite certificados internacionales de vacunación.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Qué es la consulta del viajero?",
        a: "Una consulta previa al viaje en la que un médico evalúa el riesgo de su destino y de su tipo de viaje e indica las medidas preventivas a adoptar antes, durante y después. Incluye la revisión del carné de vacunas, la indicación de vacunas y profilaxis cuando procede, y las medidas no vacunales: agua, alimentos, picaduras, medicación que llevar.",
      },
      {
        q: "¿Dónde se hace la consulta del viajero en Portugal?",
        a: "En el SNS, en los Centros de Vacunación Internacional y en las unidades de salud pública, con cita previa; cada región publica sus lugares y horarios, incluidos Oporto, Lisboa, Coímbra y Braga. También se hace en el ámbito privado, presencial o por vídeo. La vacunación internacional y el certificado, en cambio, son actos de los Centros de Vacunación Internacional.",
      },
      {
        q: "¿Puedo hacer la consulta del viajero online?",
        a: "La evaluación de riesgo, la revisión del carné de vacunas, la profilaxis de la malaria, la medicación que llevar y la gestión de la enfermedad crónica en viaje pueden hacerse por vídeo. La administración de las vacunas y el certificado internacional de vacunación no: exigen desplazarse a un Centro de Vacunación Internacional.",
      },
      {
        q: "¿Con cuánta antelación debo pedir cita?",
        a: "En cuanto el viaje esté decidido. Algunas vacunas necesitan tiempo para producir protección y algunas exigen más de una dosis, y la cita en un Centro de Vacunación Internacional puede tener lista de espera. Confirme la disponibilidad de su región en lugar de contar con una fecha.",
      },
      {
        q: "¿Qué documentos debo llevar?",
        a: "SNS 24 indica documento de identificación, documento con el número de utente y carné de vacunas. Lleve también la lista de su medicación habitual y el itinerario con fechas: sin itinerario no es posible hacer una evaluación de riesgo seria.",
      },
      {
        q: "¿Necesito la vacuna de la fiebre amarilla y el certificado?",
        a: "Depende del destino y del itinerario, y las exigencias de entrada las fija cada país. La vacuna de la fiebre amarilla se administra en los Centros de Vacunación Internacional, que emiten el certificado internacional de vacunación en el acto. Confirme siempre ante la autoridad del país de destino y la Organización Mundial de la Salud.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr Vitor Hugo de Matos Pais, médico de familia de Global Health Portugal, y revisado clínicamente por la Dra. Nádia Cavaco, médica de familia. Este artículo contiene información general sobre medicina del viajero en Portugal y no constituye asesoramiento médico personalizado. Las recomendaciones de vacunación y profilaxis dependen del destino, del itinerario y de su historia clínica, y solo pueden hacerse en consulta. Global Health no administra vacunas ni emite certificados internacionales de vacunación. En caso de emergencia médica, llame inmediatamente al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "cestovni-medicina-portugalsko",
  title: "Cestovní konzultace v Portugalsku: kde se dělá, kdy se objednat a co si vzít",
  excerpt:
    "Cestovní konzultace posoudí riziko vaší cesty podle destinace a připraví vás před odletem. Kde se dělá, co si vzít s sebou, co umí jen Centrum mezinárodního očkování a co vyřeší videokonzultace.",
  seoTitle: "Cestovní konzultace v Portugalsku: kde a kdy",
  seoDescription:
    "Cestovní konzultace v Portugalsku: co se posuzuje, kde se dělá, jaké doklady si vzít a jakou roli mají Centra mezinárodního očkování.",
  category: "Cestovní medicína",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Cestovní medicína",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Portugalsko · Před cestou",
    h1: "Cestovní konzultace",
    deck: "Posouzení rizika postavené na vaší destinaci, vaší cestě a vašem zdraví — ne obecný seznam očkování stažený z internetu.",
    intro:
      "<strong>Cestovní konzultace</strong> (consulta do viajante) je konzultace před cestou, při které lékař posoudí riziko spojené s vaší destinací a s typem cesty, kterou chystáte, a určí preventivní opatření před cestou, během ní i po ní. V Portugalsku se dělá ve veřejném systému SNS prostřednictvím <strong>Center mezinárodního očkování (CVI)</strong> a jednotek veřejného zdraví, a také soukromě. Část konzultace — posouzení rizika, kontrola očkovacího průkazu, profylaxe malárie, léky na cestu, chronické onemocnění při cestování — lze udělat <strong>přes video</strong>. Podání očkovacích látek a <strong>mezinárodní očkovací průkaz</strong> nikoli: to jsou prezenční úkony a očkování proti žluté zimnici se podává výhradně v Centru mezinárodního očkování.",
    facts: ["Riziko podle destinace", "Očkování prezenčně, v CVI", "Žlutá zimnice: jen v CVI"],
    primaryCta: { label: "Objednat cestovní konzultaci", href: href("cs", "/services/consulta-do-viajante") },
    secondaryCta: { label: "Cestovní konzultace na SNS 24", href: SNS24_VIAJANTE },
    panelChip: "Co v článku najdete",
    panelParas: [
      "Co se v cestovní konzultaci skutečně posuzuje a proč destinace mění všechno.",
      "Kde se dělá — CVI, jednotky veřejného zdraví, soukromě — a jaké doklady si vzít.",
      "Hranici mezi tím, co vyřeší videokonzultace, a tím, co vyžaduje osobní návštěvu.",
      "Doporučený předstih, očkování vyžadovaná jednotlivými zeměmi i čekací doby se liší podle destinace a ročního období. Nejsou zde uvedeny: každý údaj odkazuje na SNS 24, na CVI, na IHMT nebo na WHO.",
    ],
    author: {
      initials: "VP",
      name: "Dr Vitor Hugo de Matos Pais",
      line: "Praktický lékař · Global Health Portugalsko",
    },
    reviewLine: "Klinicky zkontrolovala Dra. Nádia Cavaco, praktická lékařka, Global Health Portugalsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "o-que-e",
        nav: "Co to je",
        eyebrow: "Východisko",
        h2: "Co cestovní konzultace vlastně je",
        blocks: [
          lead("Není to konzultace o očkování. Je to konzultace o vaší cestě, ve které je očkování jen jedním z možných výstupů."),
          p("SNS 24 ji popisuje jako konzultaci, ve které je cestující informován o <em>preventivních (nebo léčebných) opatřeních, která má přijmout před cestou, během ní a po ní, v závislosti na destinaci</em>. Důležitá je poslední část: <strong>v závislosti na destinaci</strong>. Tentýž člověk, který letí do Amsterdamu nebo do vnitrozemí Mosambiku, odchází z konzultace s doporučeními, která se navzájem vůbec nepodobají."),
          p("Posouzení nemění jen země. Mění ho region uvnitř země, roční období, typ ubytování, délka pobytu, zda jedete na venkov nebo do města, zda navštěvujete příbuzné, zda berete děti, zda jste těhotná, zda máte chronické onemocnění nebo sníženou imunitu, a zda plánujete nějakou rizikovou aktivitu. Dva lidé se stejnou letenkou mohou mít velmi odlišné posouzení."),
          ul([
            "<strong>Destinace a itinerář</strong> — země, region, venkov nebo město, nadmořská výška.",
            "<strong>Roční období</strong> — období dešťů, období přenosu, aktivní ohniska.",
            "<strong>Typ cesty</strong> — turistika, práce, batůžkářství, návštěva rodiny, humanitární mise.",
            "<strong>Váš zdravotní stav</strong> — těhotenství, věk, chronické onemocnění, imunosuprese, pravidelné léky.",
            "<strong>Očkovací historie</strong> — co už máte, čemu vypršela platnost, co chybí.",
          ]),
          cite(`Oficiální popis: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24 — cestovní konzultace</a>. U složitých itinerářů a rizikovějších destinací je referenčním pracovištěm portugalské tropické medicíny <a href="${IHMT_VIAJANTE}" rel="nofollow noopener" target="_blank">IHMT</a>; nejpodrobnější informace po jednotlivých zemích v angličtině najdete na <a href="${TRAVELHEALTHPRO}" rel="nofollow noopener" target="_blank">TravelHealthPro</a>.`),
        ],
      },
      {
        id: "onde",
        nav: "Kde se dělá",
        eyebrow: "Místa",
        h2: "Kde se dělá a co si vzít s sebou",
        blocks: [
          lead("Existují tři cesty a nejsou pro všechno zaměnitelné."),
          p("V systému SNS se cestovní konzultace a mezinárodní očkování provádějí v <strong>Centrech mezinárodního očkování</strong> a v jednotkách veřejného zdraví místních zdravotních správ, po předchozím objednání. Každý region zveřejňuje svá místa a hodiny. V soukromém sektoru ji nabízejí nemocnice, kliniky a telemedicínské služby. Jde o různé okruhy s různými kompetencemi — kde přesně je hranice, vysvětluje následující část."),
          ul([
            "<strong>Centrum mezinárodního očkování</strong> — konzultace a především mezinárodní očkování a průkaz.",
            "<strong>Jednotka veřejného zdraví / zdravotní středisko</strong> — poradenství a očkování, které není výhradně v kompetenci CVI, podle regionu.",
            "<strong>Soukromá konzultace, prezenčně nebo přes video</strong> — posouzení rizika, předpis a příprava; očkování si i tak vyžádá osobní návštěvu.",
          ]),
          p("SNS 24 uvádí doklady, které si vzít: <strong>doklad totožnosti</strong>, <strong>doklad s číslem pojištěnce</strong> a <strong>očkovací průkaz</strong>. Stojí za to přidat dva další: seznam pravidelně užívaných léků a itinerář cesty s daty. Bez itineráře ztrácí konzultace polovinu hodnoty, protože posouzení rizika závisí přesně na něm."),
          warn("Objednejte se dřív než zařídíte zbytek", "Ideální je objednat se, jakmile je cesta rozhodnutá, ne až týden předem. Některé vakcíny potřebují čas, než vytvoří ochranu, a některé vyžadují více než jednu dávku. Objednání v Centru mezinárodního očkování může navíc mít čekací dobu — ověřte si dostupnost ve svém regionu, místo abyste počítali s termínem."),
          cite(`Místa a hodiny podle regionu: <a href="${CVI_NORTE}" rel="nofollow noopener" target="_blank">ARS Norte — CVI</a> · <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve — zdraví cestujícího</a> · <a href="${SNS_ESTRANGEIRO}" rel="nofollow noopener" target="_blank">SNS — zdravotní péče v zahraničí</a>.`),
        ],
      },
      {
        id: "vacinas",
        nav: "Očkování",
        eyebrow: "Prevence",
        h2: "Očkování, žlutá zimnice a mezinárodní průkaz",
        blocks: [
          lead("Jedno rozlišení vyřeší většinu nejasností: očkování doporučená, očkování vyžadovaná a očkování, která podá jen CVI."),
          p("<strong>Doporučená</strong> chrání před riziky přítomnými v destinaci. <strong>Vyžadovaná</strong> jsou ta, která země stanoví jako podmínku vstupu a jejichž dokladem je mezinárodní očkovací průkaz. Očkování proti <strong>žluté zimnici</strong> je nejznámějším případem obojího zároveň: zdravotní úřady určují, že se podává v <strong>Centrech mezinárodního očkování</strong>, a právě tam se průkaz vystavuje."),
          ul([
            "Kontrola <strong>národního očkovacího kalendáře</strong> je součástí konzultace: mnoho cest odhalí pouze to, že máte zpoždění v běžném očkování.",
            "Některá cestovní očkování vyžadují <strong>více než jednu dávku</strong>, s odstupem mezi nimi.",
            "Vstupní požadavky se mění a stanovuje je každá země — ověřte je u úřadu destinace a u <strong>WHO</strong>, ne v článku.",
            "<strong>Mezinárodní očkovací průkaz</strong> je úřední doklad vystavený při samotném očkování v CVI. Na dálku ho nevystaví nikdo.",
          ]),
          p("Očkování nenahrazuje neočkovací opatření, která v řadě destinací váží víc: ochrana před bodnutím komárem, opatrnost s vodou a jídlem, prevence cestovatelského průjmu, bezpečné sexuální chování, ochrana před sluncem a bezpečnost v dopravě — což je v praxi jedna z nejčastějších příčin vážných potíží na cestách."),
          cite(`K podávání očkování proti žluté zimnici v CVI: <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve</a>. Požadavky podle zemí: <a href="${WHO_TRAVEL}" rel="nofollow noopener" target="_blank">WHO — travel advice</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Konzultace online",
        eyebrow: "Transparentnost",
        h2: "Co videokonzultace zvládne a co ne",
        blocks: [
          lead("Píšeme to hned a bez okolků, protože skoro žádná telemedicínská služba to neuvádí."),
          p("Videokonzultace <strong>nepodává očkování</strong> a <strong>nevystavuje mezinárodní očkovací průkaz</strong>. Pokud vaše cesta vyžaduje žlutou zimnici, budete se muset dostavit do Centra mezinárodního očkování, bez ohledu na to, kdo dělal předchozí posouzení. Každá služba, která naznačuje opak, slibuje něco, co nemůže splnit."),
          p("Přesto je část cestovní konzultace, která není injekce, značná — a je to právě ta část, na kterou lidé obvykle nemají čas:"),
          ul([
            "<strong>Posouzení rizika</strong> konkrétního itineráře, s vaší anamnézou před sebou.",
            "<strong>Kontrola očkovacího průkazu</strong> a určení toho, co chybí, ještě před objednáním do CVI — abyste tam jeli jednou, a ne dvakrát.",
            "<strong>Profylaxe malárie</strong>, kde je indikovaná: volba léku, schéma a nežádoucí účinky, které sledovat.",
            "<strong>Léky s sebou</strong>: cestovatelský průjem, nevolnost, bolest, alergie, a co dělat, když onemocníte daleko od domova.",
            "<strong>Chronické onemocnění na cestách</strong>: úprava časování při změně pásem, uchovávání léků, množství a lékařské potvrzení k lékům do zavazadla.",
            "<strong>Po návratu</strong>: které příznaky vyžadují lékařské vyšetření a v jakém časovém odstupu.",
          ]),
          p(`Registraci kteréhokoli lékaře si ověříte u <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, u nás stejně jako kdekoli jinde.`),
          warn("Žádná konzultace nezaručuje očkování ani průkaz", "Předpis profylaxe závisí na klinickém posouzení a na vaší anamnéze. Očkování a mezinárodní průkaz závisí na prezenčním okruhu mezinárodního očkování. Seriózní konzultace vám řekne, který případ je ten váš; neslibuje doklad dřív, než vás vyšetří."),
        ],
      },
      {
        id: "regresso",
        nav: "Po návratu",
        eyebrow: "Po cestě",
        h2: "Po návratu: příznaky, které se nepřecházejí",
        blocks: [
          lead("Cestovní konzultace nekončí na odletovém letišti. Významná část rizika se objeví týdny po příletu."),
          p("Nejdůležitější signál se snadno pamatuje: <strong>horečka po cestě do oblasti s rizikem malárie je urgentní stav</strong>, i když jste profylaxi užívali správně a i když se mezi vzestupy teploty cítíte přijatelně. Malárie se může zhoršit rychle a včasná léčba mění výsledek."),
          ul([
            "Horečka, zimnice nebo pocení po cestě do rizikové oblasti — vyhledejte lékaře a vždy řekněte, kde jste byli.",
            "Průjem, který přetrvává, je s krví nebo doprovázený vysokou horečkou.",
            "Žloutenka — zežloutnutí kůže nebo očí.",
            "Vyrážka, která se objeví po návratu.",
            "Poranění po kousnutí nebo poškrábání zvířetem během cesty — tohle se řeší <strong>okamžitě</strong>, pokud možno ještě na cestě.",
          ]),
          p("Vždy řekněte tomu, kdo vás ošetřuje, že jste cestovali, kam a kdy. Je to informace, která mění klinickou úvahu, a zároveň ta, která nejčastěji nezazní."),
          warn("Kdy není čas objednávat se", "Bolest na hrudi, dušnost v klidu, náhlá slabost poloviny těla, porucha řeči, zmatenost, ztuhlá šíje s horečkou nebo skvrny na kůži, které po stlačení nemizí: volejte <strong>112</strong>. Při pochybnostech o závažnosti kontaktujte <strong>SNS 24</strong>."),
        ],
      },
      {
        id: "checklist",
        nav: "Před odjezdem",
        eyebrow: "Prakticky",
        h2: "Co vyřešit před odjezdem",
        blocks: [
          lead("Krátká posloupnost, která odstraní téměř všechny odstranitelné problémy."),
          ul([
            "Objednejte se <strong>hned, jak je cesta rozhodnutá</strong>, ne den předem.",
            "Připravte si očkovací průkaz, seznam pravidelných léků a itinerář s daty.",
            "Ověřte, zda destinace vyžaduje mezinárodní očkovací průkaz, a pokud ano, objednejte se do CVI včas.",
            "Pravidelné léky si vezměte do <strong>příručního zavazadla</strong>, v originálním balení, s receptem nebo lékařským potvrzením.",
            "Zkontrolujte zdravotní krytí v destinaci včetně repatriace a mějte s sebou nouzové kontakty.",
            "Uložte si kontakt na konzulát nebo velvyslanectví, zjistěte, jak v dané zemi požádat o lékařskou pomoc, a zaregistrujte se do <strong>registru cestovatelů</strong> portugalského ministerstva zahraničí, díky němuž vás konzulát v nouzi dohledá.",
          ]),
          p("Nic z toho nezabere celé odpoledne. Vyžaduje to jen udělat to předem, a ne cestou na letiště — což je v praxi okamžik, kdy si na to většina lidí vzpomene."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugalsko",
    linksH2: "Kam dál",
    linksLead:
      "Naši lékaři v Portugalsku dělají posouzení před cestou přes video a jasně vám řeknou, co lze vyřešit při konzultaci a co vyžaduje návštěvu Centra mezinárodního očkování.",
    links: [
      { label: "Konzultace cestovní medicíny", href: href("cs", "/services/consulta-do-viajante") },
      { label: "Naši lékaři v Portugalsku", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Portugalsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Chystáte se na cestu a nevíte, kde začít?",
      text: "Videokonzultace projde váš očkovací průkaz, posoudí riziko vašeho itineráře, předepíše, co je indikováno, a řekne vám přesně, co ještě musíte vyřídit osobně.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/consulta-do-viajante") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověříte",
    sourcesLead:
      "Místa a hodiny, vstupní požadavky jednotlivých zemí i doporučená očkování se mění. Ověřujte vždy u zdroje, a co nejblíž datu odjezdu.",
    sources: [
      { label: "SNS 24 — cestovní konzultace", href: SNS24_VIAJANTE },
      { label: "ARS Norte — Centra mezinárodního očkování", href: CVI_NORTE },
      { label: "ARS Algarve — zdraví cestujícího", href: CVI_ALGARVE },
      { label: "SNS — zdravotní péče v zahraničí", href: SNS_ESTRANGEIRO },
      { label: "WHO — travel advice", href: WHO_TRAVEL },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "IHMT — consulta do viajante", href: IHMT_VIAJANTE },
      { label: "TravelHealthPro — informação por país", href: TRAVELHEALTHPRO },
      { label: "Registo do Viajante — MNE", href: REGISTO_VIAJANTE },
    ],
    sourcesNote:
      "Odkazy vedou na weby příslušných institucí. Global Health není Centrum mezinárodního očkování, nepodává očkovací látky a nevystavuje mezinárodní očkovací průkazy.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Co je cestovní konzultace?",
        a: "Konzultace před cestou, ve které lékař posoudí riziko vaší destinace a typu cesty a určí preventivní opatření před cestou, během ní i po ní. Zahrnuje kontrolu očkovacího průkazu, doporučení očkování a profylaxe, pokud jsou namístě, a neočkovací opatření — voda, jídlo, bodnutí hmyzem, léky s sebou.",
      },
      {
        q: "Kde se v Portugalsku cestovní konzultace dělá?",
        a: "V systému SNS v Centrech mezinárodního očkování a v jednotkách veřejného zdraví, po předchozím objednání; každý region zveřejňuje svá místa a hodiny, včetně Porta, Lisabonu, Coimbry a Bragy. Dělá se i soukromě, prezenčně nebo přes video. Mezinárodní očkování a průkaz jsou ale úkony Center mezinárodního očkování.",
      },
      {
        q: "Mohu cestovní konzultaci absolvovat online?",
        a: "Posouzení rizika, kontrola očkovacího průkazu, profylaxe malárie, léky s sebou a řešení chronického onemocnění na cestách lze udělat přes video. Podání očkovacích látek a mezinárodní očkovací průkaz nikoli: vyžadují návštěvu Centra mezinárodního očkování.",
      },
      {
        q: "S jakým předstihem se mám objednat?",
        a: "Jakmile je cesta rozhodnutá. Některé vakcíny potřebují čas, než vytvoří ochranu, a některé vyžadují více než jednu dávku, a objednání v Centru mezinárodního očkování může mít čekací dobu. Ověřte si dostupnost ve svém regionu, místo abyste počítali s termínem.",
      },
      {
        q: "Jaké doklady si mám vzít?",
        a: "SNS 24 uvádí doklad totožnosti, doklad s číslem pojištěnce a očkovací průkaz. Vezměte si i seznam pravidelných léků a itinerář s daty — bez itineráře nelze udělat seriózní posouzení rizika.",
      },
      {
        q: "Potřebuji očkování proti žluté zimnici a průkaz?",
        a: "Záleží na destinaci a itineráři a vstupní požadavky stanovuje každá země. Očkování proti žluté zimnici se podává v Centrech mezinárodního očkování, která na místě vystaví mezinárodní očkovací průkaz. Ověřujte vždy u úřadu cílové země a u Světové zdravotnické organizace.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Napsal Dr Vitor Hugo de Matos Pais, praktický lékař Global Health Portugalsko, klinicky zkontrolovala Dra. Nádia Cavaco, praktická lékařka. Článek obsahuje obecné informace o cestovní medicíně v Portugalsku a není personalizovaným lékařským poradenstvím. Doporučení k očkování a profylaxi závisí na destinaci, itineráři a vaší anamnéze a lze je vyslovit jen v konzultaci. Global Health nepodává očkovací látky ani nevystavuje mezinárodní očkovací průkazy. V případě lékařské pohotovosti volejte okamžitě 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "consultatia-calatorului-portugalia",
  title: "Consultația călătorului în Portugalia: unde se face, când o programați și ce luați",
  excerpt:
    "Consultația călătorului evaluează riscul călătoriei în funcție de destinație și vă pregătește înainte de plecare. Unde se face, ce luați cu dumneavoastră, ce poate face doar un Centru de Vaccinare Internațională și ce rezolvă o consultație video.",
  seoTitle: "Consultația călătorului în Portugalia: unde și când",
  seoDescription:
    "Consultația călătorului în Portugalia: ce se evaluează, unde se face, ce documente luați și rolul Centrelor de Vaccinare Internațională.",
  category: "Medicina călătoriei",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Medicina călătoriei",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Portugalia · Înainte de plecare",
    h1: "Consultația călătorului",
    deck: "O evaluare de risc construită pe destinația dumneavoastră, pe călătoria dumneavoastră și pe sănătatea dumneavoastră — nu o listă generică de vaccinuri luată de pe internet.",
    intro:
      "<strong>Consultația călătorului</strong> (consulta do viajante) este o consultație dinaintea plecării în care un medic evaluează riscul asociat destinației și tipului de călătorie pe care îl faceți și indică măsurile preventive de adoptat înainte, în timpul și după călătorie. În Portugalia se face în SNS prin <strong>Centrele de Vaccinare Internațională (CVI)</strong> și prin unitățile de sănătate publică, dar și în sistemul privat. O parte — evaluarea riscului, verificarea carnetului de vaccinări, profilaxia malariei, medicamentele de luat cu dumneavoastră, boala cronică în călătorie — se poate face <strong>prin video</strong>. Administrarea vaccinurilor și <strong>certificatul internațional de vaccinare</strong> nu: sunt acte care cer prezență fizică, iar vaccinul împotriva febrei galbene se administrează numai într-un Centru de Vaccinare Internațională.",
    facts: ["Risc evaluat după destinație", "Vaccinuri: fizic, în CVI", "Febra galbenă: doar în CVI"],
    primaryCta: { label: "Programați consultația călătorului", href: href("ro", "/services/consulta-do-viajante") },
    secondaryCta: { label: "Consultația călătorului pe SNS 24", href: SNS24_VIAJANTE },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Ce se evaluează într-o consultație a călătorului și de ce destinația schimbă totul.",
      "Unde se face — CVI, unități de sănătate publică, privat — și ce documente luați.",
      "Granița dintre ce rezolvă o consultație video și ce cere deplasare.",
      "Timpul recomandat înainte de plecare, vaccinurile cerute de fiecare țară și timpii de așteptare diferă după destinație și sezon. Nu sunt citate aici: fiecare trimite la SNS 24, la CVI, la IHMT sau la OMS.",
    ],
    author: {
      initials: "VP",
      name: "Dr Vitor Hugo de Matos Pais",
      line: "Medic de familie · Global Health Portugalia",
    },
    reviewLine: "Revizuit clinic de Dra. Nádia Cavaco, medic de familie, Global Health Portugalia.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "o-que-e",
        nav: "Ce este",
        eyebrow: "Punct de plecare",
        h2: "Ce este, de fapt, consultația călătorului",
        blocks: [
          lead("Nu este o consultație despre vaccinuri. Este o consultație despre călătoria dumneavoastră, în care vaccinurile sunt doar una dintre ieșirile posibile."),
          p("SNS 24 o descrie drept consultația în care călătorul este informat despre <em>măsurile preventive (sau curative) de adoptat înainte, în timpul și după călătorie, în funcție de destinație</em>. Partea importantă este ultima: <strong>în funcție de destinație</strong>. Aceeași persoană, călătorind la Amsterdam sau în interiorul Mozambicului, pleacă din consultație cu recomandări care nu seamănă deloc între ele."),
          p("Ce schimbă evaluarea nu este doar țara. Este regiunea din interiorul țării, sezonul, tipul de cazare, durata, dacă mergeți la sat sau la oraș, dacă vizitați rude, dacă luați copii, dacă sunteți însărcinată, dacă aveți o boală cronică sau sunteți imunosupresat și dacă practicați vreo activitate cu risc. Două persoane cu același bilet de avion pot avea evaluări foarte diferite."),
          ul([
            "<strong>Destinație și itinerariu</strong> — țară, regiune, mediu rural sau urban, altitudine.",
            "<strong>Sezon</strong> — sezonul ploios, perioade de transmitere, focare active.",
            "<strong>Profilul călătoriei</strong> — turism, muncă, rucsac, vizită la familie, misiune umanitară.",
            "<strong>Starea dumneavoastră de sănătate</strong> — sarcină, vârstă, boală cronică, imunosupresie, medicație curentă.",
            "<strong>Istoricul de vaccinare</strong> — ce aveți deja, ce a expirat, ce lipsește.",
          ]),
          cite(`Descriere oficială: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24 — consultația călătorului</a>. Pentru itinerarii complexe sau destinații cu risc mai mare, <a href="${IHMT_VIAJANTE}" rel="nofollow noopener" target="_blank">IHMT</a> este centrul portughez de referință în medicină tropicală, iar informația pe țări cea mai detaliată în engleză se află pe <a href="${TRAVELHEALTHPRO}" rel="nofollow noopener" target="_blank">TravelHealthPro</a>.`),
        ],
      },
      {
        id: "onde",
        nav: "Unde se face",
        eyebrow: "Locuri",
        h2: "Unde se face și ce luați cu dumneavoastră",
        blocks: [
          lead("Există trei circuite posibile și nu sunt interschimbabile pentru tot."),
          p("În SNS, consultația călătorului și vaccinarea internațională se fac în <strong>Centrele de Vaccinare Internațională</strong> și în unitățile de sănătate publică ale unităților locale de sănătate, cu programare prealabilă. Fiecare regiune își publică locurile și programul. În privat, consultația este oferită de spitale și clinici, precum și de servicii de telemedicină. Sunt circuite diferite, cu competențe diferite — secțiunea următoare explică unde este granița."),
          ul([
            "<strong>Centrul de Vaccinare Internațională</strong> — consultația și, mai ales, vaccinarea internațională și certificatul.",
            "<strong>Unitatea de sănătate publică / centrul de sănătate</strong> — consiliere și vaccinare care nu este exclusiv a CVI, în funcție de regiune.",
            "<strong>Consultație privată, fizică sau video</strong> — evaluarea riscului, prescriere și pregătire; vaccinarea cere în continuare deplasare.",
          ]),
          p("SNS 24 indică documentele de luat: <strong>act de identitate</strong>, <strong>document cu numărul de asigurat</strong> și <strong>carnetul de vaccinări</strong>. Merită adăugate încă două: lista medicației curente și itinerariul cu date. Fără itinerariu, consultația își pierde jumătate din valoare, pentru că evaluarea riscului depinde exact de el."),
          warn("Programați-vă înainte de a rezerva restul", "Ideal este să vă programați de îndată ce călătoria e decisă, nu în ultima săptămână. Unele vaccinuri au nevoie de timp ca să producă protecție, iar unele cer mai mult de o doză. Programarea într-un Centru de Vaccinare Internațională poate avea și listă de așteptare — verificați disponibilitatea din regiunea dumneavoastră în loc să contați pe o dată."),
          cite(`Locuri și program pe regiuni: <a href="${CVI_NORTE}" rel="nofollow noopener" target="_blank">ARS Norte — CVI</a> · <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve — sănătatea călătorului</a> · <a href="${SNS_ESTRANGEIRO}" rel="nofollow noopener" target="_blank">SNS — îngrijiri medicale în străinătate</a>.`),
        ],
      },
      {
        id: "vacinas",
        nav: "Vaccinuri",
        eyebrow: "Prevenție",
        h2: "Vaccinuri, febra galbenă și certificatul internațional",
        blocks: [
          lead("O distincție rezolvă cele mai multe nelămuriri: vaccinuri recomandate, vaccinuri cerute și vaccinuri pe care le administrează doar un CVI."),
          p("<strong>Recomandate</strong> sunt cele care protejează împotriva riscurilor prezente la destinație. <strong>Cerute</strong> sunt cele pe care o țară le impune drept condiție de intrare și a căror dovadă este certificatul internațional de vaccinare. Vaccinul împotriva <strong>febrei galbene</strong> este cazul cel mai cunoscut al ambelor în același timp: autoritățile sanitare stabilesc că se administrează în <strong>Centrele de Vaccinare Internațională</strong>, iar acolo se emite certificatul."),
          ul([
            "Verificarea <strong>calendarului național de vaccinare</strong> face parte din consultație: multe călătorii scot la iveală doar faptul că aveți restanțe la vaccinurile de rutină.",
            "Unele vaccinuri de călătorie cer <strong>mai mult de o doză</strong>, cu interval între ele.",
            "Cerințele de intrare se schimbă și sunt stabilite de fiecare țară — confirmați-le la autoritatea destinației și la <strong>OMS</strong>, nu într-un articol.",
            "<strong>Certificatul internațional de vaccinare</strong> este un document oficial emis în momentul vaccinării, în CVI. Nimeni nu îl eliberează la distanță.",
          ]),
          p("Vaccinarea nu înlocuiește măsurile nevaccinale, care în multe destinații cântăresc mai mult: protecția împotriva înțepăturilor de țânțar, grija cu apa și mâncarea, prevenirea diareei călătorului, comportamentul sexual sigur, expunerea la soare și siguranța rutieră — care este, în practică, una dintre cele mai frecvente cauze de probleme grave în călătorie."),
          cite(`Despre administrarea vaccinului împotriva febrei galbene în CVI: <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve</a>. Cerințe pe țări: <a href="${WHO_TRAVEL}" rel="nofollow noopener" target="_blank">OMS — travel advice</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consultație online",
        eyebrow: "Transparență",
        h2: "Ce poate și ce nu poate face o consultație video",
        blocks: [
          lead("O spunem devreme și fără ocolișuri, pentru că aproape niciun serviciu de telemedicină nu o scrie."),
          p("O consultație video <strong>nu administrează vaccinuri</strong> și <strong>nu emite certificatul internațional de vaccinare</strong>. Dacă itinerariul dumneavoastră cere febră galbenă, va trebui să vă deplasați la un Centru de Vaccinare Internațională, indiferent cine face evaluarea prealabilă. Orice serviciu care sugerează contrariul promite ceva ce nu poate livra."),
          p("Acestea fiind spuse, partea consultației care nu este injecție este considerabilă — și este exact partea pentru care oamenii nu își fac timp:"),
          ul([
            "<strong>Evaluarea riscului</strong> itinerariului concret, cu istoricul dumneavoastră clinic în față.",
            "<strong>Verificarea carnetului de vaccinări</strong> și identificarea a ce lipsește înainte de programarea la CVI — ca să mergeți o dată, nu de două ori.",
            "<strong>Profilaxia malariei</strong> când este indicată: alegerea medicamentului, schema și efectele de urmărit.",
            "<strong>Medicamentele de luat</strong>: diareea călătorului, greața, durerea, alergia și ce faceți dacă vă îmbolnăviți departe de casă.",
            "<strong>Boala cronică în călătorie</strong>: ajustarea orarului la fusuri, păstrarea medicamentelor, cantitățile și adeverința medicală pentru bagaj.",
            "<strong>După călătorie</strong>: ce simptome cer evaluare medicală la întoarcere și în ce interval.",
          ]),
          p(`Puteți confirma înscrierea oricărui medic la <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, la noi ca oriunde altundeva.`),
          warn("Nicio consultație nu garantează un vaccin sau un certificat", "Prescrierea profilaxiei depinde de evaluarea clinică și de istoricul dumneavoastră. Vaccinarea și certificatul internațional depind de circuitul fizic al vaccinării internaționale. O consultație serioasă vă spune care este cazul dumneavoastră; nu promite un document înainte să vă examineze."),
        ],
      },
      {
        id: "regresso",
        nav: "La întoarcere",
        eyebrow: "După călătorie",
        h2: "La întoarcere: simptomele care nu se ignoră",
        blocks: [
          lead("Consultația călătorului nu se termină la aeroportul de plecare. O parte importantă a riscului apare la săptămâni după sosire."),
          p("Semnalul cel mai important este simplu de reținut: <strong>febra după o călătorie într-o zonă cu risc de malarie este o urgență medicală</strong>, chiar dacă ați făcut profilaxia corect și chiar dacă vă simțiți rezonabil între vârfurile de febră. Malaria se poate agrava rapid, iar tratamentul precoce schimbă evoluția."),
          ul([
            "Febră, frisoane sau transpirații după o călătorie într-o zonă cu risc — cereți evaluare medicală și spuneți întotdeauna unde ați fost.",
            "Diaree care persistă, cu sânge sau însoțită de febră mare.",
            "Icter — îngălbenirea pielii sau a ochilor.",
            "Erupție care apare după întoarcere.",
            "Rană prin mușcătură sau zgârietură de animal în timpul călătoriei — acest caz se evaluează <strong>imediat</strong>, dacă se poate chiar în călătorie.",
          ]),
          p("Spuneți întotdeauna celui care vă consultă că ați călătorit, unde și când. Este informația care schimbă raționamentul clinic și cea care rămâne cel mai des nespusă."),
          warn("Când nu este momentul unei programări", "Durere în piept, lipsă de aer în repaus, slăbiciune bruscă pe o parte a corpului, tulburare de vorbire, confuzie, redoare de ceafă cu febră sau pete pe piele care nu dispar la apăsare: sunați la <strong>112</strong>. Dacă nu sunteți sigur de gravitate, contactați <strong>SNS 24</strong>."),
        ],
      },
      {
        id: "checklist",
        nav: "Înainte de plecare",
        eyebrow: "Practic",
        h2: "Ce rezolvați înainte de plecare",
        blocks: [
          lead("O secvență scurtă care elimină aproape toate problemele evitabile."),
          ul([
            "Programați consultația <strong>de îndată ce călătoria e decisă</strong>, nu în ajun.",
            "Adunați carnetul de vaccinări, lista medicației curente și itinerariul cu date.",
            "Verificați dacă destinația cere certificat internațional de vaccinare și, dacă da, programați-vă devreme la CVI.",
            "Luați medicația curentă în <strong>bagajul de mână</strong>, în ambalajul original, cu rețeta sau o adeverință medicală.",
            "Verificați acoperirea medicală la destinație, inclusiv repatrierea, și aveți la dumneavoastră contactele de urgență.",
            "Păstrați contactul consulatului sau al ambasadei, aflați cum se cere ajutor medical în țara unde mergeți și înscrieți-vă în <strong>registrul călătorilor</strong> al Ministerului de Externe portughez, care permite consulatului să vă găsească în caz de urgență.",
          ]),
          p("Nimic din toate acestea nu cere o după-amiază întreagă. Cere doar să fie făcut înainte, nu pe drumul spre aeroport — care este, în practică, momentul în care își amintesc cei mai mulți."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugalia",
    linksH2: "Pașii următori",
    linksLead:
      "Medicii noștri din Portugalia fac evaluarea dinaintea călătoriei prin video și vă spun clar ce se poate rezolva în consultație și ce cere deplasarea la un Centru de Vaccinare Internațională.",
    links: [
      { label: "Consultație de medicina călătoriei", href: href("ro", "/services/consulta-do-viajante") },
      { label: "Medicii noștri din Portugalia", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Portugalia", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Plecați în călătorie și nu știți de unde să începeți?",
      text: "O consultație video vă verifică carnetul de vaccinări, evaluează riscul itinerariului, prescrie ce este indicat și vă spune exact ce mai aveți de rezolvat față în față.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/consulta-do-viajante") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați regulile",
    sourcesLead:
      "Locurile și programul, cerințele de intrare pe țări și vaccinurile recomandate se schimbă. Verificați întotdeauna la sursă și cât mai aproape de data plecării.",
    sources: [
      { label: "SNS 24 — consultația călătorului", href: SNS24_VIAJANTE },
      { label: "ARS Norte — Centre de Vaccinare Internațională", href: CVI_NORTE },
      { label: "ARS Algarve — sănătatea călătorului", href: CVI_ALGARVE },
      { label: "SNS — îngrijiri medicale în străinătate", href: SNS_ESTRANGEIRO },
      { label: "OMS — travel advice", href: WHO_TRAVEL },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "IHMT — consulta do viajante", href: IHMT_VIAJANTE },
      { label: "TravelHealthPro — informação por país", href: TRAVELHEALTHPRO },
      { label: "Registo do Viajante — MNE", href: REGISTO_VIAJANTE },
    ],
    sourcesNote:
      "Linkurile deschid site-urile instituțiilor competente. Global Health nu este Centru de Vaccinare Internațională, nu administrează vaccinuri și nu emite certificate internaționale de vaccinare.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Ce este consultația călătorului?",
        a: "O consultație dinaintea plecării în care un medic evaluează riscul destinației și al tipului de călătorie și indică măsurile preventive de adoptat înainte, în timpul și după. Include verificarea carnetului de vaccinări, indicarea vaccinurilor și a profilaxiei acolo unde e cazul și măsurile nevaccinale — apă, alimente, înțepături, medicamente de luat.",
      },
      {
        q: "Unde se face consultația călătorului în Portugalia?",
        a: "În SNS, în Centrele de Vaccinare Internațională și în unitățile de sănătate publică, cu programare; fiecare regiune își publică locurile și programul, inclusiv Porto, Lisabona, Coimbra și Braga. Se face și în privat, fizic sau prin video. Vaccinarea internațională și certificatul rămân însă acte ale Centrelor de Vaccinare Internațională.",
      },
      {
        q: "Pot face consultația călătorului online?",
        a: "Evaluarea riscului, verificarea carnetului de vaccinări, profilaxia malariei, medicamentele de luat și gestionarea bolii cronice în călătorie se pot face prin video. Administrarea vaccinurilor și certificatul internațional de vaccinare nu: cer deplasarea la un Centru de Vaccinare Internațională.",
      },
      {
        q: "Cu cât timp înainte trebuie să mă programez?",
        a: "De îndată ce călătoria este decisă. Unele vaccinuri au nevoie de timp ca să producă protecție și unele cer mai mult de o doză, iar programarea la un Centru de Vaccinare Internațională poate avea listă de așteptare. Verificați disponibilitatea din regiunea dumneavoastră în loc să contați pe o dată.",
      },
      {
        q: "Ce documente trebuie să iau?",
        a: "SNS 24 indică act de identitate, document cu numărul de asigurat și carnetul de vaccinări. Luați și lista medicației curente, plus itinerariul cu date — fără itinerariu nu se poate face o evaluare de risc serioasă.",
      },
      {
        q: "Am nevoie de vaccinul împotriva febrei galbene și de certificat?",
        a: "Depinde de destinație și de itinerariu, iar cerințele de intrare sunt stabilite de fiecare țară. Vaccinul împotriva febrei galbene se administrează în Centrele de Vaccinare Internațională, care emit pe loc certificatul internațional de vaccinare. Confirmați întotdeauna la autoritatea țării de destinație și la Organizația Mondială a Sănătății.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de Dr Vitor Hugo de Matos Pais, medic de familie la Global Health Portugalia, și revizuit clinic de Dra. Nádia Cavaco, medic de familie. Articolul conține informații generale despre medicina călătoriei în Portugalia și nu constituie sfat medical personalizat. Recomandările de vaccinare și de profilaxie depind de destinație, de itinerariu și de istoricul dumneavoastră clinic și pot fi făcute doar în consultație. Global Health nu administrează vaccinuri și nu emite certificate internaționale de vaccinare. În caz de urgență medicală, sunați imediat la 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "reisemedizinische-beratung-portugal",
  title: "Reisemedizinische Beratung in Portugal: wo, wann buchen und was mitbringen",
  excerpt:
    "Die consulta do viajante bewertet das Risiko Ihrer Reise anhand des Ziels und bereitet Sie vor der Abreise vor. Wo sie stattfindet, was Sie mitbringen, was nur ein Internationales Impfzentrum leisten kann und was eine Videosprechstunde klärt.",
  seoTitle: "Reisemedizinische Beratung in Portugal",
  seoDescription:
    "Reisemedizinische Beratung in Portugal: was beurteilt wird, wo sie stattfindet, was Sie mitbringen und welche Rolle die Impfzentren spielen.",
  category: "Reisemedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Reisemedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Portugal · Vor der Abreise",
    h1: "Reisemedizinische Beratung",
    deck: "Eine Risikobewertung, die auf Ihr Reiseziel, Ihre Reise und Ihre Gesundheit zugeschnitten ist — keine allgemeine Impfliste aus dem Internet.",
    intro:
      "Die <strong>reisemedizinische Beratung</strong> (consulta do viajante) ist ein Termin vor der Abreise, bei dem ärztlich das Risiko Ihres Reiseziels und Ihrer Reiseart beurteilt und festgelegt wird, welche vorbeugenden Maßnahmen vor, während und nach der Reise gelten. In Portugal erfolgt sie im SNS über die <strong>Internationalen Impfzentren (CVI)</strong> und die Einrichtungen des öffentlichen Gesundheitsdienstes sowie privat. Ein Teil — Risikobewertung, Durchsicht des Impfausweises, Malariaprophylaxe, mitzunehmende Medikamente, chronische Erkrankung auf Reisen — lässt sich <strong>per Video</strong> erledigen. Das Impfen selbst und der <strong>internationale Impfausweis</strong> nicht: das sind Präsenzleistungen, und die Gelbfieberimpfung wird ausschließlich in einem Internationalen Impfzentrum verabreicht.",
    facts: ["Risiko nach Reiseziel", "Impfungen vor Ort, im CVI", "Gelbfieber: nur im CVI"],
    primaryCta: { label: "Reisemedizinische Beratung buchen", href: href("de", "/services/consulta-do-viajante") },
    secondaryCta: { label: "Reiseberatung bei SNS 24", href: SNS24_VIAJANTE },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Was in einer Reiseberatung tatsächlich beurteilt wird und warum das Reiseziel alles verändert.",
      "Wo sie stattfindet — CVI, öffentlicher Gesundheitsdienst, privat — und welche Unterlagen Sie mitbringen.",
      "Die Grenze zwischen dem, was eine Videosprechstunde klärt, und dem, was einen Weg vor Ort verlangt.",
      "Empfohlener Vorlauf, die von einzelnen Ländern verlangten Impfungen und Wartezeiten ändern sich je nach Ziel und Jahreszeit. Sie stehen hier nicht: jeder Punkt verweist auf SNS 24, das CVI, das IHMT oder die WHO.",
    ],
    author: {
      initials: "VP",
      name: "Dr Vitor Hugo de Matos Pais",
      line: "Allgemeinmediziner · Global Health Portugal",
    },
    reviewLine: "Fachlich geprüft von Dra. Nádia Cavaco, Allgemeinmedizinerin, Global Health Portugal.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "o-que-e",
        nav: "Was sie ist",
        eyebrow: "Ausgangspunkt",
        h2: "Was eine Reiseberatung tatsächlich ist",
        blocks: [
          lead("Es ist keine Beratung über Impfungen. Es ist eine Beratung über Ihre Reise, in der Impfungen nur eines von mehreren möglichen Ergebnissen sind."),
          p("SNS 24 beschreibt sie als die Beratung, in der Reisende über die <em>vorbeugenden (oder heilenden) Maßnahmen vor, während und nach der Reise, je nach Reiseziel</em>, informiert werden. Entscheidend ist der letzte Teil: <strong>je nach Reiseziel</strong>. Dieselbe Person, die nach Amsterdam oder ins Landesinnere Mosambiks reist, verlässt die Beratung mit Empfehlungen, die einander in nichts ähneln."),
          p("Die Bewertung verändert nicht nur das Land. Sie verändert sich mit der Region im Land, der Jahreszeit, der Art der Unterkunft, der Dauer, ob Sie aufs Land oder in die Stadt reisen, ob Sie Verwandte besuchen, ob Kinder mitkommen, ob Sie schwanger sind, ob eine chronische Erkrankung oder Immunschwäche vorliegt und ob eine risikoreiche Aktivität geplant ist. Zwei Menschen mit demselben Flugticket können sehr unterschiedliche Bewertungen erhalten."),
          ul([
            "<strong>Reiseziel und Route</strong> — Land, Region, ländlich oder städtisch, Höhenlage.",
            "<strong>Jahreszeit</strong> — Regenzeit, Übertragungszeiten, aktive Ausbrüche.",
            "<strong>Art der Reise</strong> — Urlaub, Arbeit, Rucksackreise, Familienbesuch, humanitärer Einsatz.",
            "<strong>Ihr Gesundheitszustand</strong> — Schwangerschaft, Alter, chronische Erkrankung, Immunsuppression, Dauermedikation.",
            "<strong>Impfhistorie</strong> — was vorhanden ist, was abgelaufen ist, was fehlt.",
          ]),
          cite(`Offizielle Beschreibung: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24 — Reiseberatung</a>. Für komplexe Reiserouten und Ziele mit höherem Risiko ist das <a href="${IHMT_VIAJANTE}" rel="nofollow noopener" target="_blank">IHMT</a> Portugals Referenzzentrum für Tropenmedizin; die ausführlichsten länderweisen Hinweise auf Englisch stehen bei <a href="${TRAVELHEALTHPRO}" rel="nofollow noopener" target="_blank">TravelHealthPro</a>.`),
        ],
      },
      {
        id: "onde",
        nav: "Wo",
        eyebrow: "Orte",
        h2: "Wo sie stattfindet und was Sie mitbringen",
        blocks: [
          lead("Es gibt drei mögliche Wege, und sie sind nicht für alles austauschbar."),
          p("Im SNS werden Reiseberatung und internationale Impfungen in den <strong>Internationalen Impfzentren</strong> und in den Einrichtungen des öffentlichen Gesundheitsdienstes der lokalen Gesundheitsverwaltungen durchgeführt, nach vorheriger Terminvergabe. Jede Region veröffentlicht ihre Standorte und Zeiten. Privat bieten Krankenhäuser, Praxen und telemedizinische Dienste die Beratung an. Es sind unterschiedliche Wege mit unterschiedlichen Befugnissen — wo genau die Grenze liegt, erklärt der nächste Abschnitt."),
          ul([
            "<strong>Internationales Impfzentrum</strong> — die Beratung und vor allem die internationale Impfung samt Ausweis.",
            "<strong>Öffentlicher Gesundheitsdienst / Gesundheitszentrum</strong> — Beratung und Impfungen, die nicht dem CVI vorbehalten sind, je nach Region.",
            "<strong>Private Beratung, vor Ort oder per Video</strong> — Risikobewertung, Verordnung und Vorbereitung; die Impfung verlangt weiterhin einen Weg vor Ort.",
          ]),
          p("SNS 24 nennt die mitzubringenden Unterlagen: <strong>Ausweisdokument</strong>, ein <strong>Dokument mit Ihrer Versichertennummer</strong> und den <strong>Impfausweis</strong>. Zwei weitere lohnen sich: die Liste Ihrer Dauermedikation und die Reiseroute mit Daten. Ohne Route verliert die Beratung die Hälfte ihres Werts, denn genau darauf beruht die Risikobewertung."),
          warn("Buchen Sie, bevor der Rest steht", "Ideal ist ein Termin, sobald die Reise feststeht, nicht in der letzten Woche. Manche Impfungen brauchen Zeit, bis sie schützen, und manche verlangen mehr als eine Dosis. Termine in einem Internationalen Impfzentrum können zudem eine Warteliste haben — prüfen Sie die Verfügbarkeit in Ihrer Region, statt mit einem Datum zu rechnen."),
          cite(`Standorte und Zeiten nach Region: <a href="${CVI_NORTE}" rel="nofollow noopener" target="_blank">ARS Norte — CVI</a> · <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve — Reisegesundheit</a> · <a href="${SNS_ESTRANGEIRO}" rel="nofollow noopener" target="_blank">SNS — Gesundheitsversorgung im Ausland</a>.`),
        ],
      },
      {
        id: "vacinas",
        nav: "Impfungen",
        eyebrow: "Vorbeugung",
        h2: "Impfungen, Gelbfieber und der internationale Impfausweis",
        blocks: [
          lead("Eine Unterscheidung klärt die meisten Fragen: empfohlene Impfungen, verlangte Impfungen und Impfungen, die nur ein CVI verabreicht."),
          p("<strong>Empfohlen</strong> sind Impfungen gegen Risiken, die am Reiseziel vorkommen. <strong>Verlangt</strong> sind jene, die ein Land als Einreisebedingung vorschreibt und deren Nachweis der internationale Impfausweis ist. Die <strong>Gelbfieberimpfung</strong> ist der bekannteste Fall von beidem zugleich: die Gesundheitsbehörden legen fest, dass sie in den <strong>Internationalen Impfzentren</strong> verabreicht wird, und dort wird der Ausweis ausgestellt."),
          ul([
            "Die Durchsicht des <strong>nationalen Impfplans</strong> gehört zur Beratung: viele Reisen bringen nur zutage, dass Routineimpfungen überfällig sind.",
            "Manche Reiseimpfungen verlangen <strong>mehr als eine Dosis</strong>, mit Abstand dazwischen.",
            "Einreiseanforderungen ändern sich und werden von jedem Land selbst gesetzt — prüfen Sie sie bei der Behörde des Ziellands und bei der <strong>WHO</strong>, nicht in einem Artikel.",
            "Der <strong>internationale Impfausweis</strong> ist ein amtliches Dokument, das im Moment der Impfung im CVI ausgestellt wird. Aus der Ferne stellt ihn niemand aus.",
          ]),
          p("Impfungen ersetzen nicht die nicht-impfbezogenen Maßnahmen, die an etlichen Zielen schwerer wiegen: Schutz vor Mückenstichen, Vorsicht bei Wasser und Lebensmitteln, Vorbeugung von Reisedurchfall, sicheres Sexualverhalten, Sonnenschutz und Verkehrssicherheit — die in der Praxis zu den häufigsten Ursachen schwerer Zwischenfälle auf Reisen zählt."),
          cite(`Zur Gelbfieberimpfung in den CVI: <a href="${CVI_ALGARVE}" rel="nofollow noopener" target="_blank">ARS Algarve</a>. Anforderungen nach Ländern: <a href="${WHO_TRAVEL}" rel="nofollow noopener" target="_blank">WHO — travel advice</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Videosprechstunde",
        eyebrow: "Transparenz",
        h2: "Was eine Videosprechstunde leisten kann — und was nicht",
        blocks: [
          lead("Wir sagen es früh und deutlich, weil fast kein telemedizinischer Anbieter es aufschreibt."),
          p("Eine Videosprechstunde <strong>verabreicht keine Impfungen</strong> und <strong>stellt keinen internationalen Impfausweis aus</strong>. Verlangt Ihre Reise eine Gelbfieberimpfung, müssen Sie ein Internationales Impfzentrum aufsuchen, unabhängig davon, wer die Vorbewertung vorgenommen hat. Jeder Dienst, der etwas anderes nahelegt, verspricht, was er nicht liefern kann."),
          p("Dennoch ist der Teil der Reiseberatung, der keine Spritze ist, beträchtlich — und es ist genau der Teil, für den sich sonst niemand Zeit nimmt:"),
          ul([
            "<strong>Risikobewertung</strong> der konkreten Route, mit Ihrer Krankengeschichte vor Augen.",
            "<strong>Durchsicht des Impfausweises</strong> und Feststellung, was fehlt, bevor Sie den CVI-Termin buchen — damit Sie einmal hinfahren und nicht zweimal.",
            "<strong>Malariaprophylaxe</strong>, wo angezeigt: Auswahl des Präparats, Schema und zu beobachtende Wirkungen.",
            "<strong>Mitzunehmende Medikamente</strong>: Reisedurchfall, Übelkeit, Schmerzen, Allergie, und was zu tun ist, wenn Sie fern von zu Hause erkranken.",
            "<strong>Chronische Erkrankung auf Reisen</strong>: Anpassung der Einnahmezeiten über Zeitzonen, Aufbewahrung, Mengen und eine ärztliche Bescheinigung für das Gepäck.",
            "<strong>Nach der Reise</strong>: welche Beschwerden bei der Rückkehr ärztlich abgeklärt gehören und in welchem Zeitraum.",
          ]),
          p(`Die Registrierung jeder Ärztin und jedes Arztes können Sie bei der <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> prüfen, bei uns wie überall sonst.`),
          warn("Keine Beratung garantiert eine Impfung oder einen Ausweis", "Die Verordnung einer Prophylaxe hängt von der klinischen Beurteilung und Ihrer Vorgeschichte ab. Impfung und internationaler Ausweis hängen am Präsenzweg der internationalen Impfung. Eine seriöse Beratung sagt Ihnen, welcher Fall Ihrer ist; sie verspricht kein Dokument, bevor sie Sie beurteilt hat."),
        ],
      },
      {
        id: "regresso",
        nav: "Nach der Rückkehr",
        eyebrow: "Nach der Reise",
        h2: "Nach der Rückkehr: die Beschwerden, die man nicht übergeht",
        blocks: [
          lead("Eine Reiseberatung endet nicht am Abfluggate. Ein wichtiger Teil des Risikos zeigt sich Wochen nach der Ankunft."),
          p("Das wichtigste Signal ist leicht zu merken: <strong>Fieber nach einer Reise in ein Malariagebiet ist ein Notfall</strong>, auch wenn Sie die Prophylaxe korrekt eingenommen haben und auch wenn Sie sich zwischen den Fieberschüben einigermaßen fühlen. Malaria kann sich rasch verschlechtern, und frühe Behandlung verändert den Verlauf."),
          ul([
            "Fieber, Schüttelfrost oder Schweißausbrüche nach einer Reise in ein Risikogebiet — ärztlich abklären lassen und immer sagen, wo Sie waren.",
            "Durchfall, der anhält, blutig ist oder mit hohem Fieber einhergeht.",
            "Gelbsucht — gelbliche Haut oder Augen.",
            "Ein Ausschlag, der nach der Rückkehr auftritt.",
            "Eine Biss- oder Kratzwunde durch ein Tier während der Reise — dieser Fall wird <strong>sofort</strong> beurteilt, wenn möglich noch unterwegs.",
          ]),
          p("Sagen Sie immer, dass Sie gereist sind, wohin und wann. Das ist die Angabe, die das ärztliche Denken verändert, und zugleich die, die am häufigsten ungesagt bleibt."),
          warn("Wann kein Termin, sondern sofort Hilfe", "Brustschmerz, Atemnot in Ruhe, plötzliche Schwäche einer Körperhälfte, Sprachstörung, Verwirrtheit, Nackensteife mit Fieber oder Hautflecken, die sich nicht wegdrücken lassen: rufen Sie <strong>112</strong>. Bei Unsicherheit über den Schweregrad wenden Sie sich an <strong>SNS 24</strong>."),
        ],
      },
      {
        id: "checklist",
        nav: "Vor der Abreise",
        eyebrow: "Praktisch",
        h2: "Was vor der Abreise geklärt sein sollte",
        blocks: [
          lead("Eine kurze Reihenfolge, die fast jedes vermeidbare Problem vermeidet."),
          ul([
            "Buchen Sie die Beratung, <strong>sobald die Reise feststeht</strong>, nicht am Vorabend.",
            "Legen Sie Impfausweis, Liste der Dauermedikation und Reiseroute mit Daten bereit.",
            "Prüfen Sie, ob das Reiseziel einen internationalen Impfausweis verlangt, und buchen Sie in dem Fall früh im CVI.",
            "Nehmen Sie Dauermedikamente ins <strong>Handgepäck</strong>, in der Originalverpackung, mit Rezept oder ärztlicher Bescheinigung.",
            "Prüfen Sie den Versicherungsschutz am Reiseziel einschließlich Rückholung und führen Sie Notfallkontakte mit.",
            "Speichern Sie den Kontakt des Konsulats oder der Botschaft, informieren Sie sich, wie man im Reiseland ärztliche Hilfe anfordert, und tragen Sie sich in das <strong>Reisendenregister</strong> des portugiesischen Außenministeriums ein, über das Sie das Konsulat im Notfall erreicht.",
          ]),
          p("Nichts davon kostet einen ganzen Nachmittag. Es muss nur vorher geschehen und nicht auf dem Weg zum Flughafen — was in der Praxis der Moment ist, in dem es den meisten einfällt."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Nächste Schritte",
    linksLead:
      "Unsere Ärztinnen und Ärzte in Portugal führen die Vorbewertung per Video durch und sagen Ihnen klar, was die Beratung klären kann und was den Weg in ein Internationales Impfzentrum verlangt.",
    links: [
      { label: "Reisemedizinische Beratung", href: href("de", "/services/consulta-do-viajante") },
      { label: "Unsere Ärztinnen und Ärzte in Portugal", href: href("de", "/doctors") },
      { label: "Global Health Portugal kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Reise geplant und unklar, wo anfangen?",
      text: "Eine Videosprechstunde geht Ihren Impfausweis durch, bewertet das Risiko Ihrer Route, verordnet, was angezeigt ist, und sagt Ihnen genau, was noch vor Ort zu erledigen bleibt.",
      primary: { label: "Termin buchen", href: href("de", "/services/consulta-do-viajante") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie die Regeln prüfen",
    sourcesLead:
      "Standorte und Zeiten, Einreiseanforderungen einzelner Länder und empfohlene Impfungen ändern sich. Prüfen Sie immer an der Quelle, und möglichst nah am Abreisedatum.",
    sources: [
      { label: "SNS 24 — Reiseberatung", href: SNS24_VIAJANTE },
      { label: "ARS Norte — Internationale Impfzentren", href: CVI_NORTE },
      { label: "ARS Algarve — Reisegesundheit", href: CVI_ALGARVE },
      { label: "SNS — Gesundheitsversorgung im Ausland", href: SNS_ESTRANGEIRO },
      { label: "WHO — travel advice", href: WHO_TRAVEL },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "IHMT — consulta do viajante", href: IHMT_VIAJANTE },
      { label: "TravelHealthPro — informação por país", href: TRAVELHEALTHPRO },
      { label: "Registo do Viajante — MNE", href: REGISTO_VIAJANTE },
    ],
    sourcesNote:
      "Die Links führen auf die Seiten der zuständigen Stellen. Global Health ist kein Internationales Impfzentrum, verabreicht keine Impfungen und stellt keine internationalen Impfausweise aus.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Was ist eine reisemedizinische Beratung?",
        a: "Ein Termin vor der Abreise, bei dem ärztlich das Risiko Ihres Reiseziels und Ihrer Reiseart beurteilt und festgelegt wird, welche vorbeugenden Maßnahmen vor, während und nach der Reise gelten. Dazu gehören die Durchsicht des Impfausweises, Impf- und Prophylaxeempfehlungen, wo zutreffend, sowie die nicht-impfbezogenen Maßnahmen — Wasser, Lebensmittel, Stiche, mitzunehmende Medikamente.",
      },
      {
        q: "Wo findet die Reiseberatung in Portugal statt?",
        a: "Im SNS in den Internationalen Impfzentren und in Einrichtungen des öffentlichen Gesundheitsdienstes, nach Terminvergabe; jede Region veröffentlicht ihre Standorte und Zeiten, darunter Porto, Lissabon, Coimbra und Braga. Auch privat, vor Ort oder per Video. Internationale Impfung und Ausweis bleiben jedoch Leistungen der Internationalen Impfzentren.",
      },
      {
        q: "Kann ich die Reiseberatung online machen?",
        a: "Risikobewertung, Durchsicht des Impfausweises, Malariaprophylaxe, mitzunehmende Medikamente und der Umgang mit einer chronischen Erkrankung auf Reisen lassen sich per Video erledigen. Das Impfen selbst und der internationale Impfausweis nicht: sie verlangen den Weg in ein Internationales Impfzentrum.",
      },
      {
        q: "Wie lange im Voraus sollte ich buchen?",
        a: "Sobald die Reise feststeht. Manche Impfungen brauchen Zeit, bis sie schützen, und manche verlangen mehr als eine Dosis; Termine in einem Internationalen Impfzentrum können zudem eine Warteliste haben. Prüfen Sie die Verfügbarkeit in Ihrer Region, statt mit einem Datum zu rechnen.",
      },
      {
        q: "Welche Unterlagen soll ich mitbringen?",
        a: "SNS 24 nennt ein Ausweisdokument, ein Dokument mit der Versichertennummer und den Impfausweis. Bringen Sie außerdem die Liste Ihrer Dauermedikation und die Reiseroute mit Daten mit — ohne Route ist eine ernsthafte Risikobewertung nicht möglich.",
      },
      {
        q: "Brauche ich die Gelbfieberimpfung und den Ausweis?",
        a: "Das hängt vom Reiseziel und der Route ab, und die Einreiseanforderungen setzt jedes Land selbst. Die Gelbfieberimpfung wird in den Internationalen Impfzentren verabreicht, die den internationalen Impfausweis dabei ausstellen. Prüfen Sie das immer bei der Behörde des Ziellands und bei der Weltgesundheitsorganisation.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Vitor Hugo de Matos Pais, Allgemeinmediziner bei Global Health Portugal, fachlich geprüft von Dra. Nádia Cavaco, Allgemeinmedizinerin. Der Artikel enthält allgemeine Informationen zur Reisemedizin in Portugal und ersetzt keine persönliche ärztliche Beratung. Empfehlungen zu Impfungen und Prophylaxe hängen vom Reiseziel, der Route und Ihrer Krankengeschichte ab und können nur in einer Sprechstunde ausgesprochen werden. Global Health verabreicht keine Impfungen und stellt keine internationalen Impfausweise aus. Rufen Sie im medizinischen Notfall sofort 112 an.",
  } satisfies Article,
};

export const PT_CONSULTA_VIAJANTE: PostSet = {
  key: "pt-consulta-viajante",
  countryCode: "pt",
  targetKeyword: "consulta do viajante",
  searchVolume: 5400,
  keywordDifficulty: 3,
  evidence:
    "pt/2620 expansion 2026-08-04. Head term 5,400 KD 3, unchanged by the expansion. Cluster: consulta do viajante online 1,000 KD 5, marcar consulta do viajante sns 880 KD 5, consulta do viajante porto 880 KD 0, consulta do viajante braga 390 KD 0, centro de vacinação internacional de braga 390 KD 0, consulta do viajante lisboa 260 KD 0, consulta do viajante coimbra 260 KD 0, consulta do viajante matosinhos 110 KD 0, marcar consulta do viajante online 110 KD 7. The tail is overwhelmingly where-and-how-to-book, so the article is built around locations, documents and the video/presential boundary. SERP 2026-08-04: SNS 24 guide at 1, ARS Norte CVI Porto at 4, then CUF, Hospital da Luz, JCS, Affidea, IHMT NOVA and two telemedicine pure-plays. None states which parts of the consultation a video appointment can deliver and which require a Centro de Vacinação Internacional.",
  serviceSlug: "consulta-do-viajante",
  authorDoctorId: "cmqwnkj7y00037gju0x972cj4",
  authorDisplayName: "Dr Vitor Hugo de Matos Pais",
  reviewerDoctorId: "cmqwnkili00027gjun3zlxdd5",
  reviewerDisplayName: "Dra. Nádia Cavaco",
  posts: [pt, en, es, cs, roPost, de],
};
