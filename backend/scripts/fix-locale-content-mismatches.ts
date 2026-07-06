import "dotenv/config";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const APPLY = process.argv.includes("--apply");

type ServiceFix = {
  name: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroDescription: string;
  detailBody: string;
  ctaLabel: string;
};

type DoctorFix = {
  title: string;
  bio: string;
};

type DoctorTranslationFix = {
  slug: string;
  locale: LocaleCode;
  title: string;
  bio: string;
};

type FaqBaseFix = {
  serviceFaqId: string;
  question: string;
  answer: string;
};

type FaqTranslationFix = {
  translationId: string;
  question: string;
  answer: string;
};

function makeRoService(
  name: string,
  summary: string,
  seoTitle: string,
  detailBody: string,
): ServiceFix {
  return {
    name,
    summary,
    seoTitle,
    seoDescription: summary,
    heroTitle: name,
    heroDescription: summary,
    detailBody: sanitizeRichHtml(detailBody),
    ctaLabel: "Programează consultația",
  };
}

const RO_SERVICE_FIXES: Record<string, ServiceFix> = {
  "travel-health-romania": makeRoService(
    "Consultație de medicină de călătorie — evaluare medicală înainte de plecare",
    "Călătoriți din România într-o zonă cu risc de malarie sau într-o destinație cu cerințe speciale de vaccinare? Medicii noștri autorizați CMR evaluează riscurile, oferă recomandări personalizate și prescriu profilaxie antimalarică atunci când este indicat clinic.",
    "Consultație de medicină de călătorie online | România | profilaxie antimalarică",
    `<p>Consultația de medicină de călătorie este potrivită dacă plecați într-o destinație cu risc infecțios mai mare, aveți nevoie de recomandări legate de vaccinuri sau trebuie să înțelegeți cum vă influențează călătoria afecțiunile și tratamentele existente.</p><p>Medicul analizează itinerariul, durata deplasării, tipul de cazare, activitățile planificate și istoricul dumneavoastră medical. Dacă este necesar, emite prescripție electronică pentru profilaxie antimalarică și vă explică măsurile de prevenție potrivite pentru destinația aleasă.</p><p>Consultația include și orientare practică privind vaccinurile recomandate, documentele medicale de călătorie și conduita dacă apar simptome după întoarcere. Dacă este nevoie de vaccinare pentru febra galbenă sau alte vaccinuri administrate doar în centre autorizate, veți primi indicații clare despre pașii următori.</p>`,
  ),
  "chronic-disease-romania": makeRoService(
    "Managementul bolilor cronice — îngrijire medicală continuă online",
    "Aveți hipertensiune, diabet, boală tiroidiană sau altă afecțiune de durată? Medicii noștri autorizați CMR oferă monitorizare medicală continuă, ajustarea planului terapeutic și coordonarea investigațiilor prin consultație video.",
    "Managementul bolilor cronice online | România | medic CMR",
    `<p>Acest serviciu este destinat pacienților care au nevoie de monitorizare consecventă pentru o afecțiune cronică, nu doar de o reînnoire ocazională a rețetei. Consultațiile urmăresc evoluția simptomelor, rezultatele analizelor, toleranța la tratament și obiectivele clinice pe termen lung.</p><p>Medicul poate coordona analize periodice, ajusta tratamentul atunci când starea dumneavoastră se schimbă și redacta scrisori medicale sau trimiteri atunci când este nevoie de implicarea unui specialist. Abordarea este utilă mai ales pentru pacienții cu mai multe diagnostice sau cu acces dificil la îngrijire primară continuă.</p><p>Serviciul este potrivit pentru afecțiuni precum hipertensiune, diabet, dislipidemie, astm, boli tiroidiene, durere cronică sau alte probleme de sănătate care necesită supraveghere regulată și un plan de management clar.</p>`,
  ),
  "paediatric-gp-romania": makeRoService(
    "Consultație pediatrică de medicină generală — online, în aceeași zi",
    "Copilul dumneavoastră este bolnav sau aveți nevoie de sfat medical rapid? Medicii noștri autorizați CMR evaluează simptomele copilului prin consultație video securizată și vă oferă recomandări clare pentru pașii următori.",
    "Consultație pediatrică online | România | medic CMR",
    `<p>Consultația pediatrică de medicină generală este potrivită pentru probleme frecvente precum febră, tuse, durere în gât, erupții cutanate, simptome digestive, infecții minore sau întrebări legate de evoluția unei boli deja cunoscute.</p><p>Medicul revizuiește simptomele, istoricul relevant, medicația curentă și semnele de alarmă. Veți primi recomandări privind tratamentul la domiciliu, indicații despre monitorizare și, dacă este necesar, îndrumare pentru investigații suplimentare sau evaluare fizică urgentă.</p><p>Serviciul este util și pentru familiile care doresc o a doua opinie rapidă, explicații privind rezultate medicale sau consiliere despre momentul potrivit pentru a merge la camera de gardă, la pediatru ori la medicul de familie.</p>`,
  ),
  "treatment-renewal-romania": makeRoService(
    "Reînnoirea tratamentului — evaluare clinică și prescripție online",
    "Urmați deja un tratament stabil? Medicii noștri autorizați CMR revizuiesc schema actuală, verifică siguranța continuării și emit prescripție electronică atunci când acest lucru este adecvat clinic.",
    "Reînnoire tratament online | România | prescripție electronică",
    `<p>Acest serviciu este dedicat pacienților cu afecțiuni stabile, care au nevoie de o revizuire medicală corectă înainte de continuarea tratamentului. Nu este o simplă rețetă automată: medicul analizează diagnosticul, răspunsul la tratament, reacțiile adverse și eventualele schimbări apărute de la ultima evaluare.</p><p>Dacă tratamentul rămâne potrivit, se poate emite prescripție electronică prin sistemul românesc, conform legislației aplicabile. Dacă sunt necesare analize suplimentare, modificări de doză sau evaluare de specialitate, veți primi explicații clare și următorii pași recomandați.</p><p>Serviciul este potrivit pentru tratamente cronice stabile, inclusiv în situațiile în care nu aveți acces facil la medicul de familie, locuiți în alt oraș, sunteți expat sau continuați în România o schemă terapeutică începută în altă țară.</p>`,
  ),
  "second-opinion-romania": makeRoService(
    "A doua opinie medicală — evaluare clinică independentă",
    "Doriți să verificați un diagnostic, un plan de tratament sau o recomandare medicală importantă? Medicii noștri autorizați CMR oferă o a doua opinie clară, structurată și independentă prin consultație video.",
    "A doua opinie medicală online | România | evaluare independentă",
    `<p>O a doua opinie este utilă atunci când ați primit un diagnostic nou, un tratament complex sau recomandarea unei intervenții și vreți să înțelegeți mai bine opțiunile disponibile. Consultația se bazează pe analiza simptomelor, istoricului și documentelor medicale pe care le aduceți.</p><p>Medicul vă explică în termeni clari ce este bine susținut de datele existente, ce puncte rămân neclare și dacă sunt necesare investigații suplimentare, monitorizare sau trimitere către alt specialist. Scopul nu este să contrazică automat un alt clinician, ci să vă ofere o evaluare riguroasă și utilă pentru luarea unei decizii informate.</p><p>Serviciul este adecvat pentru întrebări privind diagnostice cronice sau acute, tratamente medicamentoase, rezultate de imagistică sau analize, recomandări chirurgicale și planuri terapeutice cu impact major asupra sănătății dumneavoastră.</p>`,
  ),
  "skin-consultation-romania": makeRoService(
    "Consultație dermatologică de primă intenție — evaluare online",
    "Aveți erupții, eczemă, acnee, mâncărime sau altă problemă a pielii? Medicii noștri autorizați CMR evaluează simptomele prin consultație video și vă recomandă tratamentul sau următorii pași potriviți.",
    "Consultație pentru probleme ale pielii online | România",
    `<p>Consultația este potrivită pentru multe probleme cutanate frecvente, inclusiv acnee, dermatită, eczemă, urticarie, infecții minore ale pielii, iritații sau modificări care necesită o evaluare inițială rapidă.</p><p>Medicul discută istoricul simptomelor, factorii declanșatori, tratamentele încercate până acum și, dacă este posibil, analizează imaginile transmise sau aspectul pielii în timpul apelului video. În funcție de caz, veți primi recomandări de îngrijire, tratament simptomatic, investigații sau trimitere la dermatolog.</p><p>Dacă sunt prezente semne de alarmă, leziuni suspecte, agravare rapidă ori necesitatea unei examinări fizice directe, veți fi îndrumat către evaluare în persoană fără întârziere.</p>`,
  ),
  "neurology-consultation-romania": makeRoService(
    "Consultație de neurologie — evaluare de specialitate online",
    "Aveți migrene, dureri de cap persistente, amorțeli, neuropatie sau altă problemă neurologică? Specialistul nostru autorizat CMR oferă evaluare inițială, recomandări și plan de investigații prin consultație video.",
    "Consultație neurologie online | România | specialist CMR",
    `<p>Consultația neurologică online este utilă pentru simptome precum cefalee recurentă, migrenă, amețeli, tulburări de sensibilitate, furnicături, dureri neuropate, tremor sau alte manifestări care necesită clarificare de specialitate.</p><p>Medicul neurolog revizuiește istoricul, debutul și evoluția simptomelor, rezultatele existente și tratamentele anterioare. Veți primi recomandări privind conduita imediată, investigațiile necesare și momentul în care este esențială o evaluare fizică urgentă sau prezentarea la spital.</p><p>Serviciul este potrivit și pentru interpretarea unor rezultate deja obținute, monitorizarea unor afecțiuni neurologice stabile și orientarea către îngrijirea potrivită atunci când nu este clar care este următorul pas.</p>`,
  ),
  "musculoskeletal-pain-romania": makeRoService(
    "Evaluarea durerii musculo-scheletale — online, în aceeași zi",
    "Aveți dureri de spate, dureri articulare, sciatică sau o accidentare musculară? Medicii noștri autorizați CMR evaluează simptomele, semnele de alarmă și opțiunile de tratament prin consultație video.",
    "Consultație dureri musculo-scheletale online | România",
    `<p>Acest serviciu este util pentru dureri de spate, gât, umăr, genunchi, șold, articulații sau mușchi, precum și pentru rigiditate, entorse minore, suprasolicitare ori durere care limitează activitățile zilnice.</p><p>Medicul analizează modul de apariție a durerii, localizarea, severitatea, impactul asupra mobilității și eventualele semne de alarmă, cum ar fi slăbiciunea, amorțeala progresivă, traumatismele importante sau simptomele sistemice. În funcție de caz, recomandă tratament inițial, măsuri de protecție, investigații și trimitere către ortopedie, neurologie sau fizioterapie.</p><p>Consultația este potrivită și pentru pacienții care vor să înțeleagă dacă o durere aparent banală poate fi gestionată acasă sau necesită evaluare fizică mai rapidă.</p>`,
  ),
  "specialist-paediatrician-romania": makeRoService(
    "Medic pediatru specialist — evaluare pediatrică complexă online",
    "Aveți nevoie de o opinie pediatrică de specialitate sau de o evaluare mai detaliată pentru o problemă de sănătate a copilului? Pediatrul nostru autorizat CMR oferă consultații video pentru cazuri care necesită analiză clinică aprofundată.",
    "Pediatru specialist online | România | evaluare complexă",
    `<p>Acest serviciu este potrivit pentru simptome persistente, probleme recurente, situații în care tratamentul inițial nu a ajutat sau pentru familiile care doresc o opinie pediatrică de specialitate înainte de următorii pași.</p><p>Pediatrul revizuiește istoricul medical, evoluția simptomelor, analizele deja efectuate și preocupările specifice ale familiei. Veți primi recomandări clare privind monitorizarea, investigațiile suplimentare, tratamentul și situațiile în care este necesar consultul fizic de urgență.</p><p>Consultația poate fi utilă pentru infecții recurente, tulburări digestive, probleme respiratorii, întârziere de recuperare după boală, întrebări privind dezvoltarea copilului sau necesitatea coordonării cu alți specialiști.</p>`,
  ),
  "mental-health-romania": makeRoService(
    "Evaluare de sănătate mintală — consultație online confidențială",
    "Vă confruntați cu anxietate, depresie, burnout, insomnie sau altă dificultate emoțională? Medicii noștri autorizați CMR oferă evaluare confidențială, recomandări și coordonarea pașilor următori prin consultație video.",
    "Consultație de sănătate mintală online | România | confidențial",
    `<p>Consultația este potrivită pentru simptome precum anxietate, stres intens, dispoziție depresivă, atacuri de panică, epuizare, tulburări de somn sau dificultăți de funcționare care afectează viața de zi cu zi.</p><p>Medicul discută istoricul simptomelor, factorii declanșatori, tratamentele anterioare, impactul asupra muncii și relațiilor și eventualele semne de risc care necesită intervenție rapidă. În funcție de caz, veți primi recomandări de management inițial, scrisori medicale, trimitere către psihiatru sau psiholog și, unde este adecvat clinic, plan pentru monitorizare continuă.</p><p>Serviciul oferă un spațiu clar și confidențial pentru a înțelege ce vi se întâmplă și care este nivelul de ajutor de care aveți nevoie în continuare.</p>`,
  ),
  "specialist-pain-assessment-romania": makeRoService(
    "Evaluare specializată a durerii — consultație online",
    "Durerea cronică sau durerea severă vă afectează viața de zi cu zi? Specialistul nostru autorizat CMR oferă evaluare clinică orientată pe controlul durerii, opțiuni terapeutice și coordonarea investigațiilor necesare.",
    "Evaluare specializată a durerii online | România",
    `<p>Acest serviciu este destinat pacienților cu durere persistentă, durere dificil de controlat sau simptome care necesită o abordare mai specializată decât o consultație generală. Pot fi evaluate dureri musculo-scheletale, neuropate, postoperatorii, oncologice sau sindroame dureroase complexe.</p><p>Medicul revizuiește istoricul durerii, tratamentele încercate, efectele adverse, impactul asupra somnului și funcționării și investigațiile existente. Veți primi recomandări privind următorii pași, opțiuni de tratament, monitorizare și trimitere către specialitățile relevante atunci când este necesar.</p><p>Consultația este utilă și pentru clarificarea unui plan de management al durerii deja început, mai ales când tratamentul actual nu oferă controlul așteptat.</p>`,
  ),
  "hair-loss-romania": makeRoService(
    "Consultație pentru căderea părului — online, în aceeași zi",
    "Observați subțierea părului sau cădere accentuată? Medicii noștri autorizați CMR evaluează cauzele posibile, recomandă investigațiile necesare și stabilesc un plan de management bazat pe date clinice.",
    "Consultație pentru căderea părului online | România",
    `<p>Căderea părului poate avea cauze hormonale, genetice, nutriționale, inflamatorii sau poate fi legată de stres, boală recentă ori medicație. O evaluare medicală timpurie este importantă pentru a identifica factorii reversibili și pentru a decide dacă este nevoie de tratament.</p><p>Consultația include discuție detaliată despre debutul și tiparul căderii părului, istoricul familial, simptome asociate, afecțiuni existente și tratamentele încercate. Dacă este nevoie, medicul recomandă analize pentru deficit de fier, tulburări tiroidiene, dezechilibre hormonale sau alte cauze medicale.</p><p>În funcție de caz, veți primi recomandări privind îngrijirea scalpului, tratamente posibile, modificări de stil de viață și momentul în care este necesară evaluarea dermatologică de specialitate.</p>`,
  ),
  "mens-health-romania": makeRoService(
    "Sănătatea bărbatului — evaluare confidențială online",
    "Aveți întrebări legate de disfuncție erectilă, testosteron, libido, fertilitate sau sănătate generală? Medicii noștri autorizați CMR oferă evaluare confidențială și recomandări medicale clare prin consultație video.",
    "Consultație sănătatea bărbatului online | România | confidențial",
    `<p>Serviciul este potrivit pentru probleme frecvente de sănătate masculină, inclusiv simptome urinare, disfuncție erectilă, scăderea libidoului, oboseală persistentă, preocupări hormonale, sănătate sexuală și întrebări legate de fertilitate.</p><p>Medicul revizuiește istoricul simptomelor, factorii de risc cardiovasculari și metabolici, medicația curentă, stilul de viață și eventualele rezultate medicale deja obținute. Veți primi recomandări privind investigațiile, opțiunile de tratament și momentul în care este necesară evaluarea urologică sau endocrinologică.</p><p>Consultația este confidențială și utilă mai ales pentru pacienții care amână prezentarea la medic din cauza disconfortului de a discuta aceste probleme într-un cadru fizic tradițional.</p>`,
  ),
  "referrals-and-investigations-romania": makeRoService(
    "Scrisori medicale, trimiteri și investigații — coordonare online",
    "Aveți nevoie de o scrisoare medicală, recomandare pentru analize sau orientare către un specialist? Medicii noștri autorizați CMR pot evalua situația și emite documentația clinică relevantă atunci când este indicată.",
    "Scrisori medicale și investigații online | România | medic CMR",
    `<p>Acest serviciu este util atunci când aveți simptome sau un istoric medical care necesită clarificare prin analize, imagistică sau consult de specialitate, dar nu știți exact care este ruta corectă.</p><p>Medicul revizuiește problema de sănătate, documentele existente și obiectivul consultației, apoi recomandă investigațiile potrivite sau redactează o scrisoare medicală clară pentru specialistul ori serviciul relevant. Dacă sunt necesare doar explicații privind un set de analize deja efectuate, veți primi interpretare și orientare practică.</p><p>Serviciul poate fi util și pentru pacienții care au nevoie de coordonare între mai mulți furnizori sau pentru cei care doresc să se prezinte la specialist cu documentație clinică bine structurată.</p>`,
  ),
  "womens-health-romania": makeRoService(
    "Sănătatea femeii — evaluare online confidențială",
    "Aveți întrebări legate de contracepție, sindrom premenstrual, menopauză, sănătate hormonală sau alte simptome ginecologice frecvente? Medicii noștri autorizați CMR oferă evaluare confidențială și recomandări medicale clare prin consultație video.",
    "Consultație sănătatea femeii online | România | confidențial",
    `<p>Consultația este potrivită pentru probleme precum cicluri neregulate sau dureroase, simptome de perimenopauză și menopauză, suspiciune de dezechilibru hormonal, întrebări despre contracepție, infecții urinare recurente ori alte preocupări frecvente legate de sănătatea femeii.</p><p>Medicul discută simptomele în contextul istoricului menstrual, reproductiv, metabolic și general, apoi recomandă investigațiile, conduita terapeutică sau trimiterea către ginecolog atunci când este necesar. Dacă aveți deja rezultate sau scrisori medicale, acestea pot fi revizuite în timpul consultației.</p><p>Serviciul este util și pentru femeile care doresc o evaluare medicală clară înainte de a decide dacă este nevoie de consult ginecologic în persoană, precum și pentru expate sau paciente cu acces dificil la îngrijire continuă.</p>`,
  ),
  "weight-management-romania": makeRoService(
    "Managementul greutății — evaluare medicală și plan personalizat",
    "Vă este dificil să slăbiți în ciuda schimbărilor de stil de viață? Medicii noștri autorizați CMR evaluează factorii medicali, metabolici și comportamentali care influențează greutatea și stabilesc un plan realist de management.",
    "Managementul greutății online | România | evaluare medicală",
    `<p>Controlul greutății nu ține doar de voință. Tulburările hormonale, sindromul metabolic, rezistența la insulină, somnul deficitar, medicația sau obiceiurile alimentare pot contribui semnificativ la creșterea în greutate și la dificultatea de a slăbi.</p><p>Consultația include evaluarea istoricului ponderal, dietelor anterioare, nivelului de activitate, somnului, simptomelor hormonale și rezultatelor medicale disponibile. Medicul poate recomanda analize, modificări de stil de viață, monitorizare sau orientare către specialități relevante atunci când există cauze medicale care trebuie investigate.</p><p>Scopul este să primiți un plan personalizat, realist și sigur, bazat pe contextul dumneavoastră clinic, nu doar recomandări generale care nu țin cont de cauza reală a problemei.</p>`,
  ),
};

