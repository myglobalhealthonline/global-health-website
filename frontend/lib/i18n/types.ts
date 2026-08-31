export const supportedLocaleCodes = ["en", "pt", "es", "cs", "ro", "de"] as const;

export type LocaleCode = (typeof supportedLocaleCodes)[number];

export type CommonLocale = {
  site: { name: string };
  navigation: {
    clinics: string;
    about: string;
    blog: string;
    faq: string;
    egiftCard: string;
    login: string;
    bookOnline: string;
    generalConsultation: string;
    specialistConsultation: string;
    onlinePrescription: string;
    homeDelivery: string;
    plansPricing: string;
    healthTests: string;
    partnerClinics: string;
    searchCountryOrService: string;
    viewAllClinics: string;
    trustedCareAcrossEurope: string;
    home: string;
    doctors: string;
    services: string;
    contact: string;
    bookAppointment: string;
    bookShort: string;
    bookGp: string;
    bookGpDesc: string;
    seeSpecialist: string;
    seeSpecialistDesc: string;
    repeatPrescription: string;
    repeatPrescriptionDesc: string;
    labTests: string;
    labTestsDesc: string;
    howItWorks: string;
    chooseCountry: string;
    countrySwitchConfirmTemplate: string;
    cartItemSingular: string;
    cartItemPlural: string;
    language: string;
    closeMenu: string;
    adminPortal: string;
    accountPortal: string;
    bookNow: string;
  };
  footer: {
    company: string;
    clinics: string;
    legal: string;
    information: string;
    careers: string;
    press: string;
    contactUs: string;
    aboutUs: string;
    howItWorks: string;
    legalNotices: string;
    terms: string;
    cookies: string;
    refund: string;
    privacy: string;
    copyright: string;
    cta: string;
    trustLine: string;
    careHeading: string;
    clinicsHeading: string;
    accountHeading: string;
    companyHeading: string;
    ourDoctors: string;
    signIn: string;
    createAccount: string;
    forgotPassword: string;
    myAccount: string;
    privacyPolicy: string;
    termsOfService: string;
    tagline: string;
    stayInformed: string;
    newsletterDesc: string;
    subscribe: string;
    newsletterSuccess: string;
    /** Reassurance line under the newsletter form. */
    newsletterPrivacy: string;
    /** Heading above the social ribbon. */
    followUs: string;
    disclaimer: string;
    copyrightSuffix: string;
    privacyLink: string;
    euCompliant: string;
    legalInformation: string;
    medicalDisclaimer: string;
  };
  doctors: {
    theTeamBadge: string;
    ourTeamEyebrow?: string;
    heroTitleLead: string;
    heroTitleAccent: string;
    heroTitleTrail: string;
    heroLedeTemplate: string;
    heroAvailableSingular: string;
    heroAvailablePlural: string;
    onboardingTitle: string;
    onboardingBodyTemplate: string;
    bottomCtaTitle: string;
    bottomCtaAccent: string;
    filterSpeaks: string;
    filterType: string;
    filterTypeGP: string;
    filterTypeSpecialist: string;
    clearFilters: string;
    viewProfile: string;
    bookAppointment: string;
    pickTime: string;
    /** Card metadata label, e.g. "Languages" — same value as
     *  doctorProfile.languagesLabel. */
    languagesLabel: string;
    viewDoctors?: string;
    trustCard1Title?: string;
    trustCard1Subtitle?: string;
    trustCard2Title?: string;
    trustCard2Subtitle?: string;
    trustCard3Title?: string;
    trustCard3Subtitle?: string;
    floatCard1Title?: string;
    floatCard1Subtitle?: string;
    floatCard2Title?: string;
    floatCard2Subtitle?: string;
    floatCard3Title?: string;
    floatCard3Subtitle?: string;
    /** Featured-doctor spotlight primary CTA, e.g. "Book with {name}". */
    bookWithTemplate?: string;
    /** Directory filter-sheet trigger/title, e.g. "Filters". */
    filters: string;
    /** Fallback bio when a doctor record has none, e.g. "Licensed clinician
     *  available for online consultations in {country}." */
    bioFallbackTemplate: string;
    /** aria-label for the featured-doctor "verify registration" link. */
    verifyRegistrationAria: string;
    /** DoctorCard overlay-link aria-label, "{name}" placeholder. */
    viewProfileAria?: string;
    /** Heading above verified professional credentials on DoctorCard. */
    credentialsLabel: string;
    /** Truncated language-list suffix, e.g. "{languages} & More". */
    languagesMoreTemplate: string;
    /** FeaturedDoctor photo-overlay ribbon, e.g. "Clinical Director". */
    clinicalDirectorLabel?: string;
    showResults: string;
    featuredClinician: string;
    registrationLabel: string;
    verifiedSuffix: string;
    /** Heading above the always-crawlable full-roster link index below the
     *  paginated carousel. "{country}" placeholder. */
    allDoctorsHeading?: string;
  };
  /** Localised country display names, keyed by lowercase country code.
   *  data/countries.ts carries English names only. */
  countryNames?: Record<string, string>;
  countrySelector: {
    title: string;
    description: string;
    enterClinic: string;
  };
  entryGate: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
      subheadline: string;
      selectTitle: string;
      selectHint: string;
      motto: string;
      searchPlaceholder: string;
      noCountryResults: string;
      continueTo: string;
    doctor: string;
    doctors: string;
    trustLicensed: string;
    trustSecure: string;
    trustLocal: string;
    trustGdpr: string;
    euProvider: string;
    gdprNote: string;
  };
  cta: {
    primaryBooking: string;
  };
  bookingAvailability: {
    notAcceptingOnlineBookings: string;
    returningOn: string;
    nextAvailable: string;
  };
  notFound: {
    title: string;
    body: string;
    cta: string;
    /** Status pill above the headline. */
    eyebrow: string;
    /** Caption on the vitals-monitor panel. */
    monitorLabel: string;
    /** Label drawn across the flatlined ECG segment. */
    noSignal: string;
    /** Heading over the recovery links row. */
    quickLinksLabel: string;
  };
  error: {
    title: string;
    tryAgain: string;
    backToHome: string;
  };
  cookie: {
    title: string;
    body: string;
    privacyNotice: string;
    forDetails: string;
    acceptAll: string;
    deny: string;
    manage: string;
    save: string;
    necessaryTitle: string;
    necessaryBody: string;
    alwaysOn: string;
    marketingTitle: string;
    marketingBody: string;
    thirdPartyTitle: string;
    thirdPartyBody: string;
    analyticsTitle: string;
    analyticsBody: string;
    settingsLink: string;
    doctifyBlockedTitle: string;
    doctifyBlockedBody: string;
    doctifyLoad: string;
  };
  cart: {
    adding: string;
    added: string;
    addToCart: string;
    couldNotAdd: string;
    viewCart: string;
  };
  gpPage: {
    heroTitle: string;
    heroSubtitle: string;
    heroLead: string;
    heroAccent: string;
    heroTrail: string;
    secondaryLabel: string;
    countryLabelGp: string;
    countryLabelGeneral: string;
    practiceAreas: string;
    gpConsultationsTitle: string;
    gpConsultationsIntro: string;
    consultation: string;
    consultations: string;
    doctorsSectionTitle: string;
    doctorsSectionIntro: string;
    faqTitle: string;
    hero: {
      badgeTitle: string;
      badgeSubtitle: string;
      badgeAccent: string;
      feature1Title: string;
      feature1Subtitle: string;
      feature2Title: string;
      feature2Subtitle: string;
      feature3Title: string;
      feature3Subtitle: string;
      stat1Title: string;
      stat1Subtitle: string;
      stat2Title: string;
      stat2Subtitle: string;
      stat3Title: string;
      stat3Subtitle: string;
    };
  };
  specialistPage: {
    heroTitle: string;
    heroSubtitle: string;
    heroLead: string;
    heroAccent: string;
    heroTrail: string;
    secondaryLabel: string;
    countryLabel: string;
    specialtyAreas: string;
    specialistConsultationsTitle: string;
    specialistConsultationsIntro: string;
    doctorsSectionTitle: string;
    doctorsSectionIntro: string;
    hero: {
      feature1Title: string;
      feature1Subtitle: string;
      feature2Title: string;
      feature2Subtitle: string;
      feature3Title: string;
      feature3Subtitle: string;
      stat1Title: string;
      stat1Subtitle: string;
      stat2Title: string;
      stat2Subtitle: string;
      stat3Title: string;
      stat3Subtitle: string;
    };
  };
  consultPage: {
    backToConsultations: string;
    confirmBooking: string;
    pickDoctor: string;
    priceVaries: string;
    noSlots: string;
    tryAnotherClinician: string;
    seeWhoElseOffers: string;
    wrongClinician: string;
    pickDifferentDoctor: string;
    notOffering: string;
    seeOtherClinicians: string;
    noCliniciansAssigned: string;
    browseDoctors: string;
    pickSomeone: string;
    pickClinician: string;
    pickTime: string;
  };
  doctorProfile: {
    backToClinicians: string;
    bookWithDoctor: string;
    servicesOffered: string;
    viewServiceDetails: string;
    lastReviewedLabel: string;
    pickSlotWith: string;
    pickSlot: string;
    pickTimeWith: string;
    pickTime: string;
    noServicesAssigned: string;
    notSetupForBookings: string;
    browseOtherClinicians: string;
    backToTeam: string;
    doctorProfileLabel: string;
    generalPracticeFallback?: string;
    registeredIn: string;
    onlineConsultAvailable: string;
    verifiedProfile: string;
    verifyRegistration: string;
    primaryCareConsults: string;
    languagesLabel: string;
    availabilityLabel: string;
    onlineAppointments: string;
    profileEyebrow?: string;
    aboutHeadingTemplate?: string;
    qualificationsLabel?: string;
    faqsLabel?: string;
    bookThisClinicianLabel?: string;
    openVideoSlotsHeading?: string;
    calendarInviteBody?: string;
    heroDescription?: string;
    bookConsultation?: string;
    backToTeamFallback?: string;
    bottomCtaTitle?: string;
    bottomCtaDescription?: string;
    startBooking?: string;
    readFullDisclaimer?: string;
    fallbackTitle?: string;
    fallbackBio?: string;
    fallbackQualification1?: string;
    fallbackQualification2?: string;
    fallbackSpecialty1?: string;
    fallbackSpecialty2?: string;
    fallbackSpecialty3?: string;
    /** Meta description fallbacks — "{name}", "{title}", "{country}", "{languages}". */
    metaDescriptionTemplate?: string;
    metaSocialDescriptionTemplate?: string;
    nextStep: string;
    patientReviews: string;
  };
  bookingForm: {
    /**
     * Coverage picker — the toggle that reveals it, the four categories, and
     * the provider + card fields inside. Distinct from the `benefit*` keys
     * below, which describe cover ALREADY on the account (no card needed).
     */
    coverage: {
      toggleLabel: string;
      toggleHint: string;
      /** Same toggle when the booking is for someone else — the cover being
       *  described is the patient's, not the account holder's. */
      patientToggleLabel: string;
      patientToggleHint: string;
      /** Variant for an approved dependent, where turning the toggle on means
       *  giving up the account's family credit for this booking. */
      dependentToggleHint: string;
      accountOption: string;
      declareOption: string;
      categoryLabel: string;
      categoryInsurance: string;
      categoryCorporate: string;
      categoryMembership: string;
      categoryPublicPlan: string;
      providerLabel: string;
      providerPlaceholder: string;
      cardLabel: string;
      cardPlaceholder: string;
      cardHint: string;
      /** Chosen category has nothing configured for this country. */
      noProviders: string;
      loadError: string;
      retry: string;
      providerRequired: string;
      cardRequired: string;
      /** Reassurance under the card field — the price lands at the next step. */
      priceNote: string;
    };
    /** Benefit selector (§11.2) — the toggle, then the dropdown's own label. */
    benefitToggleLabel: string;
    benefitHeading: string;
    /** No benefit found on the account — precedes the claim link. */
    benefitNoneFound: string;
    benefitClaimCta: string;
    benefitClaimHint: string;
    /** Non-401 options failure. Visible, never a silently missing selector. */
    benefitLoadError: string;
    benefitLoadRetry: string;
    corporateOffAtCheckout: string;
    /** "Uses 1 of your {count} remaining" — allowance units and plan credits. */
    benefitScarcityNote: string;
    benefitUseCredit: string;
    benefitUseDiscount: string;
    /** Caption under the benefit selector: "{plan}" = subscriber's plan name. */
    benefitExplainer: string;
    pickDate: string;
    daysAvailable: string;
    day: string;
    days: string;
    slotSingular: string;
    slotPlural: string;
    pickTimeOn: string;
    patientDetails: string;
    bookingForOther: string;
    patientFullName: string;
    email: string;
    bookingConfirmationsNote: string;
    phone: string;
    dateOfBirth: string;
    nationalIdOptional: string;
    nationalIdHint: string;
    /** Czech booking: passport / ID card number — mandatory, and separate
     *  from the (optional) rodné číslo national-ID field. */
    identityDocument: string;
    identityDocumentHint: string;
    identityDocumentRequired: string;
    utenteOptional: string;
    utenteHint: string;
    reasonForVisit: string;
    reasonPlaceholder: string;
    consentStatement: string;
    patientAddress: string;
    patientAddressNote: string;
    streetAddress: string;
    aptUnit: string;
    city: string;
    postalCode: string;
    gdprConsent: string;
    /** Combined consent: clinic/doctor sharing + platform processing + cross-border access. */
    gdprCombinedConsent: string;
    privacyPolicyLinkLabel: string;
    whatsappConsent: string;
    addingToCart: string;
    continueToCart: string;
    noOpenSlots: string;
    pickSlotError: string;
    slotTakenError?: string;
    reserveTimeError?: string;
    addToCartError?: string;
    yourContactDetails?: string;
    enterFullName: string;
    enterValidEmail: string;
    acceptConsent: string;
    acceptCombinedConsent: string;
    /** Family-member targeting (§ appointment-claim, Premium family usage). */
    whoIsThisFor: string;
    forMe: string;
    forFamilyMember: string;
    manageFamily: string;
    familyBenefitNote: string;
    familyBenefitUnavailable: string;
    selectedTime: string;
    changeTime: string;
    saveAddressToProfile: string;
    pickTimeToContinue: string;
    /** Insurance card/policy number input placeholder (consult booking form). */
    insurancePolicyPlaceholder: string;
    /** aria-label for the date-picker tablist (slot-picker-step). */
    availableDatesAriaLabel: string;
  };
  extra: {
    specialistsWatermark: string;
    consultWhatItCovers: string;
    consultFaqTitle: string;
    consultMoreQuestions: string;
    minSuffix: string;
    aConsultation: string;
    everythingIncluded: string;
  };
  testsPage: {
    watermark: string;
    countryLabel: string;
    titleLead: string;
    titleAccent: string;
    titleTrail: string;
    heroSubtitle: string;
    ctaLabel: string;
    secondaryLabel: string;
    trustLabQualityValue: string;
    trustLabQualityLabel: string;
    trustDoctorValue: string;
    trustDoctorLabel: string;
    trustHomeValue: string;
    trustHomeLabel: string;
    trustGdprValue: string;
    trustGdprLabel: string;
    reviewedEyebrow: string;
    testSingular: string;
    testPlural: string;
    availableHeading: string;
    comingSoon: string;
    hero: {
      feature1Title: string;
      feature1Subtitle: string;
      feature2Title: string;
      feature2Subtitle: string;
      feature3Title: string;
      feature3Subtitle: string;
      stat1Title: string;
      stat1Subtitle: string;
      stat2Title: string;
      stat2Subtitle: string;
      stat3Title: string;
      stat3Subtitle: string;
    };
  };
  testDetailPage: {
    backToTests: string;
    doctorReviewed: string;
    eyebrow: string;
    inclDoctorReview: string;
    onlyLeft: string;
    soldOut: string;
    specSampleType: string;
    specResultsIn: string;
    specReviewedBy: string;
    specReviewedByValue: string;
    specDelivery: string;
    specDeliveryValue: string;
    secureCheckout: string;
    orderConfirmation: string;
    addToCart: string;
    whatCoversEyebrow: string;
    insideTitle: string;
    markersCount: string;
    whyEyebrow: string;
    whyTitle: string;
    howItWorksEyebrow: string;
    beforeTestingEyebrow: string;
    ctaHeading: string;
    goodToKnow: string;
    disclaimer: string;
    faqTitle: string;
  };
  prescriptionsPage: {
    countryLabel: string;
    titleLead: string;
    titleAccent: string;
    titleTrail: string;
    heroSubtitle: string;
    ctaLabel: string;
    secondaryLabel: string;
    trustLicensedValue: string;
    trustLicensedLabel: string;
    trustClinicianValue: string;
    trustClinicianLabel: string;
    trustGdprValue: string;
    trustGdprLabel: string;
    trustEuValue: string;
    trustEuLabel: string;
    practiceAreas: string;
    consultationsTitle: string;
    consultationsIntro: string;
    consultationSingular: string;
    consultationPlural: string;
    comingSoon: string;
  };
  serviceDetailPage: {
    backSpecialist: string;
    backPrescription: string;
    backGeneral: string;
    bookLabel: string;
    eyebrowSpecialist: string;
    eyebrowOnline: string;
    trustRegistered: string;
    trustVideo: string;
    trustConfidential: string;
    bookOnline: string;
    priceVaries: string;
    perConsultation: string;
    minuteAppointment: string;
    doctorRegistered: string;
    instantConfirmation: string;
    summaryIncluded: string;
    secureCheckoutFooter: string;
    aboutService: string;
    faqTitle: string;
    /** Heading over the links to `/health/*` landing pages for this service. */
    relatedTopicsTitle: string;
    readyEyebrow: string;
    bookHeading: string;
    fromPricePrefix: string;
    liveAvailability: string;
    disclaimer: string;
    clinicallyReviewedBy: string;
    /** "We also accept {list} for this service." — {list} is joined by
     *  Intl.ListFormat in the page locale. Replaces the backend's
     *  English-only insuranceSeoLine on the public service page. */
    insuranceAvailability: string;
  };
  homeCatalog: {
    tagGeneral: string;
    tagSpecialist: string;
    tagPrescription: string;
    tagTests: string;
    serviceSingular: string;
    servicePlural: string;
    testSingular: string;
    testPlural: string;
    doctorFallback: string;
    trustLive: string;
  };
  legalPage: {
    typeTermsOfService: string;
    typePrivacyPolicy: string;
    typeCookiePolicy: string;
    typeGdprNotice: string;
    typeDataProcessingAgreement: string;
    typeRefundPolicy: string;
    typeMedicalDisclaimer: string;
    typeAccessibilityStatement: string;
    typeComplaintsProcedure: string;
    heroEyebrow: string;
    heroTitle: string;
    heroAccent: string;
    heroWatermark: string;
    heroBody: string;
    companyInformation: string;
    legalName: string;
    registeredAddress: string;
    registrationNumber: string;
    taxVatNumber: string;
    medicalRegistration: string;
    healthcareLicence: string;
    regulator: string;
    supportEmail: string;
    phone: string;
    email: string;
    dataProtection: string;
    applicableLaw: string;
    dataProtectionOfficer: string;
    dpoContact: string;
    regulatorsOversight: string;
    linkCompanyRegistry: string;
    linkMedicalRegulator: string;
    linkHealthcareAuthority: string;
    linkDataProtectionAuthority: string;
    linkDisputeResolution: string;
    linkConsumerProtection: string;
    regulatorFallback: string;
    disputesComplaints: string;
    disputeBody: string;
    legalDocuments: string;
    updated: string;
    pdfAvailable: string;
    docsEmptyLead: string;
    privacyNoticeLink: string;
    andWord: string;
    termsLink: string;
    applyWord: string;
  };
  legalDocPage: {
    heroEyebrow: string;
    heroWatermark: string;
    meta: string;
    backToAll: string;
    downloadPdf: string;
    pdfOnly: string;
  };
  cartPage: {
    corporateOff: string;
    /** Corporate co-pay: the member pays this fixed amount, not a percentage. */
    corporateCopay: string;
    /** Corporate rule that covers the service in full. */
    corporateIncluded: string;
    kindGeneral: string;
    kindSpecialist: string;
    kindTest: string;
    kindPrescription: string;
    stepCart: string;
    stepCheckout: string;
    stepPayment: string;
    title: string;
    loading: string;
    emptyTitle: string;
    emptyBody: string;
    startShopping: string;
    itemSingular: string;
    itemPlural: string;
    paidIn: string;
    continueShopping: string;
    addedToCart: string;
    expiredSingular: string;
    expiredPlural: string;
    dismiss: string;
    clearCart: string;
    orderSummary: string;
    subtotalItems: string;
    shipping: string;
    /** "Plan savings" line in the order summary (benefit-adjusted total). */
    planSavings: string;
    total: string;
    continueToCheckout: string;
    trustSecure: string;
    trustNoStore: string;
    trustInstant: string;
    each: string;
    bookedForThem: string;
    holdReleased: string;
    slotReserved: string;
    maxPerItem: string;
    oneBooking: string;
    decreaseQuantity: string;
    increaseQuantity: string;
    removeAria: string;
    remove: string;
    /** Per-line subscription benefit selector (§ appointment-claim). */
    benefitLabel: string;
    payNormally: string;
    usePlanCredit: string;
    usePlanDiscount: string;
    /** "For {name}" beneficiary line on a family-booked consultation. */
    benefitFor: string;
    /** Warning under the selector when USE_PLAN_CREDIT has no credits left. */
    notEnoughCreditsHint: string;
  };
  checkoutPage: {
    title: string;
    loading: string;
    subtitleShipping: string;
    subtitleOnline: string;
    backToCart: string;
    payerContact: string;
    payerNote: string;
    fullName: string;
    email: string;
    phoneOptional: string;
    consultationsInOrder: string;
    patientNameMissing: string;
    onTheirBehalf: string;
    needChangePatient: string;
    editCartLine: string;
    shippingAddress: string;
    shippingNote: string;
    recipientName: string;
    countryCodeIso: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    redirecting: string;
    paySecurely: string;
    redirectNote: string;
    /**
     * The €0 order (§6.5/§31). A benefit can cover a booking in full, and that
     * order never reaches Stripe — checkout completes it and goes straight to
     * the success page — so `redirectNote` and `paySecurely` are both untrue
     * there.
     */
    zeroTotalNote: string;
    confirmZeroTotal: string;
    orderSummary: string;
    subtotal: string;
    shipping: string;
    total: string;
    trustSecure: string;
    trustEncrypted: string;
  };
  checkoutStatus: {
    successTitle: string;
    successBody: string;
    /** Shown while the payment webhook hasn't confirmed the order yet (2.3). */
    processingTitle: string;
    processingBody: string;
    orderRef: string;
    shipping: string;
    totalPaid: string;
    receiptError: string;
    viewOrders: string;
    browseDoctors: string;
    continueShopping: string;
    cancelledTitle: string;
    cancelledBody: string;
    backToCart: string;
    keepShopping: string;
  };
  bookPage: {
    stepService: string;
    stepDoctor: string;
    stepTime: string;
    stepDetails: string;
    /**
     * The insurance step (§11.3). Insurance and only insurance: it must be
     * chosen before doctor/time because the insurer decides both the slot price
     * and which doctors are bookable. Memberships, plans and corporate benefits
     * are chosen in the booking form instead.
     */
    stepInsurance: string;
    insuranceTitle: string;
    insuranceDesc: string;
    insuranceStandard: string;
    insuranceNone: string;
    noInsuranceDoctors: string;
    /** Deferred-charge notice on each insurer (§33). */
    benefitInsuranceNote: string;
    /** "Memberships and plans are asked for later, once you've picked a time." */
    insuranceBenefitLater: string;
    title: string;
    subtitle: string;
    bookingSteps: string;
    availabilityNote: string;
    serviceUnavailable: string;
    clinicianUnavailable: string;
    step2: string;
    chooseClinicianFor: string;
    onlyAssigned: string;
    clinicianNotAssigned: string;
    clinicianNotInCountry: string;
    steps34: string;
    pickTimeDetails: string;
    detailsTitle: string;
    detailsDesc: string;
    timesShown: string;
    selectedConsultation: string;
    changeService: string;
    slotNoLongerOpen: string;
    noOpenSlots: string;
    checkBackClinician: string;
    pickAnotherClinician: string;
    step1: string;
    chooseServiceWith: string;
    chooseWhatYouNeed: string;
    servicesEnabledNote: string;
    noBookableServices: string;
    clinicianNoServices: string;
    browseDirectory: string;
    browseDoctors: string;
    noCliniciansAssigned: string;
    browseAllOrChoose: string;
    viewProfile: string;
    pickTime: string;
    tagSpecialist: string;
    tagGeneral: string;
    priceVaries: string;
    continue: string;
    languageLabel: string;
    languageAll: string;
    noForLanguage: string;
    chooseAnotherLanguage: string;
    showAllLanguages: string;
    backToAccount: string;
    portalBadge: string;
  };
  portalChrome: {
    account: string;
    mainSite: string;
    signOut: string;
    closeNavigation: string;
    openNavigation: string;
    closeMenu: string;
    allCaughtUp: string;
    skipToContent: string;
    unsavedChangesTitle: string;
    unsavedChangesBody: string;
    unsavedChangesKeepEditing: string;
    unsavedChangesDiscard: string;
  };
  cardVerify: {
    title: string;
    subtitle: string;
    step: string;
    valid: string;
    statusSuspended: string;
    statusExpired: string;
    validBody: string;
    inactiveBody: string;
    cardNumber: string;
    member: string;
    company: string;
    plan: string;
    memberType: string;
    employee: string;
    beneficiary: string;
    status: string;
    validRange: string;
    matchNote: string;
    notFound: string;
    checkNumber: string;
    couldNotVerify: string;
  };
  /** Generic accessibility labels shared across public sections. */
  a11y: {
    whyPatientsTrustUs: string;
    /** Chrome a11y labels. Resolved server-side and passed into the client
     *  header/drawer components as props — see SiteChrome/SiteHeader. */
    skipToContent: string;
    skipToBooking: string;
    openMenu: string;
    mobileMenuDescription: string;
    yourAccount: string;
    notifications: string;
    chooseLanguage: string;
    searchLanguages: string;
    sectionNavigation: string;
    /** aria-label on the footer's link-group <nav>. */
    footerNavigation: string;
    sections: string;
    bookAnAppointment: string;
    patientReviews: string;
    doctifyReviews: string;
    phoneCountryCode: string;
    previousPage: string;
    nextPage: string;
    medicalDisclaimer: string;
  };
  /** Transient redirect/flow pages with no [country]/[lang] segment
   *  (cart, checkout, checkout/cancelled, patient-upload, reviews/rate). */
  flow: {
    cartOpeningTitle: string;
    cartOpeningBody: string;
    checkoutOpeningTitle: string;
    checkoutOpeningBody: string;
    checkoutCancelledTitle: string;
    checkoutCancelledBody: string;
    patientUploadTitle: string;
    patientUploadSubtitle: string;
    patientUploadStepUpload: string;
    patientUploadStepReview: string;
    reviewRateTitle: string;
    reviewRateSubtitle: string;
    reviewRateStepRatings: string;
    reviewRateStepSubmit: string;
  };
  blogPage: {
    articlesAvailableNow: string;
    doctorReviewedTitle: string;
    verifiedByClinicians: string;
    evidenceBasedTitle: string;
    noAdsNoSponsors: string;
    heroWatermark?: string;
    heroCountryLabel?: string;
    heroTitleLead?: string;
    heroTitleAccent?: string;
    heroLede?: string;
    /** Per-country meta description. "{country}" placeholder. */
    heroLedeCountryTemplate?: string;
    heroTitleCountryTemplate?: string;
    heroCta?: string;
    heroSecondary?: string;
    articleSingular?: string;
    articlePlural?: string;
    loadingArticleAriaLabel?: string;
    categoryFallback?: string;
    readArticle?: string;
    /** Heading for posts with no country assignment on the bare /blog hub. */
    globalGroupLabel?: string;
    /** Accessible name for the index's pagination nav, and its two controls. */
    paginationLabel?: string;
    paginationPrevious?: string;
    paginationNext?: string;
  };
  /** Country-home <head> fallback title/description when no CMS override
   *  exists. "{country}" placeholder. */
  homeMeta: {
    titleTemplate: string;
    descriptionTemplate: string;
  };
  /** /pricing hero trust-card triplet (Licensed doctors / Flexible plans /
   *  Secure payments). */
  pricingPage: {
    trustLicensedTitle: string;
    trustLicensedSubtitle: string;
    trustFlexibleTitle: string;
    trustFlexibleSubtitle: string;
    trustSecureTitle: string;
    trustSecureSubtitle: string;
  };
  /** Doctify reviews section lede (the eyebrow reuses a11y.patientReviews). */
  doctify: {
    body: string;
    /** Doctor-facing reviews headline, split so the accent half can be styled. */
    patientsSayHeadline?: string;
    patientsSayAccent?: string;
  };
  /** Section eyebrows shared by the public country/hub pages. These used to be
   *  hardcoded English literals at each call site, so every localized page
   *  rendered "Overview" and "Who it's for" in English. */
  sections: {
    overview: string;
    whoItsFor: string;
  };
  /** Shared day-agenda calendar (admin / doctor / patient portals). */
  calendar: {
    selectDay: string;
    selectDayHint: string;
  };
  /** Shared report results table (admin / doctor portals). */
  reports: {
    noRowsInRange: string;
    truncatedNotice: string;
  };
  /** LinkCallout variant labels (internal-linking spec). eyebrowSpecialist
   *  above (serviceDetailPage) covers the UPGRADE variant. */
  linkCallout: {
    entry: string;
    referral: string;
    complementary: string;
  };
  /** /{country}/{lang}/health/{slug} landing pages. */
  healthPage: {
    seeAllLanguageDoctors: string;
  };
  /** Cross-silo "also available in <language>" link row (SEO audit 3.7). */
  alsoAvailableIn: {
    title: string;
  };
};
