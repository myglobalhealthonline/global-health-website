# Spain sick-leave wording review — 14 September 2026

Review only. Nothing was written to the database, no content was pushed, no deployment was made and the ledger was not changed. Every proposed replacement below is a **draft that needs clinical approval** (ledger §43.4–43.5). The passages marked LEGAL also need legal review.

## Legal reference

BOE, Real Decreto 625/2014, article 2.1 (checked on 14 September): for contingencias comunes, the parte médico de baja is issued by "el médico del servicio público de salud". For contingencias profesionales, where the worker is covered by a mutua, it is issued by the mutua's medical services (or a collaborating company's). A private consultation cannot issue a parte de baja, confirmación or alta.

## Method and limits

- The 422 Spain URLs returning HTTP 200 in `seo/spain/target-page-inventory.csv` were fetched live on 14 September across es/en/pt/cs/ro/de. The visible text and JSON-LD were searched for baja/IT/parte/mutua/justificante and the equivalent terms in each locale (sick leave/note, baixa/atestado, Krankschreibung/Arbeitsunfähigkeit/Attest, neschopnost/neschopenka, concediu medical/adeverință).
- The 12 URLs returning 404 were not scanned. Neither were logged-in or booking steps, emails, or **the issued certificate/PDF template itself**. The template should be checked separately, because the service page says it "documenta … la valoración de incapacidad temporal".
- Service copy was confirmed through the public API (`/api/services/<slug>?countryCode=es&locale=XX`) for `justificante-medico-online` and `consulta-medica-online` in all 6 locales. The ES service record shows updatedAt 2026-09-14T04:31:37Z, which is after phase 2.
- False positives were excluded: "darse de baja" (privacy), tension/baixar articles, "Baja Sajonia", "incapacidade de engolir", "pressão baixa", and legal "statutory consumer rights".
- **GSC:** no fresh pull was possible today. The local Google API config is missing (`~/.config/claude-seo/google-api.json`), and the in-app browser is not signed in to Google; I did not sign in. The figures below come from the complete final exports of 13 September (`seo/spain/raw/gsc-*-2026-09-13.json`, current window 13 Aug–9 Sep, previous window 16 Jul–12 Aug) and the 11 September daily read. OpenSEO needs re-authorisation, so no keyword volumes are available.

## 1. Search demand and commercial fit (GSC, final windows)

Page totals (clicks / impressions / average position):

| Page | 16 Jul–12 Aug | 13 Aug–9 Sep |
| --- | --- | --- |
| ES article `baja-laboral-por-ansiedad-como-funciona` | — (published 14 Aug) | 10 / 922 / 12.4 |
| EN article `sick-leave-anxiety-spain` | — | 3 / 158 / 4.0 |
| DE article | — | 0 / 69 / 6.9 |
| PT article | — | 2 / 45 / 4.2 |
| RO article | — | 0 / 21 / 5.3 |
| CS article | — | 1 / 5 / 7.4 |
| **All 6 articles** | — | **16 / 1,220** |
| EN justificante service | 1 / 100 / 5.6 | 1 / 190 / 6.0 |
| PT justificante service | 2 / 46 | 1 / 15 |
| DE justificante service | 0 / 22 | 0 / 18 |
| RO justificante service | 0 / 4 | 0 / 12 |
| CS justificante service | 0 / 4 | 0 (no row) |
| **ES justificante service** | **no row** | **no row** |
| **All justificante services** | **3 / 176** | **2 / 235** |

Queries disclosed in the query+page export (13 Aug–9 Sep):

- **ES article:** 34 queries and 139 of the page's 922 impressions; 0 clicks. **Every query is statutory-leave intent.** Examples:
  - "mi médico no me da la baja por ansiedad": 41 impressions, position 8.6
  - "estoy de baja por ansiedad y me ha llamado la mutua": 13, position 8.0
  - "cuando te llama la mutua estando de baja por ansiedad": 8, position 7.5
  - "inspección médica por baja laboral por ansiedad": 4, position 10
  - "baja por ansiedad mutua": 1, position 9
  - The rest are cobro, duración, alargar and "cómo conseguir" queries at positions 45–89.
  - These users are already inside the public IT/mutua process or trying to enter it. A private consultation cannot deliver what they want.
- **DE article:** "krankschreibung (in) spanien" and "spanien krankmeldung", 7 impressions at positions 7–9. **EN article:** "burnout sick leave spain", 1 impression. **CS article:** 2 impressions.
- **Justificante services:** EN "doctors note spain fast / same day", 4 impressions at positions 7–11. DE "online ärztliches attest", 9 impressions at position 7.4. These match the private note the page sells.
- No disclosed query routes "baja médica online/privada" intent to any service page.

Conclusions:

- Sick-leave search visibility sits almost entirely on the informational articles, and those articles set expectations correctly (see §2.3).
- Private-note intent reaching the service pages is tiny: about 13 disclosed impressions, and the ES service page has no Google visibility at all.
- The commercial-fit hold (SEO-SPAIN-002) is confirmed. Do not expand the cluster, and do not retarget the service at "baja" queries.
- The user-expectation risk is **not search-driven**. It comes from on-site copy that tells visitors doctors provide "bajas médicas" and "certificados de incapacidad temporal" on:
  - the home page
  - four doctor profiles
  - the GP service
  - the justificante service
  - the ES meta keywords
- That copy contradicts the articles and the FAQ page.

## 2. Inventory and classification

Counts are per locale URL. **43 URLs imply statutory leave, 23 are ambiguous, and the remainder are accurate.**

### 2.1 Implies statutory sick leave — fix (clinical approval)

