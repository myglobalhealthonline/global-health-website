/**
 * Patch the 3 Romania doctor profiles (Brindus, Bica, Palaga) — title, bio,
 * SEO, FAQ and credentials — per the July 2026 SEO Content Changes Brief +
 * companion "Dr Romania SEO" doc.
 *
 * Content source is Romanian only (the brief doc supplies no other-locale
 * copy for the new bios/FAQ). Brindus's specialty relabel (Anestezist ->
 * Medic de Familie, i.e. General Practitioner) is applied across all 6
 * locales — matching the site's existing GP terminology per locale, taken
 * from another live GP doctor's DoctorTranslation rows — because it is a
 * marketing/service reclassification, not translated prose, and showing
 * "Anesthetist" on his EN profile while the RO listing hero calls him a GP
 * would be inconsistent.
 *
 *   node --import tsx scripts/patch-romania-doctor-profiles.ts            # dry-run
 *   node --import tsx scripts/patch-romania-doctor-profiles.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is
 * a no-op. Dry-run (default) prints exactly what would change; nothing is
 * written until you pass --apply.
 */
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ro";
const RO: LocaleCode = "RO";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// GP title per locale — copied from an existing GP doctor's DoctorTranslation
// rows so Brindus's relabel matches the site's established terminology.
const GP_TITLE: Record<LocaleCode, string> = {
  EN: "General Practitioner",
  RO: "Medic de Familie",
  PT: "Médico de Clínica Geral",
  ES: "Médico de Cabecera",
  CS: "Praktický lékař",
  DE: "Allgemeinmediziner",
};

type FaqItem = { question: string; answer: string };
type CredentialItem = { label: string; bodyName: string; bodyUrl?: string };

type DoctorPatch = {
  slug: string;
  /** Only set when the specialty tag itself is changing (Brindus only). */
  retitleAllLocales?: boolean;
  seoTitle: string;
  seoDescription: string;
  bio: string;
  faqs: FaqItem[];
  credentials: CredentialItem[];
};

const EDAIC_BODY = "European Board of Anaesthesiology";
const ESPGHAN_BODY =
  "European Society for Paediatric Gastroenterology, Hepatology and Nutrition";

