/**
 * Localised copy for the doctor credential outreach emails.
 *
 * Two variants share one roster and one branded template:
 *   - "portal"  → sign in to the Global Health platform (myglobalhealth.online/login)
 *   - "webmail" → sign in to the Migadu mailbox (webmail.migadu.com)
 *
 * Both carry the same mailbox address + password; only the destination and the
 * framing sentence differ. Country → language mapping lives in COUNTRY_LANGUAGE
 * below; anything not listed falls back to English.
 */

export type CredentialLang = "en" | "cs" | "pt" | "pt-BR" | "es" | "ro";
export type CredentialVariant =
  | "portal"
  | "webmail"
  | "announcement"
  | "calendar-notice";

/** Country (as written in the roster file) → email language. */
export const COUNTRY_LANGUAGE: Record<string, CredentialLang> = {
  Czechia: "cs",
  Ireland: "en",
  Portugal: "pt",
  Romania: "ro",
  Spain: "es",
  Brazil: "pt-BR",
};

export const LANGUAGE_LABEL: Record<CredentialLang, string> = {
  en: "English",
  cs: "Czech",
  pt: "Portuguese (PT)",
  "pt-BR": "Portuguese (BR)",
  es: "Spanish",
  ro: "Romanian",
};

export const PORTAL_URL = "https://www.myglobalhealth.online/login";
export const WEBMAIL_URL = "https://webmail.migadu.com/";
export const AVAILABILITY_URL = "https://www.myglobalhealth.online/doctor/availability";
export const SUPPORT_EMAIL = "support@myglobalhealth.online";

/** Primary destination shown in the preflight summary. The announcement
 *  variant carries both links in its body. */
export const VARIANT_URL: Record<CredentialVariant, string> = {
  portal: PORTAL_URL,
  webmail: WEBMAIL_URL,
  announcement: PORTAL_URL,
  "calendar-notice": AVAILABILITY_URL,
};

/** Variants that carry no mailbox password, so a roster row missing its
 *  credentials is still mailable. */
export const CREDENTIAL_FREE_VARIANTS: CredentialVariant[] = ["calendar-notice"];

/** Wording that does not change between the two variants. */
type SharedCopy = {
  greeting: (name: string) => string;
  labelEmail: string;
  labelPassword: string;
  confidentiality: string;
  support: string;
  signOff: string;
  team: string;
};

/** Wording specific to one variant. */
type VariantCopy = {
  subject: string;
  /** Headline rendered in the green template header. */
  title: string;
  intro: string;
  labelUrl: string;
  cta: string;
};

type Copy = SharedCopy & VariantCopy;

const SHARED: Record<CredentialLang, SharedCopy> = {
  en: {
    greeting: (name) => `Dear ${name},`,
    labelEmail: "Email",
    labelPassword: "Password",
    confidentiality:
      "Please keep these credentials confidential and do not share them with anyone.",
    support: "If you have any questions, simply reply to this email.",
    signOff: "Kind regards,",
    team: "The Global Health Team",
  },
  cs: {
    greeting: (name) => `Dobrý den, ${name},`,
    labelEmail: "E-mail",
    labelPassword: "Heslo",
    confidentiality:
      "Uchovávejte prosím tyto údaje v tajnosti a nesdílejte je s dalšími osobami.",
    support: "V případě jakýchkoli dotazů stačí odpovědět na tento e-mail.",
    signOff: "S pozdravem,",
    team: "tým Global Health",
  },
  pt: {
    greeting: (name) => `Caro(a) ${name},`,
    labelEmail: "E-mail",
    labelPassword: "Palavra-passe",
    confidentiality:
      "Por favor, mantenha estas credenciais confidenciais e não as partilhe com terceiros.",
    support: "Em caso de dúvida, basta responder a este e-mail.",
    signOff: "Com os melhores cumprimentos,",
    team: "A Equipa Global Health",
  },
  "pt-BR": {
    greeting: (name) => `Prezado(a) ${name},`,
    labelEmail: "E-mail",
    labelPassword: "Senha",
    confidentiality:
      "Por favor, mantenha estas credenciais confidenciais e não as compartilhe com terceiros.",
    support: "Em caso de dúvida, basta responder a este e-mail.",
    signOff: "Atenciosamente,",
    team: "Equipe Global Health",
  },
  es: {
    greeting: (name) => `Estimado/a ${name},`,
    labelEmail: "Correo electrónico",
    labelPassword: "Contraseña",
    confidentiality:
      "Le rogamos que mantenga estas credenciales confidenciales y no las comparta con terceros.",
    support: "Si tiene cualquier duda, solo tiene que responder a este correo.",
    signOff: "Un cordial saludo,",
    team: "El equipo de Global Health",
  },
  ro: {
    greeting: (name) => `Bună ziua, ${name},`,
    labelEmail: "E-mail",
    labelPassword: "Parolă",
    confidentiality:
      "Vă rugăm să păstrați confidențialitatea acestor date și să nu le comunicați altor persoane.",
    support: "Dacă aveți întrebări, este suficient să răspundeți la acest e-mail.",
    signOff: "Cu stimă,",
    team: "Echipa Global Health",
  },
};