const PT_DOCTOR_FIXES: Record<string, DoctorFix> = {
  "dr-rui-diogo-rodrigues": {
    title: "Médico de Medicina Geral e Familiar",
    bio: "Médico de medicina geral e familiar em Lisboa, com foco em telemedicina, acompanhamento de doenças crónicas e inovação em saúde digital. Licenciado pela Nova Medical School e disponível para consultas online na Global Health.",
  },
  "dr-lucas-alvarenga-berto": {
    title: "Médico de Clínica Geral",
    bio: "Médico luso-brasileiro com experiência em medicina de urgência, clínica geral, medicina desportiva e telemedicina. Certificado em ACLS e a exercer em Portugal através da Global Health.",
  },
  "dra-ana-varges-gomes": {
    title: "Oncologista",
    bio: "Oncologista médica sénior no Hospital Universitário do Algarve, com experiência em tumores da cabeça e pescoço, pulmão e cuidados oncológicos multidisciplinares. Líder na EORTC e investigadora clínica na Global Health.",
  },
  "dr-ruben-pereira": {
    title: "Médico de Clínica Geral",
    bio: "Médico com formação em psiquiatria e medicina de urgência em Portugal, com interesse em saúde mental, investigação oncológica, medicina desportiva e prática clínica baseada na evidência na Global Health.",
  },
  "dr-pedro-santos": {
    title: "Oncologista",
    bio: "Oncologista médico sénior com mais de 30 anos de experiência clínica e de liderança em Portugal. Especialista em tratamento do cancro, investigação clínica e cuidados oncológicos multidisciplinares na Global Health.",
  },
  "dr-martim-delgado": {
    title: "Médico de Medicina Geral e Familiar",
    bio: "Médico de medicina geral e familiar em Portugal, com experiência em cuidados de saúde primários, medicina de urgência, pediatria e telemedicina. Prática clínica baseada na evidência e centrada no doente.",
  },
  "dr-joana-branco-maia": {
    title: "Médica de Clínica Geral / Psicóloga Clínica",
    bio: "Médica e psicóloga clínica em Portugal, com abordagem integrada em medicina de urgência, doença crónica, saúde mental, ansiedade, depressão e gestão do peso. Disponível para consultas online na Global Health.",
  },
  "dr-telmo-coelho": {
    title: "Psiquiatra",
    bio: "Psiquiatra com experiência hospitalar, forense e comunitária em Portugal. Especialista em avaliação de saúde mental, psicoterapia e relatórios clínicos através de consulta online.",
  },
  "dr-joao-de-oliveira-e-silva": {
    title: "Médico de Medicina Geral e Familiar",
    bio: "Médico de medicina geral e familiar no Porto, com experiência em cuidados preventivos, acompanhamento de doenças crónicas e ferramentas de saúde digital. Cuidados de saúde primários completos na Global Health.",
  },
  "dra-nadia-cavaco": {
    title: "Médica de Clínica Geral",
    bio: "Médica de cuidados de saúde primários em Portugal, com experiência em teleconsulta, doença aguda, medicina interna, pediatria e saúde pública. Cuidado humanizado e centrado no doente na Global Health.",
  },
  "dr-vitor-hugo-de-matos-pais": {
    title: "Médico de Medicina Geral e Familiar",
    bio: "Especialista em medicina geral e familiar, com experiência em cuidados primários, serviços de urgência, telemedicina e cessação tabágica. Cuidados integrais e preventivos em Portugal.",
  },
  "sonia-oliveira-xavier": {
    title: "Nutricionista",
    bio: "Nutricionista clínica com experiência em Portugal, oferecendo acompanhamento especializado em oncologia, obesidade, doença renal e perturbações do comportamento alimentar em adultos.",
  },
};

