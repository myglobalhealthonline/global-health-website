/**
 * Copy for Dr. Renato's shareable consultation page (`/dr-renato`).
 *
 * Deliberately NOT in the i18n bundles: this is a single non-indexed page a
 * doctor hands to patients, not site chrome, and the bundles are already
 * 1000+ keys per locale. Two locales only — `pt` (default, the audience) and
 * `en` via `?lang=en`.
 */

export type ShareLocale = "pt" | "en";

export const SHARE_LOCALES: ShareLocale[] = ["pt", "en"];

type Copy = {
  htmlLang: string;
  eyebrow: string;
  heroLead: string;
  heroAccent: string;
  heroTrail: string;
  lede: string;
  bookCta: string;
  profileCta: string;
  feature1: { title: string; subtitle: string };
  feature2: { title: string; subtitle: string };
  feature3: { title: string; subtitle: string };
  aboutEyebrow: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  howEyebrow: string;
  howTitle: string;
  howSteps: { title: string; body: string }[];
  offerEyebrow: string;
  offerTitle: string;
  offerBody: string;
  offerLanguageNote: string;
  offerPriceFallback: string;
  crossBorderEyebrow: string;
  crossBorderTitle: string;
  crossBorderIntro: string;
  crossBorderBody: string;
  crossBorderFeeLead: string;
  crossBorderTableCountry: string;
  crossBorderTableFee: string;
  crossBorderComingSoon: string;
  crossBorderFootnote: string;
  countryNames: Record<string, string>;
  aboutGhEyebrow: string;
  aboutGhTitle: string;
  aboutGhBody: string;
  aboutGhCta: string;
  faqEyebrow: string;
  faqTitle: string;
  faq: { question: string; answer: string }[];
  noticeTitle: string;
  noticeParagraphs: string[];
  /** Inbound link card rendered on his indexed profile + the Brazil GP page. */
  shareLinkTitle: string;
  shareLinkBody: string;
  shareLinkCta: string;
  /** SEO/meta (page is noindex — these only matter for link previews). */
  metaTitle: string;
  metaDescription: string;
};

/** Countries the cross-border pathway is advertised for, in display order. */
export const CROSS_BORDER_COUNTRIES = ["IE", "PT", "ES", "CZ", "RO"] as const;