| ID | URLs | Exact live passage (ES unless stated) | Why |
| --- | --- | --- | --- |
| H1 | Home ×6 | ES "Certificados médicos y bajas laborales cuando sea clínicamente apropiado" · EN "Medical certificates and sick notes when clinically appropriate" · PT "Atestados médicos e baixas quando clinicamente apropriado" · DE "Ärztliche Atteste und Krankschreibungen, sofern klinisch angemessen" · CS "Lékařská potvrzení a neschopenky, je-li to klinicky vhodné" · RO "Certificate medicale și concedii medicale atunci când este clinic adecvat" | Offers "bajas"/Krankschreibungen/neschopenky/concedii as a service |
| D1 | Profiles Olivas, Ocampo, Brito, Tahir ×6 = 24 | ES list item "Bajas médicas e informes médicos" and FAQ "…renovación de recetas, bajas médicas e informes médicos." · EN "medical leave(s)" · PT "baixas médicas" · DE "Krankschreibungen"/"Krankmeldungen" (Tahir) · CS "pracovní neschopnosti" · RO "concedii medicale" | Lists sick leave as something the doctor provides |
| D2 | `es/doctors` listing FAQ (DB, `patch-spain-doctors-content.ts` Q5) | Q "¿Pueden los médicos de Global Health España emitir informes médicos y bajas laborales?" A "Sí. …" | Answers "Sí" to a question about bajas laborales |
| G1 | `consulta-medica-online` ×6, FAQ `cmre7px5i0004ngjugfol80qo` | "¿Puedo obtener la baja médica a través de este servicio?" — "Los médicos de Global Health pueden emitir un certificado médico privado que acredite la incapacidad temporal. Para acceder a la baja por incapacidad temporal (IT) del sistema público con prestación económica de la Seguridad Social, necesitas médico de cabecera en el SNS." (EN "Can I obtain medical leave…"; DE "Kann ich … eine Krankschreibung erhalten?"; CS "…získat pracovní neschopenku?"; PT/RO equivalent) | Does not say no; a private certificate "acredite la incapacidad temporal" (statutory term); omits the mutua |
| G2 | `es/services/consulta-medica-online` ServiceLink `cmre7rgl80000g8jufspbvv3k` | "¿Justificante médico o certificado de baja?" — "Si tu situación está relacionada con justificante médico o certificado de baja, nuestra Justificante Médico te ofrece la evaluación adecuada." | Routes "certificado de baja" to the private service |
| G3 | `en/services/consulta-medica-online` body | "Medical letters and documentation — sick notes, referral letters" | "Sick notes" is ambiguous in a Spain context and the page offers them |
| J1 | `justificante-medico-online` ×6, seoKeywords (rendered `<meta name="keywords">`) | "certificado incapacidad laboral privado", "baja médica privada online España" | No such thing as a private baja |
| J2 | Justificante ×6, seoDescription/title | ES "¿Necesitas un justificante médico o certificado de incapacidad laboral?" · DE "…ein ärztliches Attest oder eine Arbeitsunfähigkeitsbescheinigung?" (the German statutory document name) · PT "certificado de incapacidade laboral" · CS "potvrzení o pracovní neschopnosti" · RO "certificat de incapacitate de muncă" · EN title "…\| Sick Note \| English Doctor" | Search snippet names a statutory-sounding document |
| J3 | Justificante ×6, body plus FAQ "¿El certificado especifica el diagnóstico?" | "Si el médico determina que tu situación clínica justifica la emisión de un certificado médico de incapacidad temporal para el trabajo, lo emite el mismo día…" / "El certificado documenta la evaluación clínica y la valoración de incapacidad temporal para el trabajo." Heading "Valoración de la incapacidad laboral" | Private document described in statutory IT terms |
| J4 | Justificante ×6, mutua passages | "Para trabajadores con mutua — Si tu empresa tiene mutua colaboradora con la Seguridad Social, el certificado médico privado puede servir como documentación previa mientras gestionas la baja a través de la mutua." · Autónomo box "…tienes derecho a prestación por IT — pero gestionada a través de tu mutua colaboradora. El certificado médico privado puede servirte como documentación inicial." · EN "can support claims through your mutua colaboradora" | Inaccurate: for common illness the SPS doctor issues the baja, not the mutua; implies the private note starts an IT process |
| J5 | Justificante ×6, public-system facts (LEGAL) | "El parte de baja oficial del sistema público es emitido por el médico de cabecera o el médico de urgencias del SNS… prestación económica de la INSS a partir del cuarto día de baja — con los tres primeros a cargo de la empresa en contratos laborales estándar." · "Global Health no emite partes de baja del SNS. Estos requieren un médico contratado con el sistema público." | Factual errors. For common illness, days 1–3 are unpaid unless a convenio says otherwise; the employer pays days 4–15; INSS or the mutua pays from day 16. Mutua issuance is omitted. "Contratado" misstates the legal basis (it is RD 625/2014, not a contract). |
| J6 | Justificante ×6, bullets and validity FAQ (LEGAL) | "Es válido como justificante ante el empleador para ausencias laborales" · "Sirve como documentación clínica de respaldo si después acudes a tu médico de cabecera para tramitar la IT" · FAQ "tiene plena validez legal como documento clínico. La mayoría de empleadores lo aceptan…" · DE FAQ "Krankmeldeschein des SNS oder der Berufsgenossenschaft" · DE body "Krankenkasse/Mutualität" · PT "mútuo colaboradora" | Overclaims acceptance and legal validity. DE mistranslates mutua as German statutory bodies; PT has a gender/term error. |

### 2.2 Ambiguous — clarify (clinical; L2 also legal)