const RO_DOCTOR_TRANSLATION_FIXES: DoctorTranslationFix[] = [
  {
    slug: "dr-mohammed-omar",
    locale: LocaleCode.RO,
    title: "Cardiolog consultant",
    bio: "Dr. Mohammed Omar Abdelaziz este un cardiolog consultant cu vastă experiență în cardiologie generală și intervențională, practicând în prezent în Irlanda. Deține FRCP (Glasgow), MRCP (UK) și un master în cardiologie. S-a format și a lucrat la St James's Hospital, St Vincent's University Hospital, Tallaght University Hospital, iar în prezent activează la Hermitage Clinic / Blackrock Health. Expertiza sa clinică include evaluarea durerii toracice și a bolii coronariene, gestionarea hipertensiunii și a riscului cardiovascular, insuficiența cardiacă și cardiomiopatiile, imagistica cardiacă (ecocardiografie și CT cardiac), aritmiile, managementul dispozitivelor și cardiologia intervențională, inclusiv PCI și intervenții coronariene complexe. Este membru al Irish Society of Cardiology, ESC, ACC și EAPCI și este activ în cercetarea clinică și în publicații cardiologice peer-reviewed.",
  },
  {
    slug: "dr-raafat-ibrahim",
    locale: LocaleCode.RO,
    title: "Pediatru consultant",
    bio: "Dr. Raafat Ibrahim este un pediatru consultant cu peste 30 de ani de experiență clinică în Irlanda, Regatul Unit și Orientul Mijlociu. Are o expertiză solidă în pediatrie generală, endocrinologie pediatrică și îngrijirea diabetului. Deține titlul de Fellow of the Royal College of Paediatrics and Child Health (FRCPCH), diplome postuniversitare în diabet pediatric (York) și endocrinologie (South Wales) și finalizează în prezent un certificat postuniversitar în alergologie și imunologie clinică la Cork. A ocupat funcția de pediatru consultant permanent și responsabil clinic pentru diabet și endocrinologie la Portiuncula Hospital, Galway. A avut roluri de consultant la University Hospital Limerick, Bon Secours Hospital Tralee și în practică privată. Este conferențiar senior onorific la University Hospital Galway și adjunct clinical senior lecturer la University of Limerick. Activează ca tutore în programul de diplomă pediatrică afiliat RCPI și ca examinator clinic pentru studenții la medicină din ultimul an. Activitatea sa de cercetare acoperă diabetul pediatric, sindromul Down și îngrijirea neonatală.",
  },
  {
    slug: "dr-saadia-irfan",
    locale: LocaleCode.RO,
    title: "Consultantă în pediatrie",
    bio: "Dr. Saadia Irfan este o medică cu rezultate remarcabile în pediatrie, cu peste 17 ani de experiență clinică diversă în Irlanda, Arabia Saudită și Pakistan. A fost anterior registrar în neurodizabilități la Children's Health Ireland (Tallaght Hospital). A ocupat poziții de senior registrar la Rotunda Hospital, Our Lady's Children's Hospital Crumlin și Temple Street University Hospital. Expertiza sa acoperă neonatologia, terapia intensivă pediatrică (PICU), medicina de urgență și pediatria generală. Are competențe în resuscitarea neonatală, suportul avansat de viață pediatric și îngrijirea perioperatorie a sugarilor cu anomalii cardiace și chirurgicale complexe. A activat ca adjunct clinical lecturer la University College Cork. Ariile sale principale de expertiză includ managementul NICU, urgențele pediatrice precum detresa respiratorie, status epilepticus și anafilaxia, precum și neurodezvoltarea și pediatria generală și preventivă.",
  },
];

