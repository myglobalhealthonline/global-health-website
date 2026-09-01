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
  /** Header value used instead of a single IBAN when the statement covers
   *  several markets that are paid into DIFFERENT accounts — the per-market
   *  account is printed above each market's section instead. */
  ibanPerMarket: string;
  bic: string;
  markets: string;
  totalToPay: string;
  colDate: string;
  colPatient: string;
  colService: string;
  colInsurer: string;
  colPayout: string;
  notSet: string;
  /** Service-column label for async cross-border prescription consultations,
   *  which have no catalogue Service to fall back on. */
  crossBorderPrescriptionLabel: string;
  // — Invoice-style PDF layout (mirrors the patient invoice's Variant K design) —
  from: string;
  payTo: string;
  issued: string;
  statementNo: string;
  colIdx: string;
  /** `\n\n`-separated paragraphs, same convention as the patient invoice's
   *  legalFooter — NOT a VAT/fiscal claim, just what this document is. */
  footerNote: string;
  tagline: string;
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
    ibanPerMarket: "Per market — see each section",
    bic: "BIC / SWIFT",
    markets: "Markets",
    totalToPay: "Total to pay",
    colDate: "Date",
    colPatient: "Patient",
    colService: "Service",
    colInsurer: "Insurer",
    colPayout: "Payout",
    notSet: "Not set",
    crossBorderPrescriptionLabel: "Cross-border prescription",
    from: "From",
    payTo: "Pay to",
    issued: "Issued",
    statementNo: "Statement",
    colIdx: "Nº",
    footerNote:
      "This is a payout statement, not a VAT invoice — it lists consultations you finalised in the period, valued at your per-service payout rate. Use it as the basis for your own invoice or receipt to Global Health, where your local law requires one.\n\nGlobal Health is a trading name registered under Global Guest.",
    tagline: "Medicine Anytime Anywhere",
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
    ibanPerMarket: "Por mercado — ver cada secção",
    bic: "BIC / SWIFT",
    markets: "Mercados",
    totalToPay: "Total a pagar",
    colDate: "Data",
    colPatient: "Doente",
    colService: "Serviço",
    colInsurer: "Seguradora",
    colPayout: "Pagamento",
    notSet: "Não definido",
    crossBorderPrescriptionLabel: "Receita transfronteiriça",
    from: "De",
    payTo: "A pagar a",
    issued: "Emitido",
    statementNo: "Extrato",
    colIdx: "Nº",
    footerNote:
      "Este é um extrato de pagamento, não uma fatura de IVA — lista as consultas que finalizou no período, valorizadas ao seu pagamento por serviço. Utilize-o como base para a sua própria fatura ou recibo à Global Health, quando exigido pela legislação local.\n\nA Global Health é uma marca comercial registada sob a Global Guest.",
    tagline: "Medicine Anytime Anywhere",
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
    ibanPerMarket: "Por mercado — ver cada sección",
    bic: "BIC / SWIFT",
    markets: "Mercados",
    totalToPay: "Total a pagar",
    colDate: "Fecha",
    colPatient: "Paciente",
    colService: "Servicio",
    colInsurer: "Aseguradora",
    colPayout: "Pago",
    notSet: "No establecido",
    crossBorderPrescriptionLabel: "Receta transfronteriza",
    from: "De",
    payTo: "Pagar a",
    issued: "Emitido",
    statementNo: "Extracto",
    colIdx: "Nº",
    footerNote:
      "Este es un extracto de pago, no una factura de IVA — enumera las consultas que finalizó en el periodo, valoradas según su pago por servicio. Utilícelo como base para su propia factura o recibo a Global Health, cuando la legislación local lo exija.\n\nGlobal Health es un nombre comercial registrado bajo Global Guest.",
    tagline: "Medicine Anytime Anywhere",
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
    ibanPerMarket: "Podle trhu — viz jednotlivé sekce",
    bic: "BIC / SWIFT",
    markets: "Trhy",
    totalToPay: "Celkem k výplatě",
    colDate: "Datum",
    colPatient: "Pacient",
    colService: "Služba",
    colInsurer: "Pojišťovna",
    colPayout: "Výplata",
    notSet: "Nenastaveno",
    crossBorderPrescriptionLabel: "Přeshraniční předpis",
    from: "Od",
    payTo: "K výplatě",
    issued: "Vystaveno",
    statementNo: "Výpis",
    colIdx: "Č.",
    footerNote:
      "Toto je výplatní výpis, nikoli daňový doklad — uvádí konzultace, které jste v daném období dokončili, oceněné podle vaší výplaty za službu. Použijte jej jako podklad pro vlastní fakturu nebo účtenku vůči Global Health, pokud to vyžaduje místní právo.\n\nGlobal Health je obchodní značka registrovaná pod společností Global Guest.",
    tagline: "Medicine Anytime Anywhere",
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
    ibanPerMarket: "Per piață — vezi fiecare secțiune",
    bic: "BIC / SWIFT",
    markets: "Piețe",
    totalToPay: "Total de plată",
    colDate: "Data",
    colPatient: "Pacient",
    colService: "Serviciu",
    colInsurer: "Asigurător",
    colPayout: "Plată",
    notSet: "Nesetat",
    crossBorderPrescriptionLabel: "Rețetă transfrontalieră",
    from: "De la",
    payTo: "Plătibil către",
    issued: "Emis",
    statementNo: "Extras",
    colIdx: "Nr.",
    footerNote:
      "Acesta este un extras de plată, nu o factură cu TVA — listează consultațiile finalizate de dvs. în perioada respectivă, evaluate la plata dvs. per serviciu. Folosiți-l ca bază pentru propria factură sau chitanță către Global Health, acolo unde legislația locală o impune.\n\nGlobal Health este un nume comercial înregistrat sub Global Guest.",
    tagline: "Medicine Anytime Anywhere",
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
    ibanPerMarket: "Pro Markt — siehe die Abschnitte",
    bic: "BIC / SWIFT",
    markets: "Märkte",
    totalToPay: "Gesamtbetrag",
    colDate: "Datum",
    colPatient: "Patient",
    colService: "Leistung",
    colInsurer: "Versicherer",
    colPayout: "Auszahlung",
    notSet: "Nicht festgelegt",
    crossBorderPrescriptionLabel: "Grenzüberschreitendes Rezept",
    from: "Von",
    payTo: "Auszahlung an",
    issued: "Erstellt",
    statementNo: "Übersicht",
    colIdx: "Nr.",
    footerNote:
      "Dies ist eine Auszahlungsübersicht, keine Umsatzsteuerrechnung — sie listet die von Ihnen im Zeitraum abgeschlossenen Konsultationen auf, bewertet zu Ihrem Auszahlungsbetrag pro Leistung. Nutzen Sie sie als Grundlage für Ihre eigene Rechnung oder Quittung an Global Health, sofern nach örtlichem Recht erforderlich.\n\nGlobal Health ist ein Handelsname, der unter Global Guest registriert ist.",
    tagline: "Medicine Anytime Anywhere",
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
  /** Locale to fall back to when `raw` is absent/invalid. The admin payout
   *  statement (doctor picks explicitly) defaults to English; the commission
   *  run (Brazil-only, no picker touched yet) defaults to Portuguese. */
  fallback: PayoutStatementLocale = "en",
): PayoutStatementLocale {
  if (!raw) return fallback;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return (PAYOUT_STATEMENT_LOCALES as readonly string[]).includes(base)
    ? (base as PayoutStatementLocale)
    : fallback;
}