export const SHARE_COPY: Record<ShareLocale, Copy> = {
  pt: {
    htmlLang: "pt-BR",
    eyebrow: "Brasil · Medicina de Família",
    heroLead: "Consulta online com",
    heroAccent: "seu médico",
    heroTrail: "de família",
    lede: "Videoconsulta particular com médico de família registrado no CRM. Disponível para pacientes brasileiros em qualquer lugar do mundo.",
    bookCta: "Agendar consulta",
    profileCta: "Ver perfil completo",
    feature1: { title: "Videoconsulta", subtitle: "De qualquer dispositivo" },
    feature2: { title: "Registro CRM", subtitle: "Médico verificado" },
    feature3: { title: "Sem pressa", subtitle: "Consulta individual" },
    aboutEyebrow: "O médico",
    aboutTitle: "Sobre mim",
    aboutParagraphs: [
      "Sou médico de família e me dedico a um cuidado abrangente e centrado na pessoa, para pacientes de todas as idades. Minhas consultas começam pela escuta — entender não apenas os sintomas, mas a sua vida, o seu contexto e os seus objetivos — para então oferecer orientação baseada em evidências e feita sob medida para você.",
      "Se você precisa acompanhar uma condição crônica, entender um diagnóstico novo ou simplesmente quer um médico de confiança que conheça o seu histórico, estou aqui para oferecer um cuidado atento e individualizado — onde quer que você esteja no mundo.",
    ],
    howEyebrow: "Passo a passo",
    howTitle: "Como funciona",
    howSteps: [
      { title: "Agende a consulta", body: "Escolha o horário que funciona para você." },
      { title: "Entre na videochamada", body: "De qualquer lugar, em qualquer dispositivo." },
      { title: "Receba sua avaliação", body: "Personalizada, baseada em evidências e sem pressa." },
      { title: "Receba a documentação", body: "Notas clínicas, encaminhamentos ou atestados, quando clinicamente indicado." },
    ],
    offerEyebrow: "Consulta online",
    offerTitle: "Videoconsulta particular",
    offerBody: "Consulta individual por vídeo com médico de família registrado no Brasil. Disponível para pacientes brasileiros que vivem em qualquer país.",
    offerLanguageNote: "Todas as consultas são realizadas em português.",
    offerPriceFallback: "Consultar valor",
    crossBorderEyebrow: "Cuidado além-fronteiras",
    crossBorderTitle: "Mora na Europa? Também cuidamos de você.",
    crossBorderIntro:
      "Se você é brasileiro e mora na Irlanda, Portugal, Espanha, Chéquia ou Romênia, pergunte ao seu médico durante a consulta sobre a continuidade do cuidado além-fronteiras.",
    crossBorderBody:
      "Quando clinicamente apropriado, seu médico pode encaminhar você a um médico Global Health registrado no seu país de residência. Esse médico analisa o seu caso de forma independente e pode emitir receitas, pedidos de exame ou atestados, sempre em conformidade com as diretrizes e a regulamentação médica locais.",
    crossBorderFeeLead:
      "Esse caminho é iniciado durante a consulta, a seu pedido. Se o seu médico encaminhar o caso, o valor da análise além-fronteiras é:",
    crossBorderTableCountry: "País",
    crossBorderTableFee: "Valor",
    crossBorderComingSoon: "Em breve",
    crossBorderFootnote:
      "O pagamento só é solicitado se o seu médico iniciar o encaminhamento durante a consulta. A análise é feita por um médico Global Health independente, registrado localmente, e está sujeita à avaliação clínica e ao julgamento profissional dele.",
    countryNames: {
      IE: "Irlanda",
      PT: "Portugal",
      ES: "Espanha",
      CZ: "Chéquia",
      RO: "Romênia",
    },
    aboutGhEyebrow: "O que é a Global Health",
    aboutGhTitle: "O que é a Global Health",
    aboutGhBody:
      "A Global Health é uma plataforma de telemedicina multipaís que conecta pacientes a médicos licenciados no Brasil, Irlanda, Portugal, Espanha, Chéquia e Romênia. Nossa rede garante acesso a um cuidado de qualidade — no seu idioma, com médicos que entendem a sua origem — onde quer que a vida leve você.",
    aboutGhCta: "Conheça a Global Health",
    faqEyebrow: "Dúvidas",
    faqTitle: "Perguntas frequentes",
    faq: [
      {
        question: "Preciso estar no Brasil para agendar?",
        answer:
          "Não. A consulta está disponível para pacientes brasileiros que vivem em qualquer lugar do mundo. Você só precisa de uma conexão estável e um dispositivo com câmera.",
      },
      {
        question: "A consulta é em português?",
        answer: "Sim, integralmente. A consulta com o seu médico brasileiro é realizada inteiramente em português.",
      },
      {
        question: "O que é exatamente o serviço além-fronteiras?",
        answer:
          "É um caminho clínico opcional, disponível em alguns países europeus, no qual um médico registrado localmente analisa a documentação do seu caso e pode emitir receitas ou atestados locais quando clinicamente justificado. Não é um adicional automático — é discutido e iniciado durante a consulta, se for relevante para a sua necessidade.",
      },
      {
        question: "O médico além-fronteiras sempre pode emitir receita?",
        answer:
          "Não automaticamente. O médico registrado localmente exerce julgamento clínico independente, conforme as diretrizes médicas do país. A emissão de qualquer documento depende inteiramente da avaliação dele.",
      },
      {
        question: "E se eu precisar de atendimento urgente?",
        answer:
          "A telemedicina não é adequada para emergências. Se você estiver vivendo uma emergência médica, procure imediatamente o serviço de emergência local.",
      },
      {
        question: "Como faço o pagamento?",
        answer:
          "A consulta é paga online no momento do agendamento. O valor da análise além-fronteiras, quando aplicável, é cobrado separadamente no momento do encaminhamento.",
      },
    ],
    noticeTitle: "Aviso importante",
    noticeParagraphs: [
      "A Global Health é uma plataforma de telemedicina operada a partir da Irlanda. Os médicos da rede exercem a medicina de forma independente e são os únicos responsáveis pelas suas decisões clínicas. No Brasil, a Global Health não atua como clínica médica: atua exclusivamente como intermediária de serviços prestados por profissionais habilitados e devidamente registrados nos respectivos conselhos.",
      "O valor da consulta cobre apenas o atendimento com o médico registrado no Brasil. A análise documental além-fronteiras é um serviço separado e independente, prestado por médicos Global Health registrados localmente, sujeito à avaliação clínica deles e à regulamentação local aplicável. A Global Health não garante a emissão de qualquer receita, atestado ou documento clínico como resultado de nenhum dos dois serviços.",
      "Em qualquer situação urgente ou de emergência, não utilize este serviço. Procure imediatamente o serviço de emergência local.",
    ],
    shareLinkTitle: "Página para pacientes brasileiros no exterior",
    shareLinkBody:
      "Uma página curta explicando a videoconsulta em português e o caminho de continuidade do cuidado para quem mora na Europa.",
    shareLinkCta: "Abrir a página",
    metaTitle: "Consulta online com médico de família · Global Health Brasil",
    metaDescription:
      "Videoconsulta particular com médico de família registrado no CRM, para pacientes brasileiros em qualquer lugar do mundo.",
  },
  en: {
    htmlLang: "en",
    eyebrow: "Brazil · Family Medicine",
    heroLead: "Online consultation with",
    heroAccent: "your family",
    heroTrail: "doctor",
    lede: "A private video consultation with a Brazil-registered family doctor. Available to Brazilian patients living anywhere in the world.",
    bookCta: "Book your consultation",
    profileCta: "See full profile",
    feature1: { title: "Video consultation", subtitle: "From any device" },
    feature2: { title: "CRM registered", subtitle: "Verified physician" },
    feature3: { title: "Unhurried", subtitle: "One-on-one care" },
    aboutEyebrow: "The doctor",
    aboutTitle: "About me",
    aboutParagraphs: [
      "I'm a Family Medicine physician specialising in comprehensive, person-centred care for patients of all ages. My consultations are built around listening — understanding not just your symptoms, but your life, your context, and your goals — and delivering evidence-based guidance tailored to you.",
      "Whether you need help managing a chronic condition, navigating a new diagnosis, or simply want a trusted doctor who knows your history, I'm here to provide attentive, individualised care — wherever you are in the world.",
    ],
    howEyebrow: "Step by step",
    howTitle: "How it works",
    howSteps: [
      { title: "Book your consultation", body: "Choose a time that works for you." },
      { title: "Join the video call", body: "From anywhere, on any device." },
      { title: "Get your assessment", body: "Personalised, evidence-based, and unhurried." },
      { title: "Receive your documentation", body: "Clinical notes, referrals, or sick notes as clinically indicated." },
    ],
    offerEyebrow: "Online consultation",
    offerTitle: "Private video consultation",
    offerBody: "A private, one-on-one video consultation with a Brazilian-registered family doctor. Available to Brazilian patients living anywhere in the world.",
    offerLanguageNote: "All consultations are conducted in Portuguese.",
    offerPriceFallback: "Ask for pricing",
    crossBorderEyebrow: "Cross-border care",
    crossBorderTitle: "Living in Europe? We've got you covered.",
    crossBorderIntro:
      "If you're a Brazilian living in Ireland, Portugal, Spain, Czechia, or Romania, ask your doctor during the consultation about cross-border continuity of care.",
    crossBorderBody:
      "Where clinically appropriate, your physician can connect you with a locally registered Global Health doctor in your country of residence. That doctor will independently review your case and may issue prescriptions, exam requests, or medical certificates in full compliance with local medical guidelines and regulations.",
    crossBorderFeeLead:
      "This pathway is initiated during your consultation, at your request. If your doctor refers you, the cross-border review fee is:",
    crossBorderTableCountry: "Country",
    crossBorderTableFee: "Fee",
    crossBorderComingSoon: "Coming soon",
    crossBorderFootnote:
      "Payment is only requested if your doctor initiates the referral during your consultation. The review is conducted by an independent, locally registered Global Health physician and is subject to their clinical assessment and professional judgement.",
    countryNames: {
      IE: "Ireland",
      PT: "Portugal",
      ES: "Spain",
      CZ: "Czechia",
      RO: "Romania",
    },
    aboutGhEyebrow: "What Global Health is",
    aboutGhTitle: "What Global Health is",
    aboutGhBody:
      "Global Health is a multi-country telemedicine platform connecting patients with licensed physicians across Brazil, Ireland, Portugal, Spain, Czechia, and Romania. Our network ensures you have access to quality medical care — in your language, by doctors who understand your background — no matter where life takes you.",
    aboutGhCta: "Learn more about Global Health",
    faqEyebrow: "Questions",
    faqTitle: "Frequently asked questions",
    faq: [
      {
        question: "Do I need to be in Brazil to book?",
        answer:
          "No. This consultation is available to Brazilian patients living anywhere in the world. You just need a stable internet connection and a device with a camera.",
      },
      {
        question: "Is the consultation in Portuguese?",
        answer: "Yes, fully. The consultation with your Brazilian doctor is conducted entirely in Portuguese.",
      },
      {
        question: "What is the cross-border service exactly?",
        answer:
          "It's an optional clinical pathway, available in select European countries, where a locally registered physician reviews your case documentation and may issue local prescriptions or certificates where clinically justified. It is not an automatic add-on — it is discussed and initiated during your consultation if relevant to your needs.",
      },
      {
        question: "Can the cross-border doctor always issue a prescription?",
        answer:
          "Not automatically. The locally registered physician exercises independent clinical judgement in line with local medical guidelines. Issuance of any document depends entirely on their assessment.",
      },
      {
        question: "What if I need urgent care?",
        answer:
          "Telemedicine is not suitable for emergencies. If you are experiencing a medical emergency, contact your local emergency services immediately.",
      },
      {
        question: "How do I pay?",
        answer:
          "Consultation fees are paid online at the time of booking. Cross-border review fees, if applicable, are processed separately at the time of referral.",
      },
    ],
    noticeTitle: "Important notice",
    noticeParagraphs: [
      "Global Health is a telemedicine platform operated from Ireland. The physicians in our network practise independently and are solely responsible for their own clinical decisions. In Brazil, Global Health does not operate as a medical clinic: it acts only as an intermediary for services delivered by qualified practitioners registered with their respective medical councils.",
      "The consultation fee covers your appointment with a Brazil-registered physician only. The cross-border document review is a separate, independent service provided by locally registered Global Health physicians, subject to their clinical assessment and applicable local regulations. Global Health does not guarantee the issuance of any prescription, certificate, or clinical document as a result of either service.",
      "In any urgent or emergency situation, do not use this service. Contact your local emergency services immediately.",
    ],
    shareLinkTitle: "Page for Brazilian patients living abroad",
    shareLinkBody:
      "A short page explaining the Portuguese-language video consultation and the cross-border continuity-of-care pathway for patients living in Europe.",
    shareLinkCta: "Open the page",
    metaTitle: "Online consultation with a family doctor · Global Health Brazil",
    metaDescription:
      "A private video consultation with a Brazil-registered family doctor, for Brazilian patients anywhere in the world.",
  },
};
