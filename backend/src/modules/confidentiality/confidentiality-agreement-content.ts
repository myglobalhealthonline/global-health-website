/**
 * The doctor confidentiality agreement, in every language the portal ships.
 *
 * A doctor must be able to read — and hand-sign — the agreement in the
 * language they practise in, so the clause text is stored as STRUCTURED data
 * per locale (title / intro / clauses / closing) plus the PDF chrome labels.
 * Two consumers derive from it:
 *
 *   - `agreementTextFor(locale)` — the flat text shown in the portal and
 *     returned by `GET /api/doctor/confidentiality-agreement`.
 *   - `confidentiality-pdf.ts` — lays out the same clauses in the branded,
 *     signable PDF, using `labels` for the surrounding chrome.
 *
 * Because both read the same structure, the printed and on-screen wording can
 * never drift, and the PDF no longer has to parse prose back into blocks (the
 * old `parseAgreementBlocks` regex only ever worked for English).
 *
 * Adding a locale: add an entry to AGREEMENT_CONTENT keyed by the frontend
 * locale code (frontend/lib/i18n/types.ts `supportedLocaleCodes`). Anything
 * missing falls back to English rather than half-translating a legal document.
 */

/**
 * Bump this whenever the agreement's SUBSTANCE changes. Existing `accepted`
 * rows are then detected as outdated and doctors are re-prompted.
 *
 * Translating an existing version is NOT a substance change: every locale
 * below states the same obligations as the English source, so adding or
 * correcting a translation must not bump the version — that would invalidate
 * every acceptance already on file and re-prompt every doctor on the platform.
 */
export const CONFIDENTIALITY_AGREEMENT_VERSION = "1.0.0";

/** Locales the agreement is available in — mirrors the portal's own list. */
export const AGREEMENT_LOCALES = ["en", "pt", "es", "cs", "ro", "de"] as const;

export type AgreementLocale = (typeof AGREEMENT_LOCALES)[number];

export type AgreementClause = {
  /** Short clause title. Rendered as the PDF clause heading. */
  heading: string;
  body: string;
};

/** Chrome around the clause text in the printable PDF. */
export type AgreementPdfLabels = {
  /** BCP-47 tag for `<html lang>` and date formatting. */
  htmlLang: string;
  /** `<title>` of the printed document. `{name}` = doctor's full name. */
  docTitle: string;
  /** Small caps line to the right of the logo. */
  topline: string;
  /** Masthead title, split over two lines. */
  mastTitleLine1: string;
  mastTitleLine2: string;
  versionCaps: string;
  issuedPrefix: string;
  statusForSignature: string;
  partyClinician: string;
  partyPlatform: string;
  acceptanceOnFileCaps: string;
  /** `{date}` and `{version}` placeholders. */
  acceptanceOnFileBody: string;
  acceptancePendingCaps: string;
  acceptancePendingBody: string;
  signTitle: string;
  /** `{version}` placeholder. */
  declaration: string;
  sigSignature: string;
  sigPrintedName: string;
  sigDateSigned: string;
  signNote: string;
  /** Footer right-hand note. `{version}` placeholder. */
  footerNote: string;
};

export type AgreementContent = {
  /** Document title line. `{version}` placeholder. */
  title: string;
  intro: string;
  /** Numbered 1..n in the order given. */
  clauses: AgreementClause[];
  /** Click-to-accept declaration that closes the on-screen text. */
  closing: string;
  labels: AgreementPdfLabels;
};

