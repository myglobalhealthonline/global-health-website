/**
 * Locale-keyed labels for the doctor payout statement export
 * (`GET /api/doctor/reports/export?dataset=payout`) — the document a doctor
 * downloads, values against their per-service payout, and uses to raise
 * their own invoice. The doctor picks the language from a dropdown in the
 * portal (see `PayoutInvoicePanel`), independent of their portal UI locale,
 * so a clinician who reads the portal in English can still hand a Portuguese
 * statement to their accountant.
 *
 * Also carries the generic PDF/CSV chrome strings (row count, "no rows",
 * truncation note) so the WHOLE downloaded document is in one language, not
 * just the payout-specific labels. Every other report export
 * (services/patients/appointments, admin commission run) leaves
 * `ReportTable.locale`/`.chrome` unset and keeps the existing English chrome
 * — see the defaults in `report-formatters.ts`.
 */

export const PAYOUT_STATEMENT_LOCALES = ["en", "pt", "es", "cs", "ro", "de"] as const;

export type PayoutStatementLocale = (typeof PAYOUT_STATEMENT_LOCALES)[number];

/** Native display name for the language picker — not translated per-locale,
 *  the same list is shown regardless of which language is currently active. */
export const PAYOUT_STATEMENT_LANGUAGE_NAMES: Record<PayoutStatementLocale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  cs: "Čeština",
  ro: "Română",
  de: "Deutsch",
};

export type ReportChromeLabels = {
  /** Small-caps prefix before the generated timestamp, e.g. "Report". */
  reportLabel: string;
  generatedLabel: string;
  rowSingular: string;
  rowPlural: string;
  noRowsInRange: string;
  truncatedNote: string;
};

export type PayoutStatementLabels = {
  htmlLang: string;
  title: string;
  consultationSingular: string;
  consultationPlural: string;
  period: string;
  accountHolder: string;
  iban: string;
  ibanNotOnFile: string;
  bic: string;
  markets: string;
  totalToPay: string;
  colDate: string;
  colPatient: string;
  colService: string;
  colInsurer: string;
  colPayout: string;
  notSet: string;
  /** `{market}` placeholder. */
  marketSection: string;
  /** `{market}` placeholder. */
  subtotalPrefix: string;
  totalToPayCaps: string;
  chrome: ReportChromeLabels;
};