const VARIANTS: Record<"portal" | "webmail", Record<CredentialLang, VariantCopy>> = {
  portal: {
    en: {
      subject: "Global Health Access credentials",
      title: "Your Global Health credentials",
      intro:
        "We are sending you the login credentials for the Global Health platform.",
      labelUrl: "Portal",
      cta: "Open the portal",
    },
    cs: {
      subject: "Přístupové údaje k platformě Global Health",
      title: "Vaše přístupové údaje",
      intro: "zasíláme Vám přihlašovací údaje k platformě Global Health.",
      labelUrl: "Portál",
      cta: "Otevřít portál",
    },
    pt: {
      subject: "Credenciais de acesso à plataforma Global Health",
      title: "As suas credenciais de acesso",
      intro:
        "Enviamos as suas credenciais de acesso à plataforma Global Health.",
      labelUrl: "Portal",
      cta: "Aceder ao portal",
    },
    "pt-BR": {
      subject: "Credenciais de acesso à plataforma Global Health",
      title: "Suas credenciais de acesso",
      intro: "Enviamos suas credenciais de acesso à plataforma Global Health.",
      labelUrl: "Portal",
      cta: "Acessar o portal",
    },
    es: {
      subject: "Credenciales de acceso a la plataforma Global Health",
      title: "Sus credenciales de acceso",
      intro:
        "Le enviamos sus credenciales de acceso a la plataforma Global Health.",
      labelUrl: "Portal",
      cta: "Acceder al portal",
    },
    ro: {
      subject: "Date de acces la platforma Global Health",
      title: "Datele dumneavoastră de acces",
      intro:
        "Vă transmitem datele de autentificare pentru platforma Global Health.",
      labelUrl: "Portal",
      cta: "Accesați portalul",
    },
  },

  webmail: {
    en: {
      subject: "Your Global Health email account",
      title: "Your Global Health email account",
      intro:
        "To access your Global Health email account, please visit webmail.migadu.com and log in using the details below.",
      labelUrl: "Webmail",
      cta: "Open webmail",
    },
    cs: {
      subject: "Přístup k Vaší e-mailové schránce Global Health",
      title: "Vaše e-mailová schránka Global Health",
      intro:
        "pro přístup ke své e-mailové schránce Global Health přejděte na webmail.migadu.com a přihlaste se pomocí níže uvedených údajů.",
      labelUrl: "Webmail",
      cta: "Otevřít webmail",
    },
    pt: {
      subject: "Acesso à sua conta de e-mail Global Health",
      title: "A sua conta de e-mail Global Health",
      intro:
        "Para aceder à sua conta de e-mail Global Health, visite webmail.migadu.com e inicie sessão com os dados indicados abaixo.",
      labelUrl: "Webmail",
      cta: "Aceder ao webmail",
    },
    "pt-BR": {
      subject: "Acesso à sua conta de e-mail Global Health",
      title: "Sua conta de e-mail Global Health",
      intro:
        "Para acessar sua conta de e-mail Global Health, acesse webmail.migadu.com e faça login com os dados indicados abaixo.",
      labelUrl: "Webmail",
      cta: "Acessar o webmail",
    },
    es: {
      subject: "Acceso a su cuenta de correo de Global Health",
      title: "Su cuenta de correo de Global Health",
      intro:
        "Para acceder a su cuenta de correo de Global Health, visite webmail.migadu.com e inicie sesión con los datos que figuran a continuación.",
      labelUrl: "Webmail",
      cta: "Acceder al webmail",
    },
    ro: {
      subject: "Acces la contul dumneavoastră de e-mail Global Health",
      title: "Contul dumneavoastră de e-mail Global Health",
      intro:
        "Pentru a accesa contul dumneavoastră de e-mail Global Health, vă rugăm să accesați webmail.migadu.com și să vă autentificați cu datele de mai jos.",
      labelUrl: "Webmail",
      cta: "Accesați webmail",
    },
  },
};

/** The launch letter — a full message rather than a credentials notice, so it
 *  carries its own structure: narrative paragraphs, BOTH credential blocks,
 *  the 2FA notice, a "What's Next" section and a signature. */
type AnnouncementCopy = {
  subject: string;
  title: string;
  greeting: string;
  paras: string[];
  portalHeading: string;
  webmailHeading: string;
  labelEmail: string;
  labelPassword: string;
  labelLink: string;
  twoFactor: string;
  support: string;
  whatsNextHeading: string;
  whatsNextParas: string[];
  closing: string;
  signOff: string;
  signerRole: string;
  socialHeading: string;
  socialIntro: string;
};

export const SIGNER_NAME = "Dr. Tiago Miguel Figueira";
export const SIGNER_COMPANY = "Global Health";

// ---------------------------------------------------------------------------
// Social footer
// ---------------------------------------------------------------------------

/** Hosted icon PNGs — see scripts/upload-email-social-icons.ts. Email clients
 *  strip inline SVG and refuse data: URIs, so these must be real URLs. */
const ICON_BASE = "https://api.myglobalhealth.online/api/media";
const ICON: Record<string, string> = {
  instagram: `${ICON_BASE}/media/919b33c4-3884-45b3-bdb0-1662d8aeaef4-instagram.png`,
  facebook: `${ICON_BASE}/media/a31bc416-dbdd-4aed-9c40-44780f4462fd-facebook.png`,
  tiktok: `${ICON_BASE}/media/fae53338-27bf-4ea9-b415-a01b56b6e679-tiktok.png`,
  linkedin: `${ICON_BASE}/media/36ae0854-bd3b-4f39-acea-5a13fb71c59a-linkedin.png`,
  youtube: `${ICON_BASE}/media/158087a9-8b61-4945-bb08-02db061eee92-youtube.png`,
  wikidata: `${ICON_BASE}/media/44f9e9ca-7dfc-4db3-9fe7-0e01084d8fab-wikidata.png`,
};

/** Country channels, mirroring what CountryFooter holds in the DB. Every
 *  doctor sees all five countries; their own is listed first. Brazil has no
 *  country pages yet, so it contributes nothing here. */
