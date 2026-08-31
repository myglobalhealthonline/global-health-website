import type { LocaleCode } from "@prisma/client";

type CareerLocalization = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  minimumExperience: string;
  descriptionHtml: string;
};

export const CZECHIA_CAREER_LOCALIZATIONS = {
  CS: {
    title: "Praktický lékař — Přidejte se ke Global Health, Česko",
    department: "Medicína",
    location: "Česko (na dálku)",
    employmentType: "DPP nebo OSVČ · plný či částečný úvazek",
    minimumExperience: "Platná registrace u ČLK",
    descriptionHtml: `<h2>O nás</h2>
<p>Global Health je telemedicínská platforma, která se spouští v Česku — součást rostoucí sítě, jež již propojuje pacienty a lékaře v Irsku, Portugalsku, Španělsku, Rumunsku a Brazílii. Náš slib je jednoduchý: <strong>Medicine Anytime, Anywhere.</strong> Budujeme kliniku, která odstraňuje bariéry mezi lékaři a pacienty, kteří je potřebují — ať už se nacházejí kdekoli.</p>
<h2>Pozice</h2>
<p>Hledáme licencované praktické lékaře působící v Česku, kteří se připojí k naší online klinice při jejím místním spuštění. Budete poskytovat vzdálené konzultace pacientům prostřednictvím naší platformy, s flexibilitou nastavit si pracovní režim podle svých potřeb.</p>
<ul><li>100% na dálku — konzultujte odkudkoli</li><li>Flexibilní rozvrh — zvolte si hodiny a dny, které vám vyhovují</li><li>Výběr formy spolupráce: DPP (Dohoda o provedení práce) nebo OSVČ, podle toho, co vám vyhovuje</li><li>Zvažujeme jak plný, tak částečný úvazek</li></ul>
<h2>Čeho budete součástí</h2>
<ul><li>Skutečně mezinárodní tým lékařů — spolupracujte a propojujte se s kolegy napříč Evropou a Brazílií</li><li>Platforma s potenciálem růstu — připojujete se ke Global Health v zakládající fázi v Česku, nejde o pozici v už zaběhnutém systému</li><li>Reálný dopad — pomáhejte pacientům, kteří by jinak měli obtížný přístup k včasné péči, a to z pohodlí odkudkoli</li><li>Průběžná podpora — technické, administrativní a klinické zázemí, abyste se mohli soustředit na medicínu, ne na papírování</li></ul>
<h2>Koho hledáme</h2>
<ul><li>Platná lékařská licence v Česku (registrace u ČLK)</li><li>Kvalifikace nebo specializace v oboru všeobecné praktické lékařství</li><li>Znalost práce s telemedicínskými nástroji výhodou; zaškolení a podporu při onboardingu zajistíme</li><li>Plynulá čeština; angličtina výhodou vzhledem k našemu mezinárodnímu týmu. Portugalština, španělština nebo rumunština jsou bonusem vzhledem k naší přítomnosti na těchto trzích</li></ul>
<h2>Proč právě teď</h2>
<p>Aktivně rosteme na šesti trzích a Česko je prioritou. Lékaři, kteří se připojí v této fázi, pomáhají utvářet, jak klinika funguje lokálně — nejde jen o vyplnění rozvrhu.</p>
<p>Pokud hledáte způsob, jak provozovat medicínu s větší svobodou, propojením a smyslem, rádi vás poznáme.</p>`,
  },
  EN: {
    title: "General Practitioner — Join Global Health in Czechia",
    department: "Medical",
    location: "Czechia (Remote)",
    employmentType: "DPP or self-employed · Full-time or part-time",
    minimumExperience: "Valid ČLK registration",
    descriptionHtml: `<h2>About us</h2>
<p>Global Health is a telemedicine platform launching in Czechia, part of a growing network already connecting patients and doctors across Ireland, Portugal, Spain, Romania and Brazil. Our promise is simple: <strong>Medicine Anytime, Anywhere.</strong> We are building a clinic that removes barriers between doctors and the patients who need them, wherever they may be.</p>
<h2>The role</h2>
<p>We are looking for licensed general practitioners working in Czechia to join our online clinic as we launch locally. You will provide remote consultations to patients through our platform, with the flexibility to shape your working pattern around your needs.</p>
<ul><li>100% remote — consult from anywhere</li><li>Flexible schedule — choose the hours and days that suit you</li><li>Choose how you work: DPP (Agreement to Perform Work) or self-employed (OSVČ)</li><li>Both full-time and part-time arrangements are considered</li></ul>
<h2>What you will be part of</h2>
<ul><li>A genuinely international medical team — collaborate and connect with colleagues across Europe and Brazil</li><li>A platform with room to grow — you are joining Global Health at its founding stage in Czechia, not stepping into an established system</li><li>Meaningful impact — help patients who might otherwise struggle to access timely care, from wherever you work</li><li>Ongoing support — technical, administrative and clinical support so you can focus on medicine rather than paperwork</li></ul>
<h2>Who we are looking for</h2>
<ul><li>A valid medical licence in Czechia, registered with the Czech Medical Chamber (ČLK)</li><li>Qualification or specialisation in general practice</li><li>Experience with telemedicine tools is an advantage; training and onboarding support are provided</li><li>Fluent Czech; English is helpful for working with our international team. Portuguese, Spanish or Romanian are also welcome given our presence in those markets</li></ul>
<h2>Why now</h2>
<p>We are actively growing across six markets, and Czechia is a priority. Doctors who join at this stage will help shape how the clinic works locally — this is more than simply filling a schedule.</p>
<p>If you want to practise medicine with greater freedom, connection and purpose, we would be glad to meet you.</p>`,
  },
  PT: {
    title: "Médico de clínica geral — Junte-se à Global Health na Chéquia",
    department: "Medicina",
    location: "Chéquia (remoto)",
    employmentType: "DPP ou trabalhador independente · Tempo inteiro ou parcial",
    minimumExperience: "Inscrição válida na ČLK",
    descriptionHtml: `<h2>Sobre nós</h2>
<p>A Global Health é uma plataforma de telemedicina em lançamento na Chéquia, integrada numa rede em crescimento que já liga pacientes e médicos na Irlanda, em Portugal, Espanha, Roménia e no Brasil. A nossa promessa é simples: <strong>Medicine Anytime, Anywhere.</strong> Estamos a construir uma clínica que elimina barreiras entre os médicos e os pacientes que precisam deles, onde quer que estejam.</p>
<h2>A função</h2>
<p>Procuramos médicos de clínica geral licenciados e a exercer na Chéquia para integrarem a nossa clínica online durante o lançamento local. Prestará consultas à distância através da nossa plataforma, com flexibilidade para organizar o seu regime de trabalho de acordo com as suas necessidades.</p>
<ul><li>100% remoto — realize consultas a partir de qualquer lugar</li><li>Horário flexível — escolha as horas e os dias que melhor se adaptam a si</li><li>Escolha do modelo de colaboração: DPP (acordo para a realização de trabalho) ou atividade independente (OSVČ)</li><li>Consideramos regimes a tempo inteiro e a tempo parcial</li></ul>
<h2>Do que fará parte</h2>
<ul><li>Uma equipa médica verdadeiramente internacional — colabore e estabeleça ligações com colegas em toda a Europa e no Brasil</li><li>Uma plataforma com potencial de crescimento — junta-se à Global Health na fase de fundação na Chéquia, e não a um sistema já estabelecido</li><li>Impacto real — ajude pacientes que, de outra forma, teriam dificuldade em aceder atempadamente a cuidados de saúde</li><li>Apoio contínuo — suporte técnico, administrativo e clínico para que se concentre na medicina, não na burocracia</li></ul>
<h2>Quem procuramos</h2>
<ul><li>Licença médica válida na Chéquia, com inscrição na Câmara Médica Checa (ČLK)</li><li>Qualificação ou especialização em medicina geral e familiar</li><li>Experiência com ferramentas de telemedicina é valorizada; disponibilizamos formação e apoio durante o onboarding</li><li>Checo fluente; o inglês é valorizado devido à nossa equipa internacional. Português, espanhol ou romeno são também uma vantagem devido à nossa presença nesses mercados</li></ul>
<h2>Porquê agora</h2>
<p>Estamos a crescer ativamente em seis mercados e a Chéquia é uma prioridade. Os médicos que se juntarem nesta fase ajudarão a definir o funcionamento local da clínica — não se trata apenas de preencher um horário.</p>
<p>Se procura exercer medicina com mais liberdade, ligação e propósito, teremos todo o gosto em conhecê-lo.</p>`,
  },
  ES: {
    title: "Médico de familia — Únase a Global Health en Chequia",
    department: "Medicina",
    location: "Chequia (remoto)",
    employmentType: "DPP o profesional autónomo · Jornada completa o parcial",
    minimumExperience: "Registro vigente en la ČLK",
    descriptionHtml: `<h2>Sobre nosotros</h2>
<p>Global Health es una plataforma de telemedicina que se está lanzando en Chequia como parte de una red en crecimiento que ya conecta a pacientes y médicos en Irlanda, Portugal, España, Rumanía y Brasil. Nuestra promesa es sencilla: <strong>Medicine Anytime, Anywhere.</strong> Estamos construyendo una clínica que elimina las barreras entre los médicos y los pacientes que los necesitan, estén donde estén.</p>
<h2>El puesto</h2>
<p>Buscamos médicos de familia con licencia para ejercer en Chequia que quieran incorporarse a nuestra clínica online durante su lanzamiento local. Realizará consultas a distancia a través de nuestra plataforma, con flexibilidad para organizar su jornada según sus necesidades.</p>
<ul><li>100% remoto — atienda consultas desde cualquier lugar</li><li>Horario flexible — elija las horas y los días que mejor le convengan</li><li>Elija la modalidad de colaboración: DPP (acuerdo para la realización de trabajo) o profesional autónomo (OSVČ)</li><li>Consideramos tanto jornada completa como parcial</li></ul>
<h2>De qué formará parte</h2>
<ul><li>Un equipo médico verdaderamente internacional — colabore y conecte con colegas de toda Europa y Brasil</li><li>Una plataforma con potencial de crecimiento — se incorpora a Global Health durante su etapa fundacional en Chequia, no a un sistema ya consolidado</li><li>Impacto real — ayude a pacientes que, de otro modo, tendrían dificultades para acceder a atención oportuna</li><li>Apoyo continuo — respaldo técnico, administrativo y clínico para que pueda centrarse en la medicina y no en el papeleo</li></ul>
<h2>A quién buscamos</h2>
<ul><li>Licencia médica vigente en Chequia e inscripción en la Cámara Médica Checa (ČLK)</li><li>Titulación o especialización en medicina familiar y comunitaria</li><li>Se valorará la experiencia con herramientas de telemedicina; ofrecemos formación y apoyo durante la incorporación</li><li>Checo fluido; se valorará el inglés por nuestro equipo internacional. El portugués, español o rumano también son una ventaja por nuestra presencia en esos mercados</li></ul>
<h2>Por qué ahora</h2>
<p>Estamos creciendo activamente en seis mercados y Chequia es una prioridad. Los médicos que se incorporen en esta etapa ayudarán a definir cómo funciona la clínica a nivel local; no se trata solo de cubrir un horario.</p>
<p>Si busca ejercer la medicina con mayor libertad, conexión y propósito, estaremos encantados de conocerle.</p>`,
  },
  RO: {
    title: "Medic de familie — Alăturați-vă Global Health în Cehia",
    department: "Medical",
    location: "Cehia (la distanță)",
    employmentType: "DPP sau activitate independentă · Normă întreagă sau parțială",
    minimumExperience: "Înregistrare valabilă la ČLK",
    descriptionHtml: `<h2>Despre noi</h2>
<p>Global Health este o platformă de telemedicină care se lansează în Cehia, ca parte a unei rețele în creștere care conectează deja pacienți și medici din Irlanda, Portugalia, Spania, România și Brazilia. Promisiunea noastră este simplă: <strong>Medicine Anytime, Anywhere.</strong> Construim o clinică ce elimină barierele dintre medici și pacienții care au nevoie de ei, oriunde s-ar afla.</p>
<h2>Rolul</h2>
<p>Căutăm medici de familie autorizați să profeseze în Cehia, care să se alăture clinicii noastre online odată cu lansarea locală. Veți oferi consultații la distanță prin intermediul platformei, cu flexibilitatea de a vă organiza programul de lucru în funcție de propriile nevoi.</p>
<ul><li>100% la distanță — consultați de oriunde</li><li>Program flexibil — alegeți orele și zilele care vi se potrivesc</li><li>Alegeți forma de colaborare: DPP (acord pentru prestarea muncii) sau activitate independentă (OSVČ)</li><li>Luăm în considerare atât norma întreagă, cât și programul parțial</li></ul>
<h2>Din ce veți face parte</h2>
<ul><li>O echipă medicală cu adevărat internațională — colaborați și comunicați cu colegi din Europa și Brazilia</li><li>O platformă cu potențial de creștere — vă alăturați Global Health în etapa de început din Cehia, nu unui sistem deja consacrat</li><li>Impact real — ajutați pacienții care altfel ar avea dificultăți în a accesa îngrijiri la timp</li><li>Sprijin continuu — suport tehnic, administrativ și clinic, astfel încât să vă concentrați pe medicină, nu pe documente</li></ul>
<h2>Pe cine căutăm</h2>
<ul><li>Licență medicală valabilă în Cehia și înregistrare la Camera Medicală Cehă (ČLK)</li><li>Calificare sau specializare în medicină de familie</li><li>Experiența cu instrumente de telemedicină constituie un avantaj; oferim instruire și sprijin la integrare</li><li>Limba cehă la nivel fluent; engleza reprezintă un avantaj pentru colaborarea cu echipa noastră internațională. Portugheza, spaniola sau româna sunt, de asemenea, binevenite datorită prezenței noastre pe aceste piețe</li></ul>
<h2>De ce acum</h2>
<p>Ne dezvoltăm activ pe șase piețe, iar Cehia este o prioritate. Medicii care ni se alătură în această etapă vor contribui la definirea modului în care funcționează clinica la nivel local — nu este vorba doar despre completarea unui program.</p>
<p>Dacă doriți să practicați medicina cu mai multă libertate, conexiune și sens, ne-ar face plăcere să vă cunoaștem.</p>`,
  },
  DE: {
    title: "Hausärztin oder Hausarzt — Verstärken Sie Global Health in Tschechien",
    department: "Medizin",
    location: "Tschechien (remote)",
    employmentType: "DPP oder selbstständig · Vollzeit oder Teilzeit",
    minimumExperience: "Gültige Registrierung bei der ČLK",
    descriptionHtml: `<h2>Über uns</h2>
<p>Global Health ist eine Telemedizinplattform, die in Tschechien startet und zu einem wachsenden Netzwerk gehört, das bereits Patientinnen und Patienten mit Ärztinnen und Ärzten in Irland, Portugal, Spanien, Rumänien und Brasilien verbindet. Unser Versprechen ist einfach: <strong>Medicine Anytime, Anywhere.</strong> Wir bauen eine Klinik auf, die Barrieren zwischen medizinischen Fachkräften und den Menschen abbaut, die ihre Hilfe benötigen — unabhängig davon, wo sie sich befinden.</p>
<h2>Die Position</h2>
<p>Wir suchen zugelassene Hausärztinnen und Hausärzte, die in Tschechien tätig sind und sich unserer Online-Klinik zum lokalen Start anschließen möchten. Sie führen über unsere Plattform Fernkonsultationen durch und können Ihr Arbeitsmodell flexibel an Ihre Bedürfnisse anpassen.</p>
<ul><li>100% remote — beraten Sie von überall aus</li><li>Flexibler Zeitplan — wählen Sie die Stunden und Tage, die zu Ihnen passen</li><li>Wählen Sie Ihre Form der Zusammenarbeit: DPP (Vereinbarung über die Ausführung einer Arbeit) oder selbstständig (OSVČ)</li><li>Vollzeit- und Teilzeitmodelle sind möglich</li></ul>
<h2>Was Sie erwartet</h2>
<ul><li>Ein wirklich internationales Ärzteteam — arbeiten Sie mit Kolleginnen und Kollegen in Europa und Brasilien zusammen</li><li>Eine Plattform mit Wachstumspotenzial — Sie kommen in der Gründungsphase in Tschechien zu Global Health, nicht in ein bereits etabliertes System</li><li>Spürbare Wirkung — helfen Sie Menschen, die sonst nur schwer zeitnah medizinische Versorgung erhalten würden</li><li>Kontinuierliche Unterstützung — technische, administrative und klinische Begleitung, damit Sie sich auf die Medizin statt auf Papierarbeit konzentrieren können</li></ul>
<h2>Wen wir suchen</h2>
<ul><li>Eine gültige ärztliche Zulassung in Tschechien und Registrierung bei der Tschechischen Ärztekammer (ČLK)</li><li>Qualifikation oder Spezialisierung in Allgemeinmedizin</li><li>Erfahrung mit telemedizinischen Werkzeugen ist von Vorteil; Schulung und Unterstützung beim Onboarding werden angeboten</li><li>Fließende Tschechischkenntnisse; Englisch ist für die Zusammenarbeit mit unserem internationalen Team von Vorteil. Portugiesisch, Spanisch oder Rumänisch sind aufgrund unserer Präsenz in diesen Märkten ebenfalls willkommen</li></ul>
<h2>Warum jetzt</h2>
<p>Wir wachsen aktiv in sechs Märkten, und Tschechien hat Priorität. Ärztinnen und Ärzte, die jetzt einsteigen, gestalten mit, wie die Klinik vor Ort funktioniert — es geht um mehr als das Füllen eines Dienstplans.</p>
<p>Wenn Sie Medizin mit mehr Freiheit, Vernetzung und Sinn ausüben möchten, freuen wir uns darauf, Sie kennenzulernen.</p>`,
  },
} satisfies Record<LocaleCode, CareerLocalization>;