export function payoutStatementLabelsFor(locale: PayoutStatementLocale): PayoutStatementLabels {
  return PAYOUT_STATEMENT_CONTENT[locale] ?? PAYOUT_STATEMENT_CONTENT.en;
}

/**
 * Locale-keyed labels for the admin "Doctor payouts — commission markets"
 * export (Brazil bank-transfer worksheet). Separate from
 * `PayoutStatementLabels` because the two documents share almost no column
 * set (this one is a multi-doctor worksheet with Order/Charged/Commission
 * columns, not a single-doctor invoice-style statement) — but they share the
 * same language list and `chrome` (reused via `payoutStatementLabelsFor`).
 */
export type CommissionPayoutLabels = {
  htmlLang: string;
  title: string;
  /** "Paid, non-refunded orders" — first clause of the subtitle. */
  subtitleScope: string;
  doctors: string;
  consultations: string;
  totalToTransfer: string;
  commission: string;
  colPaid: string;
  colConsultation: string;
  colOrder: string;
  colPatient: string;
  colService: string;
  colCharged: string;
  colCommission: string;
  colPayout: string;
  /** "Doctor — " section-header prefix; doctor name is appended. */
  doctorSectionPrefix: string;
  unassignedDoctor: string;
  /** "TO TRANSFER — " row-label prefix; doctor name is appended. */
  toTransferPrefix: string;
  totalToTransferAll: string;
  acctHolderPrefix: string;
  ibanPrefix: string;
  ibanNotOnFile: string;
  bicPrefix: string;
  bankDetailsNotOnFile: string;
};