const COUNTRY_SOCIALS: Record<string, { instagram: string; facebook: string }> = {
  Ireland: {
    instagram: "https://www.instagram.com/globalhealth_ie/",
    facebook: "https://www.facebook.com/profile.php?id=61569767053593",
  },
  Spain: {
    instagram: "https://www.instagram.com/globalhealth_es/",
    facebook: "https://www.facebook.com/profile.php?id=61585243681654",
  },
  Romania: {
    instagram: "https://www.instagram.com/globalhealth_ro/",
    facebook: "https://www.facebook.com/profile.php?id=61589328584369",
  },
  Portugal: {
    instagram: "https://www.instagram.com/globalhealth_pt/",
    facebook: "https://www.facebook.com/profile.php?id=61585376995035",
  },
  Czechia: {
    instagram: "https://www.instagram.com/globalhealth_cz/",
    facebook: "https://www.facebook.com/profile.php?id=61585332477146",
  },
};

const GLOBAL_SOCIALS = [
  { key: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@globalhealth.online" },
  {
    key: "linkedin",
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/myglobalhealth.online",
  },
  { key: "youtube", label: "YouTube", url: "https://www.youtube.com/@GlobalHealth-y9o" },
  { key: "wikidata", label: "Wikidata", url: "https://www.wikidata.org/wiki/Q140363271" },
];

/** Display order; a doctor's own country is hoisted to the top at render time. */
const SOCIAL_COUNTRY_ORDER = ["Ireland", "Portugal", "Spain", "Romania", "Czechia"];

const COUNTRY_NAME: Record<CredentialLang, Record<string, string>> = {
  en: { Ireland: "Ireland", Portugal: "Portugal", Spain: "Spain", Romania: "Romania", Czechia: "Czechia" },
  cs: { Ireland: "Irsko", Portugal: "Portugalsko", Spain: "Španělsko", Romania: "Rumunsko", Czechia: "Česko" },
  pt: { Ireland: "Irlanda", Portugal: "Portugal", Spain: "Espanha", Romania: "Roménia", Czechia: "Chéquia" },
  "pt-BR": { Ireland: "Irlanda", Portugal: "Portugal", Spain: "Espanha", Romania: "Romênia", Czechia: "Tchéquia" },
  es: { Ireland: "Irlanda", Portugal: "Portugal", Spain: "España", Romania: "Rumanía", Czechia: "Chequia" },
  ro: { Ireland: "Irlanda", Portugal: "Portugalia", Spain: "Spania", Romania: "România", Czechia: "Cehia" },
};

const GLOBAL_CHANNELS_LABEL: Record<CredentialLang, string> = {
  en: "Global channels",
  cs: "Globální kanály",
  pt: "Canais globais",
  "pt-BR": "Canais globais",
  es: "Canales globales",
  ro: "Canale globale",
};

function iconLink(key: string, label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" title="${escapeHtml(label)}" style="text-decoration:none;display:inline-block;margin-right:8px;">
               <img src="${escapeHtml(ICON[key])}" width="28" height="28" alt="${escapeHtml(label)}" style="display:inline-block;width:28px;height:28px;border:0;border-radius:50%;vertical-align:middle;" />
             </a>`;
}

/** Every country's Instagram + Facebook, then the global channels. The URL sits
 *  behind the icon — no visible link text. Table-based and inline-styled so
 *  Outlook renders it. */
function renderSocialFooter(country: string, lang: CredentialLang): string {
  const own = country.trim();
  const ordered = [
    ...(COUNTRY_SOCIALS[own] ? [own] : []),
    ...SOCIAL_COUNTRY_ORDER.filter((c) => c !== own),
  ];

  const countryRows = ordered
    .map((c) => {
      const s = COUNTRY_SOCIALS[c];
      const name = COUNTRY_NAME[lang][c] ?? c;
      return `<tr>
             <td style="padding:6px 14px 6px 0;font-size:13px;color:#6B7A72;white-space:nowrap;">${escapeHtml(name)}</td>
             <td style="padding:6px 0;">${iconLink("instagram", `Instagram — ${name}`, s.instagram)}${iconLink("facebook", `Facebook — ${name}`, s.facebook)}</td>
           </tr>`;
    })
    .join("\n           ");

  const globalIcons = GLOBAL_SOCIALS.map((g) => iconLink(g.key, g.label, g.url)).join("");

  return `<table border="0" cellpadding="0" cellspacing="0" style="margin:0;">
         ${countryRows}
           <tr>
             <td style="padding:14px 14px 0 0;font-size:13px;color:#6B7A72;white-space:nowrap;vertical-align:middle;">${escapeHtml(GLOBAL_CHANNELS_LABEL[lang])}</td>
             <td style="padding:14px 0 0;">${globalIcons}</td>
           </tr>
       </table>`;
}

/** Plain-text mirror — the text part cannot hide a URL behind an icon. */
function socialFooterText(country: string, lang: CredentialLang): string {
  const own = country.trim();
  const ordered = [
    ...(COUNTRY_SOCIALS[own] ? [own] : []),
    ...SOCIAL_COUNTRY_ORDER.filter((c) => c !== own),
  ];
  const lines = ordered.flatMap((c) => {
    const s = COUNTRY_SOCIALS[c];
    const name = COUNTRY_NAME[lang][c] ?? c;
    return [`${name} — Instagram: ${s.instagram}`, `${name} — Facebook: ${s.facebook}`];
  });
  return [
    ...lines,
    "",
    `${GLOBAL_CHANNELS_LABEL[lang]}:`,
    ...GLOBAL_SOCIALS.map((g) => `${g.label}: ${g.url}`),
  ].join("\n");
}

const ANNOUNCEMENT: Record<CredentialLang, AnnouncementCopy> = {
  en: {
    subject: "Welcome to the new Global Health platform",
    title: "Welcome to the new Global Health platform",
    greeting: "Dear Colleagues,",
    paras: [
      "Thank you for your patience over the past months as we've been building something we're genuinely proud of.",
      "Over this time, our team has been working on a new platform, built from the ground up with both patient experience and doctor experience in mind. Every decision — from scheduling flows to how you manage your consultations — was made thinking of the people who use it every day: you and your patients.",
      "We can now proudly say that Global Health is active across 6 countries, spanning Europe and Brazil, supported by a system that connects doctors across borders and lets our network operate as one coordinated team, wherever you're based.",
    ],
    portalHeading: "Accessing the Doctor Portal",
    webmailHeading: "Accessing Institutional Email",
    labelEmail: "Email",
    labelPassword: "Password",
    labelLink: "Link",
    twoFactor:
      "The platform is fully GDPR and LGPD compliant and therefore a 2nd authentication factor is necessary when logging in. The code for the 2nd authentication factor is sent to your institutional email address.",
    support:
      "If you run into any issues logging in, please reach out to {support} and we'll help you get set up right away.",
    whatsNextHeading: "What's Next",
    whatsNextParas: [
      "Over the coming months, we'll be rolling out our marketing campaigns country by country, and we're looking forward to growing both locally and globally, together with you.",
      "This platform is still very much a work in progress, and we mean that in the best way: it's built to evolve. If you have any suggestions, feedback, or ideas — big or small — we'd love to hear them. Your experience on the ground is exactly what will make this better.",
    ],
    closing:
      "Thank you again for being part of this project from the start, and for your patience while we got it right.",
    signOff: "Warm regards,",
    signerRole: "Co-Founder & Clinical Director",
    socialHeading: "Follow us",
    socialIntro:
      "Please take a moment to follow our social media. Each country has its own Instagram and Facebook page.",
  },

  cs: {
    subject: "Vítejte na nové platformě Global Health",
    title: "Vítejte na nové platformě Global Health",
    greeting: "Vážené kolegyně, vážení kolegové,",
    paras: [
      "děkujeme Vám za trpělivost v uplynulých měsících, během nichž jsme budovali něco, na co jsme skutečně hrdí.",
      "Náš tým po celou tuto dobu pracoval na nové platformě, vytvořené od základu s ohledem na zkušenost pacientů i lékařů. Každé rozhodnutí — od průběhu objednávání až po způsob, jakým spravujete své konzultace — vzniklo s myšlenkou na ty, kdo ji používají každý den: na Vás a Vaše pacienty.",
      "S hrdostí můžeme oznámit, že Global Health nyní působí v 6 zemích Evropy a Brazílie, na základě systému, který propojuje lékaře napříč hranicemi a umožňuje naší síti fungovat jako jeden sehraný tým, ať jste kdekoli.",
    ],
    portalHeading: "Přístup do lékařského portálu",
    webmailHeading: "Přístup k institucionálnímu e-mailu",
    labelEmail: "E-mail",
    labelPassword: "Heslo",
    labelLink: "Odkaz",
    twoFactor:
      "Platforma plně odpovídá nařízením GDPR a LGPD, a proto je při přihlášení vyžadován druhý ověřovací faktor. Kód pro druhý ověřovací faktor je zasílán na Vaši institucionální e-mailovou adresu.",
    support:
      "Pokud při přihlašování narazíte na jakékoli potíže, obraťte se prosím na {support} a rádi Vám vše nastavíme.",
    whatsNextHeading: "Co bude dál",
    whatsNextParas: [
      "V následujících měsících budeme postupně spouštět marketingové kampaně v jednotlivých zemích a těšíme se na růst — místní i globální — společně s Vámi.",
      "Platforma je stále ve vývoji, a to v tom nejlepším smyslu: je stavěná tak, aby se vyvíjela. Máte-li jakékoli návrhy, připomínky nebo nápady — velké i malé — rádi je uslyšíme. Právě Vaše každodenní zkušenost je to, co ji zlepší.",
    ],
    closing:
      "Ještě jednou děkujeme, že jste součástí tohoto projektu od samého začátku, a za Vaši trpělivost, než jsme vše doladili.",
    signOff: "Se srdečným pozdravem,",
    signerRole: "spoluzakladatel a klinický ředitel",
    socialHeading: "Sledujte nás",
    socialIntro:
      "Věnujte prosím chvíli našim sociálním sítím. Každá země má vlastní účet na Instagramu a stránku na Facebooku.",
  },

  pt: {
    subject: "Bem-vindo à nova plataforma Global Health",
    title: "Bem-vindo à nova plataforma Global Health",
    greeting: "Caros Colegas,",
    paras: [
      "Obrigado pela vossa paciência ao longo dos últimos meses, durante os quais construímos algo de que nos orgulhamos genuinamente.",
      "Durante este período, a nossa equipa trabalhou numa nova plataforma, construída de raiz a pensar tanto na experiência do paciente como na do médico. Cada decisão — desde os fluxos de marcação até à forma como gere as suas consultas — foi tomada a pensar em quem a utiliza todos os dias: vocês e os vossos pacientes.",
      "Podemos agora afirmar com orgulho que a Global Health está ativa em 6 países, entre a Europa e o Brasil, suportada por um sistema que liga médicos além-fronteiras e permite que a nossa rede funcione como uma equipa coordenada, onde quer que esteja.",
    ],
    portalHeading: "Acesso ao Portal do Médico",
    webmailHeading: "Acesso ao E-mail Institucional",
    labelEmail: "E-mail",
    labelPassword: "Palavra-passe",
    labelLink: "Ligação",
    twoFactor:
      "A plataforma cumpre integralmente o RGPD e a LGPD, pelo que é necessário um segundo fator de autenticação no início de sessão. O código do segundo fator é enviado para o seu endereço de e-mail institucional.",
    support:
      "Se tiver qualquer dificuldade a iniciar sessão, contacte {support} e ajudamos de imediato.",
    whatsNextHeading: "Próximos passos",
    whatsNextParas: [
      "Nos próximos meses iremos lançar as nossas campanhas de marketing país a país, e contamos crescer local e globalmente, em conjunto convosco.",
      "Esta plataforma está ainda em evolução, e dizemo-lo no melhor sentido: foi feita para evoluir. Se tiver sugestões, comentários ou ideias — grandes ou pequenas — teremos muito gosto em ouvi-las. A sua experiência no terreno é exatamente o que a tornará melhor.",
    ],
    closing:
      "Obrigado mais uma vez por fazer parte deste projeto desde o início e pela sua paciência enquanto o preparámos como deve ser.",
    signOff: "Com os melhores cumprimentos,",
    signerRole: "Cofundador e Diretor Clínico",
    socialHeading: "Siga-nos",
    socialIntro:
      "Reserve um momento para seguir as nossas redes sociais. Cada país tem a sua própria conta de Instagram e página de Facebook.",
  },

  "pt-BR": {
    subject: "Bem-vindo à nova plataforma Global Health",
    title: "Bem-vindo à nova plataforma Global Health",
    greeting: "Caros Colegas,",
    paras: [
      "Obrigado pela sua paciência ao longo dos últimos meses, durante os quais construímos algo de que nos orgulhamos genuinamente.",
      "Durante este período, nossa equipe trabalhou em uma nova plataforma, construída do zero pensando tanto na experiência do paciente quanto na do médico. Cada decisão — desde os fluxos de agendamento até a forma como você gerencia suas consultas — foi tomada pensando em quem a utiliza todos os dias: você e seus pacientes.",
      "Podemos agora afirmar com orgulho que a Global Health está ativa em 6 países, entre a Europa e o Brasil, apoiada por um sistema que conecta médicos além-fronteiras e permite que nossa rede funcione como uma equipe coordenada, onde quer que você esteja.",
    ],
    portalHeading: "Acesso ao Portal do Médico",
    webmailHeading: "Acesso ao E-mail Institucional",
    labelEmail: "E-mail",
    labelPassword: "Senha",
    labelLink: "Link",
    twoFactor:
      "A plataforma está em total conformidade com o GDPR e a LGPD e, por isso, é necessário um segundo fator de autenticação ao fazer login. O código do segundo fator é enviado para o seu endereço de e-mail institucional.",
    support:
      "Se tiver qualquer dificuldade para acessar, entre em contato pelo {support} e ajudaremos você imediatamente.",
    whatsNextHeading: "Próximos passos",
    whatsNextParas: [
      "Nos próximos meses, lançaremos nossas campanhas de marketing país por país, e esperamos crescer local e globalmente, junto com você.",
      "Esta plataforma ainda está em evolução, e dizemos isso no melhor sentido: ela foi feita para evoluir. Se tiver sugestões, comentários ou ideias — grandes ou pequenas — teremos muito prazer em ouvi-las. Sua experiência na prática é exatamente o que vai torná-la melhor.",
    ],
    closing:
      "Obrigado mais uma vez por fazer parte deste projeto desde o início e pela sua paciência enquanto o deixamos pronto.",
    signOff: "Atenciosamente,",
    signerRole: "Cofundador e Diretor Clínico",
    socialHeading: "Siga-nos",
    socialIntro:
      "Reserve um momento para seguir nossas redes sociais. Cada país tem sua própria conta no Instagram e página no Facebook.",
  },

  es: {
    subject: "Bienvenido a la nueva plataforma de Global Health",
    title: "Bienvenido a la nueva plataforma de Global Health",
    greeting: "Estimados compañeros,",
    paras: [
      "Gracias por su paciencia durante estos últimos meses, en los que hemos construido algo de lo que estamos verdaderamente orgullosos.",
      "Durante este tiempo, nuestro equipo ha trabajado en una nueva plataforma, creada desde cero pensando tanto en la experiencia del paciente como en la del médico. Cada decisión —desde los flujos de agenda hasta la forma de gestionar sus consultas— se ha tomado pensando en quienes la usan cada día: ustedes y sus pacientes.",
      "Hoy podemos decir con orgullo que Global Health está activa en 6 países, entre Europa y Brasil, con un sistema que conecta a médicos más allá de las fronteras y permite que nuestra red funcione como un único equipo coordinado, esté donde esté.",
    ],
    portalHeading: "Acceso al Portal del Médico",
    webmailHeading: "Acceso al Correo Institucional",
    labelEmail: "Correo electrónico",
    labelPassword: "Contraseña",
    labelLink: "Enlace",
    twoFactor:
      "La plataforma cumple plenamente con el RGPD y la LGPD, por lo que es necesario un segundo factor de autenticación al iniciar sesión. El código del segundo factor se envía a su dirección de correo institucional.",
    support:
      "Si tiene cualquier problema para iniciar sesión, escriba a {support} y le ayudaremos enseguida.",
    whatsNextHeading: "Próximos pasos",
    whatsNextParas: [
      "En los próximos meses iremos lanzando nuestras campañas de marketing país por país, y esperamos crecer tanto a nivel local como global, junto a ustedes.",
      "Esta plataforma sigue siendo un proyecto en evolución, y lo decimos en el mejor sentido: está hecha para crecer. Si tiene sugerencias, comentarios o ideas —grandes o pequeñas— nos encantará escucharlas. Su experiencia sobre el terreno es justo lo que la hará mejor.",
    ],
    closing:
      "Gracias de nuevo por formar parte de este proyecto desde el principio y por su paciencia mientras lo dejábamos a punto.",
    signOff: "Un cordial saludo,",
    signerRole: "Cofundador y Director Clínico",
    socialHeading: "Síganos",
    socialIntro:
      "Dedique un momento a seguir nuestras redes sociales. Cada país tiene su propia cuenta de Instagram y su página de Facebook.",
  },

  ro: {
    subject: "Bine ați venit pe noua platformă Global Health",
    title: "Bine ați venit pe noua platformă Global Health",
    greeting: "Stimați colegi,",
    paras: [
      "Vă mulțumim pentru răbdarea din ultimele luni, în care am construit ceva cu care ne mândrim cu adevărat.",
      "În tot acest timp, echipa noastră a lucrat la o platformă nouă, construită de la zero ținând cont deopotrivă de experiența pacientului și de cea a medicului. Fiecare decizie — de la fluxul programărilor până la modul în care vă gestionați consultațiile — a fost luată gândindu-ne la cei care o folosesc zi de zi: dumneavoastră și pacienții dumneavoastră.",
      "Putem spune acum cu mândrie că Global Health este activă în 6 țări, din Europa până în Brazilia, susținută de un sistem care conectează medici dincolo de granițe și permite rețelei noastre să funcționeze ca o singură echipă coordonată, oriunde v-ați afla.",
    ],
    portalHeading: "Accesul la Portalul Medicului",
    webmailHeading: "Accesul la E-mailul Instituțional",
    labelEmail: "E-mail",
    labelPassword: "Parolă",
    labelLink: "Link",
    twoFactor:
      "Platforma respectă integral GDPR și LGPD, prin urmare la autentificare este necesar un al doilea factor de verificare. Codul pentru al doilea factor este trimis la adresa dumneavoastră de e-mail instituțional.",
    support:
      "Dacă întâmpinați dificultăți la autentificare, vă rugăm să scrieți la {support} și vă ajutăm imediat.",
    whatsNextHeading: "Ce urmează",
    whatsNextParas: [
      "În lunile următoare vom lansa campaniile de marketing țară cu țară și ne bucurăm să creștem, local și global, împreună cu dumneavoastră.",
      "Această platformă este încă în dezvoltare, iar spunem asta în cel mai bun sens: este construită pentru a evolua. Dacă aveți sugestii, observații sau idei — mari sau mici — ne-ar face plăcere să le aflăm. Experiența dumneavoastră din practică este exact ceea ce o va face mai bună.",
    ],
    closing:
      "Vă mulțumim încă o dată că faceți parte din acest proiect de la început și pentru răbdarea de care ați dat dovadă până am pus totul la punct.",
    signOff: "Cu deosebită considerație,",
    signerRole: "Cofondator și Director Clinic",
    socialHeading: "Urmăriți-ne",
    socialIntro:
      "Vă invităm să urmăriți canalele noastre de socializare. Fiecare țară are propriul cont de Instagram și propria pagină de Facebook.",
  },
};

/** System notice: Google Calendar sync retired. Carries no credentials. */
type NoticeCopy = {
  subject: string;
  title: string;
  greeting: (name: string) => string;
  paras: string[];
  warning: string;
  cta: string;
  support: string;
  signOff: string;
  team: string;
};

const CALENDAR_NOTICE: Record<CredentialLang, NoticeCopy> = {
  en: {
    subject: "System Notification — Google Calendar Integration No Longer Supported",
    title: "Google Calendar integration retired",
    greeting: (name) => `Dear ${name},`,
    paras: [
      "Google Calendar integration is no longer supported. From now on, all availability must be set and managed directly in the Doctor Portal calendar.",
    ],
    warning:
      "Previously synced hours will no longer update automatically. Please log in and set your availability now to avoid scheduling conflicts.",
    cta: "Set my availability",
    support: "If you need any help, please reach out to {support}.",
    signOff: "Kind regards,",
    team: "The Global Health Team",
  },

  cs: {
    subject: "Systémové oznámení — propojení s Google Kalendářem již není podporováno",
    title: "Propojení s Google Kalendářem bylo ukončeno",
    greeting: (name) => `Dobrý den, ${name},`,
    paras: [
      "propojení s Google Kalendářem již není podporováno. Veškerou dostupnost je od nynějška nutné nastavovat a spravovat přímo v kalendáři lékařského portálu.",
    ],
    warning:
      "Dříve synchronizované hodiny se již nebudou automaticky aktualizovat. Přihlaste se prosím a nastavte si svou dostupnost nyní, abyste předešli kolizím v objednávkách.",
    cta: "Nastavit dostupnost",
    support: "Pokud budete potřebovat pomoc, obraťte se prosím na {support}.",
    signOff: "S pozdravem,",
    team: "tým Global Health",
  },

  pt: {
    subject: "Notificação de sistema — integração com o Google Calendar descontinuada",
    title: "Integração com o Google Calendar descontinuada",
    greeting: (name) => `Caro(a) ${name},`,
    paras: [
      "A integração com o Google Calendar deixou de ser suportada. A partir de agora, toda a disponibilidade deve ser definida e gerida diretamente no calendário do Portal do Médico.",
    ],
    warning:
      "Os horários anteriormente sincronizados deixarão de ser atualizados automaticamente. Inicie sessão e defina já a sua disponibilidade para evitar conflitos de agendamento.",
    cta: "Definir a minha disponibilidade",
    support: "Se precisar de ajuda, contacte {support}.",
    signOff: "Com os melhores cumprimentos,",
    team: "A Equipa Global Health",
  },

  "pt-BR": {
    subject: "Notificação do sistema — integração com o Google Agenda descontinuada",
    title: "Integração com o Google Agenda descontinuada",
    greeting: (name) => `Prezado(a) ${name},`,
    paras: [
      "A integração com o Google Agenda não é mais suportada. A partir de agora, toda a disponibilidade deve ser definida e gerenciada diretamente no calendário do Portal do Médico.",
    ],
    warning:
      "Os horários sincronizados anteriormente não serão mais atualizados automaticamente. Faça login e defina sua disponibilidade agora para evitar conflitos de agendamento.",
    cta: "Definir minha disponibilidade",
    support: "Se precisar de ajuda, entre em contato pelo {support}.",
    signOff: "Atenciosamente,",
    team: "Equipe Global Health",
  },

  es: {
    subject: "Notificación del sistema — la integración con Google Calendar deja de estar disponible",
    title: "Integración con Google Calendar retirada",
    greeting: (name) => `Estimado/a ${name},`,
    paras: [
      "La integración con Google Calendar ya no está disponible. A partir de ahora, toda la disponibilidad debe configurarse y gestionarse directamente en el calendario del Portal del Médico.",
    ],
    warning:
      "Los horarios sincronizados anteriormente dejarán de actualizarse automáticamente. Inicie sesión y configure su disponibilidad ahora para evitar conflictos de agenda.",
    cta: "Configurar mi disponibilidad",
    support: "Si necesita ayuda, escriba a {support}.",
    signOff: "Un cordial saludo,",
    team: "El equipo de Global Health",
  },

  ro: {
    subject: "Notificare de sistem — integrarea cu Google Calendar nu mai este acceptată",
    title: "Integrarea cu Google Calendar a fost retrasă",
    greeting: (name) => `Bună ziua, ${name},`,
    paras: [
      "Integrarea cu Google Calendar nu mai este acceptată. De acum înainte, toată disponibilitatea trebuie stabilită și gestionată direct în calendarul Portalului Medicului.",
    ],
    warning:
      "Orele sincronizate anterior nu se vor mai actualiza automat. Vă rugăm să vă autentificați și să vă stabiliți disponibilitatea acum, pentru a evita conflictele de programare.",
    cta: "Stabiliți disponibilitatea",
    support: "Dacă aveți nevoie de ajutor, scrieți la {support}.",
    signOff: "Cu stimă,",
    team: "Echipa Global Health",
  },
};

function renderCalendarNotice(input: CredentialEmailInput): RenderedCredentialEmail {
  const c = CALENDAR_NOTICE[input.lang];
  const url = input.url || AVAILABILITY_URL;
  const supportHtml = escapeHtml(c.support).replace(
    "{support}",
    `<a href="mailto:${SUPPORT_EMAIL}" style="color:#15382A;font-weight:600;">${SUPPORT_EMAIL}</a>`,
  );

  const paras = c.paras
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
    .join("\n       ");

  const bodyHtml = `<p style="margin:0 0 16px;">${escapeHtml(c.greeting(input.name))}</p>
       ${paras}
       <p style="margin:0 0 24px;padding:14px 16px;background-color:#F6F8F1;border-left:3px solid #B0F122;border-radius:0 10px 10px 0;font-size:14px;">${escapeHtml(c.warning)}</p>
       <p style="margin:0 0 24px;text-align:center;"><a href="${escapeHtml(url)}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">${escapeHtml(c.cta)}</a></p>
       <p style="margin:0 0 24px;font-size:13px;color:#737373;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:#737373;">${escapeHtml(url)}</a></p>
       <p style="margin:0 0 24px;font-size:14px;">${supportHtml}</p>
       <p style="margin:0;">${escapeHtml(c.signOff)}<br/>${escapeHtml(c.team)}</p>`;

  const text = [
    c.greeting(input.name),
    "",
    ...c.paras.flatMap((p) => [p, ""]),
    c.warning,
    "",
    url,
    "",
    c.support.replace("{support}", SUPPORT_EMAIL),
    "",
    c.signOff,
    c.team,
  ].join("\n");

  return { subject: c.subject, title: c.title, bodyHtml, text };
}

export function languageForCountry(country: string): CredentialLang {
  return COUNTRY_LANGUAGE[country.trim()] ?? "en";
}

export function copyFor(
  variant: "portal" | "webmail",
  lang: CredentialLang,
): Copy {
  return { ...SHARED[lang], ...VARIANTS[variant][lang] };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type CredentialEmailInput = {
  name: string;
  lang: CredentialLang;
  variant: CredentialVariant;
  loginEmail: string;
  loginPassword: string;
  /** Destination for the single-purpose variants; ignored by "announcement",
   *  which renders both portalUrl and webmailUrl. */
  url: string;
  portalUrl?: string;
  webmailUrl?: string;
  /** Drives which country's Instagram/Facebook appear in the social footer. */
  country?: string;
};

export type RenderedCredentialEmail = {
  subject: string;
  title: string;
  bodyHtml: string;
  text: string;
};

/** Shared credential-box row used by every variant. */
function credentialRow(label: string, value: string, isLink = false): string {
  return `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #E4E7DD;font-size:13px;color:#6B7A72;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #E4E7DD;font-family:'Cascadia Code',Consolas,Menlo,monospace;font-size:14px;color:#15382A;word-break:break-all;">${
          isLink
            ? `<a href="${escapeHtml(value)}" style="color:#15382A;text-decoration:none;">${escapeHtml(value)}</a>`
            : escapeHtml(value)
        }</td>
      </tr>`;
}

function credentialBox(rows: string): string {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #E4E7DD;border-radius:14px;overflow:hidden;background-color:#F6F8F1;margin:0 0 24px;">${rows}
       </table>`;
}

