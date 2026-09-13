import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sourceBytes=fs.readFileSync('seo/romania/raw/editorial-storage-before-2026-09-13.json');
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),'1bef411492a8f86330a96d900cc417e96d3467220e05596a5a9ac6ab67c2e1fb','This reviewed editorial recipe applies only to the exact captured snapshot');
const source = JSON.parse(sourceBytes).data;
const pageIds = new Set(source.pages.filter(r => r.isActive && r.status === 'PUBLISHED').map(r => r.id));
const postIds = new Set(source.posts.filter(r => r.isActive && r.status === 'PUBLISHED').map(r => r.id));
const homeId=source.pages.find(r=>r.pageKey==='HOME').id;
const homeCopy={
 RO:{intro:'Global Health oferă consultații medicale online în România cu medici înregistrați la Colegiul Medicilor din România. Consultațiile de medicină de familie și de specialitate se desfășoară în română sau engleză, în funcție de medic. Verificați limba consultației și orele disponibile la programare. Medicul poate oferi documente medicale sau trimiteri atunci când sunt indicate clinic, după evaluare.',seoDescription:'Consultații medicale online în România, în română sau engleză. Alegeți medicul și verificați orele disponibile la programare.'},
 EN:{intro:'Global Health offers online medical consultations in Romania with doctors registered with Colegiul Medicilor din România. GP and specialist consultations are available in Romanian or English, depending on the doctor. Check the consultation language and available times when booking. After assessment, the doctor may provide medical documents or referrals where clinically appropriate.',seoDescription:'Online medical consultations in Romania, in Romanian or English. Choose your doctor and check available appointment times when booking.'},
 CS:{intro:'Global Health nabízí v Rumunsku online konzultace s lékaři registrovanými u Colegiul Medicilor din România. Konzultace s praktickým lékařem nebo specialistou probíhají v rumunštině či angličtině podle lékaře. Jazyk konzultace a volné termíny ověřte při rezervaci. Lékař může po posouzení vystavit lékařské dokumenty nebo doporučení, pokud jsou klinicky vhodné.',seoDescription:'Online lékařské konzultace v Rumunsku v rumunštině nebo angličtině. Vyberte si lékaře a při rezervaci ověřte dostupné termíny.'},
 DE:{intro:'Global Health bietet in Rumänien Online-Sprechstunden mit Ärzten an, die bei Colegiul Medicilor din România registriert sind. Hausärztliche und fachärztliche Sprechstunden finden je nach Arzt auf Rumänisch oder Englisch statt. Prüfen Sie bei der Buchung die Sprache und die verfügbaren Termine. Nach der Untersuchung kann der Arzt medizinische Dokumente oder Überweisungen ausstellen, sofern dies klinisch angemessen ist.',seoDescription:'Online-Sprechstunden in Rumänien auf Rumänisch oder Englisch. Wählen Sie einen Arzt und prüfen Sie bei der Buchung die verfügbaren Termine.'},
 ES:{intro:'Global Health ofrece consultas médicas online en Rumanía con médicos colegiados en Colegiul Medicilor din România. Las consultas de medicina general y de especialistas se realizan en rumano o inglés, según el médico. Compruebe el idioma y los horarios disponibles al reservar. Tras la evaluación, el médico puede emitir documentos médicos o derivaciones cuando esté clínicamente indicado.',seoDescription:'Consultas médicas online en Rumanía, en rumano o inglés. Elija un médico y compruebe los horarios disponibles al reservar.'},
 PT:{intro:'A Global Health oferece consultas médicas online na Roménia com médicos inscritos no Colegiul Medicilor din România. As consultas de medicina geral e de especialidade decorrem em romeno ou inglês, consoante o médico. Confirme o idioma e os horários disponíveis ao marcar. Após a avaliação, o médico pode emitir documentos médicos ou referenciações quando houver indicação clínica.',seoDescription:'Consultas médicas online na Roménia, em romeno ou inglês. Escolha o médico e confirme os horários disponíveis ao marcar.'},
};
const fields = {
  pageTranslations: ['heroTitle','heroSubtitle','heroTitleLead','heroTitleAccent','ctaLabel','intro','whoForTitle','whoForIntro','whoForItems','whyChooseTitle','whyChooseItems','faq','disclaimerParagraphs','disclaimerShort','body','seoTitle','seoDescription'],
  posts: ['title','excerpt','body','seoTitle','seoDescription'],
  blogTranslations: ['title','excerpt','content','seoTitle','seoDesc','coverImageAlt'],
};
const exact = new Map([
  ['Acest ghid acoperă tot ce trebuie să știți:','Ghidul prezintă'],
  ['This guide covers everything you need to know:','This guide explains'],
  ['Este guia aborda tudo o que precisa de saber:','Este guia apresenta'],
  ['Esta guía aborda todo lo que necesita saber:','Esta guía explica'],
  ['Tento průvodce shrnuje vše podstatné:','Tento průvodce popisuje'],
  ['Dieser Leitfaden behandelt alles, was Sie wissen sollten:','Dieser Leitfaden behandelt'],
  ['cele mai bune tratamente disponibile astăzi','tratamentele disponibile astăzi'],
  ['the best treatments available today','current treatments'],
  ['os melhores tratamentos atualmente disponíveis','os tratamentos atualmente disponíveis'],
  ['los mejores tratamientos disponibles hoy','los tratamientos disponibles hoy'],
  ['die besten heute verfügbaren Behandlungen','die heute verfügbaren Behandlungen'],
  ['Vestea bună este că diabetul poate fi gestionat foarte bine.','Diabetul poate fi gestionat prin tratament și monitorizare.'],
  ['Vestea bună este că, printr-un diagnostic corect și monitorizare regulată,','Cu un diagnostic corect și monitorizare regulată,'],
  ['The good news is that diabetes can be managed very effectively.','Diabetes can be managed with treatment and regular monitoring.'],
  ['A boa notícia é que a diabetes pode ser muito bem controlada.','A diabetes pode ser controlada com tratamento e vigilância regular.'],
  ['La buena noticia es que la diabetes es altamente manejable.','La diabetes puede controlarse con tratamiento y seguimiento regular.'],
  ['Dobrou zprávou je, že diabetes lze velmi dobře zvládat.','Diabetes lze zvládat léčbou a pravidelným sledováním.'],
  ['Die gute Nachricht ist, dass sich Diabetes sehr gut behandeln lässt.','Diabetes lässt sich mit Behandlung und regelmäßiger Kontrolle gut behandeln.'],
  ['progresele terapeutice remarcabile','progresele terapeutice'],
  ['the remarkable therapeutic advances','the therapeutic advances'],
  ['notáveis avanços terapêuticos','avanços terapêuticos'],
  ['bemerkenswerten therapeutischen Fortschritte','therapeutischen Fortschritte'],
  ['sunt cele mai bune de până acum','s-au extins'],
  ['are better than ever','have expanded'],
  ['são as melhores de sempre','são mais variadas'],
  ['son hoy las mejores de la historia','son hoy más amplias'],
  ['lepší než kdy dříve','širší'],
  ['besser als je zuvor','vielfältiger'],
  ['Diagnosticul este doar începutul. Partea care decide cum trăiți în următorii ani este monitorizarea — și circuitul prin care ajungeți la tratament.','După diagnostic, monitorizarea și accesul la tratament vă ajută să gestionați boala în următorii ani.'],
  ['The diagnosis is only the beginning. What decides how you live over the coming years is the monitoring — and the pathway that gets you to treatment.','After diagnosis, monitoring and access to treatment help you manage the condition over the coming years.'],
  ['O diagnóstico é apenas o início. O que decide como vive nos próximos anos é a monitorização — e o circuito que o leva até ao tratamento.','Após o diagnóstico, a monitorização e o acesso ao tratamento ajudam a controlar a doença ao longo dos anos.'],
  ['El diagnóstico es solo el principio. Lo que decide cómo vivirá los próximos años es el seguimiento, y el circuito que le lleva hasta el tratamiento.','Tras el diagnóstico, el seguimiento y el acceso al tratamiento ayudan a controlar la enfermedad a lo largo de los años.'],
  ['Diagnóza je jen začátek. O tom, jak budete žít další roky, rozhoduje sledování — a cesta, která vás dovede k léčbě.','Po stanovení diagnózy pomáhají pravidelné kontroly a přístup k léčbě zvládat nemoc v dalších letech.'],
  ['Die Diagnose ist nur der Anfang. Darüber, wie Sie die kommenden Jahre leben, entscheidet die Verlaufskontrolle — und der Weg, der Sie zur Behandlung bringt.','Nach der Diagnose helfen Verlaufskontrollen und der Zugang zur Behandlung, die Erkrankung über die kommenden Jahre zu bewältigen.'],
  ['Cele mai multe dintre ele au un numitor comun: perioade lungi în care vă simțiți bine. Acolo se pierd pacienții — nu la diagnostic, ci în lunile în care nimic nu doare și tratamentul pare inutil.','Multe dintre aceste boli au perioade lungi fără simptome. În aceste luni, tratamentul poate părea inutil, iar pacienții pot renunța la monitorizare.'],
  ['Most of them share one feature: long stretches in which you feel well. That is where patients are lost — not at diagnosis, but in the months when nothing hurts and the treatment seems pointless.','Many of these conditions have long periods without symptoms. Treatment may seem unnecessary during these months, and patients may stop attending follow-up appointments.'],
  ['A maioria delas tem um denominador comum: longos períodos em que a pessoa se sente bem. É aí que se perdem os doentes — não no diagnóstico, mas nos meses em que nada dói e o tratamento parece inútil.','Muitas destas doenças têm períodos longos sem sintomas. Nesses meses, o tratamento pode parecer desnecessário e os doentes podem deixar de ir às consultas de acompanhamento.'],
  ['Casi todas comparten un rasgo: largos periodos en los que uno se encuentra bien. Ahí se pierden los pacientes; no en el diagnóstico, sino en los meses en los que nada duele y el tratamiento parece innecesario.','Muchas de estas enfermedades tienen periodos largos sin síntomas. Durante esos meses, el tratamiento puede parecer innecesario y los pacientes pueden dejar de acudir a las revisiones.'],
  ['Většina z nich má společného jmenovatele: dlouhá období, kdy se člověk cítí dobře. Právě tam se pacienti ztrácejí — ne při diagnóze, ale v měsících, kdy nic nebolí a léčba se zdá zbytečná.','Mnohá z těchto onemocnění mají dlouhá období bez příznaků. V těchto měsících se léčba může zdát zbytečná a pacienti mohou přestat docházet na kontroly.'],
  ['Die meisten haben einen gemeinsamen Nenner: lange Phasen, in denen es einem gut geht. Dort gehen Patientinnen und Patienten verloren — nicht bei der Diagnose, sondern in den Monaten, in denen nichts wehtut und die Behandlung überflüssig erscheint.','Viele dieser Erkrankungen haben lange Phasen ohne Beschwerden. In diesen Monaten kann die Behandlung unnötig erscheinen, und Patientinnen und Patienten nehmen möglicherweise keine Kontrolltermine mehr wahr.'],
  ['Este o boală autoimună — sistemul imunitar','Este o boală autoimună: sistemul imunitar'],
  ['It is an autoimmune disease — the immune system','It is an autoimmune disease: the immune system'],
  ['Protejează independent inima și rinichii — recomandate ca primă linie','Protejează independent inima și rinichii și sunt recomandate ca primă linie'],
  ['Protegen de forma independiente el corazón y los riñones — recomendados como primera línea','Protegen de forma independiente el corazón y los riñones y se recomiendan como primera línea'],
  ['Yes — for monitoring','Yes, for monitoring'],
  ['Ano — pro sledování','Ano, pro sledování'],
  ['Ja — für die Verlaufskontrolle','Ja, für die Verlaufskontrolle'],
  ['Právě tady se chronická nemoc vyhrává, nebo prohrává — a právě tady je systém nejtenčí.','Pravidelné sledování mezi kontrolami je součástí péče o chronickou nemoc.'],
  ['Hier wird eine chronische Krankheit gewonnen oder verloren — und hier ist das System am dünnsten.','Regelmäßige Beobachtung zwischen den Terminen gehört zur Versorgung einer chronischen Erkrankung.'],
  ['Aceasta este întrebarea la care internetul dă cele mai multe răspunsuri contradictorii, și motivul este simplu: răspunsul depinde.','Valabilitatea depinde de scopul pentru care este cerut documentul.'],
  ['This is the question the internet answers most contradictorily, and the reason is simple: it depends.','The validity period depends on why the document is needed.'],
  ['É a pergunta a que a internet dá as respostas mais contraditórias, e a razão é simples: depende.','A validade depende do fim para o qual o documento é pedido.'],
  ['Es la pregunta con más respuestas contradictorias en internet, y el motivo es sencillo: depende.','La validez depende de la finalidad del documento.'],
  ['Auf diese Frage gibt das Internet die widersprüchlichsten Antworten, und der Grund ist einfach: Es kommt darauf an.','Die Gültigkeit hängt vom Zweck des Dokuments ab.'],
  ['Spunem asta la început, pentru că este prima întrebare și pentru că răspunsul onest economisește timp.','Verificați dacă documentul solicitat poate fi emis în cadrul unei consultații private.'],
  ['We say this at the outset, because it is the first question and because an honest answer saves time.','Check whether the document you need can be issued through a private consultation.'],
  ['Dizemo-lo logo no início, porque é a primeira pergunta e porque a resposta honesta poupa tempo.','Confirme se o documento de que precisa pode ser emitido numa consulta privada.'],
  ['Lo decimos al principio, porque es la primera pregunta y porque la respuesta honesta ahorra tiempo.','Compruebe si el documento que necesita puede emitirse en una consulta privada.'],
  ['Říkáme to hned na začátku, protože je to první otázka a protože poctivá odpověď šetří čas.','Ověřte si, zda lze požadovaný dokument vystavit při soukromé konzultaci.'],
  ['Wir sagen es gleich zu Beginn, weil es die erste Frage ist und weil eine ehrliche Antwort Zeit spart.','Prüfen Sie, ob das benötigte Dokument in einer privaten Sprechstunde ausgestellt werden kann.'],
  ['O spunem direct, pentru că economisește un drum inutil.','Verificați înainte de programare ce poate oferi consultația privată.'],
  ['We say it plainly, because it saves a wasted journey.','Check what a private consultation can provide before booking.'],
  ['Dizemo-lo diretamente, porque poupa uma deslocação inútil.','Confirme o que pode obter numa consulta privada antes de marcar.'],
  ['Lo decimos directamente, porque ahorra un viaje inútil.','Compruebe qué puede ofrecer una consulta privada antes de reservar.'],
  ['Říkáme to přímo, protože to ušetří zbytečnou cestu.','Před objednáním ověřte, co může soukromá konzultace nabídnout.'],
  ['Wir sagen es direkt, weil es einen unnötigen Weg erspart.','Prüfen Sie vor der Buchung, was eine private Sprechstunde leisten kann.'],
  ['Documentele, programele și dosarele se rezolvă după — și se rezolvă întotdeauna.','Documentele, programele și dosarele pot fi discutate după rezolvarea urgenței.'],
  ['Documents, programmes and files get sorted afterwards — and they always do get sorted.','Documents, programmes and files can be discussed after the emergency has been addressed.'],
  ['Os documentos, os programas e os processos resolvem-se depois — e resolvem-se sempre.','Os documentos, os programas e os processos podem ser tratados depois da urgência.'],
  ['Dokumenty, programy a spisy se vyřeší potom — a vždycky se vyřeší.','Dokumenty, programy a spisy lze řešit po zvládnutí akutního stavu.'],
  ['Dokumente, Programme und Akten regeln sich danach — und sie regeln sich immer.','Dokumente, Programme und Akten können nach der Versorgung des Notfalls geklärt werden.'],
  ['Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu','Prețuri transparente, fără costuri ascunse sau abonament obligatoriu'],
  ['Transparentní ceny — žádné skryté poplatky, žádné povinné členství','Transparentní ceny bez skrytých poplatků a povinného členství'],
  ['Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich','Transparente Preise ohne versteckte Gebühren und ohne Mitgliedschaftspflicht'],
  ['Transparent pricing — no hidden fees, no membership required','Transparent pricing with no hidden fees or required membership'],
  ['Precios transparentes — sin costes ocultos, sin suscripción obligatoria','Precios transparentes, sin costes ocultos ni suscripción obligatoria'],
  ['Preços transparentes — sem custos ocultos, sem subscrição obrigatória','Preços transparentes, sem custos ocultos nem subscrição obrigatória'],
  ['Bine ați venit la Global Health în România — asistență medicală online din partea unor medici înregistrați la Colegiul Medicilor din România.','Global Health oferă în România asistență medicală online din partea unor medici înregistrați la Colegiul Medicilor din România.'],
  ['Vítejte u Global Health v Rumunsku — online lékařská péče od lékařů registrovaní u Colegiul Medicilor din România.','Global Health v Rumunsku nabízí online péči lékařů registrovaných u Colegiul Medicilor din România.'],
  ['Willkommen bei Global Health in Rumänien — medizinische Online-Versorgung durch Ärzte, die bei Colegiul Medicilor din România registriert sind.','Global Health bietet in Rumänien medizinische Online-Versorgung durch Ärzte, die bei Colegiul Medicilor din România registriert sind.'],
  ['Welcome to Global Health in Romania — online medical care from doctors registered with Colegiul Medicilor din România.','Global Health provides online medical care in Romania from doctors registered with Colegiul Medicilor din România.'],
  ['Bienvenido a Global Health en Rumanía — atención médica online de médicos colegiados a través de Colegiul Medicilor din România.','Global Health ofrece en Rumanía atención médica online de médicos colegiados a través de Colegiul Medicilor din România.'],
  ['Bem-vindo à Global Health em Roménia — cuidados médicos online prestados por médicos inscritos em Colegiul Medicilor din România.','A Global Health oferece na Roménia cuidados médicos online prestados por médicos inscritos em Colegiul Medicilor din România.'],
]);
function editText(value, context) {
  let result = value.replace(/\s–(?=\s|[,.;])/g,(m,offset)=> /\d\s*$/.test(value.slice(0,offset))&&/^\s*\d/.test(value.slice(offset+m.length))?m:m.replace('–','—'));
  for (const [before, after] of exact) result = result.split(before).join(after);
  // A parenthetical apposition is paired within one sentence/text node.
  result=result.replace(/\s*—\s*([^—.!?]+?)\s*—\s*/g, ' ($1) ');
  result=result.replace(/\)\s+([,.;:])/g,')$1');
  result=result.replace(/\) (?=(?:ask your family doctor|this may be diabetic|discutați cu medicul|poate fi vorba|promluvte si|může jít o|je prvním krokem|puede tratarse|consulte con)(?=\s|,))/g,'), ');
  // Coordination continues the sentence, so no parenthetical separator is needed.
  const conjunction={RO:'și',EN:'and',PT:'e',ES:'y',CS:'a',DE:'und'}[context.locale];
  result=result.replace(new RegExp('\\s*—\\s*(?='+conjunction+'(?=\\s|,))','g'),' ');
  result=result.replace(/\s*—\s*(?=iar\b)/g,', ');
  // These modifiers supplement the preceding noun or clause.
  result=result.replace(/\s*—\s*(?=(?:with|cu|com|con|mit|s obsahem|s cílem|including|inclusiv|incluindo|incluyendo|včetně|que incluya|care să includă|regardless|indiferent|independentemente|de forma independiente|bez ohledu|bez improvizace|unabhängig|eliminând|eliminando|potentially|before|înainte|antes|dřív|bevor|eben weil|bei uns|ours as readily|a standalone specialty|o specialitate de sine stătătoare|uma especialidade autónoma|samostatný obor|einem eigenständigen|einer der höchsten)(?=\s|,))/g,', ');
  // A subject followed by its verb is not a label/value pair.
  result=result.replace(/\s*—\s*(?=(?:may issue|poate emite|pode emitir|může vystavit|können einen Arztbrief)\b)/g,' ');
  return result;
}
function edit(value, context) {
  if (Array.isArray(value)) return value.map(v=>edit(v, context));
  if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,edit(v,context)]));
  if (typeof value !== 'string') return value;
  // Treat HTML/CSS as immutable syntax; edits are only in rendered text.
  const tokens = value.split(/(<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<!--[\s\S]*?-->|<[^>]*>)/gi);
  let anchorDepth=0,headingDepth=0,previousTag='';
  let result = tokens.map(t => {
    if(t.startsWith('<')) {
      if(/^<a\b/i.test(t))anchorDepth++;if(/^<\/a>/i.test(t))anchorDepth--;
      if(/^<h[1-6]\b/i.test(t))headingDepth++;if(/^<\/h[1-6]>/i.test(t))headingDepth--;
      previousTag=t;
      return t;
    }
    let next=editText(t,context);
    if(/class="hero-(?:pill|reviewed)"/.test(previousTag))next=next.replace(/^(\s*)—\s*/,'$1');
    // Source names and section labels introduce their title with a colon.
    if(anchorDepth>0||headingDepth>0)next=next.replace(/\s*—\s*/g,': ');
    if(next.includes('—')) {
      // Reviewed residual clauses introduce an explanation, example list, or action.
      next=next.replace(/\s*—\s*/g,': ');
    }
    return next;
  }).join('');
  return result;
}
const changes=[];
for(const [table, keys] of Object.entries(fields)) for(const row of source[table]) {
  if(table==='pageTranslations' && !pageIds.has(row.pageContentId)) continue;
  if(table==='posts' && !postIds.has(row.id)) continue;
  if(table==='blogTranslations' && !postIds.has(row.postId)) continue;
  for(const field of keys) {
    const before=row[field];
    if(before==null) continue;
    const context={table,id:row.id,locale:row.locale||'RO',field};
    const narrowing=table==='pageTranslations'&&row.pageContentId===homeId&&homeCopy[row.locale]?.[field];
    const after=narrowing||edit(before,context);
    if(JSON.stringify(before)!==JSON.stringify(after))changes.push({table,id:row.id,field,before,after,reason:narrowing?'Evidence-backed claim narrowing: remove same-day and preferred-language guarantees; reflect Romanian/English roster, booking availability, and clinician-dependent documents/referrals.':'Editorial copy edit: remove filler and use punctuation appropriate to the clause; retain clinical meaning, figures and markup.'});
  }
}
const syntax=s=>s.match(/<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<!--[\s\S]*?-->|<[^>]*>/gi)||[];
const visible=s=>s.replace(/<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<!--[\s\S]*?-->|<[^>]*>/gi,'');
for(const change of changes) {
  const row=source[change.table].find(r=>r.id===change.id);
  assert.deepEqual(change.before,row[change.field]);
  assert(fields[change.table].includes(change.field));
  const before=typeof change.before==='string'?change.before:JSON.stringify(change.before);
  const after=typeof change.after==='string'?change.after:JSON.stringify(change.after);
  assert.deepEqual(syntax(after),syntax(before),'HTML, attributes, CSS, and scripts must be byte-identical');
  assert.deepEqual(visible(after).match(/\d+/g),visible(before).match(/\d+/g),'Clinical figures and dates must be preserved');
  assert(!visible(after).includes('—'),'No em dash remains in changed visible copy');
}
assert.equal(new Set(changes.map(r=>r.id)).size,60);
assert.equal(changes.filter(r=>r.reason.startsWith('Evidence-backed')).length,12);
fs.writeFileSync('seo/romania/content-briefs/editorial-pages-articles-changes-2026-09-13.json',JSON.stringify(changes,null,2)+'\n');
console.log(JSON.stringify({changes:changes.length,rows:new Set(changes.map(r=>r.id)).size,byTable:Object.fromEntries(Object.keys(fields).map(k=>[k,changes.filter(c=>c.table===k).length])),checks:'exact before-values; immutable markup/styles/links; preserved digits/dates; all 60 eligible rows covered; no visible em dashes'}));