export const AGREEMENT_CONTENT: Record<AgreementLocale, AgreementContent> = {
  // ── English ──────────────────────────────────────────────────────────────
  en: {
    title: "Doctor Confidentiality & Data Protection Agreement (v{version})",
    intro:
      "As a practising clinician on the Global Health Network platform, I agree to the following terms governing access to patient records and protected health information (PHI):",
    clauses: [
      {
        heading: "Confidentiality",
        body: "I will treat all patient information — medical records, consultation notes, prescriptions, test results, messages, and identifying details — as strictly confidential, and will not disclose it to any third party except as required for the patient's care or by law.",
      },
      {
        heading: "Access on a need-to-know basis",
        body: "I will access patient records only for patients under my care and only to the extent required to deliver that care. I understand that all record access is logged and audited.",
      },
      {
        heading: "Account security",
        body: "I am responsible for keeping my login credentials secure. I will not share my account, will use two-factor authentication where available, and will notify the platform immediately if I suspect my account has been compromised.",
      },
      {
        heading: "Data handling",
        body: "I will not download, copy, photograph, or otherwise extract patient data outside the platform except where clinically necessary and permitted, and I will ensure any such data is stored securely and deleted when no longer required.",
      },
      {
        heading: "Breach notification",
        body: "I will report any suspected loss, theft, or unauthorised disclosure of patient data to the platform without undue delay.",
      },
      {
        heading: "Regulatory compliance",
        body: "I will comply with the data-protection and medical-confidentiality laws applicable in the countries where I practise through the platform (including GDPR where applicable) and with my professional body's codes of conduct.",
      },
      {
        heading: "Duration",
        body: "These obligations continue after my engagement with the platform ends, for as long as the information remains confidential.",
      },
    ],
    closing:
      "By accepting, I confirm I have read, understood, and agree to be bound by this agreement.",
    labels: {
      htmlLang: "en-GB",
      docTitle: "Confidentiality Agreement — {name}",
      topline: "Compliance Document — Clinician Confidentiality",
      mastTitleLine1: "Confidentiality &",
      mastTitleLine2: "Data Protection Agreement",
      versionCaps: "VERSION",
      issuedPrefix: "Issued",
      statusForSignature: "For signature",
      partyClinician: "Clinician",
      partyPlatform: "Platform",
      acceptanceOnFileCaps: "Portal acceptance on file",
      acceptanceOnFileBody:
        "Accepted electronically in the Global Health doctor portal on {date} (version {version}). This signed copy supplements — it does not replace — that record.",
      acceptancePendingCaps: "Portal acceptance",
      acceptancePendingBody:
        "Not yet recorded. Accept the agreement in the Global Health doctor portal as well as returning this signed copy.",
      signTitle: "Declaration & signature",
      declaration:
        "I confirm that I have read, understood, and agree to be bound by this Confidentiality & Data Protection Agreement (version {version}).",
      sigSignature: "Signature",
      sigPrintedName: "Printed name",
      sigDateSigned: "Date signed",
      signNote:
        "Print this document, sign it, then scan or photograph the signed copy and upload it in the Global Health doctor portal under Compliance → Confidentiality agreement. The uploaded copy is retained alongside your electronic acceptance and is visible to you and to Global Health administrators only.",
      footerNote: "Confidentiality Agreement v{version} — myglobalhealth.online",
    },
  },

  // ── Portuguese ───────────────────────────────────────────────────────────
  pt: {
    title: "Acordo de Confidencialidade e Proteção de Dados do Médico (v{version})",
    intro:
      "Enquanto clínico em exercício na plataforma Global Health Network, aceito os seguintes termos que regem o acesso a registos clínicos de doentes e a informação de saúde protegida (PHI):",
    clauses: [
      {
        heading: "Confidencialidade",
        body: "Tratarei toda a informação do doente — registos clínicos, notas de consulta, prescrições, resultados de análises, mensagens e dados identificativos — como estritamente confidencial e não a divulgarei a terceiros, exceto quando necessário para a prestação de cuidados ao doente ou por imposição legal.",
      },
      {
        heading: "Acesso na estrita medida do necessário",
        body: "Acederei aos registos apenas dos doentes ao meu cuidado e apenas na medida necessária para prestar esses cuidados. Compreendo que todos os acessos a registos são registados e auditados.",
      },
      {
        heading: "Segurança da conta",
        body: "Sou responsável por manter as minhas credenciais de acesso seguras. Não partilharei a minha conta, utilizarei autenticação de dois fatores quando disponível e notificarei a plataforma de imediato se suspeitar que a minha conta foi comprometida.",
      },
      {
        heading: "Tratamento de dados",
        body: "Não descarregarei, copiarei, fotografarei nem extrairei por qualquer outro meio dados de doentes para fora da plataforma, exceto quando clinicamente necessário e permitido, e assegurarei que esses dados são armazenados em segurança e eliminados quando já não forem necessários.",
      },
      {
        heading: "Notificação de violações de dados",
        body: "Comunicarei à plataforma, sem demora injustificada, qualquer suspeita de perda, roubo ou divulgação não autorizada de dados de doentes.",
      },
      {
        heading: "Conformidade regulamentar",
        body: "Cumprirei a legislação de proteção de dados e de sigilo médico aplicável nos países onde exerço através da plataforma (incluindo o RGPD, quando aplicável) e os códigos deontológicos da minha ordem profissional.",
      },
      {
        heading: "Duração",
        body: "Estas obrigações mantêm-se após o termo da minha colaboração com a plataforma, enquanto a informação permanecer confidencial.",
      },
    ],
    closing:
      "Ao aceitar, confirmo que li, compreendi e aceito ficar vinculado a este acordo.",
    labels: {
      htmlLang: "pt-PT",
      docTitle: "Acordo de Confidencialidade — {name}",
      topline: "Documento de conformidade — Confidencialidade do clínico",
      mastTitleLine1: "Acordo de Confidencialidade",
      mastTitleLine2: "e Proteção de Dados",
      versionCaps: "VERSÃO",
      issuedPrefix: "Emitido",
      statusForSignature: "Para assinatura",
      partyClinician: "Clínico",
      partyPlatform: "Plataforma",
      acceptanceOnFileCaps: "Aceitação no portal registada",
      acceptanceOnFileBody:
        "Aceite eletronicamente no portal de médicos da Global Health em {date} (versão {version}). Esta cópia assinada complementa — não substitui — esse registo.",
      acceptancePendingCaps: "Aceitação no portal",
      acceptancePendingBody:
        "Ainda não registada. Além de devolver esta cópia assinada, aceite o acordo no portal de médicos da Global Health.",
      signTitle: "Declaração e assinatura",
      declaration:
        "Confirmo que li, compreendi e aceito ficar vinculado a este Acordo de Confidencialidade e Proteção de Dados (versão {version}).",
      sigSignature: "Assinatura",
      sigPrintedName: "Nome legível",
      sigDateSigned: "Data de assinatura",
      signNote:
        "Imprima este documento, assine-o e, em seguida, digitalize ou fotografe a cópia assinada e carregue-a no portal de médicos da Global Health em Conformidade → Acordo de confidencialidade. A cópia carregada é conservada juntamente com a sua aceitação eletrónica e é visível apenas para si e para os administradores da Global Health.",
      footerNote: "Acordo de Confidencialidade v{version} — myglobalhealth.online",
    },
  },

  // ── Spanish ──────────────────────────────────────────────────────────────
  es: {
    title: "Acuerdo de Confidencialidad y Protección de Datos del Médico (v{version})",
    intro:
      "Como profesional clínico en ejercicio en la plataforma Global Health Network, acepto los siguientes términos que rigen el acceso a las historias clínicas de los pacientes y a la información sanitaria protegida (PHI):",
    clauses: [
      {
        heading: "Confidencialidad",
        body: "Trataré toda la información del paciente — historias clínicas, notas de consulta, prescripciones, resultados de pruebas, mensajes y datos identificativos — como estrictamente confidencial y no la revelaré a ningún tercero, salvo cuando sea necesario para la asistencia del paciente o lo exija la ley.",
      },
      {
        heading: "Acceso limitado a lo necesario",
        body: "Accederé únicamente a las historias de los pacientes a mi cargo y solo en la medida necesaria para prestar esa asistencia. Entiendo que todos los accesos a las historias quedan registrados y son auditados.",
      },
      {
        heading: "Seguridad de la cuenta",
        body: "Soy responsable de mantener seguras mis credenciales de acceso. No compartiré mi cuenta, usaré la autenticación de doble factor cuando esté disponible y notificaré de inmediato a la plataforma si sospecho que mi cuenta ha sido comprometida.",
      },
      {
        heading: "Tratamiento de los datos",
        body: "No descargaré, copiaré, fotografiaré ni extraeré de ningún otro modo datos de pacientes fuera de la plataforma, salvo cuando sea clínicamente necesario y esté permitido, y garantizaré que dichos datos se almacenen de forma segura y se eliminen cuando ya no sean necesarios.",
      },
      {
        heading: "Notificación de brechas de seguridad",
        body: "Comunicaré a la plataforma, sin dilación indebida, cualquier sospecha de pérdida, robo o divulgación no autorizada de datos de pacientes.",
      },
      {
        heading: "Cumplimiento normativo",
        body: "Cumpliré la normativa de protección de datos y de secreto médico aplicable en los países en los que ejerzo a través de la plataforma (incluido el RGPD cuando resulte aplicable) y los códigos deontológicos de mi colegio profesional.",
      },
      {
        heading: "Duración",
        body: "Estas obligaciones continúan tras la finalización de mi relación con la plataforma, mientras la información siga siendo confidencial.",
      },
    ],
    closing:
      "Al aceptar, confirmo que he leído y comprendido este acuerdo y que acepto quedar obligado por él.",
    labels: {
      htmlLang: "es-ES",
      docTitle: "Acuerdo de Confidencialidad — {name}",
      topline: "Documento de cumplimiento — Confidencialidad del clínico",
      mastTitleLine1: "Acuerdo de Confidencialidad",
      mastTitleLine2: "y Protección de Datos",
      versionCaps: "VERSIÓN",
      issuedPrefix: "Emitido",
      statusForSignature: "Para firma",
      partyClinician: "Clínico",
      partyPlatform: "Plataforma",
      acceptanceOnFileCaps: "Aceptación registrada en el portal",
      acceptanceOnFileBody:
        "Aceptado electrónicamente en el portal de médicos de Global Health el {date} (versión {version}). Esta copia firmada complementa ese registro; no lo sustituye.",
      acceptancePendingCaps: "Aceptación en el portal",
      acceptancePendingBody:
        "Aún no registrada. Además de devolver esta copia firmada, acepte el acuerdo en el portal de médicos de Global Health.",
      signTitle: "Declaración y firma",
      declaration:
        "Confirmo que he leído y comprendido este Acuerdo de Confidencialidad y Protección de Datos (versión {version}) y que acepto quedar obligado por él.",
      sigSignature: "Firma",
      sigPrintedName: "Nombre y apellidos",
      sigDateSigned: "Fecha de firma",
      signNote:
        "Imprima este documento, fírmelo y después escanee o fotografíe la copia firmada y súbala en el portal de médicos de Global Health, en Cumplimiento → Acuerdo de confidencialidad. La copia subida se conserva junto con su aceptación electrónica y solo es visible para usted y para los administradores de Global Health.",
      footerNote: "Acuerdo de Confidencialidad v{version} — myglobalhealth.online",
    },
  },

  // ── Czech ────────────────────────────────────────────────────────────────
  cs: {
    title: "Dohoda lékaře o mlčenlivosti a ochraně osobních údajů (v{version})",
    intro:
      "Jako lékař působící na platformě Global Health Network souhlasím s následujícími podmínkami, které upravují přístup ke zdravotnické dokumentaci pacientů a k chráněným zdravotním informacím (PHI):",
    clauses: [
      {
        heading: "Mlčenlivost",
        body: "Se všemi informacemi o pacientovi — zdravotnickou dokumentací, záznamy z konzultací, předpisy, výsledky vyšetření, zprávami a identifikačními údaji — budu zacházet jako se striktně důvěrnými a nezpřístupním je žádné třetí straně, s výjimkou případů nezbytných pro péči o pacienta nebo vyžadovaných zákonem.",
      },
      {
        heading: "Přístup pouze v nezbytném rozsahu",
        body: "Do dokumentace budu nahlížet pouze u pacientů ve své péči a pouze v rozsahu nezbytném k poskytnutí této péče. Jsem si vědom(a), že každý přístup k dokumentaci je logován a auditován.",
      },
      {
        heading: "Bezpečnost účtu",
        body: "Odpovídám za zabezpečení svých přihlašovacích údajů. Svůj účet nebudu sdílet, budu používat dvoufaktorové ověření, je-li dostupné, a neprodleně uvědomím platformu, pokud budu mít podezření na zneužití svého účtu.",
      },
      {
        heading: "Zacházení s údaji",
        body: "Údaje pacientů nebudu stahovat, kopírovat, fotografovat ani jinak vynášet mimo platformu, s výjimkou případů klinicky nezbytných a povolených; takové údaje uložím bezpečně a odstraním je, jakmile již nebudou potřebné.",
      },
      {
        heading: "Hlášení narušení bezpečnosti údajů",
        body: "Jakékoli podezření na ztrátu, krádež nebo neoprávněné zpřístupnění údajů pacientů nahlásím platformě bez zbytečného odkladu.",
      },
      {
        heading: "Dodržování právních předpisů",
        body: "Budu dodržovat právní předpisy o ochraně osobních údajů a o lékařském tajemství platné v zemích, kde prostřednictvím platformy působím (včetně GDPR, je-li relevantní), a etické kodexy své profesní komory.",
      },
      {
        heading: "Trvání",
        body: "Tyto povinnosti trvají i po ukončení mé spolupráce s platformou, a to po celou dobu, kdy informace zůstávají důvěrné.",
      },
    ],
    closing:
      "Přijetím potvrzuji, že jsem si tuto dohodu přečetl(a), porozuměl(a) jí a souhlasím, že jí budu vázán(a).",
    labels: {
      htmlLang: "cs-CZ",
      docTitle: "Dohoda o mlčenlivosti — {name}",
      topline: "Dokument compliance — mlčenlivost lékaře",
      mastTitleLine1: "Dohoda o mlčenlivosti",
      mastTitleLine2: "a ochraně osobních údajů",
      versionCaps: "VERZE",
      issuedPrefix: "Vydáno",
      statusForSignature: "K podpisu",
      partyClinician: "Lékař",
      partyPlatform: "Platforma",
      acceptanceOnFileCaps: "Přijetí v portálu je zaznamenáno",
      acceptanceOnFileBody:
        "Přijato elektronicky v portálu pro lékaře Global Health dne {date} (verze {version}). Tato podepsaná kopie uvedený záznam doplňuje — nenahrazuje jej.",
      acceptancePendingCaps: "Přijetí v portálu",
      acceptancePendingBody:
        "Dosud nezaznamenáno. Kromě zaslání této podepsané kopie přijměte dohodu také v portálu pro lékaře Global Health.",
      signTitle: "Prohlášení a podpis",
      declaration:
        "Potvrzuji, že jsem si tuto Dohodu o mlčenlivosti a ochraně osobních údajů (verze {version}) přečetl(a), porozuměl(a) jí a souhlasím, že jí budu vázán(a).",
      sigSignature: "Podpis",
      sigPrintedName: "Jméno hůlkovým písmem",
      sigDateSigned: "Datum podpisu",
      signNote:
        "Tento dokument vytiskněte, podepište, poté podepsanou kopii naskenujte nebo vyfotografujte a nahrajte ji v portálu pro lékaře Global Health v části Compliance → Dohoda o mlčenlivosti. Nahraná kopie se uchovává společně s vaším elektronickým přijetím a je viditelná pouze pro vás a pro administrátory Global Health.",
      footerNote: "Dohoda o mlčenlivosti v{version} — myglobalhealth.online",
    },
  },

  // ── Romanian ─────────────────────────────────────────────────────────────
  ro: {
    title: "Acord de confidențialitate și protecție a datelor pentru medici (v{version})",
    intro:
      "În calitate de medic care profesează pe platforma Global Health Network, accept următorii termeni care guvernează accesul la dosarele pacienților și la informațiile medicale protejate (PHI):",
    clauses: [
      {
        heading: "Confidențialitate",
        body: "Voi trata toate informațiile despre pacient — dosare medicale, note de consultație, prescripții, rezultate de analize, mesaje și date de identificare — ca strict confidențiale și nu le voi divulga niciunui terț, cu excepția cazurilor necesare pentru îngrijirea pacientului sau impuse de lege.",
      },
      {
        heading: "Acces strict necesar",
        body: "Voi accesa dosarele numai ale pacienților aflați în îngrijirea mea și numai în măsura necesară pentru acordarea acestei îngrijiri. Înțeleg că fiecare accesare a dosarelor este înregistrată și auditată.",
      },
      {
        heading: "Securitatea contului",
        body: "Răspund pentru păstrarea în siguranță a datelor mele de autentificare. Nu voi partaja contul, voi folosi autentificarea în doi pași atunci când este disponibilă și voi notifica imediat platforma dacă suspectez că contul meu a fost compromis.",
      },
      {
        heading: "Gestionarea datelor",
        body: "Nu voi descărca, copia, fotografia sau extrage în alt mod date ale pacienților în afara platformei, cu excepția cazurilor necesare din punct de vedere clinic și permise, și mă voi asigura că aceste date sunt stocate în siguranță și șterse atunci când nu mai sunt necesare.",
      },
      {
        heading: "Notificarea incidentelor de securitate",
        body: "Voi raporta platformei, fără întârziere nejustificată, orice suspiciune de pierdere, furt sau divulgare neautorizată a datelor pacienților.",
      },
      {
        heading: "Conformitate cu reglementările",
        body: "Voi respecta legislația privind protecția datelor și secretul medical aplicabilă în țările în care profesez prin intermediul platformei (inclusiv GDPR, unde este aplicabil) și codurile deontologice ale organismului meu profesional.",
      },
      {
        heading: "Durată",
        body: "Aceste obligații continuă după încetarea colaborării mele cu platforma, atât timp cât informațiile rămân confidențiale.",
      },
    ],
    closing:
      "Prin acceptare, confirm că am citit și am înțeles acest acord și că accept să fiu obligat prin el.",
    labels: {
      htmlLang: "ro-RO",
      docTitle: "Acord de confidențialitate — {name}",
      topline: "Document de conformitate — confidențialitatea clinicianului",
      mastTitleLine1: "Acord de confidențialitate",
      mastTitleLine2: "și protecție a datelor",
      versionCaps: "VERSIUNEA",
      issuedPrefix: "Emis",
      statusForSignature: "Pentru semnătură",
      partyClinician: "Medic",
      partyPlatform: "Platformă",
      acceptanceOnFileCaps: "Acceptare înregistrată în portal",
      acceptanceOnFileBody:
        "Acceptat electronic în portalul pentru medici Global Health la {date} (versiunea {version}). Această copie semnată completează acea înregistrare; nu o înlocuiește.",
      acceptancePendingCaps: "Acceptare în portal",
      acceptancePendingBody:
        "Încă neînregistrată. Pe lângă returnarea acestei copii semnate, acceptați acordul în portalul pentru medici Global Health.",
      signTitle: "Declarație și semnătură",
      declaration:
        "Confirm că am citit și am înțeles acest Acord de confidențialitate și protecție a datelor (versiunea {version}) și că accept să fiu obligat prin el.",
      sigSignature: "Semnătură",
      sigPrintedName: "Nume în clar",
      sigDateSigned: "Data semnării",
      signNote:
        "Tipăriți acest document, semnați-l, apoi scanați sau fotografiați copia semnată și încărcați-o în portalul pentru medici Global Health, la Conformitate → Acord de confidențialitate. Copia încărcată este păstrată împreună cu acceptarea dumneavoastră electronică și este vizibilă numai pentru dumneavoastră și pentru administratorii Global Health.",
      footerNote: "Acord de confidențialitate v{version} — myglobalhealth.online",
    },
  },

  // ── German ───────────────────────────────────────────────────────────────
  de: {
    title: "Vertraulichkeits- und Datenschutzvereinbarung für Ärztinnen und Ärzte (v{version})",
    intro:
      "Als auf der Plattform Global Health Network tätige Ärztin bzw. tätiger Arzt stimme ich den folgenden Bedingungen für den Zugriff auf Patientenakten und geschützte Gesundheitsdaten (PHI) zu:",
    clauses: [
      {
        heading: "Vertraulichkeit",
        body: "Ich behandle alle Patienteninformationen — Krankenakten, Konsultationsnotizen, Verordnungen, Befunde, Nachrichten und identifizierende Angaben — als streng vertraulich und gebe sie an Dritte nur weiter, soweit dies für die Behandlung der Patientin oder des Patienten erforderlich oder gesetzlich vorgeschrieben ist.",
      },
      {
        heading: "Zugriff nach dem Need-to-know-Prinzip",
        body: "Ich greife nur auf Akten von Patientinnen und Patienten zu, die sich in meiner Behandlung befinden, und nur in dem Umfang, der für diese Behandlung erforderlich ist. Mir ist bekannt, dass jeder Zugriff auf Akten protokolliert und geprüft wird.",
      },
      {
        heading: "Kontosicherheit",
        body: "Ich bin dafür verantwortlich, meine Zugangsdaten sicher aufzubewahren. Ich gebe mein Konto nicht weiter, nutze die Zwei-Faktor-Authentifizierung, soweit verfügbar, und informiere die Plattform unverzüglich, wenn ich einen Missbrauch meines Kontos vermute.",
      },
      {
        heading: "Umgang mit Daten",
        body: "Ich lade Patientendaten nicht herunter, kopiere, fotografiere oder entnehme sie nicht auf andere Weise außerhalb der Plattform, es sei denn, dies ist klinisch erforderlich und zulässig; solche Daten bewahre ich sicher auf und lösche sie, sobald sie nicht mehr benötigt werden.",
      },
      {
        heading: "Meldung von Datenschutzverletzungen",
        body: "Jeden Verdacht auf Verlust, Diebstahl oder unbefugte Offenlegung von Patientendaten melde ich der Plattform unverzüglich.",
      },
      {
        heading: "Einhaltung der Rechtsvorschriften",
        body: "Ich halte die in den Ländern, in denen ich über die Plattform tätig bin, geltenden Vorschriften zum Datenschutz und zur ärztlichen Schweigepflicht (einschließlich der DSGVO, soweit anwendbar) sowie die Berufsordnung meiner Ärztekammer ein.",
      },
      {
        heading: "Dauer",
        body: "Diese Pflichten bestehen nach Beendigung meiner Tätigkeit auf der Plattform fort, solange die Informationen vertraulich bleiben.",
      },
    ],
    closing:
      "Mit der Annahme bestätige ich, dass ich diese Vereinbarung gelesen und verstanden habe und mich zu ihrer Einhaltung verpflichte.",
    labels: {
      htmlLang: "de-DE",
      docTitle: "Vertraulichkeitsvereinbarung — {name}",
      topline: "Compliance-Dokument — Ärztliche Vertraulichkeit",
      mastTitleLine1: "Vertraulichkeits- und",
      mastTitleLine2: "Datenschutzvereinbarung",
      versionCaps: "VERSION",
      issuedPrefix: "Ausgestellt",
      statusForSignature: "Zur Unterschrift",
      partyClinician: "Ärztin/Arzt",
      partyPlatform: "Plattform",
      acceptanceOnFileCaps: "Zustimmung im Portal erfasst",
      acceptanceOnFileBody:
        "Am {date} elektronisch im Global Health Ärzteportal angenommen (Version {version}). Diese unterschriebene Kopie ergänzt diesen Nachweis — sie ersetzt ihn nicht.",
      acceptancePendingCaps: "Zustimmung im Portal",
      acceptancePendingBody:
        "Noch nicht erfasst. Nehmen Sie die Vereinbarung zusätzlich zur Rücksendung dieser unterschriebenen Kopie auch im Global Health Ärzteportal an.",
      signTitle: "Erklärung und Unterschrift",
      declaration:
        "Ich bestätige, dass ich diese Vertraulichkeits- und Datenschutzvereinbarung (Version {version}) gelesen und verstanden habe und mich zu ihrer Einhaltung verpflichte.",
      sigSignature: "Unterschrift",
      sigPrintedName: "Name in Druckbuchstaben",
      sigDateSigned: "Datum der Unterschrift",
      signNote:
        "Drucken Sie dieses Dokument aus, unterschreiben Sie es, scannen oder fotografieren Sie die unterschriebene Kopie und laden Sie sie im Global Health Ärzteportal unter Compliance → Vertraulichkeitsvereinbarung hoch. Die hochgeladene Kopie wird zusammen mit Ihrer elektronischen Zustimmung aufbewahrt und ist nur für Sie und für Global Health Administratoren sichtbar.",
      footerNote: "Vertraulichkeitsvereinbarung v{version} — myglobalhealth.online",
    },
  },
};