export const COMMISSION_PAYOUT_CONTENT: Record<PayoutStatementLocale, CommissionPayoutLabels> = {
  en: {
    htmlLang: "en-GB",
    title: "Doctor payouts — commission markets",
    subtitleScope: "Paid, non-refunded orders",
    doctors: "Doctors",
    consultations: "Consultations",
    totalToTransfer: "Total to transfer",
    commission: "Global Health commission",
    colPaid: "Paid",
    colConsultation: "Consultation",
    colOrder: "Order",
    colPatient: "Patient",
    colService: "Service",
    colCharged: "Charged",
    colCommission: "GH commission",
    colPayout: "Doctor payout",
    doctorSectionPrefix: "Doctor — ",
    unassignedDoctor: "Unassigned",
    toTransferPrefix: "TO TRANSFER — ",
    totalToTransferAll: "TOTAL TO TRANSFER (all doctors)",
    acctHolderPrefix: "Acct holder: ",
    ibanPrefix: "IBAN: ",
    ibanNotOnFile: "IBAN: not on file",
    bicPrefix: "BIC: ",
    bankDetailsNotOnFile: "Bank details: not on file",
  },
  pt: {
    htmlLang: "pt-PT",
    title: "Pagamentos aos médicos — mercados de comissão",
    subtitleScope: "Encomendas pagas, sem reembolso",
    doctors: "Médicos",
    consultations: "Consultas",
    totalToTransfer: "Total a transferir",
    commission: "Comissão da Global Health",
    colPaid: "Pago",
    colConsultation: "Consulta",
    colOrder: "Pedido",
    colPatient: "Doente",
    colService: "Serviço",
    colCharged: "Cobrado",
    colCommission: "Comissão GH",
    colPayout: "Pagamento ao médico",
    doctorSectionPrefix: "Médico — ",
    unassignedDoctor: "Não atribuído",
    toTransferPrefix: "A TRANSFERIR — ",
    totalToTransferAll: "TOTAL A TRANSFERIR (todos os médicos)",
    acctHolderPrefix: "Titular da conta: ",
    ibanPrefix: "IBAN: ",
    ibanNotOnFile: "IBAN: não registado",
    bicPrefix: "BIC: ",
    bankDetailsNotOnFile: "Dados bancários: não registados",
  },
  es: {
    htmlLang: "es-ES",
    title: "Pagos a médicos — mercados de comisión",
    subtitleScope: "Pedidos pagados, sin reembolso",
    doctors: "Médicos",
    consultations: "Consultas",
    totalToTransfer: "Total a transferir",
    commission: "Comisión de Global Health",
    colPaid: "Pagado",
    colConsultation: "Consulta",
    colOrder: "Pedido",
    colPatient: "Paciente",
    colService: "Servicio",
    colCharged: "Cobrado",
    colCommission: "Comisión GH",
    colPayout: "Pago al médico",
    doctorSectionPrefix: "Médico — ",
    unassignedDoctor: "Sin asignar",
    toTransferPrefix: "A TRANSFERIR — ",
    totalToTransferAll: "TOTAL A TRANSFERIR (todos los médicos)",
    acctHolderPrefix: "Titular de la cuenta: ",
    ibanPrefix: "IBAN: ",
    ibanNotOnFile: "IBAN: no registrado",
    bicPrefix: "BIC: ",
    bankDetailsNotOnFile: "Datos bancarios: no registrados",
  },
  cs: {
    htmlLang: "cs-CZ",
    title: "Výplaty lékařům — provizní trhy",
    subtitleScope: "Zaplacené objednávky bez vrácení peněz",
    doctors: "Lékaři",
    consultations: "Konzultace",
    totalToTransfer: "Celkem k převodu",
    commission: "Provize Global Health",
    colPaid: "Zaplaceno",
    colConsultation: "Konzultace",
    colOrder: "Objednávka",
    colPatient: "Pacient",
    colService: "Služba",
    colCharged: "Účtováno",
    colCommission: "Provize GH",
    colPayout: "Výplata lékaři",
    doctorSectionPrefix: "Lékař — ",
    unassignedDoctor: "Nepřiřazeno",
    toTransferPrefix: "K PŘEVODU — ",
    totalToTransferAll: "CELKEM K PŘEVODU (všichni lékaři)",
    acctHolderPrefix: "Majitel účtu: ",
    ibanPrefix: "IBAN: ",
    ibanNotOnFile: "IBAN: neuvedeno",
    bicPrefix: "BIC: ",
    bankDetailsNotOnFile: "Bankovní údaje: nejsou uvedeny",
  },
  ro: {
    htmlLang: "ro-RO",
    title: "Plăți către medici — piețe cu comision",
    subtitleScope: "Comenzi plătite, nerambursate",
    doctors: "Medici",
    consultations: "Consultații",
    totalToTransfer: "Total de transferat",
    commission: "Comision Global Health",
    colPaid: "Plătit",
    colConsultation: "Consultație",
    colOrder: "Comandă",
    colPatient: "Pacient",
    colService: "Serviciu",
    colCharged: "Facturat",
    colCommission: "Comision GH",
    colPayout: "Plată medic",
    doctorSectionPrefix: "Medic — ",
    unassignedDoctor: "Neasignat",
    toTransferPrefix: "DE TRANSFERAT — ",
    totalToTransferAll: "TOTAL DE TRANSFERAT (toți medicii)",
    acctHolderPrefix: "Titular de cont: ",
    ibanPrefix: "IBAN: ",
    ibanNotOnFile: "IBAN: neînregistrat",
    bicPrefix: "BIC: ",
    bankDetailsNotOnFile: "Date bancare: neînregistrate",
  },
  de: {
    htmlLang: "de-DE",
    title: "Arztauszahlungen — Provisionsmärkte",
    subtitleScope: "Bezahlte, nicht erstattete Bestellungen",
    doctors: "Ärzte",
    consultations: "Konsultationen",
    totalToTransfer: "Gesamtbetrag zur Überweisung",
    commission: "Global Health-Provision",
    colPaid: "Bezahlt",
    colConsultation: "Konsultation",
    colOrder: "Bestellung",
    colPatient: "Patient",
    colService: "Leistung",
    colCharged: "Berechnet",
    colCommission: "GH-Provision",
    colPayout: "Auszahlung an Arzt",
    doctorSectionPrefix: "Arzt — ",
    unassignedDoctor: "Nicht zugewiesen",
    toTransferPrefix: "ZU ÜBERWEISEN — ",
    totalToTransferAll: "GESAMTBETRAG ZUR ÜBERWEISUNG (alle Ärzte)",
    acctHolderPrefix: "Kontoinhaber: ",
    ibanPrefix: "IBAN: ",
    ibanNotOnFile: "IBAN: nicht hinterlegt",
    bicPrefix: "BIC: ",
    bankDetailsNotOnFile: "Bankdaten: nicht hinterlegt",
  },
};

export function commissionPayoutLabelsFor(locale: PayoutStatementLocale): CommissionPayoutLabels {
  return COMMISSION_PAYOUT_CONTENT[locale] ?? COMMISSION_PAYOUT_CONTENT.pt;
}
