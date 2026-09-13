import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = 'seo/romania/';
const data = JSON.parse(fs.readFileSync(root+'raw/editorial-storage-before-2026-09-13.json')).data.clinical;
const fragments = JSON.parse(fs.readFileSync(root+'content-briefs/editorial-clinical-fragments-2026-09-13.json'));
// Each index refers to an inspected exact source fragment, not arbitrary live prose.
const edits = fragments.map(s=>s.replace(/\s*—\s*/g, ': '));
function separators(indices, separator) { for(const i of indices) edits[i]=fragments[i].replace(/\s*—\s*/g,separator); }
separators([1,4,7,10,11,14,31,34,36,39,40,43,88,90,91,93,95,96,104,105,108,110,117,125,127,155,157,158,161,162,163,166,169,178,179,186,200,203,204,207,214,222,224,225,227,228,230,233,234,261,277,281,282,289,290,291,292,293,294,306,310,314,317,319,341,343,357,358,359,360,362,379,380,384,386,388,389,407,408,410,413,419,421,425,427,445,448,453,454,459,461,468,472,477,478,479,480,481,484,486,488,489,494,496,498,515,560,562,563,567,597,600,603,606,607,610,614,619,620,623,625,628,631,634,635,638,640,643,646,649,650,653,729,731,733,734,735,737,739,740,741,742,743,744,745,746,747,749,751,753,755,757], ', ');
separators([2,42,44,53,54,106,107,112,116,122,123,124,126,156,159,164,177,181,206,223,229,263,264,278,280,295,309,312,318,355,361,365,381,382,385,390,417,422,429,455,456,457,460,463,469,495,497,511,512,519,520,566,598,612,626,641,748], ', ');
separators([3,33,97,599,613,627,642], ' ');
separators([30], ', ');
separators([32,37,55,99,102,114,119,168,199,201,202,260,271,307,308,315,338,344,352,391,423,446,449,450,451,518,568,736,738,750,752,754,756,758,759,760,761,762], '. ');
// Sentence splits need sentence case, while names, abbreviations and existing HTML stay intact.
for (const i of [32,37,55,99,102,114,119,168,199,201,202,260,271,307,308,315,338,344,352,391,423,446,449,450,451,518,568,736,738,750,752,754,756,758,759,760,761,762]) edits[i]=edits[i].replace(/\. (\p{Ll})/gu,(_,c)=>'. '+c.toUpperCase());
function set(i, after) { edits[i]=after; }
set(32, 'Expats, international students, business travellers, digital nomads and other residents or visitors can book a same-day consultation from anywhere in Romania.');
set(99, 'The following neurological symptoms require immediate emergency care. Do not wait for a video consultation:');
set(391, fragments[391].replace(' — ', ', '));
set(8, 'Explicație clară. Medicul vă explică ce se întâmplă, ce trebuie să faceți în continuare și când să căutați îngrijiri suplimentare. Vă implică în decizia medicală.');
set(13, 'Limbi disponibile: română și engleză, în funcție de disponibilitatea medicului.');
set(58, 'Cognitive concerns (memory, concentration, or word-finding difficulties): initial specialist assessment');
set(89, fragments[89].replace(' — ', ': '));
set(113, 'A second opinion provides an additional clinical review of decisions with significant consequences. Romanian patients and international residents can use it to discuss the original recommendation and any alternatives with another doctor.');
set(120, 'Chronic Disease Management provides ongoing GP-level care. Your doctor monitors your condition over time, adjusts management when needed, and coordinates investigations and specialist referrals.');
set(121, 'If your condition is stable and you need a prescription renewed, Treatment Renewal is appropriate. Choose Chronic Disease Management if you need ongoing support with your condition.');
set(125, 'A doctor who monitors you over time can review patterns and changes across consultations, alongside your current symptoms.');
set(127, 'This service provides a GP who reviews your conditions together and coordinates your care.');
set(153, 'Chronic skin conditions: psoriasis and eczema at GP level');
set(185, 'Degree of urgency (routine, soon, or urgent), based on clinical assessment');
set(208, 'Scope of This Service');
set(231, fragments[231].replace(' — ', ': '));
for(const i of [266,267,268,269,270]) { let p=fragments[i].split(' — '); set(i, p[0]+': '+p[1]+', '+p[2]); }
set(273, 'Close-up photos: take clear photos of the affected area before your consultation. These can be shared during the call and help your doctor assess changes over time');
set(284, 'Personalised risk assessment based on your destination, itinerary, accommodation type, planned activities, and health profile');
set(285, 'Vaccination planning: advice on which vaccines are needed, which you may already be immune to, and the appropriate schedule given your departure date, so you know what to ask for at the vaccination centre');
set(305, fragments[305].replace(' — ', ': ').replace('BangladeshTyphoid','Bangladesh. Typhoid'));
set(340, fragments[340].replace(' — where clinically indicatedSince', ', where clinically indicated. Since').replaceAll(' — ', ', '));
set(378, fragments[378].replace(' — onset', ': onset').replace(' — building', ', building'));
set(411, 'Any change in bladder or bowel function associated with back pain, including incontinence or retention, may indicate cauda equina syndrome, a surgical emergency');
set(414, 'Fever associated with swelling and joint pain may indicate septic arthritis');
set(416, 'Most musculoskeletal conditions are self-limiting. They resolve with adequate rest, activity modification, and structured rehabilitation. Clinical assessment can help you avoid returning to activity too early or restricting activity unnecessarily during recovery.');
set(426, 'Your doctor reviews your current treatment, your condition, any side effects, and changes to your health since your last review. They advise on whether your treatment remains appropriate and issue an electronic prescription where clinically indicated. Prescription renewal is not automatic.');
set(447, 'Renewing stable medication can be difficult without a registered family doctor in Romania. This affects people moving between practices, recent arrivals and international residents. Finding a clinic and discussing treatment in a less familiar language can add to the difficulty.');
set(458, 'Medical assessment can identify factors that a diet plan alone does not address and help your doctor adapt your management plan.');
set(462, fragments[462].replace(' — BMI', ' (BMI').replace(' — not by', '), not by'));
set(471, 'Stigma, time pressure, and access barriers can make it difficult to seek help for men’s health concerns. A confidential video consultation with a CMR-registered doctor lets you discuss these concerns without travelling to a clinic. Consultations are available in English and Romanian.');
set(514, fragments[514].replace(' — these require', ' requires'));
set(565, fragments[565].replace(' — Cluj', ', including Cluj').replaceAll(' — ', ', '));
set(604, 'Explicação clara. O médico explica o que se passa, o que deve fazer a seguir e quando procurar cuidados adicionais. Envolve-o na decisão clínica.');
set(609, 'Línguas disponíveis: romeno e inglês, dependendo da disponibilidade do médico.');
set(617, 'Explicación clara. El médico le explica qué está ocurriendo, qué debe hacer a continuación y cuándo buscar atención adicional. Le incluye en la decisión médica.');
set(622, 'Idiomas disponibles: rumano e inglés, según la disponibilidad del médico.');
set(632, 'Jasné vysvětlení. Lékař vám vysvětlí, co se děje, co máte dělat dál a kdy vyhledat další péči. Zapojí vás do rozhodování o léčbě.');
set(637, 'Dostupné jazyky: rumunština a angličtina podle dostupnosti lékaře.');
set(647, 'Klare Erklärung. Der Arzt erklärt Ihnen, was vor sich geht, was Sie als Nächstes tun sollten und wann Sie weitere medizinische Hilfe benötigen. Er bezieht Sie in die medizinische Entscheidung ein.');
set(652, 'Verfügbare Sprachen: Rumänisch und Englisch, je nach Verfügbarkeit des Arztes.');
// Separate run-together labels observed in the general-service text, preserving every tag.
const literal = new Map([
 ['din București, și cu experiență','din București și cu experiență'],
 ['în română, engleză în','în română și engleză în'],['em romeno, inglês no','em romeno e inglês no'],['en rumano, inglés el','en rumano e inglés el'],['v rumunštině, angličtině ještě','v rumunštině a angličtině ještě'],['auf Rumänisch, Englisch am','auf Rumänisch und Englisch am'],
 ['cea mai prestigioasă facultate de medicină din România, și','și'],
 ['Ceea ce o face distinctă este profunzimea expertizei sale în gastroenterologie pediatrică și nutriție.', 'Are experiență în gastroenterologie pediatrică și nutriție.'],
 ['Dr. Alexandra Palaga is a dedicated pediatric specialist physician, with a deep commitment to promoting children’s health through clinical excellence and academic research.', 'Dr. Alexandra Palaga is a pediatric specialist with experience in clinical care and academic research.'],
 ['A Dra. Alexandra Palaga é uma médica especialista em pediatria dedicada, com um compromisso profundo com a promoção da saúde infantil por meio da excelência clínica e da pesquisa acadêmica.', 'A Dra. Alexandra Palaga é médica especialista em pediatria, com experiência clínica e de investigação.'],
 ['La Dra. Alexandra Palaga es una médica especialista en pediatría dedicada, con un profundo compromiso con la promoción de la salud infantil mediante la excelencia clínica y la investigación académica.', 'La Dra. Alexandra Palaga es médica especialista en pediatría, con experiencia clínica y de investigación.'],
 ['Dr. Alexandra Palaga je oddaná lékařka-specialistka v pediatrii s hlubokým závazkem podporovat zdraví dětí prostřednictvím klinické excelence a akademického výzkumu.', 'Dr. Alexandra Palaga je specialistka v pediatrii se zkušenostmi v klinické péči a akademickém výzkumu.'],
 ['Dr. Alexandra Palaga ist eine engagierte Fachärztin für Pädiatrie mit einem tiefen Engagement für die Förderung der Kindergesundheit durch klinische Exzellenz und akademische Forschung.', 'Dr. Alexandra Palaga ist Fachärztin für Pädiatrie mit Erfahrung in der klinischen Versorgung und akademischen Forschung.'],
 ['Medic Chat.Clinical','Medic Chat. Clinical'],['Medic Chat.Experiência','Medic Chat. Experiência'],['Medic Chat.Experiencia','Medic Chat. Experiencia'],['světě.Klinické','světě. Klinické'],['Beratung.Klinische','Beratung. Klinische'],
 ['With a career built on rigorous training in some of the most prestigious institutions in Romania, Dr. Alexandra Palaga has extensive experience in:', 'Dr. Alexandra Palaga trained in Romania and has clinical experience in:'],
 ['Com uma carreira construída sobre uma formação rigorosa em algumas das instituições mais prestigiadas da Roménia, a Dra. Alexandra Palaga tem vasta experiência em:', 'A Dra. Alexandra Palaga formou-se na Roménia e tem experiência clínica em:'],
 ['Con una carrera construida sobre una formación rigurosa en algunas de las instituciones más prestigiosas de Rumanía, la Dra. Alexandra Palaga tiene amplia experiencia en:', 'La Dra. Alexandra Palaga se formó en Rumanía y tiene experiencia clínica en:'],
 ['Aufbauend auf einer strengen Ausbildung an einigen der renommiertesten Institutionen Rumäniens verfügt Dr. Alexandra Palaga über umfassende Erfahrung in:', 'Dr. Alexandra Palaga absolvierte ihre Ausbildung in Rumänien und hat klinische Erfahrung in:'],
 ['prestigious journals such as','journals such as'],['revistas de prestigio como','revistas como'],['renommierten Fachzeitschriften wie','Fachzeitschriften wie'],
 ['a dedicated specialist neurologist physician','a specialist neurologist'],['at prestigious hospitals','at hospitals'],['especialista em neurologia dedicada','especialista em neurologia'],['hospitais de prestígio','hospitais'],['especialista en neurología dedicada','especialista en neurología'],['hospitales de prestigio','hospitales'],['je oddaná lékařka specialistka neurolog,','je lékařka se specializací v neurologii'],['prestižních nemocnic','nemocnic'],['eine engagierte Fachärztin','eine Fachärztin'],['angesehenen Krankenhäusern','Krankenhäusern'],
 ['She is dedicated to providing patient-centered care, emphasizing accurate diagnosis, individualized treatment plans, and clear communication with patients and their families. Dr. Andreea-Lorena Bica is recognized for her careful approach, professionalism, and dedication to improving patient outcomes.', 'Dr. Bica assesses each patient individually, develops a treatment plan and explains it to the patient and their family.'],
 ['Está dedicada a prestar cuidados centrados no paciente, com ênfase no diagnóstico preciso, em planos de tratamento individualizados e numa comunicação clara com os pacientes e as suas famílias. A Dr. Andreea-Lorena Bica é reconhecida pela sua abordagem atenta, pelo profissionalismo e pela dedicação à melhoria dos resultados dos pacientes.', 'A Dra. Bica avalia cada paciente individualmente, elabora um plano de tratamento e explica-o ao paciente e à família.'],
 ['Está dedicada a brindar una atención centrada en el paciente, haciendo hincapié en un diagnóstico preciso, planes de tratamiento individualizados y una comunicación clara con los pacientes y sus familias. La Dra. Andreea-Lorena Bica es reconocida por su enfoque atento, su profesionalismo y su dedicación a mejorar los resultados de los pacientes.', 'La Dra. Bica evalúa a cada paciente de forma individual, elabora un plan de tratamiento y lo explica al paciente y a su familia.'],
 ['Je oddaná poskytování péče zaměřené na pacienta, s důrazem na přesnou diagnózu, individuálně přizpůsobené léčebné plány a jasnou komunikaci s pacienty a jejich rodinami. Dr. Andreea-Lorena Bica je uznávána pro svůj pečlivý přístup, profesionalitu a odhodlání zlepšovat výsledky pacientů.', 'Dr. Bica posuzuje každého pacienta individuálně, sestaví léčebný plán a vysvětlí jej pacientovi i jeho rodině.'],
 ['Sie ist der Bereitstellung einer patientenzentrierten Versorgung verpflichtet, mit Schwerpunkt auf präziser Diagnose, individuell angepassten Behandlungsplänen und klarer Kommunikation mit den Patienten und ihren Familien. Dr. Andreea-Lorena Bica ist für ihren sorgfältigen Ansatz, ihre Professionalität und ihr Engagement zur Verbesserung der Patientenergebnisse bekannt.', 'Dr. Bica beurteilt jeden Patienten individuell, erstellt einen Behandlungsplan und erklärt ihn dem Patienten und seiner Familie.'],
 ['Experiența sa în unele dintre cele mai solicitante medii clinice din România și Irlanda îi conferă o profunzime diagnostică rar întâlnită în medicina primară online.', 'Are experiență clinică în România și Irlanda.'],
 ['the renowned „Florească”','the „Florească”'],['no renomado Hospital','no Hospital'],['el renombrado Hospital','el Hospital'],['v renomované Klinické','v Klinické'],['am renommierten Klinischen','am Klinischen'],['espanhol, Dr. Brînduș','espanhol. Dr. Brînduș'],
 ['completăMedicul','completă. Medicul'],['medicalăCând','medicală. Când'],['medicalDacă','medical. Dacă'],['prealabilăNu','prealabilă. Nu'],['CMRToate','CMR. Toate'],['ziDisponibilitate','zi. Disponibilitate'],['RomâniaNu','România. Nu'],['medicalMedicii','medical. Medicii'],['anamneza completă','anamneză completă'],['evaluare antibiotic','evaluarea necesității unui antibiotic'],
 ['completaO médico','completa. O médico'],['médicaQuando','médica. Quando'],['médicaSe','médica. Se'],['prévioNão','prévio. Não'],['CMRTodas','CMR. Todas'],['diaDisponibilidade','dia. Disponibilidade'],['RoméniaNão','Roménia. Não'],['médicaOs nossos','médica. Os nossos'],
 ['completaEl médico','completa. El médico'],['médicaCuando','médica. Cuando'],['médicaSi','médica. Si'],['previoNo','previo. No'],['CMRTodas','CMR. Todas'],['díaDisponibilidad','día. Disponibilidad'],['RumaníaNo','Rumanía. No'],['médicaNuestros','médica. Nuestros'],
 ['zhodnoceníLékař','zhodnocení. Lékař'],['dokumentaceKdyž','dokumentace. Když'],['neschopnostPokud','neschopnost. Pokud'],['registraceNemusíte','registrace. Nemusíte'],['CMRVšechny','CMR. Všechny'],['denDostupnost','den. Dostupnost'],['RumunskaNemusíte','Rumunska. Nemusíte'],['neschopnostNaši','neschopnost. Naši'],
 ['BeurteilungDer Arzt','Beurteilung. Der Arzt'],['DokumentationWenn','Dokumentation. Wenn'],['KrankschreibungWenn','Krankschreibung. Wenn'],['RegistrierungSie','Registrierung. Sie'],['CMRAlle','CMR. Alle'],['TagVerfügbarkeit','Tag. Verfügbarkeit'],['zugänglichSie','zugänglich. Sie'],['KrankschreibungUnsere','Krankschreibung. Unsere'],
 ['where clinically appropriateWhen','where clinically appropriate. When'],['where clinically indicatedSince','where clinically indicated. Since'],['where neededIf','where needed. If'],['indicatCând','indicat. Când'],['indicatÎncepând','indicat. Începând'],['indicadoQuando','indicado. Quando'],['indicadoA partir','indicado. A partir'],['indicadoCuando','indicado. Cuando'],['indikovánoKdyž','indikováno. Když'],['indikovánoOd','indikováno. Od'],['indiziertWenn','indiziert. Wenn'],['indiziertSeit','indiziert. Seit'],
 ['in English, Romanian When','in English and Romanian. When'],['in English, Romanian.','in English and Romanian.'],['in English, Romanian as appropriate','in English or Romanian as appropriate'],['including english','including English'],['Full clinical assessmentYour','Full clinical assessment. Your'],['Clear explanation in plain EnglishYou','Clear explanation in plain English. You'],['assessmentYour','assessment. Your'],['assessment Skin','assessment. Skin'],['reviewIf','review. If'],['adjustmentFor','adjustment. For'],['planBased','plan. Based'],['documentationWhere','documentation. Where'],['reviewsYour','reviews. Your'],['coordinationYour','coordination. Your'],['managementYour','management. Your'],['supportEvidence','support. Evidence'],['referralWhen','referral. When'],['continuityBecause','continuity. Because'],['assessmentReturned','assessment. Returned'],['guidanceYou','guidance. You'],['documentationWhen','documentation. When'],['causeHair','cause. Hair'],['indicatedWhere','indicated. Where'],['neededCertain','needed. Certain'],['screeningMusculoskeletal','screening. Musculoskeletal'],['coordinationWhen','coordination. When'],['causesYour','causes. Your'],['therapiesFor','therapies. For'],['causesMen','causes. Men'],['resultsIf','results. If'],['toolsWhere','tools. Where'],['assessmentEvery','assessment. Every'],
 ['a registrars physician','a registrar'],['medicine</p>','medicine.</p>'],['perioperatória</p>','perioperatória.</p>'],['perioperatoria</p>','perioperatoria.</p>'],['medicínu</p>','medicínu.</p>'],['Medizin</p>','Medizin.</p>']
]);
const fragmentMap=new Map(fragments.map((s,i)=>[s,edits[i]]));
const staffed=new Set(data.services.filter(s=>s.isActive&&data.assignments.some(a=>a.serviceId===s.id&&a.isActive)).map(s=>s.id));
const changes=[]; let reviewedFields=0;
for(const table of ['services','serviceTranslations','doctors','doctorTranslations','doctorMarketTranslations','doctorFaqs']) for(const row of data[table]) {
 if(['services','serviceTranslations'].includes(table)&&!staffed.has(row.serviceId||row.id))continue;
 for(const field of ['name','summary','heroTitle','heroDescription','detailBody','bio','seoTitle','seoDescription','question','answer']) {
  const before=row[field]; if(typeof before!=='string'||!before)continue; reviewedFields++;
  let after=before.split(/(<[^>]+>)/).map(p=>p.startsWith('<')?p:(fragmentMap.get(p)||p)).join('');
  for(const [a,b] of literal) after=after.replaceAll(a,b);
  // Reuse the already published, approved service heading for concise card names.
  if(field==='name' && typeof row.heroTitle==='string' && row.heroTitle.trim()) after=row.heroTitle;
  if(after===before)continue;
  assert(!after.includes('—'),table+' '+row.id+' '+field);
  assert.deepEqual(after.match(/<[^>]+>/g),before.match(/<[^>]+>/g),'HTML invariant');
  changes.push({table,id:row.id,field,before,after,reason:field==='name'?'Use the existing approved service heading as the card name; remove promotional and same-day promises.':'Editorial rewrite: natural clause punctuation, clearer sentences and removal of repetitive promotional phrasing; clinical meaning and HTML retained.'});
 }
}
fs.writeFileSync(root+'content-briefs/editorial-clinical-changes-2026-09-13.json',JSON.stringify(changes,null,2)+'\n');
console.log(JSON.stringify({reviewedFields,staffedServices:staffed.size,changedFields:changes.length,byTable:Object.fromEntries([...new Set(changes.map(c=>c.table))].map(t=>[t,changes.filter(c=>c.table===t).length]))}));