| ID | URLs | Exact live passage | Issue |
| --- | --- | --- | --- |
| J7 | Justificante ×6, hero | ES "Estás enfermo y no puedes trabajar. Necesitas un documento médico que lo acredite — hoy…" (PT/DE/CS/RO equivalent; EN "Feeling too unwell to work…" is acceptable) | Frames the private note as proof of incapacity |
| L2 | `legal/medical-disclaimer` ×6 (ES indexable; the other five are noindex and render the same ES text) | "Los partes médicos emitidos a través de nuestra plataforma son aceptados por empleadores e instituciones educativas en todo el país. Cuando un empleador requiera un parte médico durante un periodo de baja, este podrá emitirse… Tenga en cuenta que los partes de baja para su presentación ante la Seguridad Social (INSS) no están disponibles a través de nuestro servicio. Los pacientes que necesiten esta documentación… deben acudir a una consulta presencial con su médico de cabecera." | "Partes médicos … aceptados … en todo el país" overclaims and reuses the statutory term; the mutua route is missing |
| A1 | `about` ×6 (frontend content) | ES "Un justificante médico emitido por el médico que le ha valorado. La baja laboral y su prestación las decide por separado el INSS conforme a sus propios criterios." (EN "Entitlement to sick-leave benefit is decided separately by INSS"; PT/DE/CS/RO equivalent) | Attributes the baja to the INSS; omits SPS/mutua; does not say the note is not a baja |
| C1 | `contact` ×6 (`frontend/lib/content/country-contact.ts`; CS/DE/PT/RO via template) | ES "La baja laboral y sus prestaciones las gestionan el INSS y los servicios de salud autonómicos…"; FAQ "¿Sirve su certificado para una baja laboral?" — "El certificado acredita la valoración médica realizada. La baja laboral oficial…" (no explicit "no") · EN "Can I use your certificate for statutory sick leave?" (same pattern) · CS/DE/PT/RO FAQ "Will my justificante be accepted? … same validity as one issued in person" | Never answers "no"; omits the mutua |
| P1 | `psiquiatra-online` es/pt/de/cs/ro | "Informes psiquiátricos para incapacidad laboral temporal o permanente" | Reads as if the report certifies IT/IP |

### 2.3 Accurate — no change

- **Anxiety sick-leave article, 6 locales, plus its teaser on 6 blog listings and ~18 related-article cards.** Examples: "Una consulta privada —también la nuestra— no emite el parte de baja"; FAQ "Una consulta privada puede evaluarle, tratarle y emitir un justificante médico de ausencia, pero no emite el parte de baja"; footer "no emite partes de baja de incapacidad temporal". The issuer rules match RD 625/2014 art. 2.
- **FAQ pages ES/EN:** "¿Pueden darme la baja médica (incapacidad temporal)? No directamente…"; "¿Qué es un justificante médico y en qué se diferencia de la baja?"
- `blog/medical-review-policy` ×6.
- **Justificante "Lo que este servicio no puede hacer"**, including "No garantizamos la emisión del certificado".
- Paediatrics school-absence notes, and the Dr. Cornejo psychiatric-report FAQ ("puede discutir esta necesidad durante la consulta").
- Generic GP/specialist disclaimers ("certificados médicos únicamente cuando sea clínicamente apropiado").
- Press page, and the GP ES body "Si necesitas justificar una ausencia laboral, el médico puede emitir el certificado médico correspondiente…".

## 3. Proposed replacement copy — DRAFT, needs clinical approval

Native drafting by AI with self-review against ES. This is not native-speaker or clinical approval. "parte de baja" and "mutua" stay in Spanish in every locale, following the articles' convention. Register follows each existing page ("tú" on PT/DE service bodies, "usted/Sie" elsewhere).

### H1 — Home services bullet (PageContent `CERTS_ITEM`; change the Spain rows only, because the seed constant is shared with other markets)
- ES: Justificantes médicos privados cuando sea clínicamente apropiado
- EN: Private medical certificates when clinically appropriate
- PT: Atestados médicos privados quando clinicamente apropriado
- DE: Private ärztliche Atteste, sofern klinisch angemessen
- CS: Soukromá lékařská potvrzení, je-li to klinicky vhodné
- RO: Adeverințe medicale private, atunci când este clinic adecvat

### D1 — Doctor profiles (Olivas, Ocampo, Brito, Tahir): replace only the sick-leave term in the list item and FAQ answer
- ES: "Bajas médicas e informes médicos" → "Justificantes médicos privados e informes médicos"; "bajas médicas e informes" → "justificantes médicos privados e informes"
- EN: "medical leave(s)" → "private medical certificates"
- PT: "baixas médicas" → "atestados médicos privados"
- DE: "Krankschreibungen" / "Krankmeldungen" → "private ärztliche Atteste"
- CS: "pracovní neschopnosti" → "soukromá lékařská potvrzení"
- RO: "concedii medicale" → "adeverințe medicale private"

### D2 — `es/doctors` listing FAQ (ES)
- Q: ¿Pueden los médicos de Global Health España emitir informes y justificantes médicos?
- A: Sí, cuando esté clínicamente indicado y a criterio profesional del médico tras la evaluación. No emiten partes de baja por incapacidad temporal, que corresponden al servicio público de salud o, en contingencias profesionales, a la mutua. Tras cada consulta recibirás por correo electrónico las notas clínicas del médico con sus conclusiones y recomendaciones.

