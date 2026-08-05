/**
 * Per-locale alt text for the August 2026 blog covers.
 *
 * One image serves all six locales of an article, but its description is prose
 * and belongs in the language of the page around it. The article's OWN locale
 * is not listed here — that string lives on the Asset (Asset.altText) and is
 * edited with the image itself in the admin. Everything below writes
 * BlogTranslation.coverImageAlt.
 *
 * Keyed by the cover's `name` in scripts/seed-blog-covers-2026-08.ts.
 */
export const COVER_ALTS: Record<string, Partial<Record<"EN" | "PT" | "ES" | "CS" | "RO" | "DE", string>>> = {
  // 1 · IE illness benefit — original EN on the Asset.
  "illness-benefit-ireland-claim-form-at-home": {
    PT: "Mulher à mesa da cozinha, numa casa de Dublin, a preencher o pedido de Illness Benefit ao lado do portátil, com chuva na janela.",
    ES: "Mujer en la mesa de la cocina de una casa de Dublín rellenando la solicitud de Illness Benefit junto al portátil, con lluvia en la ventana.",
    CS: "Žena u kuchyňského stolu v dublinském domě vyplňuje žádost o Illness Benefit vedle notebooku, za oknem prší.",
    RO: "Femeie la masa din bucătărie, într-o casă din Dublin, completează cererea de Illness Benefit lângă laptop, cu ploaie la fereastră.",
    DE: "Frau am Küchentisch in einem Dubliner Haus füllt neben dem Laptop den Antrag auf Illness Benefit aus, Regen am Fenster.",
  },

  // 2 · IE blood tests — original EN on the Asset.
  "blood-test-dublin-phlebotomy-sample-tubes": {
    PT: "Profissional de colheitas coloca o garrote no braço de uma doente numa clínica de Dublin, com tubos de colheita de tampa colorida prontos num tabuleiro de aço.",
    ES: "Profesional de extracciones coloca el compresor en el brazo de una paciente en una clínica de Dublín, con tubos de muestra de tapón de colores listos en una bandeja de acero.",
    CS: "Odběrová sestra přikládá pacientce na paži škrtidlo v dublinské ordinaci, na ocelové misce jsou připravené zkumavky s barevnými uzávěry.",
    RO: "Asistentă de recoltare pune garoul pe brațul unei paciente într-o clinică din Dublin, cu vacutainere cu capac colorat pregătite pe o tavă de oțel.",
    DE: "Fachkraft legt einer Patientin in einer Dubliner Praxis den Stauschlauch an, auf einem Stahltablett liegen Blutröhrchen mit farbigen Kappen bereit.",
  },

  // 3 · CZ eNeschopenka — original CS on the Asset.
  "eneschopenka-lekar-odesila-z-ordinace": {
    EN: "Czech GP sending an eNeschopenka from the computer in the consulting room while the patient, still in her coat, leaves the desk.",
    PT: "Médico de família checo envia a eNeschopenka a partir do computador do consultório, enquanto a doente, ainda de casaco, se afasta da secretária.",
    ES: "Médico de familia checo envía la eNeschopenka desde el ordenador de la consulta mientras la paciente, aún con el abrigo puesto, se aleja de la mesa.",
    RO: "Medic de familie ceh trimite eNeschopenka de la calculatorul din cabinet, în timp ce pacienta, încă în palton, se ridică de la birou.",
    DE: "Tschechischer Hausarzt übermittelt die eNeschopenka vom Praxisrechner, während die Patientin im Mantel den Schreibtisch verlässt.",
  },

  // 4 · CZ doctor online 24/7 — original CS on the Asset.
  "lekar-online-24-7-vecerni-konzultace-doma": {
    EN: "Woman in a Prague flat consulting a doctor by tablet in the evening, night rooftops beyond the window.",
    PT: "Mulher num apartamento em Praga consulta um médico pelo tablet à noite, com os telhados da cidade à janela.",
    ES: "Mujer en un piso de Praga consulta con un médico por tableta durante la noche, con los tejados de la ciudad al otro lado de la ventana.",
    RO: "Femeie într-un apartament din Praga discută seara cu un medic prin tabletă, cu acoperișurile orașului la fereastră.",
    DE: "Frau in einer Prager Wohnung spricht abends per Tablet mit einer Ärztin, hinter dem Fenster die nächtlichen Dächer.",
  },

  // 5 · PT autodeclaração — original PT on the Asset.
  "autodeclaracao-de-doenca-no-telemovel": {
    EN: "Woman sitting on the edge of the bed in a Lisbon bedroom, completing a self-declaration of illness on her phone.",
    ES: "Mujer sentada en el borde de la cama, en un dormitorio de Lisboa, rellenando la autodeclaración de enfermedad en el móvil.",
    CS: "Žena sedí na kraji postele v lisabonské ložnici a vyplňuje na mobilu čestné prohlášení o nemoci.",
    RO: "Femeie așezată pe marginea patului, într-un dormitor din Lisabona, completează pe telefon autodeclarația de boală.",
    DE: "Frau sitzt auf der Bettkante in einem Lissabonner Schlafzimmer und füllt am Handy die Selbsterklärung zur Krankheit aus.",
  },

  // 6 · PT travel clinic — original PT on the Asset.
  "consulta-do-viajante-preparacao-antes-da-viagem": {
    EN: "Doctor placing a vaccination record card on an open map beside a half-packed rucksack, weeks before the trip.",
    ES: "Médico deja la cartilla de vacunación sobre un mapa abierto, junto a una mochila a medio hacer, semanas antes del viaje.",
    CS: "Lékař pokládá očkovací průkaz na rozloženou mapu vedle napůl sbaleného batohu, týdny před cestou.",
    RO: "Medicul așază carnetul de vaccinare pe o hartă deschisă, lângă un rucsac pe jumătate făcut, cu săptămâni înainte de plecare.",
    DE: "Arzt legt einen Impfpass auf eine aufgeschlagene Karte neben einen halb gepackten Rucksack, Wochen vor der Reise.",
  },

  // 7 · ES sick leave for anxiety — original ES on the Asset.
  "baja-laboral-por-ansiedad-oficina-madrid": {
    EN: "Employee in a Madrid office at the end of the day, chair turned away from a dark monitor towards the window.",
    PT: "Trabalhadora num escritório de Madrid ao fim do dia, com a cadeira virada para a janela e o monitor apagado.",
    CS: "Zaměstnankyně v madridské kanceláři na konci dne, židli otočenou od zhasnutého monitoru k oknu.",
    RO: "Angajată într-un birou din Madrid la finalul zilei, cu scaunul întors de la monitorul stins către fereastră.",
    DE: "Angestellte in einem Madrider Büro am Ende des Arbeitstags, den Stuhl vom dunklen Monitor zum Fenster gedreht.",
  },

  // 8 · ES online dermatologist — original ES on the Asset.
  "dermatologo-online-fotografia-de-la-lesion": {
    EN: "Patient photographing a forearm lesion with a phone by the window, a strip laid on the skin for scale.",
    PT: "Doente fotografa com o telemóvel uma lesão do antebraço junto à janela, com uma tira pousada na pele a dar referência de tamanho.",
    CS: "Pacientka fotí mobilem lézi na předloktí u okna, na kůži má položený proužek jako měřítko.",
    RO: "Pacientă fotografiază cu telefonul o leziune de pe antebraț lângă fereastră, cu o bandă așezată pe piele ca reper de mărime.",
    DE: "Patientin fotografiert am Fenster mit dem Handy eine Hautveränderung am Unterarm, ein Streifen auf der Haut dient als Größenmaßstab.",
  },

  // 9 · RO medical letter — original RO on the Asset.
  "scrisoare-medicala-completata-in-doua-exemplare": {
    EN: "Specialist completing a medical letter in two copies, stamp and ink pad on the desk and the patient seated opposite.",
    PT: "Médico especialista preenche a carta médica em dois exemplares, com carimbo e almofada de tinta na secretária e o doente sentado à frente.",
    ES: "Médico especialista rellena el informe médico por duplicado, con sello y tampón sobre la mesa y el paciente sentado enfrente.",
    CS: "Lékař specialista vyplňuje lékařskou zprávu ve dvou stejnopisech, na stole razítko s poduškou, pacient sedí naproti.",
    DE: "Facharzt füllt einen Arztbrief in zwei Ausfertigungen aus, Stempel und Stempelkissen auf dem Schreibtisch, der Patient sitzt gegenüber.",
  },

  // 10 · RO chronic disease — original RO on the Asset.
  "boli-cronice-monitorizare-acasa-intre-controale": {
    EN: "Patient measuring her blood pressure at the kitchen table and writing the readings in a notebook, weekly pill organiser beside her.",
    PT: "Doente mede a tensão arterial à mesa da cozinha e regista os valores num caderno, com a caixa semanal de medicamentos ao lado.",
    ES: "Paciente se toma la tensión en la mesa de la cocina y anota las cifras en un cuaderno, con el pastillero semanal al lado.",
    CS: "Pacientka si u kuchyňského stolu měří tlak a zapisuje hodnoty do sešitu, vedle leží týdenní dávkovač léků.",
    DE: "Patientin misst am Küchentisch ihren Blutdruck und notiert die Werte in ein Heft, daneben die Wochen-Tablettenbox.",
  },

  // 11 · BR medical certificate — original PT on the Asset.
  "atestado-medico-online-assinatura-digital": {
    EN: "Patient checking a digitally signed medical certificate as a PDF on her phone, straight after the video consultation on the laptop behind.",
    ES: "Paciente revisa en el móvil el certificado médico en PDF con firma digital, justo después de la teleconsulta en el portátil del fondo.",
  },

  // 12 · BR test request — original PT on the Asset.
  "solicitacao-de-exames-pedido-medico-no-consultorio": {
    EN: "Doctor comparing earlier results while building the test request on the computer, sample tubes in a rack beside him.",
    ES: "Médico compara resultados anteriores mientras prepara la solicitud de análisis en el ordenador, con tubos de muestra en una gradilla al lado.",
  },
};