function sectionHeading(text: string): string {
  return `<p style="margin:0 0 12px;font-family:'Cascadia Code',Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#15382A;font-weight:700;">${escapeHtml(text)}</p>`;
}

/** The launch letter: narrative paragraphs, both credential blocks, the 2FA
 *  notice, "What's Next", and a signature block. */
function renderAnnouncement(input: CredentialEmailInput): RenderedCredentialEmail {
  const c = ANNOUNCEMENT[input.lang];
  const portalUrl = input.portalUrl ?? PORTAL_URL;
  const webmailUrl = input.webmailUrl ?? WEBMAIL_URL;
  const supportHtml = escapeHtml(c.support).replace(
    "{support}",
    `<a href="mailto:${SUPPORT_EMAIL}" style="color:#15382A;font-weight:600;">${SUPPORT_EMAIL}</a>`,
  );

  const paras = c.paras
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
    .join("\n       ");
  const nextParas = c.whatsNextParas
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
    .join("\n       ");

  const bodyHtml = `<p style="margin:0 0 16px;">${escapeHtml(c.greeting)}</p>
       ${paras}
       ${sectionHeading(c.portalHeading)}
       ${credentialBox(
         credentialRow(c.labelEmail, input.loginEmail) +
           credentialRow(c.labelPassword, input.loginPassword) +
           credentialRow(c.labelLink, portalUrl, true),
       )}
       ${sectionHeading(c.webmailHeading)}
       ${credentialBox(
         credentialRow(c.labelEmail, input.loginEmail) +
           credentialRow(c.labelPassword, input.loginPassword) +
           credentialRow(c.labelLink, webmailUrl, true),
       )}
       <p style="margin:0 0 16px;padding:14px 16px;background-color:#F6F8F1;border-left:3px solid #B0F122;border-radius:0 10px 10px 0;font-size:14px;">${escapeHtml(c.twoFactor)}</p>
       <p style="margin:0 0 28px;font-size:14px;">${supportHtml}</p>
       <hr style="border:none;border-top:1px solid #E4E7DD;margin:0 0 24px;" />
       ${sectionHeading(c.whatsNextHeading)}
       ${nextParas}
       <p style="margin:0 0 24px;">${escapeHtml(c.closing)}</p>
       <p style="margin:0;">${escapeHtml(c.signOff)}<br/>
         <strong>${escapeHtml(SIGNER_NAME)}</strong><br/>
         <span style="color:#6B7A72;">${escapeHtml(c.signerRole)}</span><br/>
         <span style="color:#6B7A72;">${escapeHtml(SIGNER_COMPANY)}</span>
       </p>
       <hr style="border:none;border-top:1px solid #E4E7DD;margin:28px 0 20px;" />
       ${sectionHeading(c.socialHeading)}
       <p style="margin:0 0 18px;font-size:14px;">${escapeHtml(c.socialIntro)}</p>
       ${renderSocialFooter(input.country ?? "", input.lang)}`;

  const text = [
    c.greeting,
    "",
    ...c.paras.flatMap((p) => [p, ""]),
    c.portalHeading,
    `${c.labelEmail}: ${input.loginEmail}`,
    `${c.labelPassword}: ${input.loginPassword}`,
    `${c.labelLink}: ${portalUrl}`,
    "",
    c.webmailHeading,
    `${c.labelEmail}: ${input.loginEmail}`,
    `${c.labelPassword}: ${input.loginPassword}`,
    `${c.labelLink}: ${webmailUrl}`,
    "",
    c.twoFactor,
    "",
    c.support.replace("{support}", SUPPORT_EMAIL),
    "",
    c.whatsNextHeading,
    "",
    ...c.whatsNextParas.flatMap((p) => [p, ""]),
    c.closing,
    "",
    c.signOff,
    SIGNER_NAME,
    c.signerRole,
    SIGNER_COMPANY,
    "",
    c.socialHeading,
    c.socialIntro,
    "",
    socialFooterText(input.country ?? "", input.lang),
  ].join("\n");

  return { subject: c.subject, title: c.title, bodyHtml, text };
}