### G1 — GP service FAQ `cmre7px5i0004ngjugfol80qo`
- **ES** — Q: ¿Puedo obtener la baja médica (incapacidad temporal) a través de este servicio? — A: No. El parte de baja por incapacidad temporal lo emite el médico del servicio público de salud o, si se trata de un accidente de trabajo o una enfermedad profesional, el de la mutua, y es el que da acceso a la prestación de la Seguridad Social. Nuestros médicos pueden emitir un justificante médico privado que acredita la consulta y la valoración clínica, cuando esté indicado, pero no sustituye al parte de baja ni da derecho a prestación.
- **EN** — Q: Can I get statutory sick leave (baja médica) through this service? — A: No. The parte de baja for temporary incapacity is issued by a public health service doctor or, for a workplace accident or occupational disease, by the mutua doctor, and it is what gives access to Social Security benefit. Our doctors can issue a private medical certificate recording the consultation and clinical assessment where clinically appropriate, but it does not replace the parte de baja or give entitlement to benefit.
- **PT** — Q: Posso obter a baixa médica (incapacidade temporária) através deste serviço? — A: Não. O parte de baja por incapacidade temporária é emitido pelo médico do serviço público de saúde ou, em caso de acidente de trabalho ou doença profissional, pelo médico da mutua, e é o que dá acesso à prestação da Seguridad Social. Os nossos médicos podem emitir um atestado médico privado que regista a consulta e a avaliação clínica, quando clinicamente indicado, mas não substitui o parte de baja nem dá direito a prestação.
- **DE** — Q: Kann ich über diesen Service eine Krankschreibung (baja médica) erhalten? — A: Nein. Den parte de baja wegen vorübergehender Arbeitsunfähigkeit stellt ein Arzt des öffentlichen Gesundheitsdienstes aus, bei Arbeitsunfall oder Berufskrankheit ein Arzt der Mutua; nur er eröffnet den Anspruch auf Leistungen der Seguridad Social. Unsere Ärzte können, sofern klinisch angemessen, ein privates ärztliches Attest über die Konsultation und die klinische Beurteilung ausstellen. Es ersetzt den parte de baja nicht und begründet keinen Leistungsanspruch.
- **CS** — Q: Mohu přes tuto službu získat pracovní neschopenku (baja médica)? — A: Ne. Parte de baja pro dočasnou pracovní neschopnost vystavuje lékař veřejné zdravotní služby, u pracovního úrazu nebo nemoci z povolání lékař mutuy, a jen ten zakládá nárok na dávku Seguridad Social. Naši lékaři mohou, je-li to klinicky vhodné, vystavit soukromé lékařské potvrzení o konzultaci a klinickém posouzení. Parte de baja nenahrazuje a nárok na dávku nezakládá.
- **RO** — Q: Pot obține concediu medical (baja médica) prin acest serviciu? — A: Nu. Parte de baja pentru incapacitate temporară este emis de medicul serviciului public de sănătate sau, pentru accidente de muncă și boli profesionale, de medicul mutuei, și doar acesta dă acces la indemnizația Seguridad Social. Medicii noștri pot emite, când este clinic adecvat, o adeverință medicală privată care atestă consultația și evaluarea clinică. Aceasta nu înlocuiește parte de baja și nu dă drept la indemnizație.

### G2 — ES ServiceLink `cmre7rgl80000g8jufspbvv3k`
- Heading: ¿Necesitas un justificante médico privado?
- Body: Si necesitas documentar una consulta médica ante tu empresa o tu centro de estudios, nuestro servicio de Justificante Médico te ofrece la valoración adecuada. No emite partes de baja.

### G3 — EN GP body bullet
- Medical letters and documentation — private medical certificates, referral letters

### J1 — Justificante seoKeywords (one array shared by all locales)
- Remove "certificado incapacidad laboral privado" and "baja médica privada online España".

### J2 — Justificante title/description
- Descriptions no longer carry "El mismo día"; this also fits the §56.4 same-day cleanup. Keep it only if the owner prefers.
- **EN seoTitle:** Private Medical Certificate Online Spain | English Doctor
- **ES:** ¿Necesitas un justificante médico privado? Médicos colegiados valoran tus síntomas por videollamada y lo emiten cuando está clínicamente justificado. No sustituye al parte de baja.
- **EN:** Need a private medical certificate in Spain? OMC-registered doctors assess you by video and issue one where clinically justified. Not a parte de baja (statutory sick leave).
- **PT:** Precisa de um atestado médico privado? Médicos inscritos avaliam os seus sintomas por videochamada e emitem-no quando clinicamente justificado. Não substitui o parte de baja.
- **DE:** Sie brauchen ein privates ärztliches Attest? Zugelassene Ärzte beurteilen Ihre Symptome per Videoanruf und stellen es aus, wenn medizinisch gerechtfertigt. Kein Ersatz für den parte de baja.
- **CS:** Potřebujete soukromé lékařské potvrzení? Registrovaní lékaři posoudí vaše příznaky přes videohovor a vystaví ho, je-li to lékařsky odůvodněné. Nenahrazuje parte de baja.
- **RO:** Ai nevoie de o adeverință medicală privată? Medici înregistrați îți evaluează simptomele prin apel video și o emit când este justificat medical. Nu înlocuiește parte de baja.

### J3 — Certificate section heading, body sentence and diagnosis FAQ
- **ES**
  - Heading: Valoración clínica de tu capacidad para trabajar
  - Body: Si el médico determina que tu situación clínica lo justifica, emite el mismo día un justificante médico privado con la fecha de la valoración, los síntomas, la valoración clínica y su criterio sobre la compatibilidad con tu actividad laboral, sin especificar diagnóstico si no lo deseas. No es un parte de baja por incapacidad temporal.
  - FAQ: El justificante documenta la valoración clínica y el criterio del médico sobre tu capacidad para trabajar ese día; no es un parte de baja. Si prefieres que no figure el diagnóstico —por privacidad—, coméntalo con el médico al inicio de la consulta.
