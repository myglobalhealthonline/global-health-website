export type ReviewFormLocale = {
  title: string;
  intro: string;
  submit: string;
  thanks: string;
  publicTitle: string;
  publicIntro: string;
  publicCta: string;
  labels: Record<string, string>;
};

const EN: ReviewFormLocale = {
  title: "How was your visit?",
  intro: "Your feedback helps us improve care for every patient.",
  submit: "Submit review",
  thanks: "Thank you for your feedback.",
  publicTitle: "Share your experience",
  publicIntro: "If you would like, you can also leave an optional honest public review.",
  publicCta: "Review us on",
  labels: {
    overallSatisfaction: "Overall satisfaction",
    doctorProfessionalism: "Doctor professionalism",
    communicationClarity: "Communication clarity",
    timelinessOfService: "Timeliness",
    valueForMoney: "Value for money",
    likeliness: "Likelihood to recommend",
    bookingExperience: "Booking experience",
  },
};

const PT: ReviewFormLocale = {
  title: "Como foi a sua consulta?",
  intro: "O seu feedback ajuda-nos a melhorar o cuidado para todos os pacientes.",
  submit: "Enviar avaliação",
  thanks: "Obrigado pelo seu feedback.",
  publicTitle: "Partilhe a sua experiência",
  publicIntro: "Se desejar, também pode deixar uma avaliação pública honesta e opcional.",
  publicCta: "Avaliar no",
  labels: {
    overallSatisfaction: "Satisfação geral",
    doctorProfessionalism: "Profissionalismo do médico",
    communicationClarity: "Clareza da comunicação",
    timelinessOfService: "Pontualidade",
    valueForMoney: "Relação qualidade-preço",
    likeliness: "Probabilidade de recomendar",
    bookingExperience: "Experiência de marcação",
  },
};

const CS: ReviewFormLocale = {
  title: "Jak proběhla vaše konzultace?",
  intro: "Vaše zpětná vazba nám pomáhá zlepšovat péči o všechny pacienty.",
  submit: "Odeslat hodnocení",
  thanks: "Děkujeme za vaši zpětnou vazbu.",
  publicTitle: "Podělte se o svou zkušenost",
  publicIntro: "Pokud chcete, můžete také zanechat nepovinné a upřímné veřejné hodnocení.",
  publicCta: "Ohodnotit na",
  labels: {
    overallSatisfaction: "Celková spokojenost",
    doctorProfessionalism: "Profesionalita lékaře",
    communicationClarity: "Srozumitelnost komunikace",
    timelinessOfService: "Dochvilnost",
    valueForMoney: "Poměr ceny a kvality",
    likeliness: "Pravděpodobnost doporučení",
    bookingExperience: "Zkušenost s rezervací",
  },
};

const ES: ReviewFormLocale = {
  title: "¿Cómo fue su consulta?",
  intro: "Sus comentarios nos ayudan a mejorar la atención de todos los pacientes.",
  submit: "Enviar valoración",
  thanks: "Gracias por sus comentarios.",
  publicTitle: "Comparta su experiencia",
  publicIntro: "Si lo desea, también puede dejar una reseña pública honesta y opcional.",
  publicCta: "Valorar en",
  labels: {
    overallSatisfaction: "Satisfacción general",
    doctorProfessionalism: "Profesionalidad del médico",
    communicationClarity: "Claridad de la comunicación",
    timelinessOfService: "Puntualidad",
    valueForMoney: "Relación calidad-precio",
    likeliness: "Probabilidad de recomendar",
    bookingExperience: "Experiencia de reserva",
  },
};

const RO: ReviewFormLocale = {
  title: "Cum a fost consultația?",
  intro: "Feedbackul dumneavoastră ne ajută să îmbunătățim îngrijirea tuturor pacienților.",
  submit: "Trimite evaluarea",
  thanks: "Vă mulțumim pentru feedback.",
  publicTitle: "Împărtășiți experiența",
  publicIntro: "Dacă doriți, puteți lăsa și o recenzie publică sinceră și opțională.",
  publicCta: "Evaluează pe",
  labels: {
    overallSatisfaction: "Satisfacție generală",
    doctorProfessionalism: "Profesionalismul medicului",
    communicationClarity: "Claritatea comunicării",
    timelinessOfService: "Punctualitate",
    valueForMoney: "Raport calitate-preț",
    likeliness: "Probabilitatea de recomandare",
    bookingExperience: "Experiența rezervării",
  },
};

const LOCALES: Record<string, ReviewFormLocale> = {
  en: EN,
  "en-ie": EN,
  "en-gb": EN,
  pt: PT,
  "pt-br": PT,
  br: PT,
  cs: CS,
  cz: CS,
  es: ES,
  ro: RO,
};

export function getReviewFormLocale(code?: string | null): ReviewFormLocale {
  if (!code) return EN;
  const key = code.trim().toLowerCase();
  return LOCALES[key] ?? LOCALES[key.split("-")[0]] ?? EN;
}
