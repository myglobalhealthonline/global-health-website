export type ReviewFormLocale = {
  title: string;
  intro: string;
  submit: string;
  thanks: string;
  labels: Record<string, string>;
};

const EN: ReviewFormLocale = {
  title: "How was your visit?",
  intro: "Your feedback helps us improve care for every patient.",
  submit: "Submit review",
  thanks: "Thank you for your feedback.",
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

const LOCALES: Record<string, ReviewFormLocale> = {
  en: EN,
  "en-ie": EN,
  "en-gb": EN,
  pt: PT,
  "pt-br": PT,
  br: PT,
};

export function getReviewFormLocale(code?: string | null): ReviewFormLocale {
  if (!code) return EN;
  const key = code.trim().toLowerCase();
  return LOCALES[key] ?? LOCALES[key.split("-")[0]] ?? EN;
}