const PT_FAQ_BASE_FIXES: FaqBaseFix[] = [
  {
    serviceFaqId: "cmr85us52003tckjuxia4lxa7",
    question: "O meu ECG ou ecocardiograma já realizado pode ser revisto durante a consulta?",
    answer:
      "Sim. Leve consigo quaisquer resultados de exames, relatórios ou cartas clínicas relevantes para a consulta. O cardiologista analisá-los-á na íntegra e dará uma interpretação especializada — muitas vezes a parte mais valiosa da consulta para doentes que já realizaram exames, mas nunca os discutiram com um cardiologista.",
  },
  {
    serviceFaqId: "cmr85udne0005ckjur2wihsgp",
    question: "Em que línguas podem decorrer as consultas?",
    answer:
      "As consultas podem decorrer em português, inglês, espanhol, checo e romeno, consoante a disponibilidade do médico.",
  },
  {
    serviceFaqId: "cmr85urah003pckju0dk2p9hf",
    question: "Em que línguas podem decorrer as consultas?",
    answer:
      "As consultas podem decorrer em português, inglês, espanhol, checo e romeno, consoante a disponibilidade do médico.",
  },
  {
    serviceFaqId: "cmr85ug7n000nckjuxjx5uxj4",
    question: "De quantas consultas poderei precisar?",
    answer:
      "Isso depende dos seus hábitos de consumo e da estratégia terapêutica definida. Muitos doentes beneficiam de uma consulta inicial seguida de duas ou três consultas de seguimento ao longo das semanas seguintes, para acompanhar a evolução e ajustar o plano. O médico recomendará o calendário de seguimento mais adequado ao seu caso.",
  },
  {
    serviceFaqId: "cmr85uszm0047ckju1qe02jt7",
    question: "Em que línguas podem decorrer as consultas?",
    answer:
      "As consultas podem decorrer em português, inglês, espanhol, checo e romeno, consoante a disponibilidade do pediatra.",
  },
  {
    serviceFaqId: "cmr85ukh1001tckju259rs4ee",
    question: "Como posso marcar o exame psicotécnico, caso seja necessário?",
    answer:
      "Após a consulta, se o médico concluir que o exame psicotécnico é necessário, contacte o nosso apoio ao cliente. Encaminhá-lo-emos diretamente para um dos nossos centros parceiros de avaliação psicotécnica.",
  },
];

