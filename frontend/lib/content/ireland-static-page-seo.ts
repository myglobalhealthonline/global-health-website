import type { LocaleCode } from "@/lib/i18n/types";

export type IrelandStaticPage = "PRICING" | "ABOUT" | "CONTACT";

export type IrelandStaticPageSeo = {
  title: string;
  description: string;
  h1: string;
};

/**
 * Ireland-only SEO copy for public pages that are not backed by PageContent.
 *
 * These pages have deliberately separate jobs: pricing owns monthly membership,
 * About owns entity/trust intent, and Contact owns branded support intent. Keeping
 * the copy here prevents those pages from borrowing the GP hub or doctor-directory
 * head terms just to make a title sound more commercial.
 */
const COPY: Record<LocaleCode, Record<IrelandStaticPage, IrelandStaticPageSeo>> = {
  en: {
    PRICING: {
      title: "Online GP Membership Plans Ireland | Monthly Care",
      description:
        "Compare monthly online GP membership plans in Ireland, with consultation credits, selected specialist savings and wellness rewards. Cancel anytime.",
      h1: "Online GP membership plans in Ireland",
    },
    ABOUT: {
      title: "About Our Online Clinic in Ireland | Global Health",
      description:
        "Learn how Global Health Ireland delivers secure video consultations through an online clinic with locally registered doctors and clear booking options.",
      h1: "About Global Health Ireland, an online clinic",
    },
    CONTACT: {
      title: "Contact Our Ireland Team | Global Health",
      description:
        "Contact Global Health Ireland for booking, billing or account support by phone or email. Our Dublin address is a registered office, not a walk-in clinic.",
      h1: "Contact Global Health Ireland",
    },
  },
  pt: {
    PRICING: {
      title: "Planos de Médico Online na Irlanda | Adesão Mensal",
      description:
        "Compare planos mensais de médico online na Irlanda, com créditos para consultas, descontos selecionados em especialistas e benefícios de bem-estar.",
      h1: "Planos mensais de médico online na Irlanda",
    },
    ABOUT: {
      title: "Sobre a nossa clínica online na Irlanda | Global Health",
      description:
        "Conheça a Global Health Irlanda, uma clínica online com videochamadas seguras, médicos registados localmente e opções de marcação apresentadas com clareza.",
      h1: "Sobre a Global Health Irlanda, uma clínica online",
    },
    CONTACT: {
      title: "Contactar a nossa equipa na Irlanda | Global Health",
      description:
        "Contacte a Global Health Irlanda para apoio com marcações, pagamentos ou conta por telefone ou email. A morada de Dublin é apenas a sede social.",
      h1: "Contactar a Global Health Irlanda",
    },
  },
  es: {
    PRICING: {
      title: "Planes de Médico Online en Irlanda | Cuota Mensual",
      description:
        "Compare planes mensuales de médico online en Irlanda, con créditos para consultas, descuentos seleccionados en especialistas y ventajas de bienestar.",
      h1: "Planes mensuales de médico online en Irlanda",
    },
    ABOUT: {
      title: "Sobre nuestra clínica online en Irlanda | Global Health",
      description:
        "Conozca Global Health Irlanda, una clínica online con videoconsultas seguras, médicos registrados localmente y opciones de reserva explicadas con claridad.",
      h1: "Sobre Global Health Irlanda, una clínica online",
    },
    CONTACT: {
      title: "Contactar con nuestro equipo en Irlanda | Global Health",
      description:
        "Contacte con Global Health Irlanda para ayuda con reservas, pagos o su cuenta por teléfono o email. La dirección de Dublín es solo la sede social.",
      h1: "Contactar con Global Health Irlanda",
    },
  },
  cs: {
    PRICING: {
      title: "Plány Online Lékaře v Irsku | Měsíční Členství",
      description:
        "Porovnejte měsíční plány online lékaře v Irsku s kredity na konzultace, vybranými slevami u specialistů a odměnami pro zdravý životní styl.",
      h1: "Měsíční plány online lékaře v Irsku",
    },
    ABOUT: {
      title: "O naší online klinice v Irsku | Global Health",
      description:
        "Poznejte Global Health Irsko, online kliniku s bezpečnými videokonzultacemi, místně registrovanými lékaři a přehlednými možnostmi objednání.",
      h1: "O Global Health Irsko, online klinice",
    },
    CONTACT: {
      title: "Kontakt na náš tým v Irsku | Global Health",
      description:
        "Kontaktujte Global Health Irsko kvůli objednání, platbě nebo účtu telefonicky či e-mailem. Dublinská adresa je sídlo, nikoli ordinace.",
      h1: "Kontaktujte Global Health Irsko",
    },
  },
  ro: {
    PRICING: {
      title: "Planuri Medic Online Irlanda | Abonament Lunar",
      description:
        "Comparați planurile lunare de medic online din Irlanda, cu credite pentru consultații, reduceri selectate la specialiști și beneficii de wellness.",
      h1: "Planuri lunare de medic online în Irlanda",
    },
    ABOUT: {
      title: "Despre clinica noastră online din Irlanda | Global Health",
      description:
        "Aflați cum Global Health Irlanda oferă consultații video sigure printr-o clinică online, cu medici înregistrați local și opțiuni clare de programare.",
      h1: "Despre Global Health Irlanda, o clinică online",
    },
    CONTACT: {
      title: "Contactați echipa noastră din Irlanda | Global Health",
      description:
        "Contactați Global Health Irlanda pentru programări, plăți sau cont prin telefon ori e-mail. Adresa din Dublin este sediu social, nu clinică fizică.",
      h1: "Contact Global Health Irlanda",
    },
  },
  de: {
    PRICING: {
      title: "Online-Arzt-Tarife Irland | Monatliche Versorgung",
      description:
        "Vergleichen Sie monatliche Online-Arzt-Tarife in Irland mit Beratungsguthaben, ausgewählten Facharztvorteilen und Wellness-Prämien. Jederzeit kündbar.",
      h1: "Monatliche Online-Arzt-Tarife in Irland",
    },
    ABOUT: {
      title: "Über unsere Online-Praxis in Irland | Global Health",
      description:
        "Erfahren Sie, wie Global Health Irland sichere Videosprechstunden über eine Online-Praxis mit lokal registrierten Ärzten und klarer Buchung anbietet.",
      h1: "Über Global Health Irland, eine Online-Praxis",
    },
    CONTACT: {
      title: "Kontakt zu unserem Team in Irland | Global Health",
      description:
        "Kontaktieren Sie Global Health Irland bei Fragen zu Buchung, Zahlung oder Konto per Telefon oder E-Mail. Die Dubliner Adresse ist nur der Firmensitz.",
      h1: "Kontakt Global Health Irland",
    },
  },
};

export function irelandStaticPageSeo(
  page: IrelandStaticPage,
  locale: LocaleCode,
): IrelandStaticPageSeo {
  return COPY[locale][page];
}