- **EN**
  - Heading: Clinical assessment of your fitness for work
  - Body: If your doctor determines that your clinical situation justifies it, they issue a private medical certificate the same day, recording the date of assessment, symptoms, clinical findings and their opinion on your fitness for your work, without the diagnosis if you prefer. It is not a parte de baja for temporary incapacity.
  - FAQ: The certificate documents the clinical assessment and the doctor's opinion on your fitness for work that day; it is not a parte de baja. If you prefer the specific diagnosis not to appear, for privacy, tell the doctor at the start of the consultation.
- **PT**
  - Heading: Avaliação clínica da tua capacidade para trabalhar
  - Body: Se o médico determinar que a tua situação clínica o justifica, emite no mesmo dia um atestado médico privado com a data da avaliação, os sintomas, a avaliação clínica e o seu critério sobre a compatibilidade com a tua atividade laboral, sem indicar o diagnóstico se não o desejares. Não é um parte de baja por incapacidade temporária.
  - FAQ: O atestado documenta a avaliação clínica e o critério do médico sobre a sua capacidade para trabalhar nesse dia; não é um parte de baja. Se preferir que não conste o diagnóstico, por privacidade, diga-o ao médico no início da consulta.
- **DE**
  - Heading: Klinische Beurteilung deiner Arbeitsfähigkeit
  - Body: Wenn der Arzt feststellt, dass deine klinische Situation es rechtfertigt, stellt er noch am selben Tag ein privates ärztliches Attest aus. Es dokumentiert Datum, Symptome, klinische Beurteilung und seine Einschätzung zur Vereinbarkeit mit deiner Arbeit – auf Wunsch ohne Diagnose. Es ist kein parte de baja wegen vorübergehender Arbeitsunfähigkeit.
  - FAQ: Das Attest dokumentiert die klinische Beurteilung und die ärztliche Einschätzung Ihrer Arbeitsfähigkeit an diesem Tag; es ist kein parte de baja. Wenn die Diagnose aus Datenschutzgründen nicht erscheinen soll, sagen Sie das zu Beginn des Termins.
- **CS**
  - Heading: Klinické posouzení vaší schopnosti pracovat
  - Body: Pokud lékař usoudí, že to váš klinický stav odůvodňuje, vystaví týž den soukromé lékařské potvrzení s datem vyšetření, příznaky, klinickým posouzením a jeho názorem na slučitelnost s vaší prací, na přání bez diagnózy. Nejde o parte de baja pro dočasnou pracovní neschopnost.
  - FAQ: Potvrzení dokládá klinické vyšetření a názor lékaře na vaši schopnost pracovat v daný den; nejde o parte de baja. Nechcete-li z důvodu soukromí uvést diagnózu, řekněte to lékaři na začátku konzultace.
- **RO**
  - Heading: Evaluarea clinică a capacității tale de a lucra
  - Body: Dacă medicul stabilește că situația ta clinică o justifică, emite în aceeași zi o adeverință medicală privată cu data evaluării, simptomele, evaluarea clinică și opinia sa privind compatibilitatea cu activitatea ta, fără diagnostic dacă nu dorești. Nu este parte de baja pentru incapacitate temporară.
  - FAQ: Adeverința documentează evaluarea clinică și opinia medicului privind capacitatea ta de a lucra în acea zi; nu este parte de baja. Dacă preferi să nu apară diagnosticul, din motive de confidențialitate, spune-i medicului la începutul consultației.

### J4 — Mutua and self-employed passages
**Autónomo box** (EN: replaces the "Self-employed workers and freelancers" paragraph)
- ES: ¿Eres autónomo? Si cotizas por incapacidad temporal, el parte de baja también lo emite tu médico del servicio público de salud (o la mutua, si es una contingencia profesional), y la prestación suele gestionarla tu mutua colaboradora. El justificante médico privado no sustituye ese parte.
- EN: As a self-employed worker in Spain, your parte de baja is still issued by your public health service doctor (or the mutua for work-related conditions), and the benefit is usually managed by your mutua colaboradora. A private medical certificate does not replace that parte; your doctor can explain the route.
- PT: És autónomo? Se descontas para incapacidade temporária, o parte de baja também é emitido pelo teu médico do serviço público de saúde (ou pela mutua, se for contingência profissional) e a prestação costuma ser gerida pela tua mutua colaboradora. O atestado médico privado não substitui esse parte.
- DE: Du bist selbstständig? Wenn du für vorübergehende Arbeitsunfähigkeit versichert bist, stellt den parte de baja ebenfalls dein Arzt im öffentlichen Gesundheitsdienst aus (bei Arbeitsunfall oder Berufskrankheit die Mutua); die Leistung verwaltet in der Regel deine Mutua colaboradora. Das private ärztliche Attest ersetzt diesen parte nicht.
- CS: Jste OSVČ? Pokud platíte pojištění pro dočasnou neschopnost, parte de baja vám rovněž vystavuje lékař veřejné zdravotní služby (u pracovního úrazu či nemoci z povolání mutua) a dávku obvykle spravuje vaše mutua colaboradora. Soukromé lékařské potvrzení tento parte nenahrazuje.
- RO: Ești autonom? Dacă plătești contribuții pentru incapacitate temporară, parte de baja este emis tot de medicul serviciului public de sănătate (sau de mutua, pentru contingențe profesionale), iar indemnizația este de regulă gestionată de mutua colaboradora. Adeverința medicală privată nu înlocuiește acest parte.

