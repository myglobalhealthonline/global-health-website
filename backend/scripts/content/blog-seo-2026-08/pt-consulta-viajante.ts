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
      "A antecedência recomendada, as vacinas exigidas por cada país e os tempos de espera mudam com o destino e com a época do ano. Não são citados aqui: cada um remete para o SNS 24, para o CVI ou para a OMS.",
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
          cite(`Descrição oficial: <a href="${SNS24_VIAJANTE}" rel="nofollow noopener" target="_blank">SNS 24 — consulta do viajante</a>.`),
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
            "Guarde o contacto do consulado ou embaixada e saiba como pedir ajuda médica no país onde vai estar.",
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
  posts: [pt],
};