const DOCTORS: DoctorPatch[] = [
  {
    slug: "dr-robert-gabriel-brindus",
    retitleAllLocales: true,
    seoTitle: "Dr. Robert Brînduș — Medic de Familie | CMR 152462 | Global Health România",
    seoDescription:
      "Rezervați o consultație video cu Dr. Robert Brînduș — medic de familie înregistrat la CMR (nr. 152462). Formare specializată ATI · Spitalul Floreasca București · Tallaght University Hospital · EDAIC. Programare în aceeași zi.",
    bio: `<h3><strong>Dr. Robert Brînduș — Medic de Familie</strong></h3>
<p>Dr. Robert Brînduș este medic cu formare specializată în Anestezie și Terapie Intensivă, care activează ca medic de familie pe platforma Global Health România. Experiența sa în unele dintre cele mai solicitante medii clinice din România și Irlanda îi conferă o profunzime diagnostică rar întâlnită în medicina primară online.</p>
<p>A absolvit Facultatea de Medicină a Universității de Medicină și Farmacie din Craiova și a efectuat rezidențiatul în ATI la Spitalul Clinic de Urgență Floreasca din București — unul dintre cele mai active spitale de urgență din România. Și-a continuat formarea în Irlanda ca medic registrator ATI la Spitalul Universitar Tallaght și la Spitalul Universitar Mater Misericordiae din Dublin. În prezent practică la un spital de nivel IV din București — cel mai înalt nivel de complexitate din sistemul românesc.</p>
<p>Pregătirea în terapie intensivă nu înseamnă că Dr. Brînduș tratează doar urgențe. Înseamnă că știe exact când ceva este urgent și când nu — una dintre cele mai valoroase abilități într-o consultație online, unde evaluarea precisă a situației clinice este esențială. Deține Diploma Europeană în Anestezie și Terapie Intensivă (EDAIC), Partea I.</p>
<p><strong>Ce tratează:</strong></p>
<ul>
<li>Afecțiuni acute — infecții respiratorii, febră, gripă, dureri în gât, infecții ale urechii</li>
<li>Infecții urinare și simptome urinare</li>
<li>Managementul bolilor cronice — hipertensiune, diabet, astm, reflux, colesterol ridicat, hipotiroidism</li>
<li>Probleme dermatologice — erupții cutanate, eczemă, acnee, reacții alergice cutanate</li>
<li>Sănătatea bărbaților și femeilor — anticoncepție, probleme hormonale, sănătate sexuală</li>
<li>Sănătate mintală — anxietate, depresie, management al stresului și trimitere la specialist</li>
<li>Îngrijire preventivă — evaluări de sănătate, consiliere privind stilul de viață, recomandări de screening</li>
<li>Managementul durerii — evaluarea și managementul durerii cronice și postoperatorii</li>
<li>Sfaturi perioperatorii — pregătire pre-operatorie, întrebări despre anestezie, recuperare post-operatorie</li>
<li>Reînnoirea prescripțiilor și revizuirea medicației</li>
<li>Adeverințe medicale și scrisori medicale</li>
<li>Trimiteri pentru investigații, analize de laborator sau consultații de specialitate</li>
</ul>
<p><strong>Abordarea sa:</strong> Fiecare consultație cu Dr. Brînduș este personalizată, bazată pe dovezi și condusă la același standard clinic pe care l-ați aștepta de la o consultație față în față. Este cunoscut pentru valorile etice solide, gândirea analitică și comunicarea clară — calități pe care anii petrecuți în terapie intensivă le formează mai bine decât oricare alt mediu clinic.</p>
<p><strong>Calificări:</strong></p>
<ul>
<li>EDAIC Partea I — European Board of Anaesthesiology</li>
<li>Medic specialist — Anestezie și Terapie Intensivă</li>
<li>Rezidențiat ATI — Spitalul Clinic de Urgență Floreasca, București</li>
<li>Medic registrator ATI — Spitalul Universitar Tallaght, Irlanda</li>
<li>Medic registrator ATI — Spitalul Universitar Mater Misericordiae, Dublin</li>
<li>Absolvent — Facultatea de Medicină, UMF Craiova</li>
<li>Înregistrat la Colegiul Medicilor din România (CMR nr. 152462)</li>
</ul>`,
    faqs: [
      {
        question: "Este Dr. Brînduș înregistrat la Colegiul Medicilor din România?",
        answer:
          "Da. Dr. Robert Gabriel Brînduș este înregistrat la Colegiul Medicilor din România (CMR) cu numărul 152462. Puteți verifica această înregistrare pe site-ul cmr.ro. Dr. Brînduș activează ca medic de familie pe platforma Global Health România, aducând o formare specializată în Anestezie și Terapie Intensivă — cu experiență la Spitalul Clinic de Urgență Floreasca din București, Spitalul Universitar Tallaght și Mater Misericordiae Dublin.",
      },
      {
        question: "Ce tratează Dr. Brînduș?",
        answer:
          "Dr. Brînduș oferă consultații de medicină de familie acoperind afecțiuni acute (infecții respiratorii, febră, gripă, dureri în gât, infecții urinare), managementul bolilor cronice (hipertensiune, diabet, astm, reflux, colesterol, hipotiroidism), probleme dermatologice, sănătatea bărbaților și femeilor, sănătate mintală (anxietate, depresie, stres), îngrijire preventivă, managementul durerii, sfaturi perioperatorii, reînnoirea prescripțiilor, adeverințe medicale și trimiteri.",
      },
      {
        question: "Ce aduce pregătirea ATI unui medic de familie online?",
        answer:
          "Formarea în Anestezie și Terapie Intensivă înseamnă că Dr. Brînduș a gestionat unele dintre cele mai complexe și urgente situații medicale — în săli de operații, unități de terapie intensivă și urgențe. Aceasta îi oferă capacitatea de a evalua rapid gravitatea unui simptom, de a identifica semnalele de alarmă și de a ști cu precizie când o situație poate fi gestionată online și când necesită îngrijire de urgență imediată. Pentru un medic care consultă online, această claritate clinică este extrem de valoroasă.",
      },
      {
        question:
          "Dr. Brînduș poate oferi sfaturi legate de o intervenție chirurgicală planificată sau de recuperarea post-operatorie?",
        answer:
          "Da. Formarea sa în ATI și medicină perioperatorie îi permite să răspundă întrebărilor legate de pregătirea pre-operatorie, să explice aspectele legate de anestezie, să evalueze riscuri și să ofere îndrumare privind recuperarea post-operatorie. Dacă aveți o intervenție programată și doriți o consultație preliminară sau o a doua opinie, Dr. Brînduș poate oferi o evaluare informată.",
      },
      {
        question: "Cum rezerv o consultație cu Dr. Brînduș?",
        answer:
          "Selectați un slot disponibil pe această pagină pentru a rezerva direct cu Dr. Brînduș. Plata se procesează securizat la rezervare — consultația este confirmată după efectuarea plății. Veți primi imediat o invitație în calendar. Consultațiile se desfășoară prin apel video securizat în română, engleză sau spaniolă. Programările în aceeași zi sunt de obicei disponibile.",
      },
      {
        question: "Care sunt calificările Dr. Brînduș?",
        answer:
          "Dr. Robert Brînduș este absolvent al Facultății de Medicină a UMF Craiova. A efectuat rezidențiatul în ATI la Spitalul Clinic de Urgență Floreasca din București și și-a continuat formarea ca medic registrator ATI la Spitalul Universitar Tallaght și Spitalul Universitar Mater Misericordiae din Dublin, Irlanda. Deține Diploma Europeană în Anestezie și Terapie Intensivă (EDAIC), Partea I. Este înregistrat la Colegiul Medicilor din România (CMR nr. 152462).",
      },
    ],
    credentials: [
      { label: "EDAIC Partea I", bodyName: EDAIC_BODY },
      { label: "Medic specialist — Anestezie și Terapie Intensivă", bodyName: "Colegiul Medicilor din România" },
    ],
  },
  {
    slug: "dr-andreea-lorena-bica",
    seoTitle: "Dr. Andreea-Lorena Bica — Neurolog | CMR 147502 | Global Health România",
    seoDescription:
      "Rezervați o consultație video cu Dr. Andreea-Lorena Bica — neurolog specialist înregistrat la CMR (nr. 147502). UMF Craiova · Spitalul Elias București · AVC, epilepsie, boli neurodegenerative. Programare în aceeași zi.",
    bio: `<h3><strong>Dr. Andreea-Lorena Bica — Medic Specialist Neurolog</strong></h3>
<p>Dr. Andreea-Lorena Bica este medic specialist în Neurologie cu o formare clinică riguroasă la unele dintre cele mai importante centre medicale din România — o neurologă care aduce în fiecare consultație online același nivel de atenție și precizie pe care l-a dobândit în ani de lucru cu cazuri neurologice complexe.</p>
<p>A absolvit Facultatea de Medicină a Universității de Medicină și Farmacie din Craiova și a efectuat un rezidențiat complet în Neurologie la Spitalul Universitar de Urgență Elias din București — unul dintre spitalele universitare de referință din România. Formarea sa a acoperit un spectru larg: neurologie intensivă, investigații funcționale neurologice, neuroimagistică, neuroradiologie, psihiatrie, neurologie pediatrică și neurochirurgie. Această expunere multidisciplinară îi permite să evalueze prezentările neurologice cu o perspectivă cuprinzătoare — nu dintr-un singur unghi de specialitate.</p>
<p>Dr. Bica participă activ la dezvoltarea profesională continuă, contribuind ca și co-autor la prezentări de cercetare la Congresul Societății Române de Neurologie și la Congresul Academiei Europene de Neurologie (EAN) — organisme internaționale care stabilesc standardele de practică în neurologie.</p>
<p>Neurologia poate fi intimidantă pentru pacienți. Un simptom nou — o furnicătură persistentă, un episod de slăbiciune, dureri de cap frecvente, probleme de memorie — poate genera neliniște fără ca pacientul să știe dacă este ceva urgent sau nu. Dr. Bica crede că o consultație neurologică bună începe cu ascultarea atentă, explică clar ce se știe și ce nu, și oferă pacientului un plan concret — nu doar o trimitere.</p>
<p><strong>Ce oferă online:</strong></p>
<ul>
<li>Consultații neurologice generale — evaluarea și managementul simptomelor neurologice noi sau existente</li>
<li>AVC și boli cerebrovasculare — evaluare secundară, prevenție, interpretarea investigațiilor</li>
<li>Epilepsie — evaluare, ajustarea tratamentului, consiliere privind managementul crizelor</li>
<li>Boli neurodegenerative — Parkinson, demență, scleroză multiplă — înțelegerea diagnosticului și a evoluției</li>
<li>Dureri de cap și migrenă — evaluare, diagnostic diferențial, plan de tratament</li>
<li>Neuropatii periferice — amorțeală, furnicături, slăbiciune — evaluare și ghidaj</li>
<li>Tulburări de mișcare — tremur, probleme de mers, coordonare</li>
<li>Interfața neurologie-psihiatrie — simptome la granița dintre afecțiunile neurologice și psihiatrice</li>
<li>A doua opinie — privind diagnostice neurologice, rezultate RMN/CT, planuri de tratament</li>
<li>Interpretarea investigațiilor — explicarea rezultatelor RMN cerebral, EEG și alte investigații neurologice</li>
</ul>
<p><strong>Abordarea sa:</strong> Dr. Bica este recunoscută pentru abordarea sa minuțioasă, profesionalism și dedicare față de îmbunătățirea stării pacienților. Ea consideră că o bună comunicare cu pacientul și familia acestuia este parte integrantă din îngrijirea neurologică — nu un adaos. Fiecare pacient primește o evaluare individualizată și un plan de tratament adaptat situației sale specifice.</p>
<p><strong>Calificări:</strong></p>
<ul>
<li>Medic specialist — Neurologie</li>
<li>Rezidențiat în Neurologie — Spitalul Universitar de Urgență Elias, București</li>
<li>Absolventă — Facultatea de Medicină, UMF Craiova</li>
<li>Co-autor — Congresul Societății Române de Neurologie</li>
<li>Co-autor — Congresul Academiei Europene de Neurologie (EAN)</li>
<li>Înregistrată la Colegiul Medicilor din România (CMR nr. 147502)</li>
</ul>`,
    faqs: [
      {
        question: "Este Dr. Bica înregistrată la Colegiul Medicilor din România?",
        answer:
          "Da. Dr. Andreea-Lorena Bica este înregistrată la Colegiul Medicilor din România (CMR) cu numărul 147502. Puteți verifica această înregistrare pe site-ul cmr.ro. Dr. Bica este medic specialist în Neurologie, cu formare la Spitalul Universitar de Urgență Elias din București și a contribuit ca și co-autor la prezentări la Congresul Academiei Europene de Neurologie (EAN).",
      },
      {
        question: "Ce afecțiuni neurologice evaluează Dr. Bica online?",
        answer:
          "Dr. Bica oferă consultații neurologice online pentru: AVC și boli cerebrovasculare (evaluare secundară, prevenție, interpretarea investigațiilor), epilepsie (evaluare și ajustarea tratamentului), boli neurodegenerative (Parkinson, demență, scleroză multiplă), dureri de cap și migrenă, neuropatii periferice (amorțeală, furnicături, slăbiciune), tulburări de mișcare, interfața neurologie-psihiatrie, a doua opinie privind diagnostice sau rezultate RMN/CT și interpretarea investigațiilor neurologice.",
      },
      {
        question: "Am nevoie de trimitere de la medicul de familie pentru a consulta un neurolog online?",
        answer:
          "Nu. Prin Global Health România puteți rezerva direct o consultație cu Dr. Bica fără trimitere de la medicul de familie. Dacă aveți scrisori medicale anterioare, rezultate RMN, EEG sau alte investigații, vă rugăm să le transmiteți înainte de consultație — acestea nu sunt obligatorii pentru rezervare, dar ajută la o evaluare mai precisă.",
      },
      {
        question: "Poate Dr. Bica explica rezultatele unui RMN cerebral sau alte investigații neurologice?",
        answer:
          "Da. Dr. Bica are formare specializată în neuroimagistică și neuroradiologie și poate interpreta și explica rezultatele RMN cerebral și spinal, CT, EEG și alte investigații neurologice ca parte a consultației online. Dacă transmiteți raportul radiologic sau scrisoarea medicală înainte de programare, Dr. Bica va putea oferi o evaluare mai detaliată.",
      },
      {
        question: "Cum rezerv o consultație cu Dr. Bica?",
        answer:
          "Selectați un slot disponibil pe această pagină pentru a rezerva direct cu Dr. Bica. Plata se procesează securizat la rezervare — consultația este confirmată după efectuarea plății. Veți primi imediat o invitație în calendar. Consultațiile se desfășoară prin apel video securizat în română sau engleză. Vă rugăm să transmiteți orice scrisori medicale, rezultate RMN sau EEG înainte de consultație pentru o evaluare mai precisă. Dacă experimentați o urgență neurologică — cefalee bruscă și severă, slăbiciune acută sau tulburări de vorbire — sunați imediat la 112.",
      },
      {
        question: "Care sunt calificările Dr. Bica?",
        answer:
          "Dr. Andreea-Lorena Bica este absolventă a Facultății de Medicină a Universității de Medicină și Farmacie din Craiova și și-a efectuat rezidențiatul în Neurologie la Spitalul Universitar de Urgență Elias din București. A participat ca și co-autor la prezentări de cercetare la Congresul Societății Române de Neurologie și la Congresul Academiei Europene de Neurologie (EAN). Este înregistrată la Colegiul Medicilor din România (CMR nr. 147502).",
      },
    ],
    credentials: [
      { label: "Medic specialist — Neurologie", bodyName: "Colegiul Medicilor din România" },
    ],
  },
  {
    slug: "dr-alexandra-palaga",
    seoTitle: "Dr. Alexandra Palaga — Pediatru Specialist | CMR 159625 | Global Health România",
    seoDescription:
      "Rezervați o consultație video cu Dr. Alexandra Palaga — pediatru specialist înregistrat la CMR (nr. 159625). UMF Carol Davila · Urgențe pediatrice · Gastroenterologie și nutriție · Boală celiacă · ESPGHAN. Programare în aceeași zi.",
    bio: `<h3><strong>Dr. Alexandra Palaga — Medic Specialist Pediatru</strong></h3>
<p>Dr. Alexandra Palaga este medic specialist pediatru cu formare la Universitatea de Medicină și Farmacie „Carol Davila" din București — cea mai prestigioasă facultate de medicină din România — și cu experiență clinică și de cercetare la nivel național și internațional.</p>
<p>A efectuat rezidențiatul în Pediatrie la Spitalul Clinic de Urgență pentru Copii „Sf. Ioan" din Galați și la Spitalul Clinic de Urgență „Sf. Ioan" din București, unde a dobândit experiență solidă în urgențele pediatrice — de la crize acute la gestionarea afecțiunilor complexe care necesită spitalizare. La începutul carierei a acumulat experiență și în Obstetrică-Ginecologie la Spitalul Universitar de Urgență Elias, ceea ce îi oferă o perspectivă holistică asupra sănătății mamei și copilului de la naștere.</p>
<p>Colaborează clinic cu Medlife și a oferit consultanță de specialitate familiilor la nivel internațional prin platforma Medic Chat.</p>
<p>Ceea ce o face distinctă este profunzimea expertizei sale în gastroenterologie pediatrică și nutriție. A activat ca investigator de cercetare la Centrul de Management al Bolii Celiace din cadrul Institutului Național pentru Sănătatea Mamei și Copilului „Alessandrescu-Rusescu" — centrul de referință național pentru această condiție. Lucrările sale privind impactul strategiilor nutriționale și al dietelor fără gluten asupra calității vieții copiilor au fost publicate în Frontiers in Pediatrics, una dintre revistele de specialitate recunoscute internațional. Este membră trainee ESPGHAN — Societatea Europeană de Gastroenterologie Pediatrică, Hepatologie și Nutriție — și a prezentat cercetări la conferințe internaționale ESPGHAN și la Academia Europeană a Societăților de Pediatrie.</p>
<p>Pentru părinții cu copii care au probleme digestive, dificultăți de alimentație, creștere insuficientă sau suspiciune de boală celiacă, această combinație de practică clinică și cercetare activă în gastroenterologie pediatrică este rar întâlnită într-o singură consultație online.</p>
<p><strong>Ce oferă online:</strong></p>
<ul>
<li>Consultații pediatrice generale — evaluarea sănătății copilului de la naștere până la 18 ani</li>
<li>Urgențe pediatrice — evaluarea simptomelor acute și ghidaj privind următorii pași</li>
<li>Gastroenterologie pediatrică — probleme digestive, diaree cronică, dureri abdominale, constipație</li>
<li>Boală celiacă — evaluare, interpretarea investigațiilor, dietă și management pe termen lung</li>
<li>Nutriție pediatrică — alimentație selectivă, malnutriție, tulburări metabolice ereditare, diete specifice</li>
<li>Sănătatea nou-născutului și sugarului — icter, colici, dificultăți de alimentație, creștere</li>
<li>Boli infecțioase pediatrice — febră, infecții respiratorii, infecții frecvente recidivante</li>
<li>Evaluarea creșterii și dezvoltării — greutate, înălțime, dezvoltare neuromotorie</li>
<li>A doua opinie — privind diagnostice pediatrice, rezultate investigații, planuri de tratament</li>
<li>Întrebări ale părinților — orice nelămurire legată de sănătatea, alimentația sau dezvoltarea copilului</li>
</ul>
<p><strong>Abordarea sa:</strong> Dr. Palaga îmbină rigoarea clinică cu o abordare empatică — știind că, pentru un părinte, o consultație despre sănătatea copilului este rareori o simplă conversație medicală. Ea explică clar, ascultă cu atenție și oferă fiecărui copil și familiei sale un plan personalizat, bazat pe dovezi și adaptat vârstei și nevoilor specifice.</p>
<p><strong>Calificări:</strong></p>
<ul>
<li>Medic specialist pediatru — certificat de Ministerul Sănătății din România</li>
<li>Absolventă — Universitatea de Medicină și Farmacie „Carol Davila", București</li>
<li>Rezidențiat Pediatrie — Spitalul Clinic de Urgență pentru Copii „Sf. Ioan", Galați</li>
<li>Rezidențiat Pediatrie — Spitalul Clinic de Urgență „Sf. Ioan", București</li>
<li>Colaborator clinic — Medlife</li>
<li>Investigator cercetare — Centrul de Management al Bolii Celiace, INSMCA „Alessandrescu-Rusescu"</li>
<li>Membră trainee — ESPGHAN (Societatea Europeană de Gastroenterologie Pediatrică, Hepatologie și Nutriție)</li>
<li>Publicată în Frontiers in Pediatrics</li>
<li>Speaker internațional — ESPGHAN Congress, Academia Europeană a Societăților de Pediatrie</li>
<li>Certificări avansate — nutriție pediatrică, detectarea malnutriției, tulburări metabolice ereditare</li>
<li>Înregistrată la Colegiul Medicilor din România (CMR nr. 159625)</li>
</ul>`,
    faqs: [
      {
        question: "Este Dr. Palaga înregistrată la Colegiul Medicilor din România?",
        answer:
          "Da. Dr. Alexandra Palaga este înregistrată la Colegiul Medicilor din România (CMR) cu numărul 159625. Puteți verifica această înregistrare pe site-ul cmr.ro. Dr. Palaga este medic specialist pediatru certificat de Ministerul Sănătății din România, absolventă a UMF Carol Davila și membră trainee ESPGHAN.",
      },
      {
        question: "Ce afecțiuni pediatrice evaluează Dr. Palaga online?",
        answer:
          "Dr. Palaga oferă consultații pediatrice online pentru: sănătatea generală a copilului (de la naștere până la 18 ani), urgențe pediatrice și evaluarea simptomelor acute, gastroenterologie pediatrică (probleme digestive, diaree cronică, dureri abdominale), boală celiacă (evaluare, investigații, management dietetic), nutriție pediatrică (alimentație selectivă, malnutriție, tulburări metabolice), sănătatea nou-născutului și sugarului, boli infecțioase pediatrice, evaluarea creșterii și dezvoltării și a doua opinie privind diagnostice sau tratamente pediatrice.",
      },
      {
        question: "Are Dr. Palaga expertiză specială în boala celiacă și gastroenterologie pediatrică?",
        answer:
          "Da. Dr. Palaga a activat ca investigator de cercetare la Centrul de Management al Bolii Celiace din cadrul Institutului Național pentru Sănătatea Mamei și Copilului „Alessandrescu-Rusescu\" — centrul de referință național pentru această afecțiune. Lucrările sale privind strategiile nutriționale și dieta fără gluten la copii au fost publicate în Frontiers in Pediatrics. Este membră trainee ESPGHAN și a prezentat cercetări la conferințe internaționale ESPGHAN. Pentru familiile cu copii cu suspiciune de boală celiacă, intoleranță alimentară sau probleme digestive cronice, această expertiză este rar disponibilă într-o consultație online.",
      },
      {
        question: "Pot rezerva o consultație pediatrică fără trimitere de la medicul de familie?",
        answer:
          "Da. Prin Global Health România puteți rezerva direct o consultație cu Dr. Palaga fără trimitere de la medicul de familie sau pediatrul curent. Dacă aveți scrisori medicale anterioare, rezultate analize sau investigații ale copilului, vă rugăm să le transmiteți înainte de consultație — nu sunt obligatorii pentru rezervare, dar ajută la o evaluare mai precisă.",
      },
      {
        question: "Cum rezerv o consultație cu Dr. Palaga?",
        answer:
          "Selectați un slot disponibil pe această pagină pentru a rezerva direct cu Dr. Palaga. Plata se procesează securizat la rezervare — consultația este confirmată după efectuarea plății. Veți primi imediat o invitație în calendar. Consultațiile se desfășoară prin apel video securizat în română sau engleză. Rugăm părinții să aibă copilul prezent la consultație acolo unde este posibil.",
      },
      {
        question: "Care sunt calificările și experiența de cercetare ale Dr. Palaga?",
        answer:
          "Dr. Alexandra Palaga este absolventă a UMF Carol Davila din București și a efectuat rezidențiatul în Pediatrie la Spitalul Clinic de Urgență pentru Copii „Sf. Ioan\" din Galați și la Spitalul Clinic de Urgență „Sf. Ioan\" din București. A activat ca investigator de cercetare la INSMCA „Alessandrescu-Rusescu\" și a publicat în Frontiers in Pediatrics. Este membră trainee ESPGHAN și speaker la congrese internaționale ESPGHAN și Academia Europeană a Societăților de Pediatrie. Este înregistrată la CMR (nr. 159625).",
      },
    ],
    credentials: [
      { label: "Medic specialist pediatru", bodyName: "Ministerul Sănătății din România" },
      { label: "Membră trainee ESPGHAN", bodyName: ESPGHAN_BODY },
    ],
  },
];

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma.$transaction(
    async (tx) => {
      for (const patch of DOCTORS) {
        const doctor = await tx.doctor.findUnique({
          where: { countryId_slug: { countryId, slug: patch.slug } },
          include: {
            translations: true,
            faqs: { where: { locale: RO } },
            credentials: true,
            additionalCountries: { where: { countryId }, include: { translations: true } },
          },
        });
        if (!doctor) {
          note(`⚠ No doctor found for slug "${patch.slug}" — skipping.`);
          continue;
        }
        note(`\n=== ${doctor.fullName} (${patch.slug}) ===`);

        // 1) Specialty relabel (Brindus only) — base Doctor.title,
        // DoctorTranslation.title (all 6 locales) AND DoctorMarketTranslation.title
        // (the RO market row — what the public payload actually resolves).
        if (patch.retitleAllLocales) {
          if (doctor.title !== GP_TITLE.RO) {
            note(`Doctor.title: "${doctor.title}" -> "${GP_TITLE.RO}"`);
            if (APPLY) await tx.doctor.update({ where: { id: doctor.id }, data: { title: GP_TITLE.RO } });
          }
          for (const locale of Object.keys(GP_TITLE) as LocaleCode[]) {
            const wantTitle = GP_TITLE[locale];
            const tr = doctor.translations.find((t) => t.locale === locale);
            if (tr && tr.title !== wantTitle) {
              note(`DoctorTranslation[${locale}].title: "${tr.title}" -> "${wantTitle}"`);
              if (APPLY) await tx.doctorTranslation.update({ where: { id: tr.id }, data: { title: wantTitle } });
            } else if (!tr) {
              note(`DoctorTranslation[${locale}] missing — creating with title "${wantTitle}"`);
              if (APPLY) {
                await tx.doctorTranslation.create({
                  data: { doctorId: doctor.id, locale, title: wantTitle },
                });
              }
            }
          }
        }

        const dc = doctor.additionalCountries[0];
        if (!dc) {
          note(`⚠ No RO DoctorCountry row for "${patch.slug}" — skipping market translation/FAQ/credentials.`);
          continue;
        }

        // 2) DoctorMarketTranslation (RO) — title (Brindus only), seoTitle,
        // seoDescription, bio.
        const marketTr = dc.translations.find((t) => t.locale === RO);
        if (!marketTr) {
          note(`⚠ No RO DoctorMarketTranslation row for "${patch.slug}" — skipping.`);
        } else {
          const data: Record<string, string> = {};
          if (patch.retitleAllLocales && marketTr.title !== GP_TITLE.RO) {
            data.title = GP_TITLE.RO;
            note(`DoctorMarketTranslation(RO).title: "${marketTr.title}" -> "${GP_TITLE.RO}"`);
          }
          if (marketTr.seoTitle !== patch.seoTitle) {
            data.seoTitle = patch.seoTitle;
            note(`DoctorMarketTranslation(RO).seoTitle updated`);
          }
          if (marketTr.seoDescription !== patch.seoDescription) {
            data.seoDescription = patch.seoDescription;
            note(`DoctorMarketTranslation(RO).seoDescription updated`);
          }
          if (marketTr.bio !== patch.bio) {
            data.bio = patch.bio;
            note(`DoctorMarketTranslation(RO).bio updated (${patch.bio.length} chars)`);
          }
          if (Object.keys(data).length && APPLY) {
            await tx.doctorMarketTranslation.update({ where: { id: marketTr.id }, data });
          }
        }

        // 3) DoctorFaq (RO) — only create if this doctor has none yet, so
        // re-running never duplicates or clobbers admin edits.
        if (doctor.faqs.length === 0) {
          note(`DoctorFaq: creating ${patch.faqs.length} RO FAQ item(s)`);
          if (APPLY) {
            await tx.doctorFaq.createMany({
              data: patch.faqs.map((f, i) => ({
                doctorId: doctor.id,
                locale: RO,
                question: f.question,
                answer: f.answer,
                sortOrder: i,
              })),
            });
          }
        } else {
          note(`DoctorFaq: ${doctor.faqs.length} RO item(s) already exist — skipping (no clobber).`);
        }

        // 4) DoctorCredential — match on label, create if missing.
        for (const cred of patch.credentials) {
          const exists = doctor.credentials.some((c) => c.label === cred.label);
          if (!exists) {
            note(`DoctorCredential: creating "${cred.label}" (${cred.bodyName})`);
            if (APPLY) {
              await tx.doctorCredential.create({
                data: {
                  doctorId: doctor.id,
                  countryCode: COUNTRY_CODE,
                  label: cred.label,
                  bodyName: cred.bodyName,
                  bodyUrl: cred.bodyUrl,
                },
              });
            }
          }
        }
      }

      if (!APPLY) throw new ROLLBACK();
    },
    { timeout: 60_000 },
  ).catch((e) => {
    if (e instanceof ROLLBACK) return;
    throw e;
  });

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: changes written for ${DOCTORS.length} Romania doctor profile(s).`
      : `DRY-RUN: changes listed above would be written. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

class ROLLBACK extends Error {}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
