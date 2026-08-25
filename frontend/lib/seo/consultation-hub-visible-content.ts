export type ConsultationHubFaq = {
  question: string;
  answer: string;
};

export function resolveConsultationHubVisibleContent({
  authoredTitle,
  fallbackTitle,
  authoredDescription,
  fallbackDescription,
  authoredFaq,
  authoredFaqVisible,
  fallbackFaq,
}: {
  authoredTitle: string | null | undefined;
  fallbackTitle: string;
  authoredDescription: string | null | undefined;
  fallbackDescription: string;
  authoredFaq: ConsultationHubFaq[];
  authoredFaqVisible: boolean;
  fallbackFaq: ConsultationHubFaq[];
}): { title: string; description: string; faq: ConsultationHubFaq[] } {
  return {
    title: authoredTitle ?? fallbackTitle,
    description: authoredDescription ?? fallbackDescription,
    faq: authoredFaqVisible && authoredFaq.length > 0 ? authoredFaq : fallbackFaq,
  };
}