**"Para trabajadores con mutua" card** (not present in EN)
- ES — Heading: Si tu dolencia puede ser laboral — Body: Si puede tratarse de un accidente de trabajo o una enfermedad profesional, acude a la mutua de tu empresa: es quien emite el parte de baja en esos casos. El justificante privado no sustituye ese trámite.
- PT — Heading: Se a tua doença puder ser laboral — Body: Se puder tratar-se de um acidente de trabalho ou de uma doença profissional, dirige-te à mutua da tua empresa: é ela que emite o parte de baja nesses casos. O atestado privado não substitui esse procedimento.
- DE — Heading: Wenn deine Beschwerden beruflich bedingt sein könnten — Body: Handelt es sich möglicherweise um einen Arbeitsunfall oder eine Berufskrankheit, wende dich an die Mutua deines Unternehmens: Sie stellt in diesen Fällen den parte de baja aus. Das private Attest ersetzt dieses Verfahren nicht.
- CS — Heading: Pokud může jít o pracovní příčinu — Body: Může-li jít o pracovní úraz nebo nemoc z povolání, obraťte se na mutuu svého zaměstnavatele: v těchto případech vystavuje parte de baja ona. Soukromé potvrzení tento postup nenahrazuje.
- RO — Heading: Dacă afecțiunea poate avea legătură cu munca — Body: Dacă poate fi vorba de un accident de muncă sau de o boală profesională, adresează-te mutuei firmei tale: ea emite parte de baja în aceste cazuri. Adeverința privată nu înlocuiește această procedură.

**Self-employed FAQ answer**
- ES: Sí. El justificante médico privado documenta clínicamente tu situación de salud. Si cotizas por incapacidad temporal, el parte de baja lo emite tu médico del servicio público de salud (o la mutua en contingencias profesionales) y la prestación suele gestionarla tu mutua colaboradora; el médico puede orientarte.
- EN: Yes. The private medical certificate documents your health condition. If you contribute for temporary incapacity, the parte de baja is issued by your public health service doctor (or the mutua for work-related conditions) and the benefit is usually managed by your mutua colaboradora; the doctor can guide you.
- PT: Sim. O atestado médico privado documenta clinicamente a sua situação de saúde. Se desconta para incapacidade temporária, o parte de baja é emitido pelo seu médico do serviço público de saúde (ou pela mutua em contingências profissionais) e a prestação costuma ser gerida pela sua mutua colaboradora; o médico pode orientá-lo.
- DE: Ja. Das private ärztliche Attest dokumentiert Ihren Gesundheitszustand. Wenn Sie für vorübergehende Arbeitsunfähigkeit versichert sind, stellt den parte de baja Ihr Arzt im öffentlichen Gesundheitsdienst aus (bei beruflicher Ursache die Mutua); die Leistung verwaltet in der Regel Ihre Mutua colaboradora. Der Arzt kann Sie beraten.
- CS: Ano. Soukromé lékařské potvrzení klinicky dokládá váš zdravotní stav. Pokud platíte pojištění pro dočasnou neschopnost, parte de baja vystavuje lékař veřejné zdravotní služby (u pracovních příčin mutua) a dávku obvykle spravuje vaše mutua colaboradora; lékař vám poradí.
- RO: Da. Adeverința medicală privată documentează clinic starea ta de sănătate. Dacă plătești contribuții pentru incapacitate temporară, parte de baja este emis de medicul serviciului public de sănătate (sau de mutua, pentru contingențe profesionale), iar indemnizația este de regulă gestionată de mutua colaboradora; medicul te poate îndruma.

### J5 — Public-system paragraph (LEGAL)
The payment-day claim is removed rather than restated. It is wrong today and depends on the contingency and the convenio.
- **ES**
  - Heading: Parte de baja por incapacidad temporal (IT)
  - Body: El parte de baja lo emite el médico del servicio público de salud o, si la causa es un accidente de trabajo o una enfermedad profesional, la mutua (Real Decreto 625/2014, art. 2). Se comunica electrónicamente al INSS y da acceso, si se cumplen los requisitos, a la prestación económica de la Seguridad Social.
  - Closing line: Global Health no emite partes de baja, confirmación ni alta.
  - Also replace the "Lo que este servicio no puede hacer" bullet: "No emitimos partes de baja, confirmación ni alta: los emite el servicio público de salud o la mutua"
- **EN**
  - Body: The parte de baja is issued by a public health service doctor or, if the cause is a workplace accident or occupational disease, by the mutua (Royal Decree 625/2014, art. 2). It is sent electronically to the INSS and, where the requirements are met, gives access to Social Security sickness benefit.
  - Closing line: Global Health does not issue sick-leave, confirmation or discharge certificates (partes de baja, confirmación or alta).
- **PT**
  - Body: O parte de baja é emitido pelo médico do serviço público de saúde ou, se a causa for um acidente de trabalho ou uma doença profissional, pela mutua (Real Decreto 625/2014, art. 2). É comunicado eletronicamente ao INSS e dá acesso, quando se cumprem os requisitos, à prestação económica da Seguridad Social.
  - Closing line: A Global Health não emite partes de baja, de confirmação nem de alta.
- **DE**
  - Body: Den parte de baja stellt ein Arzt des öffentlichen Gesundheitsdienstes aus, bei einem Arbeitsunfall oder einer Berufskrankheit die Mutua (Real Decreto 625/2014, Art. 2). Er wird elektronisch an das INSS übermittelt und eröffnet, wenn die Voraussetzungen erfüllt sind, den Anspruch auf Krankengeld der Seguridad Social.
  - Closing line: Global Health stellt keine partes de baja, Bestätigungen oder Gesundschreibungen (alta) aus.
