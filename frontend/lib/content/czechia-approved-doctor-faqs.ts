type DoctorFaq = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
};

export const CZECHIA_APPROVED_DOCTOR_FAQS: Readonly<Record<string, readonly DoctorFaq[]>> = {
  "dr-ahmed-maklad": [
    {
      id: "cmrl5zxt80009a0juv89gv0hs",
      question: "Jak si rezervovat konzultaci s MUDr. Makladem?",
      answer:
        "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
    },
  ],
  "khoiamul-islam": [
    {
      id: "cmrl60dlo000ya0juiyioxt4v",
      question: "Jak si rezervovat konzultaci s MUDr. Islamem?",
      answer:
        "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
    },
  ],
  "mudr-romana-pavlu": [
    {
      id: "cmrl60a88000sa0juznacdn72",
      question: "Jak si rezervovat konzultaci s MUDr. Pavlů?",
      answer:
        "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
    },
  ],
  "mudr-vojtech-cerny": [
    {
      id: "cmrl5zud70002a0juyprdpwtr",
      question:
        "Je online konzultace s MUDr. Černým vhodná při náhlém nebo závažném zhoršení?",
      answer:
        "Ne. Online konzultace není určena pro neodkladnou péči. Při náhlém nebo závažném zhoršení, nebo pokud si nejste jistí závažností stavu, nečekejte na online termín a volejte 155 nebo 112.",
    },
    {
      id: "cmrl5zukd0003a0jua02nny7w",
      question: "Jak si rezervovat konzultaci s MUDr. Černým?",
      answer:
        "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
    },
  ],
  "mudr-yasmin-holz": [
    {
      id: "cmrl601x4000ea0jutgyf2i2q",
      question: "Jak ověřím možnost posouzení eNeschopenky při konzultaci s MUDr. Holz?",
      answer:
        "Možnost eNeschopenky se ověřuje u konkrétní služby a termínu. Vystavit ji může pouze oprávněný lékař, pokud je pracovní neschopnost po klinickém posouzení odůvodněná a splňuje příslušné podmínky; rezervace vystavení nezaručuje.",
    },
    {
      id: "cmrl6024a000fa0jumi26025q",
      question: "V jakých jazycích MUDr. Holz konzultuje?",
      answer:
        "MUDr. Holz konzultuje v jazycích uvedených v aktuálním profilu. Před rezervací zkontrolujte jazyk konkrétního termínu a při konzultaci sdělte, kterému jazyku dáváte přednost.",
    },
    {
      id: "cmrl602bg000ga0jue0woiccy",
      question: "Jak si rezervovat konzultaci s MUDr. Holz?",
      answer:
        "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
    },
  ],
};

/** Applies the signed Czech profile copy without changing globally shared FAQ rows. */
export function applyCzechiaApprovedDoctorFaqs(
  countryCode: string | undefined,
  locale: string | undefined,
  slug: string,
  faqs: DoctorFaq[] | undefined,
): DoctorFaq[] | undefined {
  if (countryCode?.toLowerCase() !== "cz" || locale?.toLowerCase() !== "cs" || !faqs) {
    return faqs;
  }
  const replacements = CZECHIA_APPROVED_DOCTOR_FAQS[slug.toLowerCase()];
  if (!replacements) {
    return faqs;
  }
  if (replacements.some(({ id }) => !faqs.some((faq) => faq.id === id))) return [];
  const byId = new Map(replacements.map((faq) => [faq.id, faq]));
  return faqs.map((faq) => {
    const replacement = byId.get(faq.id);
    return replacement
      ? { ...faq, question: replacement.question, answer: replacement.answer }
      : faq;
  });
}