const PT_FAQ_TRANSLATION_FIXES: FaqTranslationFix[] = [
  {
    translationId: "cmr8vfbpp000h7kju83vgue6d",
    question: "O meu ECG ou ecocardiograma já realizado pode ser revisto durante a consulta?",
    answer:
      "Sim. Leve consigo quaisquer resultados de exames, relatórios ou cartas clínicas relevantes para a consulta. O cardiologista analisá-los-á na íntegra e dará uma interpretação especializada — muitas vezes a parte mais valiosa da consulta para doentes que já realizaram exames, mas nunca os discutiram com um cardiologista.",
  },
  {
    translationId: "cmr8vg07d002o7kjuborjlgng",
    question: "Em que línguas podem decorrer as consultas?",
    answer:
      "As consultas podem decorrer em inglês, português, espanhol, checo e romeno, consoante a disponibilidade do consultor.",
  },
  {
    translationId: "cmr8lztza002a60jubd4g50ga",
    question: "O que devo levar para a consulta?",
    answer:
      "Leve consigo quaisquer análises ao sangue relevantes, cartas de especialistas ou documentação clínica. Se tiver um resumo do seu médico ou especialista anterior, será particularmente útil — o médico irá lê-lo na íntegra.",
  },
];

const CORPORATE_SERVICE_LOCALIZATION: Record<
  string,
  Record<string, { name: string; summary: string }>