- **CS**
  - Body: Parte de baja vystavuje lékař veřejné zdravotní služby, a jde-li o pracovní úraz nebo nemoc z povolání, mutua (Real Decreto 625/2014, čl. 2). Elektronicky se předává INSS a při splnění podmínek zakládá nárok na nemocenskou dávku Seguridad Social.
  - Closing line: Global Health nevystavuje parte de baja ani potvrzení o pokračování či ukončení neschopnosti.
- **RO**
  - Body: Parte de baja este emis de medicul serviciului public de sănătate sau, dacă este vorba de un accident de muncă ori o boală profesională, de mutua (Real Decreto 625/2014, art. 2). Este transmis electronic către INSS și, dacă sunt îndeplinite condițiile, dă acces la indemnizația Seguridad Social.
  - Closing line: Global Health nu emite parte de baja, de confirmare sau de alta.

### J6 — Bullets and validity FAQ (LEGAL)
**Bullets** ("Es válido como justificante…" / "Sirve como documentación clínica de respaldo…")
- ES: Puede presentarse ante la empresa; su aceptación depende del convenio y de la política interna · Puedes llevarlo a tu médico del servicio público como información clínica; la decisión sobre la baja es suya
- EN: Can be given to your employer; acceptance depends on the collective agreement and company policy · Can be shared with your public health service doctor as clinical information; the sick-leave decision is theirs · replaces "Is legally valid as a clinical document…" with: Is a clinical document signed by a registered doctor — not a parte de baja
- PT: Pode ser apresentado à empresa; a aceitação depende da convenção coletiva e da política interna · Podes levá-lo ao teu médico do serviço público como informação clínica; a decisão sobre a baixa é dele
- DE: Kann dem Arbeitgeber vorgelegt werden; ob er es akzeptiert, hängt vom Tarifvertrag und der Unternehmensrichtlinie ab · Du kannst es deinem Arzt im öffentlichen Gesundheitsdienst als klinische Information vorlegen; über die Krankschreibung entscheidet er
- CS: Lze ho předložit zaměstnavateli; přijetí závisí na kolektivní smlouvě a vnitřních pravidlech firmy · Můžete ho předat lékaři veřejné zdravotní služby jako klinickou informaci; o neschopnosti rozhoduje on
- RO: Poate fi prezentată angajatorului; acceptarea depinde de contractul colectiv și de politica internă · O poți duce medicului din serviciul public ca informație clinică; decizia privind concediul medical îi aparține

**Validity FAQ**
- **ES** — Q: ¿Qué validez tiene el justificante médico privado? — A: Es un documento clínico firmado por un médico colegiado. Muchas empresas lo aceptan para ausencias breves, pero depende del convenio colectivo y de su política interna. No es un parte de baja: la prestación por incapacidad temporal requiere el parte del servicio público de salud o, en contingencias profesionales, de la mutua.
- **EN** — Q: What is a private medical certificate valid for? — A: It is a clinical document signed by a registered doctor. Many employers accept it for short absences, but this depends on the collective agreement and company policy. It is not a parte de baja: temporary incapacity benefit requires the parte issued by the public health service or, for work-related conditions, the mutua.
- **PT** — Q: Que validade tem o atestado médico privado? — A: É um documento clínico assinado por um médico inscrito. Muitas empresas aceitam-no para ausências curtas, mas depende da convenção coletiva e da política interna. Não é um parte de baja: a prestação por incapacidade temporária exige o parte do serviço público de saúde ou, em contingências profissionais, da mutua.
- **DE** — Q: Wofür gilt das private ärztliche Attest? — A: Es ist ein klinisches Dokument, unterschrieben von einem zugelassenen Arzt. Viele Arbeitgeber akzeptieren es für kurze Abwesenheiten; das hängt aber vom Tarifvertrag und der Unternehmensrichtlinie ab. Es ist kein parte de baja: Krankengeld wegen vorübergehender Arbeitsunfähigkeit setzt den parte des öffentlichen Gesundheitsdienstes oder, bei beruflicher Ursache, der Mutua voraus.
- **CS** — Q: K čemu platí soukromé lékařské potvrzení? — A: Je to klinický dokument podepsaný registrovaným lékařem. Mnoho zaměstnavatelů ho přijímá u krátkých absencí, záleží však na kolektivní smlouvě a pravidlech firmy. Nejde o parte de baja: dávka při dočasné neschopnosti vyžaduje parte od veřejné zdravotní služby, nebo u pracovních příčin od mutuy.
- **RO** — Q: Ce valabilitate are adeverința medicală privată? — A: Este un document clinic semnat de un medic înregistrat. Mulți angajatori o acceptă pentru absențe scurte, dar depinde de contractul colectiv și de politica internă. Nu este parte de baja: indemnizația pentru incapacitate temporară necesită parte emis de serviciul public de sănătate sau, pentru contingențe profesionale, de mutua.

With these replacements, the DE "Krankenkasse/Mutualität", "Berufsgenossenschaft" and "Krankmeldeschein" wording and the PT "mútuo colaboradora" wording disappear.

### J7 — Hero opening sentence (the rest of the hero is unchanged)
- ES: ¿Te encuentras mal y necesitas hoy un justificante médico privado, sin desplazarte ni esperar en una sala de espera?
- PT: Sentes-te mal e precisas hoje de um atestado médico privado, sem te deslocares nem esperares numa sala de espera?
- DE: Du fühlst dich krank und brauchst heute ein privates ärztliches Attest – ohne Weg und ohne Wartezimmer?
- CS: Je vám špatně a potřebujete ještě dnes soukromé lékařské potvrzení, bez cestování a bez čekárny?
- RO: Te simți rău și ai nevoie azi de o adeverință medicală privată, fără să te deplasezi și fără sală de așteptare?
- EN: no change.

