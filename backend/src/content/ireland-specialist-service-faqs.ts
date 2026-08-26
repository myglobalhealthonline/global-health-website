export const IRELAND_SPECIALIST_SERVICE_FAQ_VERSION =
  "IE-SPECIALIST-FAQ-2026-08-26" as const;

type IrelandFaqLocale = "PT" | "ES" | "CS" | "RO" | "DE";

export type IrelandSpecialistServiceFaqAddition = Readonly<{
  slug: string;
  question: string;
  answer: string;
  translations: readonly Readonly<{
    locale: IrelandFaqLocale;
    question: string;
    answer: string;
  }>[];
}>;

export const irelandSpecialistServiceFaqAdditions: readonly IrelandSpecialistServiceFaqAddition[] = [
  {
    slug: "cardiology-specialist-consultation",
    question: "How do I book an online cardiology consultation in Ireland?",
    answer:
      "Choose the cardiology service, select an available clinician and appointment time, then complete the booking. Before the secure video call, upload any ECG, echocardiogram, blood test results, medication list or relevant letters you want the cardiologist to review. If you have chest pain, severe breathlessness or other urgent symptoms, seek emergency care instead.",
    translations: [
      {
        locale: "PT",
        question: "Como marco uma consulta de cardiologia online na Irlanda?",
        answer:
          "Escolha o serviço de cardiologia, selecione o profissional e o horário disponíveis e conclua a marcação. Antes da videochamada segura, pode enviar ECG, ecocardiograma, análises, lista de medicamentos ou cartas clínicas relevantes. Se tiver dor no peito, falta de ar intensa ou outros sintomas urgentes, procure cuidados de emergência.",
      },
      {
        locale: "ES",
        question: "¿Cómo reservo una consulta de cardiología online en Irlanda?",
        answer:
          "Elija el servicio de cardiología, seleccione un profesional y una hora disponibles y complete la reserva. Antes de la videollamada segura puede enviar ECG, ecocardiogramas, análisis, una lista de medicamentos o informes relevantes. Si tiene dolor torácico, dificultad respiratoria intensa u otros síntomas urgentes, acuda a urgencias.",
      },
      {
        locale: "CS",
        question: "Jak si objednám online kardiologickou konzultaci v Irsku?",
        answer:
          "Vyberte kardiologickou službu, dostupného odborníka a termín a dokončete rezervaci. Před zabezpečeným videohovorem můžete nahrát EKG, echokardiogram, výsledky krve, seznam léků nebo lékařské zprávy. Při bolesti na hrudi, výrazné dušnosti nebo jiných akutních příznacích vyhledejte pohotovostní péči.",
      },
      {
        locale: "RO",
        question: "Cum programez o consultație de cardiologie online în Irlanda?",
        answer:
          "Alegeți serviciul de cardiologie, un specialist și un interval disponibile, apoi finalizați programarea. Înaintea apelului video securizat puteți încărca EKG-uri, ecocardiografii, analize, lista medicamentelor sau scrisori medicale relevante. Pentru durere în piept, lipsă severă de aer sau alte simptome urgente, solicitați asistență de urgență.",
      },
      {
        locale: "DE",
        question: "Wie buche ich eine Online-Kardiologie-Beratung in Irland?",
        answer:
          "Wählen Sie die Kardiologie-Leistung, eine verfügbare Fachperson und einen Termin und schließen Sie die Buchung ab. Vor dem sicheren Videoanruf können Sie EKG, Echokardiogramm, Blutwerte, Medikamentenliste oder Arztbriefe hochladen. Bei Brustschmerzen, starker Atemnot oder anderen akuten Beschwerden suchen Sie bitte die Notfallversorgung auf.",
      },
    ],
  },
  {
    slug: "neurology-specialist-consultation",
    question: "How do I book an online neurology consultation in Ireland?",
    answer:
      "Choose the neurology service, select an available clinician and time, and complete the booking. Upload any MRI or CT reports, EEG results, medication list and relevant clinic letters before the secure video consultation so the neurologist can review them. Sudden weakness, new speech difficulty, a first seizure or other urgent symptoms need emergency assessment.",
    translations: [
      {
        locale: "PT",
        question: "Como marco uma consulta de neurologia online na Irlanda?",
        answer:
          "Escolha o serviço de neurologia, selecione o profissional e o horário disponíveis e conclua a marcação. Antes da videochamada segura, envie relatórios de ressonância ou TAC, resultados de EEG, lista de medicamentos e cartas clínicas relevantes. Fraqueza súbita, dificuldade nova na fala, uma primeira convulsão ou outros sintomas urgentes exigem avaliação de emergência.",
      },
      {
        locale: "ES",
        question: "¿Cómo reservo una consulta de neurología online en Irlanda?",
        answer:
          "Elija el servicio de neurología, seleccione un profesional y una hora disponibles y complete la reserva. Antes de la videollamada segura, envíe informes de resonancia o TAC, resultados de EEG, una lista de medicamentos y cartas clínicas relevantes. La debilidad repentina, una nueva dificultad para hablar, una primera convulsión u otros síntomas urgentes requieren atención de emergencia.",
      },
      {
        locale: "CS",
        question: "Jak si objednám online neurologickou konzultaci v Irsku?",
        answer:
          "Vyberte neurologickou službu, dostupného odborníka a termín a dokončete rezervaci. Před zabezpečeným videohovorem nahrajte zprávy z MRI nebo CT, výsledky EEG, seznam léků a související lékařské zprávy. Náhlá slabost, nová porucha řeči, první záchvat nebo jiné akutní příznaky vyžadují pohotovostní vyšetření.",
      },
      {
        locale: "RO",
        question: "Cum programez o consultație de neurologie online în Irlanda?",
        answer:
          "Alegeți serviciul de neurologie, un specialist și un interval disponibile, apoi finalizați programarea. Înaintea apelului video securizat încărcați rapoarte RMN sau CT, rezultate EEG, lista medicamentelor și scrisori medicale relevante. Slăbiciunea bruscă, dificultățile noi de vorbire, prima criză convulsivă sau alte simptome urgente necesită evaluare de urgență.",
      },
      {
        locale: "DE",
        question: "Wie buche ich eine Online-Neurologie-Beratung in Irland?",
        answer:
          "Wählen Sie die Neurologie-Leistung, eine verfügbare Fachperson und einen Termin und schließen Sie die Buchung ab. Laden Sie vor dem sicheren Videoanruf MRT- oder CT-Berichte, EEG-Ergebnisse, Ihre Medikamentenliste und relevante Arztbriefe hoch. Plötzliche Schwäche, neue Sprachstörungen, ein erster Krampfanfall oder andere akute Beschwerden müssen im Notfall abgeklärt werden.",
      },
    ],
  },
  {
    slug: "nutrition-specialist-consultation",
    question: "Can I book an online nutrition consultation in Ireland?",
    answer:
      "Yes. Choose the nutrition service, select an available practitioner and appointment time, and complete the booking. During the secure video consultation, the nutrition specialist will discuss your health history, current diet, symptoms and goals, then explain practical next steps they can help with. Have recent test results and a medication or supplement list ready if relevant.",
    translations: [
      {
        locale: "PT",
        question: "Posso marcar uma consulta de nutrição online na Irlanda?",
        answer:
          "Sim. Escolha o serviço de nutrição, selecione o profissional e o horário disponíveis e conclua a marcação. Na videochamada segura, o especialista em nutrição irá falar sobre o seu historial de saúde, alimentação atual, sintomas e objetivos, e explicar os próximos passos dentro da sua área profissional. Tenha consigo análises recentes e uma lista de medicamentos ou suplementos, se forem relevantes.",
      },
      {
        locale: "ES",
        question: "¿Puedo reservar una consulta de nutrición online en Irlanda?",
        answer:
          "Sí. Elija el servicio de nutrición, seleccione un profesional y una hora disponibles y complete la reserva. Durante la videollamada segura, el especialista revisará sus antecedentes de salud, alimentación actual, síntomas y objetivos, y explicará los siguientes pasos dentro de su ámbito profesional. Tenga a mano análisis recientes y una lista de medicamentos o suplementos si son relevantes.",
      },
      {
        locale: "CS",
        question: "Mohu si objednat online nutriční konzultaci v Irsku?",
        answer:
          "Ano. Vyberte nutriční službu, dostupného odborníka a termín a dokončete rezervaci. Během zabezpečeného videohovoru odborník probere váš zdravotní stav, současný jídelníček, obtíže a cíle a vysvětlí praktické další kroky v rámci své odbornosti. Pokud jsou důležité, připravte si aktuální výsledky vyšetření a seznam léků nebo doplňků.",
      },
      {
        locale: "RO",
        question: "Pot programa o consultație de nutriție online în Irlanda?",
        answer:
          "Da. Alegeți serviciul de nutriție, un specialist și un interval disponibile, apoi finalizați programarea. În apelul video securizat, specialistul va discuta istoricul medical, alimentația actuală, simptomele și obiectivele și va explica pașii practici care intră în aria sa profesională. Pregătiți analize recente și lista medicamentelor sau suplimentelor dacă sunt relevante.",
      },
      {
        locale: "DE",
        question: "Kann ich eine Online-Ernährungsberatung in Irland buchen?",
        answer:
          "Ja. Wählen Sie die Ernährungsberatung, eine verfügbare Fachperson und einen Termin und schließen Sie die Buchung ab. Im sicheren Videoanruf bespricht die Fachperson Ihre Krankengeschichte, aktuelle Ernährung, Beschwerden und Ziele und erklärt passende nächste Schritte im eigenen Tätigkeitsbereich. Halten Sie relevante aktuelle Befunde sowie eine Medikamenten- oder Supplementliste bereit.",
      },
    ],
  },
  {
    slug: "paediatric-specialist-consultation",
    question: "How do I book an online paediatric consultation in Ireland?",
    answer:
      "A parent or guardian can choose the paediatric specialist service, select an available clinician and time, and complete the booking. Before the secure video consultation, upload any GP letters, hospital reports, developmental assessments and current medication details that may help the paediatrician. A seriously unwell child or urgent symptoms need prompt in-person or emergency care.",
    translations: [
      {
        locale: "PT",
        question: "Como marco uma consulta pediátrica online na Irlanda?",
        answer:
          "O pai, a mãe ou o responsável pode escolher o serviço de pediatria especializada, selecionar o profissional e o horário disponíveis e concluir a marcação. Antes da videochamada segura, envie cartas do médico de família, relatórios hospitalares, avaliações do desenvolvimento e informação sobre medicação atual. Uma criança gravemente doente ou sintomas urgentes exigem cuidados presenciais ou de emergência sem demora.",
      },
      {
        locale: "ES",
        question: "¿Cómo reservo una consulta pediátrica online en Irlanda?",
        answer:
          "El padre, la madre o el tutor puede elegir el servicio de pediatría especializada, seleccionar un profesional y una hora disponibles y completar la reserva. Antes de la videollamada segura, envíe cartas del médico de cabecera, informes hospitalarios, evaluaciones del desarrollo y datos de la medicación actual. Un menor gravemente enfermo o con síntomas urgentes necesita atención presencial o de emergencia inmediata.",
      },
      {
        locale: "CS",
        question: "Jak objednám online pediatrickou konzultaci v Irsku?",
        answer:
          "Rodič nebo zákonný zástupce vybere službu dětského specialisty, dostupného odborníka a termín a dokončí rezervaci. Před zabezpečeným videohovorem může nahrát zprávy praktického lékaře, nemocniční zprávy, vývojová vyšetření a informace o současných lécích. Vážně nemocné dítě nebo akutní příznaky vyžadují rychlou osobní či pohotovostní péči.",
      },
      {
        locale: "RO",
        question: "Cum programez o consultație pediatrică online în Irlanda?",
        answer:
          "Un părinte sau tutore poate alege serviciul pediatric de specialitate, un medic și un interval disponibile, apoi poate finaliza programarea. Înaintea apelului video securizat, încărcați scrisori de la medicul de familie, rapoarte de spital, evaluări de dezvoltare și informații despre medicația actuală. Un copil grav bolnav sau cu simptome urgente are nevoie rapid de un consult în persoană sau de îngrijiri de urgență.",
      },
      {
        locale: "DE",
        question: "Wie buche ich eine pädiatrische Online-Beratung in Irland?",
        answer:
          "Ein Elternteil oder eine sorgeberechtigte Person wählt die pädiatrische Fachberatung, eine verfügbare Fachperson und einen Termin und schließt die Buchung ab. Vor dem sicheren Videoanruf können Hausarztbriefe, Krankenhausberichte, Entwicklungsbeurteilungen und Angaben zu aktuellen Medikamenten hochgeladen werden. Ein schwer krankes Kind oder akute Beschwerden brauchen umgehend persönliche ärztliche Hilfe oder Notfallversorgung.",
      },
    ],
  },
  {
    slug: "physiotherapy-specialist-consultation",
    question: "How do I book an online physiotherapy consultation in Ireland?",
    answer:
      "Choose the physiotherapy service, select an available practitioner and appointment time, and complete the booking. For the secure video consultation, wear clothing that lets you move comfortably and have enough space for the practitioner to observe relevant movement. Keep any scan reports, operation notes or current exercise plan nearby. Severe injury, loss of function or urgent symptoms need in-person assessment.",
    translations: [
      {
        locale: "PT",
        question: "Como marco uma consulta de fisioterapia online na Irlanda?",
        answer:
          "Escolha o serviço de fisioterapia, selecione o profissional e o horário disponíveis e conclua a marcação. Para a videochamada segura, use roupa que permita movimentar-se e tenha espaço para o profissional observar os movimentos relevantes. Tenha por perto relatórios de exames, notas operatórias ou o plano atual de exercícios. Uma lesão grave, perda de função ou sintomas urgentes exigem avaliação presencial.",
      },
      {
        locale: "ES",
        question: "¿Cómo reservo una consulta de fisioterapia online en Irlanda?",
        answer:
          "Elija el servicio de fisioterapia, seleccione un profesional y una hora disponibles y complete la reserva. Para la videollamada segura, use ropa que le permita moverse con comodidad y disponga de espacio para mostrar los movimientos relevantes. Tenga cerca informes de pruebas, notas de una operación o su plan de ejercicios actual. Una lesión grave, pérdida de función o síntomas urgentes requieren valoración presencial.",
      },
      {
        locale: "CS",
        question: "Jak si objednám online fyzioterapeutickou konzultaci v Irsku?",
        answer:
          "Vyberte fyzioterapeutickou službu, dostupného odborníka a termín a dokončete rezervaci. Na zabezpečený videohovor si vezměte oblečení, ve kterém se můžete pohodlně hýbat, a připravte prostor pro ukázku důležitých pohybů. Mějte po ruce zprávy ze zobrazovacích vyšetření, operační zprávy nebo současný cvičební plán. Vážné poranění, ztráta funkce nebo akutní příznaky vyžadují osobní vyšetření.",
      },
      {
        locale: "RO",
        question: "Cum programez o consultație de fizioterapie online în Irlanda?",
        answer:
          "Alegeți serviciul de fizioterapie, un specialist și un interval disponibile, apoi finalizați programarea. Pentru apelul video securizat, purtați haine în care vă puteți mișca și pregătiți suficient spațiu pentru observarea mișcărilor relevante. Țineți aproape rapoarte imagistice, note operatorii sau planul actual de exerciții. O accidentare gravă, pierderea funcției sau simptomele urgente necesită evaluare în persoană.",
      },
      {
        locale: "DE",
        question: "Wie buche ich eine Online-Physiotherapie-Beratung in Irland?",
        answer:
          "Wählen Sie die Physiotherapie-Leistung, eine verfügbare Fachperson und einen Termin und schließen Sie die Buchung ab. Tragen Sie für den sicheren Videoanruf bequeme Kleidung und schaffen Sie Platz, damit wichtige Bewegungen beurteilt werden können. Halten Sie Bildgebungsberichte, Operationsunterlagen oder Ihren aktuellen Übungsplan bereit. Schwere Verletzungen, Funktionsverlust oder akute Beschwerden brauchen eine persönliche Untersuchung.",
      },
    ],
  },
  {
    slug: "psychiatry-specialist-consultation",
    question: "How do I book an online psychiatry consultation in Ireland?",
    answer:
      "Choose the psychiatry service, select an available psychiatrist and appointment time, and complete the booking. Before the secure video consultation, prepare your current medication list and any relevant GP letters, previous assessments or treatment summaries. This is a planned outpatient appointment. If you may harm yourself or someone else, or cannot stay safe, contact emergency services or attend an emergency department now.",
    translations: [
      {
        locale: "PT",
        question: "Como marco uma consulta de psiquiatria online na Irlanda?",
        answer:
          "Escolha o serviço de psiquiatria, selecione o psiquiatra e o horário disponíveis e conclua a marcação. Antes da videochamada segura, prepare a lista de medicamentos atuais e cartas do médico de família, avaliações anteriores ou resumos de tratamento relevantes. Este é um serviço ambulatório agendado. Se existir risco de se magoar ou magoar outra pessoa, ou se não conseguir manter-se em segurança, contacte os serviços de emergência ou vá já às urgências.",
      },
      {
        locale: "ES",
        question: "¿Cómo reservo una consulta de psiquiatría online en Irlanda?",
        answer:
          "Elija el servicio de psiquiatría, seleccione un psiquiatra y una hora disponibles y complete la reserva. Antes de la videollamada segura, prepare su lista de medicamentos actuales y las cartas del médico de cabecera, evaluaciones anteriores o resúmenes de tratamiento relevantes. Este es un servicio ambulatorio programado. Si puede hacerse daño o dañar a otra persona, o no puede mantenerse a salvo, contacte con emergencias o acuda ahora a urgencias.",
      },
      {
        locale: "CS",
        question: "Jak si objednám online psychiatrickou konzultaci v Irsku?",
        answer:
          "Vyberte psychiatrickou službu, dostupného psychiatra a termín a dokončete rezervaci. Před zabezpečeným videohovorem si připravte seznam současných léků a související zprávy praktického lékaře, předchozí posudky nebo souhrny léčby. Jde o plánovanou ambulantní službu. Pokud hrozí, že ublížíte sobě nebo někomu jinému, nebo nedokážete zůstat v bezpečí, volejte tísňovou linku nebo jeďte ihned na pohotovost.",
      },
      {
        locale: "RO",
        question: "Cum programez o consultație de psihiatrie online în Irlanda?",
        answer:
          "Alegeți serviciul de psihiatrie, un psihiatru și un interval disponibile, apoi finalizați programarea. Înaintea apelului video securizat, pregătiți lista medicamentelor actuale și scrisori de la medicul de familie, evaluări anterioare sau rezumate ale tratamentului. Acesta este un serviciu ambulatoriu programat. Dacă există riscul să vă răniți sau să răniți pe altcineva ori nu vă puteți menține în siguranță, contactați serviciile de urgență sau mergeți acum la urgențe.",
      },
      {
        locale: "DE",
        question: "Wie buche ich eine Online-Psychiatrie-Beratung in Irland?",
        answer:
          "Wählen Sie die Psychiatrie-Leistung, eine verfügbare psychiatrische Fachperson und einen Termin und schließen Sie die Buchung ab. Halten Sie vor dem sicheren Videoanruf Ihre aktuelle Medikamentenliste sowie relevante Hausarztbriefe, frühere Beurteilungen oder Behandlungsübersichten bereit. Dies ist eine geplante ambulante Leistung. Wenn Sie sich oder andere gefährden könnten oder nicht sicher bleiben können, rufen Sie den Notdienst oder gehen Sie sofort in eine Notaufnahme.",
      },
    ],
  },
  {
    slug: "psychology-specialist-consultation",
    question: "How do I book an online psychology consultation in Ireland?",
    answer:
      "Choose the psychology service, select an available psychologist and appointment time, and complete the booking. Find a private place for the secure video consultation and share any relevant referral letters or previous assessment summaries in advance. This is a planned appointment, not crisis care. If you cannot stay safe, contact emergency services or attend an emergency department now.",
    translations: [
      {
        locale: "PT",
        question: "Como marco uma consulta de psicologia online na Irlanda?",
        answer:
          "Escolha o serviço de psicologia, selecione o psicólogo e o horário disponíveis e conclua a marcação. Encontre um local privado para a videochamada segura e envie antecipadamente cartas de referenciação ou resumos de avaliações anteriores que sejam relevantes. Este é um serviço ambulatório agendado, não um serviço de crise. Se não conseguir manter-se em segurança, contacte os serviços de emergência ou vá já às urgências.",
      },
      {
        locale: "ES",
        question: "¿Cómo reservo una consulta de psicología online en Irlanda?",
        answer:
          "Elija el servicio de psicología, seleccione un psicólogo y una hora disponibles y complete la reserva. Busque un lugar privado para la videollamada segura y envíe con antelación las cartas de derivación o los resúmenes de evaluaciones anteriores que sean relevantes. Este es un servicio ambulatorio programado, no atención de crisis. Si no puede mantenerse a salvo, contacte con emergencias o acuda ahora a urgencias.",
      },
      {
        locale: "CS",
        question: "Jak si objednám online psychologickou konzultaci v Irsku?",
        answer:
          "Vyberte psychologickou službu, dostupného psychologa a termín a dokončete rezervaci. Pro zabezpečený videohovor si najděte soukromé místo a předem nahrajte související doporučení nebo souhrny předchozích posouzení. Jde o plánovanou ambulantní službu, nikoli krizovou péči. Pokud nedokážete zůstat v bezpečí, volejte tísňovou linku nebo jeďte ihned na pohotovost.",
      },
      {
        locale: "RO",
        question: "Cum programez o consultație de psihologie online în Irlanda?",
        answer:
          "Alegeți serviciul de psihologie, un psiholog și un interval disponibile, apoi finalizați programarea. Găsiți un loc privat pentru apelul video securizat și încărcați din timp scrisori de trimitere sau rezumate ale evaluărilor anterioare dacă sunt relevante. Acesta este un serviciu ambulatoriu programat, nu un serviciu de criză. Dacă nu vă puteți menține în siguranță, contactați serviciile de urgență sau mergeți acum la urgențe.",
      },
      {
        locale: "DE",
        question: "Wie buche ich eine Online-Psychologie-Beratung in Irland?",
        answer:
          "Wählen Sie die Psychologie-Leistung, eine verfügbare psychologische Fachperson und einen Termin und schließen Sie die Buchung ab. Suchen Sie für den sicheren Videoanruf einen privaten Ort und laden Sie relevante Überweisungen oder Zusammenfassungen früherer Beurteilungen vorab hoch. Dies ist eine geplante ambulante Leistung und keine Krisenversorgung. Wenn Sie nicht sicher bleiben können, rufen Sie den Notdienst oder gehen Sie sofort in eine Notaufnahme.",
      },
    ],
  },
] as const;