export const PAYOUT_STATEMENT_CONTENT: Record<PayoutStatementLocale, PayoutStatementLabels> = {
  en: {
    htmlLang: "en-GB",
    title: "Payout statement",
    consultationSingular: "consultation",
    consultationPlural: "consultations",
    period: "Period",
    accountHolder: "Account holder",
    iban: "IBAN",
    ibanNotOnFile: "Not on file",
    bic: "BIC / SWIFT",
    markets: "Markets",
    totalToPay: "Total to pay",
    colDate: "Date",
    colPatient: "Patient",
    colService: "Service",
    colInsurer: "Insurer",
    colPayout: "Payout",
    notSet: "Not set",
    marketSection: "Market — {market}",
    subtotalPrefix: "Subtotal — {market}",
    totalToPayCaps: "TOTAL TO PAY",
    chrome: {
      reportLabel: "Report",
      generatedLabel: "Generated",
      rowSingular: "row",
      rowPlural: "rows",
      noRowsInRange: "No rows in this range.",
      truncatedNote:
        "List truncated at the export row limit — narrow the date range or filters for a complete pull.",
    },
  },

  pt: {
    htmlLang: "pt-PT",
    title: "Extrato de pagamento",
    consultationSingular: "consulta",
    consultationPlural: "consultas",
    period: "Período",
    accountHolder: "Titular da conta",
    iban: "IBAN",
    ibanNotOnFile: "Não registado",
    bic: "BIC / SWIFT",
    markets: "Mercados",
    totalToPay: "Total a pagar",
    colDate: "Data",
    colPatient: "Doente",
    colService: "Serviço",
    colInsurer: "Seguradora",
    colPayout: "Pagamento",
    notSet: "Não definido",
    marketSection: "Mercado — {market}",
    subtotalPrefix: "Subtotal — {market}",
    totalToPayCaps: "TOTAL A PAGAR",
    chrome: {
      reportLabel: "Relatório",
      generatedLabel: "Gerado em",
      rowSingular: "linha",
      rowPlural: "linhas",
      noRowsInRange: "Sem linhas neste período.",
      truncatedNote:
        "Lista truncada no limite de exportação — reduza o intervalo de datas ou os filtros para uma extração completa.",
    },
  },

  es: {
    htmlLang: "es-ES",
    title: "Extracto de pago",
    consultationSingular: "consulta",
    consultationPlural: "consultas",
    period: "Periodo",
    accountHolder: "Titular de la cuenta",
    iban: "IBAN",
    ibanNotOnFile: "No registrado",
    bic: "BIC / SWIFT",
    markets: "Mercados",
    totalToPay: "Total a pagar",
    colDate: "Fecha",
    colPatient: "Paciente",
    colService: "Servicio",
    colInsurer: "Aseguradora",
    colPayout: "Pago",
    notSet: "No establecido",
    marketSection: "Mercado — {market}",
    subtotalPrefix: "Subtotal — {market}",
    totalToPayCaps: "TOTAL A PAGAR",
    chrome: {
      reportLabel: "Informe",
      generatedLabel: "Generado el",
      rowSingular: "fila",
      rowPlural: "filas",
      noRowsInRange: "No hay filas en este periodo.",
      truncatedNote:
        "Lista truncada en el límite de exportación — reduzca el intervalo de fechas o los filtros para una extracción completa.",
    },
  },

  cs: {
    htmlLang: "cs-CZ",
    title: "Výplatní výpis",
    consultationSingular: "konzultace",
    consultationPlural: "konzultací",
    period: "Období",
    accountHolder: "Majitel účtu",
    iban: "IBAN",
    ibanNotOnFile: "Není uvedeno",
    bic: "BIC / SWIFT",
    markets: "Trhy",
    totalToPay: "Celkem k výplatě",
    colDate: "Datum",
    colPatient: "Pacient",
    colService: "Služba",
    colInsurer: "Pojišťovna",
    colPayout: "Výplata",
    notSet: "Nenastaveno",
    marketSection: "Trh — {market}",
    subtotalPrefix: "Mezisoučet — {market}",
    totalToPayCaps: "CELKEM K VÝPLATĚ",
    chrome: {
      reportLabel: "Report",
      generatedLabel: "Vygenerováno",
      rowSingular: "řádek",
      rowPlural: "řádků",
      noRowsInRange: "V tomto období nejsou žádné řádky.",
      truncatedNote:
        "Seznam zkrácen na limit exportu — pro úplný výpis zúžte časové období nebo filtry.",
    },
  },

  ro: {
    htmlLang: "ro-RO",
    title: "Extras de plată",
    consultationSingular: "consultație",
    consultationPlural: "consultații",
    period: "Perioadă",
    accountHolder: "Titular de cont",
    iban: "IBAN",
    ibanNotOnFile: "Neînregistrat",
    bic: "BIC / SWIFT",
    markets: "Piețe",
    totalToPay: "Total de plată",
    colDate: "Data",
    colPatient: "Pacient",
    colService: "Serviciu",
    colInsurer: "Asigurător",
    colPayout: "Plată",
    notSet: "Nesetat",
    marketSection: "Piață — {market}",
    subtotalPrefix: "Subtotal — {market}",
    totalToPayCaps: "TOTAL DE PLATĂ",
    chrome: {
      reportLabel: "Raport",
      generatedLabel: "Generat la",
      rowSingular: "rând",
      rowPlural: "rânduri",
      noRowsInRange: "Niciun rând în această perioadă.",
      truncatedNote:
        "Listă trunchiată la limita de export — restrângeți intervalul de date sau filtrele pentru o extragere completă.",
    },
  },

  de: {
    htmlLang: "de-DE",
    title: "Auszahlungsübersicht",
    consultationSingular: "Konsultation",
    consultationPlural: "Konsultationen",
    period: "Zeitraum",
    accountHolder: "Kontoinhaber",
    iban: "IBAN",
    ibanNotOnFile: "Nicht hinterlegt",
    bic: "BIC / SWIFT",
    markets: "Märkte",
    totalToPay: "Gesamtbetrag",
    colDate: "Datum",
    colPatient: "Patient",
    colService: "Leistung",
    colInsurer: "Versicherer",
    colPayout: "Auszahlung",
    notSet: "Nicht festgelegt",
    marketSection: "Markt — {market}",
    subtotalPrefix: "Zwischensumme — {market}",
    totalToPayCaps: "GESAMTBETRAG",
    chrome: {
      reportLabel: "Bericht",
      generatedLabel: "Erstellt am",
      rowSingular: "Zeile",
      rowPlural: "Zeilen",
      noRowsInRange: "Keine Zeilen in diesem Zeitraum.",
      truncatedNote:
        "Liste am Exportlimit gekürzt — grenzen Sie den Zeitraum oder die Filter ein, um einen vollständigen Export zu erhalten.",
    },
  },
};

export function resolvePayoutStatementLocale(
  raw: string | null | undefined,
): PayoutStatementLocale {
  if (!raw) return "en";
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return (PAYOUT_STATEMENT_LOCALES as readonly string[]).includes(base)
    ? (base as PayoutStatementLocale)
    : "en";
}

export function payoutStatementLabelsFor(locale: PayoutStatementLocale): PayoutStatementLabels {
  return PAYOUT_STATEMENT_CONTENT[locale] ?? PAYOUT_STATEMENT_CONTENT.en;
}