/**
 * Narrow an arbitrary locale hint (query param, cookie value, country default
 * locale) to a locale the agreement exists in. Accepts region-tagged tags —
 * `pt-BR` → `pt`, `de-AT` → `de` — and falls back to English.
 */
export function resolveAgreementLocale(raw: string | null | undefined): AgreementLocale {
  if (!raw) return "en";
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return (AGREEMENT_LOCALES as readonly string[]).includes(base)
    ? (base as AgreementLocale)
    : "en";
}

export function agreementContentFor(locale: AgreementLocale): AgreementContent {
  return AGREEMENT_CONTENT[locale] ?? AGREEMENT_CONTENT.en;
}

/**
 * Flat text of the agreement in one locale — the exact string shown in the
 * portal before acceptance. Clauses are numbered from the array order, so the
 * clause numbers referenced in the PDF and on screen always match.
 */
export function agreementTextFor(locale: AgreementLocale): string {
  const content = agreementContentFor(locale);
  const version = CONFIDENTIALITY_AGREEMENT_VERSION;
  const clauses = content.clauses.map(
    (clause, index) => `${index + 1}. ${clause.heading}. ${clause.body}`,
  );
  return [
    content.title.replace("{version}", version),
    content.intro,
    ...clauses,
    content.closing,
  ].join("\n\n");
}
