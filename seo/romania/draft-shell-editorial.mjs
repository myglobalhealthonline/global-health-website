import fs from 'node:fs';
import assert from 'node:assert/strict';
const locales=['en','ro','cs','de','es','pt'];
const output={};
const sentence=s=>s.replace(/\s*—\s*(\p{L})/gu,(_,c)=>'. '+c.toUpperCase());
const colon=s=>s.replace(/\s*—\s*/g,': ');
const comma=s=>s.replace(/\s*—\s*/g,', ');
const titles=s=>s.replace(/\s*—\s*/g,' | ');
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
function put(o,p,v){const a=p.split('.');let t=o;for(const k of a.slice(0,-1))t=t[k]??={};t[a.at(-1)]=v;}
let count=0;
for(const locale of locales){
 output[locale]={};
 for(const ns of ['company','legal','subscription','common']){
  const source=JSON.parse(fs.readFileSync(`frontend/locales/${locale}/${ns}.json`));
  const target={};
  const edit=(path,fn)=>{const before=get(source,path);if(typeof before!=='string')return;const after=fn(before);if(after!==before){assert.deepEqual((after.match(/\{[^}]+\}/g)||[]).sort(),(before.match(/\{[^}]+\}/g)||[]).sort(),path+' placeholders');assert.deepEqual(after.match(/\d+/g),before.match(/\d+/g),path+' numbers');assert(!after.includes('—'),path);put(target,path,after);count++;}};
  if(ns==='company'){
   for(const p of ['press.titleTemplate','medicalReview.titleTemplate'])edit(p,titles);
   for(const p of ['careers.rolesBody','press.contactBody','medicalReview.s3Std4Body'])edit(p,sentence);
   edit('press.introTemplate',colon);
   edit('medicalReview.s1Body1',colon);
   edit('medicalReview.s3Std5BodyTemplate',s=>s.replace(/\s*—\s*/g,', '));
   // Paired apposition retains the byline and avoids a list-like sentence.
   edit('medicalReview.s1Body2Template',s=>s.replace(/\s*—\s*(.*?)\s*—\s*/g,' ($1) ').replace(') ,', '),').replace(') protože', '), protože'));
   for(const p of ['careers.introTemplate','medicalReview.introTemplate'])edit(p,s=>s.replace(/\s*—\s*/g,' '));
   edit('careers.pillarOpsBody',s=>s.replace(/\s*—\s*(.*?)\s*—\s*/g,' ($1) '));
   edit('medicalReview.s2BylineFormatNote',comma);
   edit('medicalReview.s3Std2Body',comma);
   if(locale==='de')edit('careers.whyBodyTemplate',comma);
   const custom={
    en:{
     'careers.introTemplate':'Global Health connects patients in {country} with registered doctors online. Our clinicians, clinical operations staff and engineers work across our markets. We welcome applications from people who want to join the team.',
     'careers.whyBodyTemplate':'Our small team supports patients in {country} and across our markets. You could consult with patients, help them with bookings or develop the platform.',
     'careers.pillarDoctorsBody':'Consult online as a registered doctor. You set your availability; we handle bookings, payments and consultation technology.',
     'careers.pillarOpsBody':'Help patients with bookings, documents and follow-up before and after their consultation, in the languages used in our markets.',
     'careers.rolesBody':'We do not list vacancies on this page. Registered doctors, clinical support professionals and engineers can send a CV and a short introduction. We read every application and reply to candidates we can take further.',
     'press.introTemplate':'Journalists covering Global Health in {country} can find information here about the service, its operator and how to verify our work.',
     'press.contactBody':'For interviews, comments, data or fact-checking, email us with your outlet and deadline. We prioritise journalists working to a deadline.',
     'medicalReview.descriptionTemplate':'How Global Health writes and reviews health articles for {country}, including sources, physician sign-off and updates.',
     'medicalReview.introTemplate':'Every clinical article we publish for {country} is drafted from primary sources and checked against them. A named physician registered with {regulator} signs it off before publication. We review it again when the underlying rules change.',
     'medicalReview.s1Body1':'We draft articles using verified primary sources, including government guidance, national health authority publications and the social security or insurance documents that apply in the relevant country. Editorial tools may assist with drafting, but do not replace source checks and clinical review.',
     'medicalReview.s1Body2Template':'Articles carry the Global Health Medical Team byline because the team shares drafting, research and editing. A physician registered with {regulator} approves each article. Their name and registration number appear on it.',
     'medicalReview.s2Intro':'A registered physician reviews the full article before publication and checks its claims against the sources. Their name and registration number appear on the article so you can verify their registration.',
     'medicalReview.s2BylineFormatNote':'Each reviewer name and registration number identifies a doctor on the public register for this market.',
     'medicalReview.s3Std2Body':'Claims about entitlements, certification rules and legal processes link directly to the government department, health authority or regulator responsible for them.',
     'medicalReview.s3Std4Body':'Articles explain how a process generally works. They do not diagnose your condition or guarantee an outcome. Your individual circumstances require a consultation.',
     'medicalReview.s3Std5BodyTemplate':'When an article describes warning signs that need urgent care, it includes the local emergency number, {emergency}.',
     'medicalReview.s3Std3BodyTemplate':'An article about sick leave in {country} is written and reviewed specifically for {country}, because rules vary between countries.'
    },
    ro:{'careers.pillarOpsBody':'Ajutați pacienții cu programările, documentele și îngrijirea ulterioară, înainte și după consultație, în limbile folosite pe piețele noastre.'},
    cs:{'careers.pillarOpsBody':'Pomáhejte pacientům s rezervacemi, dokumenty a následnou péčí před konzultací i po ní, v jazycích používaných na našich trzích.'},
    de:{'careers.pillarOpsBody':'Unterstützen Sie Patienten vor und nach der Konsultation bei Buchungen, Dokumenten und Nachsorge in den Sprachen unserer Märkte.'},
    es:{'careers.pillarOpsBody':'Ayude a los pacientes con las citas, los documentos y el seguimiento antes y después de la consulta, en los idiomas de nuestros mercados.'},
    pt:{'careers.pillarOpsBody':'Ajude os pacientes com marcações, documentos e acompanhamento antes e depois da consulta, nos idiomas dos nossos mercados.'}
   };
   for(const [p,v]of Object.entries(custom[locale]||{}))edit(p,()=>v);
  }
  if(ns==='legal'){
   for(const p of ['summaryNotice.text','privacy.s1_p','privacy.s2_i3','privacy.s4_i1_pre','terms.s5_p','terms.s6_p_pre','terms.s9_p'])edit(p,sentence);
   edit('privacy.s3_p',s=>{
    // Cookie-name explanations stay inside existing parentheses; following independent clauses split.
    let seen=0;return s.replace(/\s*—\s*(\p{L})/gu,(_,c)=>++seen<=2?': '+c:'. '+c.toUpperCase());
   });
   edit('privacy.s6_p',comma);
   const deletion={en:'Delete your account on the same page. Booking history is preserved for regulatory reasons but stripped of identifying details.',ro:'Ștergeți contul de pe aceeași pagină. Istoricul rezervărilor este păstrat din motive de reglementare, dar fără detalii de identificare.',cs:'Svůj účet můžete smazat na stejné stránce. Historie rezervací je uchována z regulačních důvodů, ale bez identifikačních údajů.',de:'Sie können Ihr Konto auf derselben Seite löschen. Der Buchungsverlauf wird aus regulatorischen Gründen aufbewahrt, jedoch ohne identifizierende Angaben.',es:'Elimine su cuenta en la misma página. El historial de reservas se conserva por razones regulatorias, pero se eliminan los datos identificativos.',pt:'Elimine a sua conta na mesma página. O histórico de reservas é preservado por razões regulatórias, mas sem dados de identificação.'};
   edit('privacy.s4_i2',()=>deletion[locale]);
  }
  if(ns==='subscription'){
   for(const p of ['legal.renewal_p','legal.credits_p'])edit(p,sentence);
   const headlines={en:['Choose a health plan','Compare the available plans and their included services.'],ro:['Alegeți un plan de sănătate','Comparați planurile disponibile și serviciile incluse.'],cs:['Vyberte si zdravotní plán','Porovnejte dostupné plány a zahrnuté služby.'],de:['Wählen Sie einen Gesundheitsplan','Vergleichen Sie die verfügbaren Tarife und enthaltenen Leistungen.'],es:['Elija un plan de salud','Compare los planes disponibles y los servicios incluidos.'],pt:['Escolha um plano de saúde','Compare os planos disponíveis e os serviços incluídos.']};
   edit('howItWorks.title',()=>headlines[locale][0]);edit('howItWorks.lede',()=>headlines[locale][1]);
   if(locale==='en'){
    const steps=structuredClone(source.howItWorks.steps);
    steps[0].title='Choose your plan'; steps[1].title='Create your account';steps[1].body='Create an account and start your secure monthly membership.';steps[2].title='Book a consultation';steps[2].body='Choose an available appointment time and book your online consultation from your device.';steps[3].title='No additional booking fees';steps[3].body='Your monthly plan covers the booking fee for consultations included in the plan.';steps[4].title='Meet your doctor online';
    put(target,'howItWorks.steps',steps);
   }
  }
  if(ns==='common'){
   const descriptions={en:'Consult a registered doctor online in {country}, in Romanian or English. Check the doctor and available appointment times before booking.',ro:'Consultați un medic înregistrat online în {country}, în română sau engleză. Verificați medicul și orele disponibile înainte de programare.',cs:'Online konzultace s registrovaným lékařem v {country}, v rumunštině nebo angličtině. Před rezervací si ověřte lékaře a volné termíny.',de:'Online-Konsultation mit einem registrierten Arzt in {country}, auf Rumänisch oder Englisch. Prüfen Sie Arzt und freie Termine vor der Buchung.',es:'Consulte a un médico colegiado en línea en {country}, en rumano o inglés. Revise el médico y los horarios disponibles antes de reservar.',pt:'Consulte um médico registado online em {country}, em romeno ou inglês. Verifique o médico e os horários disponíveis antes de marcar.'};
   edit('homeMeta.descriptionTemplate',()=>descriptions[locale]);
   edit('doctors.onboardingBodyTemplate',s=>s.replace(/\s*—\s*/g,' '));
   edit('testsPage.hero.feature2Subtitle',s=>locale==='en'?'Take your sample at home without a clinic visit.':s.replace(/\s*—\s*/g,', '));
  }
  if(Object.keys(target).length)output[locale][ns]=target;
 }
}
fs.writeFileSync('frontend/lib/i18n/romania-editorial-copy.json',JSON.stringify(output,null,2)+'\n');
console.log(`${count} string overrides across six locales; placeholders and numeric sequences preserved.`);