/** Renders the body only — the caller wraps it in the shared branded shell. */
export function renderCredentialEmail(
  input: CredentialEmailInput,
): RenderedCredentialEmail {
  if (input.variant === "announcement") return renderAnnouncement(input);
  if (input.variant === "calendar-notice") return renderCalendarNotice(input);

  const c = copyFor(input.variant, input.lang);
  const row = (label: string, value: string, isLink = false) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #E4E7DD;font-size:13px;color:#6B7A72;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #E4E7DD;font-family:'Cascadia Code',Consolas,Menlo,monospace;font-size:14px;color:#15382A;word-break:break-all;">${
          isLink
            ? `<a href="${escapeHtml(value)}" style="color:#15382A;text-decoration:none;">${escapeHtml(value)}</a>`
            : escapeHtml(value)
        }</td>
      </tr>`;

  const bodyHtml = `<p style="margin:0 0 14px;">${escapeHtml(c.greeting(input.name))}</p>
       <p style="margin:0 0 22px;">${escapeHtml(c.intro)}</p>
       <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #E4E7DD;border-radius:14px;overflow:hidden;background-color:#F6F8F1;margin:0 0 24px;">
         ${row(c.labelEmail, input.loginEmail)}
         ${row(c.labelPassword, input.loginPassword)}
         ${row(c.labelUrl, input.url, true)}
       </table>
       <p style="margin:0 0 24px;text-align:center;"><a href="${escapeHtml(input.url)}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">${escapeHtml(c.cta)}</a></p>
       <p style="margin:0 0 10px;font-size:13px;color:#737373;">${escapeHtml(c.confidentiality)}</p>
       <p style="margin:0 0 24px;font-size:13px;color:#737373;">${escapeHtml(c.support)}</p>
       <p style="margin:0;">${escapeHtml(c.signOff)}<br/>${escapeHtml(c.team)}</p>`;

  const text = [
    c.greeting(input.name),
    "",
    c.intro,
    "",
    `${c.labelEmail}: ${input.loginEmail}`,
    `${c.labelPassword}: ${input.loginPassword}`,
    `${c.labelUrl}: ${input.url}`,
    "",
    c.confidentiality,
    c.support,
    "",
    c.signOff,
    c.team,
  ].join("\n");

  return { subject: c.subject, title: c.title, bodyHtml, text };
}
