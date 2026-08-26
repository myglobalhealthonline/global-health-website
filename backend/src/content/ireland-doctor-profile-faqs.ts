export const IRELAND_DOCTOR_PROFILE_FAQ_VERSION =
  "IE-DOCTOR-FAQ-2026-08-26" as const;

type IrelandDoctorFaqLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export type IrelandDoctorProfileFaqAddition = Readonly<{
  slug: string;
  expectedActiveFaqCount: number;
  faqs: readonly Readonly<{
    locale: IrelandDoctorFaqLocale;
    question: string;
    answer: string;
  }>[];
}>;

const englishFaqs = [
  {
    question: "Who is Roney Carli, chiropractor and manual therapist?",
    answer:
      "Roney Carli is a chiropractor and manual therapist who works with musculoskeletal health, movement and physical function. He looks at joint mobility, muscle function, lifestyle and other factors that may be contributing to discomfort.",
  },
  {
    question: "What concerns does Roney Carli work with?",
    answer:
      "Roney works with pain, restricted movement, reduced joint mobility, muscle function and return to everyday activity or exercise. He assesses each person's movement and needs before choosing the techniques that may fit.",
  },
  {
    question: "What techniques does Roney Carli use?",
    answer:
      "Depending on the person's needs, Roney may use manual therapy, soft-tissue techniques, joint mobilisation, chiropractic techniques, neuromuscular approaches and movement-based strategies. He chooses techniques case by case, so not every approach suits every concern.",
  },
  {
    question: "What training does Roney Carli have?",
    answer:
      "Roney completed a chiropractic degree in Brazil. His profile also lists further training in Kinesiology, Neuromuscular Therapy, Manual Therapy, soft-tissue techniques, joint mobilisation, cupping, dry needling and sports massage.",
  },
  {
    question: "What languages does Roney Carli speak?",
    answer:
      "Roney Carli speaks English and Portuguese. These are the languages listed on his Global Health profile.",
  },
] as const;

const portugueseFaqs = [
  {
    question: "Quem é Roney Carli, quiroprático e terapeuta manual?",
    answer:
      "Roney Carli é quiroprático e terapeuta manual. Trabalha com saúde musculoesquelética, movimento e função física, tendo em conta a mobilidade articular, a função muscular, o estilo de vida e outros fatores que podem contribuir para o desconforto.",
  },
  {
    question: "Com que problemas trabalha Roney Carli?",
    answer:
      "Roney trabalha com dor, limitações do movimento, mobilidade articular reduzida, função muscular e regresso às atividades diárias ou ao exercício. Avalia o movimento e as necessidades de cada pessoa antes de escolher as técnicas mais adequadas.",
  },
  {
    question: "Que técnicas utiliza Roney Carli?",
    answer:
      "Consoante as necessidades da pessoa, Roney pode usar terapia manual, técnicas de tecidos moles, mobilização articular, técnicas quiropráticas, abordagens neuromusculares e estratégias baseadas no movimento. Nem todas as técnicas são adequadas para todas as situações.",
  },
  {
    question: "Que formação tem Roney Carli?",
    answer:
      "Roney concluiu uma licenciatura em Quiropraxia no Brasil. O seu perfil público também indica formação em Cinesiologia, Terapia Neuromuscular, Terapia Manual, técnicas de tecidos moles, mobilização articular, ventosaterapia, agulhamento seco e massagem desportiva.",
  },
  {
    question: "Que idiomas fala Roney Carli?",
    answer:
      "Roney Carli fala inglês e português. Estes são os idiomas indicados no seu perfil da Global Health.",
  },
] as const;

const spanishFaqs = [
  {
    question: "¿Quién es Roney Carli, quiropráctico y terapeuta manual?",
    answer:
      "Roney Carli es quiropráctico y terapeuta manual. Trabaja con salud musculoesquelética, movimiento y función física, teniendo en cuenta la movilidad articular, la función muscular, el estilo de vida y otros factores que pueden contribuir a las molestias.",
  },
  {
    question: "¿Con qué problemas trabaja Roney Carli?",
    answer:
      "Roney trabaja con dolor, movimiento limitado, menor movilidad articular, función muscular y vuelta a la actividad diaria o al ejercicio. Evalúa el movimiento y las necesidades de cada persona antes de elegir qué técnicas pueden encajar mejor.",
  },
  {
    question: "¿Qué técnicas utiliza Roney Carli?",
    answer:
      "Según las necesidades de la persona, Roney puede utilizar terapia manual, técnicas de tejidos blandos, movilización articular, técnicas quiroprácticas, enfoques neuromusculares y estrategias basadas en el movimiento. No todas las técnicas son adecuadas para todos los problemas.",
  },
  {
    question: "¿Qué formación tiene Roney Carli?",
    answer:
      "Roney completó una licenciatura en Quiropráctica en Brasil. Su perfil público también indica formación en Kinesiología, Terapia Neuromuscular, Terapia Manual, técnicas de tejidos blandos, movilización articular, ventosas, punción seca y masaje deportivo.",
  },
  {
    question: "¿Qué idiomas habla Roney Carli?",
    answer:
      "Roney Carli habla inglés y portugués. Estos son los idiomas que figuran en su perfil de Global Health.",
  },
] as const;