### L2 — Medical disclaimer, ES only (the other locales render ES) — LEGAL
Replace the three sentences from "Los partes médicos emitidos…" to "…médico de cabecera." with:

> Los justificantes médicos privados emitidos a través de nuestra plataforma documentan la valoración clínica realizada; su aceptación por empleadores o centros educativos depende de las normas de cada uno. Cuando esté clínicamente indicado, el médico podrá emitir un justificante tras una evaluación clínica completa, a su criterio. Nuestro servicio no emite partes médicos de baja, confirmación ni alta por incapacidad temporal: conforme al Real Decreto 625/2014, los emite el médico del servicio público de salud o, en contingencias profesionales, la mutua o la empresa colaboradora. Para ese trámite, acuda a su centro de salud o a su mutua.

### A1 — About card (frontend content)
- ES: Un justificante médico privado emitido por el médico que le ha valorado. No es un parte de baja: la baja la emite el servicio público de salud o la mutua, y la prestación la gestionan el INSS o la mutua.
- EN: A private justificante médico issued by the doctor who assessed you. It is not a parte de baja: statutory sick leave is issued by the public health service or the mutua, and benefit is managed by the INSS or the mutua.
- PT: Um justificante médico privado emitido pelo médico que o avaliou. Não é um parte de baja: a baixa é emitida pelo serviço público de saúde ou pela mutua, e a prestação é gerida pelo INSS ou pela mutua.
- DE: Ein privates justificante médico, ausgestellt von der Ärztin oder dem Arzt, die oder der Sie beurteilt hat. Es ist kein parte de baja: Die Krankschreibung stellt der öffentliche Gesundheitsdienst oder die Mutua aus, das Krankengeld verwalten INSS oder Mutua.
- CS: Soukromé justificante médico vystavené lékařem, který vás vyšetřil. Nejde o parte de baja: neschopnost vystavuje veřejná zdravotní služba nebo mutua a dávku spravuje INSS nebo mutua.
- RO: O justificante médico privată emisă de medicul care v-a evaluat. Nu este parte de baja: concediul medical este emis de serviciul public de sănătate sau de mutua, iar indemnizația este gestionată de INSS sau de mutua.

### C1 — Contact (`frontend/lib/content/country-contact.ts`)
- The CS/DE/PT/RO text comes from a template shared with other markets. Make the change as a Spain-only override.
- **ES intro:** El certificado lo emite el médico que realiza la valoración y no es un parte de baja. La baja la emite el médico del servicio público de salud o, en contingencias profesionales, la mutua; la prestación la gestionan el INSS o la mutua.
- **ES FAQ answer:** No. El certificado acredita la valoración médica realizada, pero no es un parte de baja. La baja por incapacidad temporal la emite el médico del servicio público de salud o, en contingencias profesionales, la mutua, y la prestación la gestionan el INSS o la mutua.
- **EN FAQ answer:** No. The certificate records the medical assessment, but it is not a parte de baja. Statutory sick leave is issued by a public health service doctor or, for work-related conditions, the mutua; benefit is managed by the INSS or the mutua.
- **CS/DE/PT/RO intro:** use the A1 sentence for each locale.
- **CS/DE/PT/RO FAQ "Will my justificante be accepted?":** append one sentence — PT "Não é um parte de baja." · DE "Es ist kein parte de baja." · CS "Nejde o parte de baja." · RO "Nu este parte de baja."

### P1 — Psychiatry bullet
- ES: Informes psiquiátricos de apoyo en procesos de incapacidad temporal o permanente (la decisión corresponde al servicio público de salud, la mutua o el INSS)
- PT: Relatórios psiquiátricos de apoio a processos de incapacidade temporária ou permanente (a decisão cabe ao serviço público de saúde, à mutua ou ao INSS)
- DE: Psychiatrische Berichte zur Unterstützung von Verfahren wegen vorübergehender oder dauerhafter Arbeitsunfähigkeit (die Entscheidung liegt beim öffentlichen Gesundheitsdienst, der Mutua oder dem INSS)
- CS: Psychiatrické zprávy jako podklad pro řízení o dočasné nebo trvalé pracovní neschopnosti (rozhoduje veřejná zdravotní služba, mutua nebo INSS)
- RO: Rapoarte psihiatrice în sprijinul procedurilor de incapacitate temporară sau permanentă (decizia aparține serviciului public de sănătate, mutuei sau INSS)

## 4. Where each change would land

| Group | Storage | Writer |
| --- | --- | --- |
| J1–J7, G1–G3, P1 | Service / ServiceTranslation / ServiceFaq(+Translation) / ServiceLink | Existing Spain CMS runner (manifest + approval + rollout) |
| D1 | Doctor / DoctorMarketTranslation (profile groups) | Spain CMS runner |
| D2, H1 | Page content rows (`seed-page-content-translations.ts` CERTS_ITEM, `patch-spain-doctors-content.ts` Q5) | Outside the runner (§56.3: page writers not governed) — needs its own guarded path |
| L2 | Legal document row (`seed-missing-legal-docs.ts`) | Legal writer — legal approval first |
| A1, C1 | Frontend code (`frontend/lib/content/country-contact.ts`, about content) | Code PR + deploy |

## 5. Owner decisions requested
1. Approve (or change) the classification. Then arrange clinical approval of §3 and legal review of J5, J6 and L2.
2. Priority: G1, J1–J4 and D1 first (explicit statutory implication on commercial pages); then H1, D2 and J5–J7; then L2, A1, C1 and P1.
3. Confirm whether to record this review in ledger §53/§56. Nothing has been written.
4. Separately check the issued certificate template for "incapacidad temporal" wording.
5. Re-authorise Google API/OpenSEO locally if the September 18 read should use a fresh final window rather than the browser.