> = {
  es: {
    "corporate-pre-assessment": {
      name: "Consulta de preevaluación",
      summary:
        "Consulta inicial de incorporación corporativa con el médico asignado por Global Health para su empresa.",
    },
    "corporate-illness-benefit": {
      name: "Consulta para prestación por enfermedad",
      summary:
        "Consulta solicitada por la empresa para valorar la elegibilidad de un empleado para la prestación por enfermedad.",
    },
    "corporate-fit-for-work": {
      name: "Consulta de aptitud para el trabajo",
      summary:
        "Consulta solicitada por la empresa para valorar si un empleado está en condiciones de reincorporarse al trabajo.",
    },
  },
  pt: {
    "corporate-pre-assessment": {
      name: "Consulta de pré-avaliação",
      summary:
        "Consulta inicial de integração corporativa com o médico da Global Health atribuído à sua empresa.",
    },
    "corporate-illness-benefit": {
      name: "Avaliação para subsídio de doença",
      summary:
        "Consulta clínica solicitada pela empresa para avaliar a condição do colaborador e a elegibilidade para subsídio de doença.",
    },
    "corporate-fit-for-work": {
      name: "Avaliação de aptidão para o trabalho",
      summary:
        "Consulta clínica solicitada pela empresa para confirmar se o colaborador está em condições de regressar ao trabalho com segurança.",
    },
  },
  br: {
    "corporate-pre-assessment": {
      name: "Consulta de pré-avaliação",
      summary:
        "Consulta inicial de integração corporativa com o médico da Global Health designado para a sua empresa.",
    },
    "corporate-illness-benefit": {
      name: "Avaliação para benefício por doença",
      summary:
        "Consulta clínica solicitada pela empresa para avaliar a condição do colaborador e a elegibilidade para benefício por doença.",
    },
    "corporate-fit-for-work": {
      name: "Avaliação de aptidão para o trabalho",
      summary:
        "Consulta clínica solicitada pela empresa para confirmar se o colaborador está em condições de regressar ao trabalho com segurança.",
    },
  },
  ro: {
    "corporate-pre-assessment": {
      name: "Consultație de preevaluare",
      summary:
        "Consultația inițială de integrare corporativă cu medicul Global Health desemnat companiei dumneavoastră.",
    },
    "corporate-illness-benefit": {
      name: "Consultație pentru evaluarea indemnizației de boală",
      summary:
        "Consultație solicitată de companie pentru evaluarea eligibilității unui angajat pentru indemnizație de boală.",
    },
    "corporate-fit-for-work": {
      name: "Consultație pentru aptitudinea de muncă",
      summary:
        "Consultație solicitată de companie pentru a evalua dacă un angajat este apt să revină la muncă.",
    },
  },
  cz: {
    "corporate-pre-assessment": {
      name: "Vstupní lékařská konzultace",
      summary:
        "Úvodní firemní konzultace s lékařem Global Health přiděleným vaší společnosti.",
    },
    "corporate-illness-benefit": {
      name: "Konzultace k nemocenské dávce",
      summary:
        "Konzultace vyžádaná zaměstnavatelem za účelem posouzení nároku zaměstnance na nemocenskou dávku.",
    },
    "corporate-fit-for-work": {
      name: "Konzultace pracovní způsobilosti",
      summary:
        "Konzultace vyžádaná zaměstnavatelem k posouzení, zda je zaměstnanec způsobilý k návratu do práce.",
    },
  },
};

