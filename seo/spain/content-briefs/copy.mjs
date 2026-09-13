// Exact editorial candidates. No clinician has approved these answers.
export const languageNames = {
 es:['español','inglés','húngaro','alemán','hindi','urdu','neerlandés','italiano'],
 en:['Spanish','English','Hungarian','German','Hindi','Urdu','Dutch','Italian'],
 cs:['španělština','angličtina','maďarština','němčina','hindština','urdština','nizozemština','italština'],
 de:['Spanisch','Englisch','Ungarisch','Deutsch','Hindi','Urdu','Niederländisch','Italienisch'],
 pt:['espanhol','inglês','húngaro','alemão','hindi','urdu','neerlandês','italiano'],
 ro:['spaniolă','engleză','maghiară','germană','hindi','urdu','neerlandeză','italiană']
};
export const gpCopy = {
 es:['Consulta médica online en España','Consulte por videollamada con un médico de medicina general. Compruebe el idioma, el precio y los horarios disponibles antes de reservar.'],
 en:['Online GP consultation in Spain','Consult a general medical doctor by video. Check the clinician’s consultation languages, price and available appointment times before booking.'],
 cs:['Online lékařská konzultace ve Španělsku','Konzultujte své potíže s praktickým lékařem přes video. Před rezervací zkontrolujte jazyk konzultace, cenu a dostupné termíny.'],
 de:['Online-Arztberatung in Spanien','Sprechen Sie per Video mit einem Arzt für allgemeine medizinische Anliegen. Prüfen Sie Beratungssprache, Preis und verfügbare Termine vor der Buchung.'],
 pt:['Consulta médica online em Espanha','Consulte um médico de medicina geral por videochamada. Confirme a língua da consulta, o preço e os horários disponíveis antes de marcar.'],
 ro:['Consultație medicală online în Spania','Discutați prin apel video cu un medic de medicină generală. Verificați limba consultației, prețul și orele disponibile înainte de programare.']
};
export const booking = {
 es:l=>`Elija un horario disponible y compruebe el precio antes de reservar. Idiomas de consulta: ${l}. La lengua de esta página no determina la lengua de la consulta. Prepare sus informes y la lista de medicamentos que toma. Compruebe los horarios actuales; la disponibilidad puede cambiar.`,
 en:l=>`Choose an available appointment and check the price before booking. Consultation languages: ${l}. The language of this page does not determine the consultation language. Have your medical reports and current medication list ready. Check the current appointment times; availability can change.`,
 cs:l=>`Vyberte si volný termín a před rezervací zkontrolujte cenu. Jazyky konzultace: ${l}. Jazyk této stránky neurčuje jazyk konzultace. Připravte si lékařské zprávy a seznam užívaných léků. Ověřte si aktuální termíny; dostupnost se může změnit.`,
 de:l=>`Wählen Sie einen verfügbaren Termin und prüfen Sie vor der Buchung den Preis. Beratungssprachen: ${l}. Die Sprache dieser Seite bestimmt nicht die Sprache der Beratung. Halten Sie Ihre Befunde und eine Liste Ihrer aktuellen Medikamente bereit. Prüfen Sie die aktuellen Termine; die Verfügbarkeit kann sich ändern.`,
 pt:l=>`Escolha um horário disponível e confirme o preço antes de marcar. Línguas da consulta: ${l}. A língua desta página não determina a língua da consulta. Prepare os seus relatórios médicos e a lista de medicamentos que toma. Confirme os horários atuais; a disponibilidade pode mudar.`,
 ro:l=>`Alegeți un interval disponibil și verificați prețul înainte de programare. Limbile consultației: ${l}. Limba acestei pagini nu stabilește limba consultației. Pregătiți documentele medicale și lista medicamentelor pe care le luați. Verificați orele disponibile; disponibilitatea se poate schimba.`
};
export const emergency = {
 es:'Si necesita atención urgente, llame al 112; no espere a una cita online.',en:'If you need emergency care, call 112; do not wait for an online appointment.',cs:'Pokud potřebujete neodkladnou pomoc, volejte 112; nečekejte na online konzultaci.',de:'Rufen Sie bei einem Notfall die 112 an; warten Sie nicht auf einen Online-Termin.',pt:'Se precisar de ajuda urgente, ligue 112; não espere por uma consulta online.',ro:'Dacă aveți nevoie de ajutor de urgență, sunați la 112; nu așteptați o consultație online.'
};
export const missingFaqs = {
 'consulta-diagnotico-vascular':[
 ['¿Se realiza el eco-Doppler durante la videollamada?','No. La consulta permite revisar los informes que ya tenga. El eco-Doppler y otras pruebas que requieren equipos o exploración física se realizan de forma presencial.'],
 ['¿Qué debo preparar para la revisión de mis pruebas?','Tenga a mano los informes vasculares, los resultados de pruebas previas y la lista de medicamentos que toma. Anote los síntomas y las dudas que quiere consultar.'],
 ['¿En qué idioma puedo consultar y cómo reservo?','El médico asignado, Leandro Wang, ofrece consultas en español. Compruebe su perfil, el precio y los horarios disponibles antes de reservar. No se garantiza una cita para el mismo día.']
 ],
 'consulta-flebologia-y-linfologia':[
 ['¿Se pueden realizar tratamientos de varices o drenaje linfático online?','No. La videollamada permite comentar sus síntomas e informes. Los procedimientos y los tratamientos físicos requieren atención presencial.'],
 ['¿Qué información conviene preparar?','Reúna los informes y pruebas que ya tenga, la lista de medicamentos y una descripción de cuándo empezó la hinchazón o la molestia. Si dispone de fotografías, tenga también esas imágenes a mano.'],
 ['¿Qué idioma habla el médico asignado?','Leandro Wang ofrece consultas en español. Revise los horarios y el precio en la página de reserva. La disponibilidad puede cambiar.']
 ],
 'consulta-online-medicina-estetica':[
 ['¿El precio incluye un procedimiento estético?','No. Este servicio es una consulta médica por videollamada. Las infiltraciones, el láser y otros procedimientos se realizan de forma presencial y no forman parte de esta consulta online.'],
 ['¿Qué debo preparar antes de la consulta?','Anote qué le preocupa y qué resultado espera. Tenga a mano la lista de medicamentos, sus antecedentes, los tratamientos estéticos previos y cualquier informe o presupuesto que quiera comentar.'],
 ['¿En qué idioma se realiza la consulta?','La médica asignada, María Fernanda Ocampo Mora, ofrece consultas en español. Compruebe el precio y los horarios disponibles antes de reservar.']
 ],
 'consulta-salud-vascular-circulatoria':[
 ['¿La consulta incluye una ecografía o un procedimiento vascular?','No. La consulta se realiza por videollamada. Las pruebas que requieren equipos, la exploración física y los procedimientos vasculares necesitan una visita presencial.'],
 ['¿Qué idiomas están disponibles para esta consulta?','La médica asignada, Eszter Szilágyi, indica español, inglés, húngaro y alemán en su perfil. Compruebe la lengua elegida, el precio y los horarios antes de reservar.']
 ]
};
export const dermAnswers = {
 es:[
 'La consulta de piel de medicina general y la consulta con un dermatólogo tienen profesionales distintos. Esta consulta está asignada a Alfredo del Valle Moreno Montañez, cuya especialidad en Dermatología Médico-Quirúrgica y Venereología consta en CGCOM. La valoración online puede requerir una exploración presencial.',
 'Las fotografías y la videollamada pueden ayudar a orientar la valoración, pero no sustituyen una exploración con dermatoscopio ni una biopsia. Si una lesión necesita una prueba o exploración presencial, el dermatólogo indicará el siguiente paso. No se promete un diagnóstico definitivo por imagen.',
 'Si considera necesaria una biopsia, el dermatólogo le explicará la necesidad de una valoración presencial. La biopsia no se realiza por videollamada y su fecha depende del centro que la lleve a cabo.'
 ],
 en:[
 'General medical skin consultations and dermatologist consultations are provided by different clinicians. This service is assigned to Alfredo del Valle Moreno Montañez, whose dermatology specialty is listed in CGCOM. An online assessment may need an in-person examination.',
 'Photos and a video call can help guide an assessment, but they do not replace examination with a dermatoscope or a biopsy. If a lesion needs an in-person test or examination, the dermatologist will explain the next step. A definitive diagnosis from images is not promised.',
 'If a biopsy is needed, the dermatologist will explain the need for an in-person assessment. A biopsy cannot be performed by video call; its timing depends on the centre providing it.'
 ],
 cs:[
 'Kožní konzultaci u praktického lékaře a konzultaci u dermatologa poskytují různí lékaři. Tuto službu poskytuje Alfredo del Valle Moreno Montañez, jehož specializace v dermatologii je uvedena v registru CGCOM. Online posouzení může vyžadovat osobní vyšetření.',
 'Fotografie a videohovor mohou pomoci při posouzení, ale nenahrazují vyšetření dermatoskopem ani biopsii. Pokud je nutné osobní vyšetření nebo test, dermatolog vysvětlí další postup. Konečnou diagnózu z fotografií nelze slíbit.',
 'Pokud je potřebná biopsie, dermatolog vysvětlí potřebu osobního vyšetření. Biopsii nelze provést prostřednictvím videohovoru; termín závisí na pracovišti, které ji provede.'
 ],
 de:[
 'Eine allgemeine ärztliche Hautberatung und eine dermatologische Beratung werden von unterschiedlichen Ärzten angeboten. Dieser Dienst ist Alfredo del Valle Moreno Montañez zugeordnet, dessen Fachgebiet Dermatologie im CGCOM-Register verzeichnet ist. Eine Online-Beratung kann eine Untersuchung vor Ort erfordern.',
 'Fotos und ein Videogespräch können bei der Einschätzung helfen, ersetzen aber weder eine Untersuchung mit dem Dermatoskop noch eine Biopsie. Falls eine Untersuchung vor Ort nötig ist, erläutert der Dermatologe den nächsten Schritt. Eine abschließende Diagnose anhand von Bildern wird nicht versprochen.',
 'Falls eine Biopsie nötig ist, erläutert der Dermatologe die erforderliche Untersuchung vor Ort. Eine Biopsie lässt sich nicht per Videogespräch durchführen. Der Termin hängt von der Einrichtung ab, die sie durchführt.'
 ],
 pt:[
 'A consulta de pele de medicina geral e a consulta de dermatologia são prestadas por profissionais diferentes. Este serviço está atribuído a Alfredo del Valle Moreno Montañez, cuja especialidade em dermatologia consta do CGCOM. A avaliação online pode exigir um exame presencial.',
 'As fotografias e a videochamada podem ajudar na avaliação, mas não substituem o exame com dermatoscópio nem uma biópsia. Se a lesão precisar de um exame presencial, o dermatologista explicará o passo seguinte. Não se promete um diagnóstico definitivo por imagem.',
 'Se for necessária uma biópsia, o dermatologista explicará a necessidade de avaliação presencial. A biópsia não se realiza por videochamada e a data depende do centro que a efetuar.'
 ],
 ro:[
 'Consultația de medicină generală pentru probleme de piele și consultația dermatologică sunt oferite de medici diferiți. Acest serviciu este atribuit lui Alfredo del Valle Moreno Montañez, a cărui specializare în dermatologie apare în registrul CGCOM. Evaluarea online poate necesita un examen fizic.',
 'Fotografiile și apelul video pot ajuta evaluarea, dar nu înlocuiesc examinarea cu dermatoscopul sau biopsia. Dacă leziunea necesită un test ori un examen fizic, dermatologul va explica pasul următor. Nu se promite un diagnostic definitiv doar pe baza imaginilor.',
 'Dacă este necesară o biopsie, dermatologul va explica nevoia unei evaluări în persoană. Biopsia nu se poate realiza prin apel video, iar data depinde de centrul care o efectuează.'
 ]
};
// Service-specific answers replacing newFaqCopy entries by index (after the per-service filter).
const csFemaleLanguages='Před rezervací zkontrolujte profil přidělené lékařky, cenu a dostupné termíny. Jazyky konzultace: ';
export const faqOverrides = {
 'consulta-online-medicina-estetica':{
  en:{1:'Note what concerns you and the result you hope for. Have your medication list, medical history, previous aesthetic treatments and any reports or quotes you want to discuss to hand.'},
  de:{1:'Notieren Sie, was Sie stört und welches Ergebnis Sie sich wünschen. Halten Sie Ihre Medikamentenliste, Vorerkrankungen, frühere ästhetische Behandlungen sowie Befunde oder Kostenvoranschläge bereit, die Sie besprechen möchten.'},
  cs:{1:'Poznamenejte si, co vás trápí a jaký výsledek očekáváte. Připravte si seznam užívaných léků, údaje o předchozích onemocněních a estetických ošetřeních a zprávy či cenové nabídky, které chcete probrat.',2:csFemaleLanguages},
  pt:{1:'Anote o que o preocupa e que resultado espera. Tenha à mão a lista de medicamentos, os seus antecedentes, os tratamentos estéticos anteriores e os relatórios ou orçamentos que queira comentar.'},
  ro:{1:'Notați ce vă preocupă și ce rezultat așteptați. Pregătiți lista medicamentelor, antecedentele medicale, tratamentele estetice anterioare și orice document medical sau ofertă de preț pe care doriți să le discutați.'}
 },
 'consulta-salud-vascular-circulatoria':{cs:{1:csFemaleLanguages}}
};
export const newFaqCopy = {
 en:[['Does the video consultation include tests or procedures?','No. This is a medical video consultation. Tests that require equipment, physical examinations and procedures take place in person.'],['What should I prepare?','Have your previous reports and a list of your current medicines ready. Note when your symptoms started, any previous treatment and the questions you want to discuss.'],['Which consultation languages are available?','Check the assigned clinician’s profile, the price and available times before booking. Consultation languages: ']],
 cs:[['Zahrnuje videokonzultace vyšetření nebo zákroky?','Ne. Jde o lékařskou konzultaci přes video. Vyšetření vyžadující přístroje, fyzické vyšetření a zákroky probíhají osobně.'],['Co si mám připravit?','Připravte si předchozí zprávy a seznam užívaných léků. Poznamenejte si začátek obtíží, dosavadní léčbu a otázky, které chcete probrat.'],['V jakých jazycích probíhá konzultace?','Před rezervací zkontrolujte profil přiděleného lékaře, cenu a dostupné termíny. Jazyky konzultace: ']],
 de:[['Sind Untersuchungen oder Eingriffe in der Videoberatung enthalten?','Nein. Dies ist eine ärztliche Videoberatung. Untersuchungen mit Geräten, körperliche Untersuchungen und Eingriffe finden vor Ort statt.'],['Was sollte ich vorbereiten?','Halten Sie frühere Befunde und eine Liste Ihrer aktuellen Medikamente bereit. Notieren Sie den Beginn Ihrer Beschwerden, bisherige Behandlungen und Ihre Fragen.'],['In welchen Sprachen ist die Beratung möglich?','Prüfen Sie vor der Buchung das Profil der zugeordneten ärztlichen Fachperson, den Preis und die verfügbaren Termine. Beratungssprachen: ']],
 pt:[['A videochamada inclui exames ou procedimentos?','Não. Trata-se de uma consulta médica por videochamada. Os exames que exigem equipamentos, o exame físico e os procedimentos realizam-se presencialmente.'],['O que devo preparar?','Tenha à mão os relatórios anteriores e a lista de medicamentos que toma. Anote quando começaram os sintomas, os tratamentos anteriores e as perguntas que quer colocar.'],['Em que línguas se realiza a consulta?','Consulte o perfil do profissional atribuído, o preço e os horários disponíveis antes de marcar. Línguas da consulta: ']],
 ro:[['Consultația video include investigații sau proceduri?','Nu. Aceasta este o consultație medicală prin apel video. Investigațiile care necesită echipamente, examenul fizic și procedurile se realizează în persoană.'],['Ce trebuie să pregătesc?','Pregătiți rapoartele anterioare și lista medicamentelor pe care le luați. Notați când au început simptomele, tratamentele anterioare și întrebările pe care doriți să le discutați.'],['În ce limbi se poate desfășura consultația?','Verificați profilul medicului alocat, prețul și orele disponibile înainte de programare. Limbile consultației: ']]
};