const czechFaqs = [
  {
    question: "Kdo je Roney Carli, chiropraktik a manuální terapeut?",
    answer:
      "Roney Carli je chiropraktik a manuální terapeut. Jeho irský profil se zaměřuje na muskuloskeletální zdraví, pohyb a tělesnou funkci a zohledňuje pohyblivost kloubů, funkci svalů, životní styl a faktory, které mohou přispívat k obtížím.",
  },
  {
    question: "S jakými obtížemi Roney Carli pracuje?",
    answer:
      "Roney se ve své praxi věnuje bolesti, omezenému pohybu, snížené pohyblivosti kloubů, funkci svalů a návratu k běžným činnostem nebo cvičení. Než zvolí vhodné techniky, posoudí pohyb a potřeby konkrétního člověka.",
  },
  {
    question: "Jaké techniky Roney Carli používá?",
    answer:
      "Podle potřeb člověka může Roney využít manuální terapii, techniky měkkých tkání, mobilizaci kloubů, chiropraktické techniky, neuromuskulární přístupy a pohybové strategie. Ne každá technika je vhodná pro každé onemocnění nebo obtíž.",
  },
  {
    question: "Jaké vzdělání a výcvik má Roney Carli?",
    answer:
      "Roney vystudoval chiropraxi v Brazílii. Jeho veřejný profil uvádí také další vzdělání v kineziologii, neuromuskulární a manuální terapii, technikách měkkých tkání, mobilizaci kloubů, baňkování, suché jehle a sportovní masáži.",
  },
  {
    question: "Jakými jazyky Roney Carli mluví?",
    answer:
      "Roney Carli mluví anglicky a portugalsky. Tyto jazyky jsou uvedeny na jeho profilu Global Health.",
  },
] as const;

const romanianFaqs = [
  {
    question: "Cine este Roney Carli, chiropractician și terapeut manual?",
    answer:
      "Roney Carli este chiropractician și terapeut manual. Lucrează cu sănătatea musculo-scheletică, mișcarea și funcția fizică, ținând cont de mobilitatea articulațiilor, funcția musculară, stilul de viață și alți factori care pot contribui la disconfort.",
  },
  {
    question: "Cu ce probleme lucrează Roney Carli?",
    answer:
      "Roney lucrează cu durere, mișcare limitată, mobilitate articulară redusă, funcție musculară și revenirea la activitățile zilnice sau la exerciții. El evaluează mișcarea și nevoile fiecărei persoane înainte de a alege tehnicile potrivite.",
  },
  {
    question: "Ce tehnici folosește Roney Carli?",
    answer:
      "În funcție de nevoile persoanei, Roney poate folosi terapie manuală, tehnici pentru țesuturile moi, mobilizare articulară, tehnici chiropractice, abordări neuromusculare și strategii bazate pe mișcare. Nu toate tehnicile sunt potrivite pentru fiecare problemă.",
  },
  {
    question: "Ce pregătire are Roney Carli?",
    answer:
      "Roney a absolvit studii de Chiropractică în Brazilia. Profilul său public menționează și formare în Kinesiologie, Terapie Neuromusculară, Terapie Manuală, tehnici pentru țesuturi moi, mobilizare articulară, ventuze, dry needling și masaj sportiv.",
  },
  {
    question: "Ce limbi vorbește Roney Carli?",
    answer:
      "Roney Carli vorbește engleză și portugheză. Acestea sunt limbile listate pe profilul său Global Health.",
  },
] as const;

const germanFaqs = [
  {
    question: "Wer ist Roney Carli, Chiropraktiker und Manualtherapeut?",
    answer:
      "Roney Carli ist Chiropraktiker und Manualtherapeut. Er arbeitet mit muskuloskelettaler Gesundheit, Bewegung und körperlicher Funktion und berücksichtigt Gelenkbeweglichkeit, Muskelfunktion, Lebensstil und mögliche Ursachen von Beschwerden.",
  },
  {
    question: "Mit welchen Beschwerden arbeitet Roney Carli?",
    answer:
      "Roney arbeitet mit Schmerzen, eingeschränkter Bewegung, verminderter Gelenkbeweglichkeit, Muskelfunktion und der Rückkehr zu Alltag oder Bewegung. Vor der Auswahl geeigneter Techniken beurteilt er die Bewegung und die Bedürfnisse der jeweiligen Person.",
  },
  {
    question: "Welche Techniken verwendet Roney Carli?",
    answer:
      "Je nach Bedarf kann Roney Manualtherapie, Weichteiltechniken, Gelenkmobilisation, chiropraktische Techniken, neuromuskuläre Ansätze und bewegungsbasierte Strategien einsetzen. Nicht jede Technik eignet sich für jedes Anliegen.",
  },
  {
    question: "Welche Ausbildung hat Roney Carli?",
    answer:
      "Roney hat ein Chiropraktik-Studium in Brasilien abgeschlossen. Sein öffentliches Profil nennt außerdem Weiterbildungen in Kinesiologie, neuromuskulärer Therapie, Manualtherapie, Weichteiltechniken, Gelenkmobilisation, Schröpfen, Dry Needling und Sportmassage.",
  },
  {
    question: "Welche Sprachen spricht Roney Carli?",
    answer:
      "Roney Carli spricht Englisch und Portugiesisch. Diese Sprachen sind in seinem Profil bei Global Health aufgeführt.",
  },
] as const;

function localizeFaqs(
  locale: IrelandDoctorFaqLocale,
  faqs: readonly Readonly<{ question: string; answer: string }>[],
) {
  return faqs.map((faq) => ({ locale, ...faq }));
}

export const irelandDoctorProfileFaqAdditions: readonly IrelandDoctorProfileFaqAddition[] = [
  {
    slug: "roney-carli",
    expectedActiveFaqCount: 0,
    faqs: [
      ...localizeFaqs("EN", englishFaqs),
      ...localizeFaqs("PT", portugueseFaqs),
      ...localizeFaqs("ES", spanishFaqs),
      ...localizeFaqs("CS", czechFaqs),
      ...localizeFaqs("RO", romanianFaqs),
      ...localizeFaqs("DE", germanFaqs),
    ],
  },
] as const;