const CZ_DOCTOR_EN_FIX = {
  slug: "mudr-vojtech-cerny",
  title: "General Practice",
  bio: sanitizeRichHtml(
    `<p>MUDr. Vojtěch Černý is a Czech general practitioner with clinical experience across emergency medicine, internal medicine, surgery and primary care in major Czech hospitals and ambulance services.</p><p>He graduated in General Medicine from the Second Faculty of Medicine of Charles University in Prague and continues doctoral studies in preventive medicine and epidemiology. His work combines frontline acute-care experience with modern online primary care for patients across Czechia.</p><p>At Global Health Czech Republic, he provides first-contact GP consultations by secure video call, with a practical and evidence-based approach focused on clear explanations, safe decision-making and realistic next steps for each patient.</p>`,
  ),
  seoTitle: "MUDr. Vojtěch Černý | Online GP — Global Health",
  seoDescription:
    "MUDr. Vojtěch Černý is a Czech GP with experience from Motol, Bulovka and emergency services. Book an online consultation with Global Health.",
};

async function preserveServiceEnglishTranslation(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  service: {
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    heroTitle: string | null;
    heroDescription: string | null;
    detailBody: string | null;
    ctaLabel: string | null;
    translations: Array<{ locale: LocaleCode }>;
  },
) {
  const hasEn = service.translations.some((translation) => translation.locale === LocaleCode.EN);
  if (hasEn) return false;

  await tx.serviceTranslation.create({
    data: {
      serviceId: service.id,
      locale: LocaleCode.EN,
      name: service.name,
      summary: service.summary,
      seoTitle: service.seoTitle,
      seoDescription: service.seoDescription,
      heroTitle: service.heroTitle,
      heroDescription: service.heroDescription,
      detailBody: service.detailBody,
      ctaLabel: service.ctaLabel,
    },
  });
  return true;
}

async function fixRomaniaServices() {
  const services = await prisma.service.findMany({
    where: { country: { code: "ro" }, slug: { in: Object.keys(RO_SERVICE_FIXES) } },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      heroDescription: true,
      detailBody: true,
      ctaLabel: true,
      translations: { select: { locale: true } },
    },
  });

  let updated = 0;
  let preservedEnglish = 0;

  for (const service of services) {
    const fix = RO_SERVICE_FIXES[service.slug];
    console.log(`${APPLY ? "FIX" : "PLAN"} ro/service ${service.slug}`);
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      if (await preserveServiceEnglishTranslation(tx, service)) preservedEnglish += 1;
      await tx.service.update({
        where: { id: service.id },
        data: fix,
      });
    });
    updated += 1;
  }

  return { updated, preservedEnglish };
}

async function fixPortugalDoctors() {
  const doctors = await prisma.doctor.findMany({
    where: { country: { code: "pt" }, slug: { in: Object.keys(PT_DOCTOR_FIXES) } },
    select: { id: true, slug: true },
  });

  let updated = 0;
  for (const doctor of doctors) {
    const fix = PT_DOCTOR_FIXES[doctor.slug];
    console.log(`${APPLY ? "FIX" : "PLAN"} pt/doctor ${doctor.slug}`);
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      await tx.doctor.update({
        where: { id: doctor.id },
        data: {
          title: fix.title,
          bio: fix.bio,
        },
      });
      await tx.doctorTranslation.upsert({
        where: { doctorId_locale: { doctorId: doctor.id, locale: LocaleCode.PT } },
        create: {
          doctorId: doctor.id,
          locale: LocaleCode.PT,
          title: fix.title,
          bio: fix.bio,
        },
        update: {
          title: fix.title,
          bio: fix.bio,
        },
      });
    });
    updated += 1;
  }

  return { updated };
}

async function fixRomanianDoctorTranslations() {
  const doctors = await prisma.doctor.findMany({
    where: { slug: { in: RO_DOCTOR_TRANSLATION_FIXES.map((fix) => fix.slug) }, country: { code: "ie" } },
    select: { id: true, slug: true },
  });

  const doctorIdBySlug = new Map(doctors.map((doctor) => [doctor.slug, doctor.id]));
  let updated = 0;

  for (const fix of RO_DOCTOR_TRANSLATION_FIXES) {
    const doctorId = doctorIdBySlug.get(fix.slug);
    if (!doctorId) continue;
    console.log(`${APPLY ? "FIX" : "PLAN"} ie/doctor-translation ${fix.slug} -> ${fix.locale}`);
    if (!APPLY) continue;

    await prisma.doctorTranslation.upsert({
      where: { doctorId_locale: { doctorId, locale: fix.locale } },
      create: {
        doctorId,
        locale: fix.locale,
        title: fix.title,
        bio: fix.bio,
      },
      update: {
        title: fix.title,
        bio: fix.bio,
      },
    });
    updated += 1;
  }

  return { updated };
}

async function fixPortugueseFaqs() {
  let baseUpdated = 0;
  let translationUpdated = 0;

  for (const fix of PT_FAQ_BASE_FIXES) {
    console.log(`${APPLY ? "FIX" : "PLAN"} pt/service-faq ${fix.serviceFaqId}`);
    if (!APPLY) continue;
    await prisma.serviceFaq.update({
      where: { id: fix.serviceFaqId },
      data: {
        question: fix.question,
        answer: fix.answer,
      },
    });
    baseUpdated += 1;
  }

  for (const fix of PT_FAQ_TRANSLATION_FIXES) {
    console.log(`${APPLY ? "FIX" : "PLAN"} pt/service-faq-translation ${fix.translationId}`);
    if (!APPLY) continue;
    await prisma.serviceFaqTranslation.update({
      where: { id: fix.translationId },
      data: {
        question: fix.question,
        answer: fix.answer,
      },
    });
    translationUpdated += 1;
  }

  return { baseUpdated, translationUpdated };
}

async function fixCzechDoctorEnglishTranslation() {
  const doctor = await prisma.doctor.findFirst({
    where: { country: { code: "cz" }, slug: CZ_DOCTOR_EN_FIX.slug },
    select: { id: true, slug: true },
  });
  if (!doctor) return { updated: 0 };

  console.log(`${APPLY ? "FIX" : "PLAN"} cz/doctor-translation ${doctor.slug} -> EN`);
  if (!APPLY) return { updated: 0 };

  await prisma.doctorTranslation.upsert({
    where: { doctorId_locale: { doctorId: doctor.id, locale: LocaleCode.EN } },
    create: {
      doctorId: doctor.id,
      locale: LocaleCode.EN,
      title: CZ_DOCTOR_EN_FIX.title,
      bio: CZ_DOCTOR_EN_FIX.bio,
      seoTitle: CZ_DOCTOR_EN_FIX.seoTitle,
      seoDescription: CZ_DOCTOR_EN_FIX.seoDescription,
    },
    update: {
      title: CZ_DOCTOR_EN_FIX.title,
      bio: CZ_DOCTOR_EN_FIX.bio,
      seoTitle: CZ_DOCTOR_EN_FIX.seoTitle,
      seoDescription: CZ_DOCTOR_EN_FIX.seoDescription,
    },
  });

  return { updated: 1 };
}

async function fixCorporateServices() {
  const services = await prisma.service.findMany({
    where: {
      slug: { in: ["corporate-pre-assessment", "corporate-illness-benefit", "corporate-fit-for-work"] },
      country: { code: { in: Object.keys(CORPORATE_SERVICE_LOCALIZATION) } },
    },
    select: {
      id: true,
      slug: true,
      country: { select: { code: true } },
      name: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      heroDescription: true,
      detailBody: true,
      ctaLabel: true,
      translations: { select: { locale: true } },
    },
  });

  let updated = 0;
  let preservedEnglish = 0;

  for (const service of services) {
    const localized = CORPORATE_SERVICE_LOCALIZATION[service.country.code]?.[service.slug];
    if (!localized) continue;
    console.log(`${APPLY ? "FIX" : "PLAN"} ${service.country.code}/service ${service.slug}`);
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      if (await preserveServiceEnglishTranslation(tx, service)) preservedEnglish += 1;
      await tx.service.update({
        where: { id: service.id },
        data: {
          name: localized.name,
          summary: localized.summary,
        },
      });
    });
    updated += 1;
  }

  return { updated, preservedEnglish };
}

async function main() {
  const ro = await fixRomaniaServices();
  const ptDoctors = await fixPortugalDoctors();
  const roDoctorTranslations = await fixRomanianDoctorTranslations();
  const ptFaqs = await fixPortugueseFaqs();
  const czDoctor = await fixCzechDoctorEnglishTranslation();
  const corporate = await fixCorporateServices();

  console.log("");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`RO services updated: ${ro.updated}`);
  console.log(`RO services EN preserved: ${ro.preservedEnglish}`);
  console.log(`PT doctors updated: ${ptDoctors.updated}`);
  console.log(`RO doctor translations updated: ${roDoctorTranslations.updated}`);
  console.log(`PT FAQ base rows updated: ${ptFaqs.baseUpdated}`);
  console.log(`PT FAQ translations updated: ${ptFaqs.translationUpdated}`);
  console.log(`CZ doctor EN translations updated: ${czDoctor.updated}`);
  console.log(`Corporate services updated: ${corporate.updated}`);
  console.log(`Corporate services EN preserved: ${corporate.preservedEnglish}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
