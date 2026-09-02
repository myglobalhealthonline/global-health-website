import { createHash } from "node:crypto";

export type CzechiaSeoServiceDraft = {
  serviceId: string;
  expectedServiceUpdatedAt: string;
  expectedSourceSha256: string;
  countryCode: "cz";
  locale: "CS" | "EN";
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  expectedFaqIds: readonly string[];
  name?: string;
  summary?: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroDescription?: string;
  detailBody?: string;
  ctaLabel?: string;
  faqs: readonly {
    id: string;
    question: string;
    answer: string;
  }[];
};

const metadataDrafts = [
  {
    serviceId: "cmr85yaop003t70juxbhysddk",
    expectedServiceUpdatedAt: "2026-07-19T05:02:17.241Z",
    expectedSourceSha256: "ce8536fbbb759426e65a4f80e50557000af1f59771670c5363497aca80939a43",
    countryCode: "cz",
    locale: "CS",
    slug: "bolesti-pohyboveho-aparatu",
    primaryKeyword: "bolest zad online konzultace",
    secondaryKeywords: ["bolest kloubů online", "pohybové potíže lékař"],
    expectedFaqIds: [
      "cmr85yaw4003u70ju0yc2kob4", "cmr85yaw4003v70jujjmuvh9w", "cmr85yaw4003w70jubykdw3jz",
      "cmr85yaw4003x70juqav84y0k", "cmr85yaw4003y70jur0kyqx1a", "cmr85yaw4003z70ju9gm1vj50",
      "cmr85yaw4004070jun6j0zq6e",
    ],
    summary: "Online konzultace bolesti zad, kloubů, svalů nebo pohybových obtíží. Lékař posoudí, zda je bezpečný postup na dálku, nebo je nutné osobní vyšetření.",
    seoTitle: "Bolesti zad a kloubů | Online konzultace",
    seoDescription: "Online konzultace bolesti zad, kloubů, svalů nebo pohybových obtíží. Lékař posoudí, zda je vhodný postup na dálku, nebo osobní vyšetření.",
    heroTitle: "Bolesti zad a kloubů: online konzultace",
    heroDescription: "Online konzultace bolesti zad, kloubů, svalů nebo pohybových obtíží. Lékař posoudí, zda je bezpečný postup na dálku, nebo je nutné osobní vyšetření.",
    faqs: [],
  },
  {
    serviceId: "cmr85y546002q70ju6ikn8phw",
    expectedServiceUpdatedAt: "2026-07-19T05:02:29.686Z",
    expectedSourceSha256: "45e6374b7c9d963ab151dec7e8a028910deb42a5ceff434061dc105d25fbf499",
    countryCode: "cz",
    locale: "CS",
    slug: "cestovni-medicina-praha",
    primaryKeyword: "cestovní medicína Praha",
    secondaryKeywords: ["cestovní medicína online", "očkování do zahraničí", "antimalarika konzultace"],
    expectedFaqIds: [
      "cmr85y5bq002r70juysq3pk1j", "cmr85y5bq002s70jujhbjds41", "cmr85y5br002t70jud8b29nlb",
      "cmr85y5br002u70jusqmv6gyz", "cmr85y5br002v70jufdo4nh58", "cmr85y5br002w70ju1zqfz6i3",
      "cmr85y5br002x70ju7yv1xtzi", "cmr85y5br002y70juy9kidavu", "cmr85y5br002z70jucj1sj5lw",
    ],
    summary: "Online konzultace před cestou zaměřená na zdravotní rizika, očkování a prevenci. Recept, očkování nebo potvrzení závisejí na individuálním posouzení.",
    seoTitle: "Cestovní medicína Praha | Online konzultace",
    seoDescription: "Online konzultace cestovní medicíny před cestou. Proberte rizika, očkování a prevenci; recepty a potvrzení závisejí na posouzení.",
    heroTitle: "Cestovní medicína: online konzultace",
    heroDescription: "Proberte destinaci, itinerář, zdravotní stav, očkování a prevenci. Lékař doporučí další postup; recept, očkování ani potvrzení nelze slíbit předem.",
    detailBody: `<p><strong>Při náhlém závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace nenahrazuje neodkladnou péči.</strong></p>
<h2>Co si připravit</h2>
<p>Připravte si destinaci, itinerář, délku a typ pobytu, datum odjezdu, plánované aktivity, zdravotní stav, užívané léky a dostupné záznamy o očkování.</p>
<h2>Očkování a potvrzení</h2>
<p>Vakcínu nelze podat při videokonzultaci. Cestovní očkování a mezinárodní očkovací průkaz zajišťují příslušná osobní pracoviště. Požadavky se liší podle destinace a mohou se měnit.</p>
<h2>Antimalarika a další léky</h2>
<p>Vhodnost chemoprofylaxe závisí mimo jiné na destinaci, délce pobytu, místní rezistenci, věku a zdravotním stavu. NZIP doporučuje řešit opatření s lékařem v centru cestovní medicíny s dostatečným předstihem; online konzultace recept nezaručuje.</p>
<h2>Potíže po návratu</h2>
<p>Horečka nebo jiné závažné potíže po návratu mohou vyžadovat rychlé osobní vyšetření. Uveďte navštívené země a datum návratu. Při závažném stavu volejte 155 nebo 112.</p>
<p>Zdroje: <a href="https://www.nzip.cz/clanek/32-ockovani-do-zahranici">NZIP: očkování při cestách do zahraničí</a>, <a href="https://www.nzip.cz/clanek/33-mezinarodni-ockovaci-prukaz">NZIP: mezinárodní očkovací průkaz</a>, <a href="https://www.nzip.cz/clanek/2424-malarie">NZIP: malárie a chemoprofylaxe</a> a <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP: zdravotnická záchranná služba</a>.</p>`,
    faqs: [
      {
        id: "cmr85y5bq002r70juysq3pk1j",
        question: "Mohu při online konzultaci cestovní medicíny získat recept na antimalarika?",
        answer: "Vhodnost profylaxe závisí mimo jiné na destinaci, délce pobytu, místní rezistenci, věku, zdravotním stavu a dalších lécích. NZIP doporučuje poradit se s lékařem v centru cestovní medicíny; online konzultace recept nezaručuje.",
      },
      {
        id: "cmr85y5bq002s70jujhbjds41",
        question: "Mohu online získat očkování nebo certifikát proti žluté zimnici?",
        answer: "Ne. Vakcínu nelze podat online a příslušný záznam nebo certifikát vyžaduje osobní návštěvu oprávněného pracoviště. Aktuální požadavky si ověřte podle cílové země.",
      },
      {
        id: "cmr85y5br002t70jud8b29nlb",
        question: "Lze při online konzultaci podat cestovní vakcínu?",
        answer: "Ne. Videokonzultace slouží k posouzení a plánování. Podání vakcíny vyžaduje osobní návštěvu praktického lékaře nebo specializovaného pracoviště podle typu očkování.",
      },
      {
        id: "cmr85y5br002u70jusqmv6gyz",
        question: "Co si připravit na konzultaci cestovní medicíny?",
        answer: "Připravte si itinerář, destinace, datum odjezdu, délku pobytu, plánované aktivity, seznam nemocí a léků a dostupné záznamy o očkování.",
      },
      {
        id: "cmr85y5br002v70jufdo4nh58",
        question: "Jak dlouho před cestou řešit očkování a prevenci?",
        answer: "Objednejte se co nejdříve, protože potřebný předstih závisí na destinaci, zdravotním stavu a očkovacím plánu. Některé vakcíny vyžadují více dávek nebo čas k vytvoření ochrany.",
      },
      {
        id: "cmr85y5br002w70ju1zqfz6i3",
        question: "Je online cestovní medicína vhodná při potížích po návratu?",
        answer: "Může pomoci s úvodním posouzením, ale horečka nebo jiné závažné příznaky po návratu mohou vyžadovat rychlé osobní vyšetření. Při závažném stavu volejte 155 nebo 112.",
      },
      {
        id: "cmr85y5br002x70ju7yv1xtzi",
        question: "Je konzultace cestovní medicíny vhodná pro rodinu s dětmi?",
        answer: "Vhodnost se posuzuje individuálně podle věku, zdravotního stavu, destinace a typu cesty. Očkování a vyšetření dítěte mohou vyžadovat osobní návštěvu příslušného pracoviště.",
      },
      {
        id: "cmr85y5br002y70juy9kidavu",
        question: "Má smysl cestovní konzultace při diabetu nebo jiném chronickém onemocnění?",
        answer: "Ano, individuální plánování může být užitečné. Lékař probere léky, skladování, časová pásma a rizika, ale konkrétní změny dávkování závisejí na vašem stavu a ošetřujícím lékaři.",
      },
      {
        id: "cmr85y5br002z70jucj1sj5lw",
        question: "Může lékař vystavit potvrzení k lékům na cestu?",
        answer: "Lékař může po posouzení vystavit zdravotní souhrn nebo jiné vhodné potvrzení, pokud má potřebné informace. Přijetí dokumentu celní správou, dopravcem nebo cizím státem nelze zaručit.",
      },
    ],
  },
  {
    serviceId: "cmr85yeea004i70ju3b7aiw7k",
    expectedServiceUpdatedAt: "2026-07-19T05:02:10.155Z",
    expectedSourceSha256: "56e1792fb5f5691371d735d9916a90fce42c979f6117bec472d585858008bee8",
    countryCode: "cz",
    locale: "CS",
    slug: "chronicka-onemocneni",
    primaryKeyword: "chronická onemocnění online",
    secondaryKeywords: ["kontrola hypertenze online", "kontrola diabetu online"],
    expectedFaqIds: ["cmr85yelp004j70juylf9rbbd", "cmr85yelp004k70juf8cxx8n8", "cmr85yelp004l70jup62yxaws", "cmr85yelp004m70juqgkk8p2k", "cmr85yelp004n70juypsr1gtm"],
    summary: "Online kontrola stabilního chronického onemocnění jako doplněk pravidelné péče. Lékař posoudí průběh, léčbu a potřebu dalšího vyšetření.",
    seoTitle: "Chronická onemocnění | Online kontrola léčby",
    seoDescription: "Online kontrola stabilního chronického onemocnění jako doplněk pravidelné péče. Lékař posoudí průběh, léčbu a potřebu dalšího vyšetření.",
    heroTitle: "Chronická onemocnění: online kontrola léčby",
    heroDescription: "Online kontrola stabilního chronického onemocnění jako doplněk pravidelné péče. Lékař posoudí průběh, léčbu a potřebu dalšího vyšetření.",
    faqs: [],
  },
  {
    serviceId: "cmr85ycjf004670juod6z2yqd",
    expectedServiceUpdatedAt: "2026-07-19T05:02:19.027Z",
    expectedSourceSha256: "5382a2857335ff52f1ec5dceab4bd7ab1ad958e2bb43cdf26b80e7737a6ad732",
    countryCode: "cz",
    locale: "CS",
    slug: "detsky-lekar-online",
    primaryKeyword: "dětský lékař online",
    secondaryKeywords: ["pediatr online", "online konzultace pro dítě"],
    expectedFaqIds: ["cmr85ycqv004770jux22fnm86", "cmr85ycqv004870julkldu2kh", "cmr85ycqv004970juh4i934dv", "cmr85ycqv004a70juuvthy3ub", "cmr85ycqv004b70jut3xo112p", "cmr85ycqv004c70jupe7uctrf"],
    summary: "Online konzultace zdravotních potíží dítěte. Podmínky rezervace a zapojení rodiče nebo zákonného zástupce závisí na věku, okolnostech a pravidlech služby.",
    seoTitle: "Dětský lékař online | Konzultace pro rodiče",
    seoDescription: "Online konzultace dětských potíží s lékařem. Zjistěte, jak se připravit a které příznaky vyžadují akutní nebo osobní péči.",
    heroTitle: "Dětský lékař online",
    heroDescription: "Online konzultace zdravotních potíží dítěte. Podmínky rezervace a zapojení rodiče nebo zákonného zástupce závisí na věku, okolnostech a pravidlech služby.",
    detailBody: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu dítěte volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Co lze při online konzultaci dítěte posoudit</h2>
<p>Lékař probere příznaky, jejich průběh, věk dítěte, užívané léky a další důležité údaje. Videohovor může pomoci s prvním posouzením, ale nenahrazuje fyzikální vyšetření, odběry ani zobrazovací vyšetření.</p>
<h2>Kdy je nutné osobní vyšetření</h2>
<p>Lékař doporučí osobní nebo akutní péči, pokud stav nelze bezpečně posoudit na dálku. U malého kojence s horečkou kontaktujte lékaře; porucha vědomí, potíže s dýcháním, křeče nebo rychlé zhoršování vyžadují neodkladné posouzení.</p>
<h2>Rodič nebo zákonný zástupce</h2>
<p>Podmínky rezervace a způsob zapojení rodiče, zákonného zástupce a dítěte se posuzují podle věku, vyspělosti, okolností a pravidel služby.</p>
<h2>Recepty a dokumenty</h2>
<p>Recept, potvrzení nebo doporučení může lékař vystavit pouze tehdy, pokud je to klinicky odůvodněné a dovoluje to posouzení na dálku. Objednání konzultace žádný dokument ani léčbu nezaručuje.</p>
<p>Zdroje: <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP: zdravotnická záchranná služba</a>, <a href="https://www.nzip.cz/clanek/641-horecka-u-deti">NZIP: horečka u dětí</a>, <a href="https://www.nzip.cz/clanek/239-prava-ditete">NZIP: práva dítěte</a> a <a href="https://ncez.mzcr.cz/cs/milnik-c-3-pravidladokumentypodklady-interoperabilita-telemedicina/pravidla-pro-rozvoj-telemediciny">NCEZ: pravidla pro telemedicínu</a>.</p>`,
    faqs: [
      {
        id: "cmr85ycqv004770jux22fnm86",
        question: "Může dětský lékař online posoudit nemoc dítěte přes videohovor?",
        answer: "Videohovor může pomoci s prvním posouzením příznaků, ale vhodnost závisí na věku dítěte, průběhu obtíží a dostupných informacích. Některé stavy vyžadují fyzikální nebo akutní vyšetření.",
      },
      {
        id: "cmr85ycqv004870julkldu2kh",
        question: "Je online konzultace vhodná pro dítě s horečkou?",
        answer: "Záleží na věku dítěte, výši a délce horečky a dalších příznacích. U malého kojence s horečkou kontaktujte lékaře. Při zhoršování, poruše vědomí, křečích nebo potížích s dýcháním vyhledejte neodkladnou péči; při závažném stavu volejte 155 nebo 112.",
      },
      {
        id: "cmr85ycqv004970juh4i934dv",
        question: "Mohu využít online konzultaci pro dítě bez registrujícího pediatra?",
        answer: "Konzultaci si objednat můžete, ale služba nenahrazuje pravidelnou péči registrujícího praktického lékaře pro děti a dorost. Lékař podle potíží doporučí vhodný další postup.",
      },
      {
        id: "cmr85ycqv004a70juuvthy3ub",
        question: "Co když dítě potřebuje osobní nebo akutní vyšetření?",
        answer: "Lékař vysvětlí, proč posouzení na dálku nestačí, a doporučí odpovídající osobní nebo akutní péči. Případné shrnutí nebo doporučení závisí na klinickém posouzení.",
      },
      {
        id: "cmr85ycqv004b70jut3xo112p",
        question: "Může online lékař vystavit potvrzení pro školu?",
        answer: "Potvrzení může být vystaveno pouze tehdy, pokud je po konzultaci medicínsky a administrativně odůvodněné. Objednání konzultace vystavení potvrzení nezaručuje.",
      },
      {
        id: "cmr85ycqv004c70jupe7uctrf",
        question: "Jak probíhá online konzultace u dospívajícího?",
        answer: "Podmínky rezervace, potřebný souhlas a způsob zapojení rodiče, zákonného zástupce a dospívajícího se posuzují podle věku, vyspělosti, okolností a pravidel služby.",
      },
    ],
  },
  {
    serviceId: "cmr85yg92004t70juaf7wjrsu",
    expectedServiceUpdatedAt: "2026-07-19T05:02:22.571Z",
    expectedSourceSha256: "03df701e33ba96e25bab127607bd5ff1b9aabba751522b02cb42cf427e4d3456",
    countryCode: "cz",
    locale: "CS",
    slug: "doporuceni-a-vysetreni",
    primaryKeyword: "žádanka online",
    secondaryKeywords: ["doporučení ke specialistovi", "eŽádanka"],
    expectedFaqIds: ["cmr85yggh004u70jubrjk6343", "cmr85yggh004v70ju3wr5njck", "cmr85yggh004w70julchy15yi", "cmr85yggh004x70juyb9eqmmd", "cmr85yggh004y70juxubsi1ul", "cmr85yggh004z70judefhmm3v", "cmr85yggh005070jue4rrzzxo"],
    summary: "Online konzultace k posouzení potřeby vyšetření nebo doporučení ke specialistovi. Vystavení žádanky či doporučení závisí na klinickém posouzení.",
    seoTitle: "Žádanka a doporučení online | Posouzení lékařem",
    seoDescription: "Proberte s lékařem potřebu vyšetření nebo doporučení ke specialistovi. Vystavení závisí na klinickém posouzení a není automatické.",
    heroTitle: "Doporučení a vyšetření po online konzultaci",
    heroDescription: "Online konzultace k posouzení potřeby vyšetření nebo doporučení ke specialistovi. Vystavení žádanky či doporučení závisí na klinickém posouzení.",
    faqs: [],
  },
  {
    serviceId: "cmr85y6z9003570ju1euveuwm",
    expectedServiceUpdatedAt: "2026-07-19T05:02:24.357Z",
    expectedSourceSha256: "92d1cceea01ecc97f4c6f554ae263c32c3c09cfc3d0bc8db3be7cb6e5f77a014",
    countryCode: "cz",
    locale: "CS",
    slug: "druhy-nazor-praha",
    primaryKeyword: "druhý názor lékaře",
    secondaryKeywords: ["druhy nazor", "second opinion Prague"],
    expectedFaqIds: ["cmr85y76o003670jutk8id0j1", "cmr85y76o003770juzzlqx2mx", "cmr85y76o003870ju2lmsb647", "cmr85y76o003970ju8n0ggasc", "cmr85y76o003a70ju5p7xlsjq", "cmr85y76o003b70ju6s11i8ou"],
    summary: "Nezávislé posouzení dostupných lékařských zpráv, výsledků a léčebného plánu. Druhý názor nenahrazuje akutní péči ani vyšetření, které nelze provést na dálku.",
    seoTitle: "Druhý názor lékaře | Online konzultace",
    seoDescription: "Nezávislé posouzení dostupných lékařských zpráv a léčebného plánu. Druhý názor nenahrazuje akutní péči ani nutné osobní vyšetření.",
    heroTitle: "Druhý názor lékaře online",
    heroDescription: "Nezávislé posouzení dostupných lékařských zpráv, výsledků a léčebného plánu. Druhý názor nenahrazuje akutní péči ani vyšetření, které nelze provést na dálku.",
    faqs: [],
  },
  {
    serviceId: "cmr85y1e7002170jutctxdjdx",
    expectedServiceUpdatedAt: "2026-07-19T05:02:15.472Z",
    expectedSourceSha256: "3839eaf5ad33d12809b326247cba8b7552929d712829dfa19c42000b26cec5ee",
    countryCode: "cz",
    locale: "CS",
    slug: "dusevni-zdravi-online",
    primaryKeyword: "duševní zdraví online",
    secondaryKeywords: ["online konzultace duševní zdraví", "úzkost konzultace online"],
    expectedFaqIds: ["cmr85y1lm002270juhocgavdd", "cmr85y1lm002370jul5kq2re1", "cmr85y1ln002470juv37t93ib", "cmr85y1ln002570ju2j62y5fl", "cmr85y1ln002670jugx5wqmqm", "cmr85y1ln002770ju1g7p03g7", "cmr85y1ln002870juwlpqv3mh"],
    summary: "Diskrétní online konzultace duševních obtíží s lékařem. Lékař posoudí situaci a doporučí další postup; při krizi nebo ohrožení volejte 155 nebo 112.",
    seoTitle: "Duševní zdraví online | Konzultace s lékařem",
    seoDescription: "Diskrétní online konzultace duševních obtíží s lékařem. Při krizi nebo bezprostředním ohrožení volejte 155 nebo 112.",
    heroTitle: "Duševní zdraví: online konzultace s lékařem",
    heroDescription: "Diskrétní online konzultace duševních obtíží s lékařem. Lékař posoudí situaci a doporučí další postup; při krizi nebo ohrožení volejte 155 nebo 112.",
    detailBody: `<p><strong>Při bezprostředním ohrožení sebe nebo jiné osoby volejte 155 nebo 112. Tato služba není krizová linka ani akutní psychiatrická péče.</strong></p>
<h2>Rozsah online konzultace duševního zdraví</h2>
<p>Lékař probere vaše obtíže, jejich délku, dopad na běžný život, užívané léky a možné tělesné příčiny. Konzultace může pomoci s úvodním zdravotním posouzením a s volbou dalšího postupu.</p>
<h2>Co služba nenahrazuje</h2>
<p>Nejde o psychoterapii ani automatickou diagnózu či psychiatrickou léčbu. Pokud je potřeba specializované vyšetření, osobní péče nebo krizová pomoc, lékař doporučí odpovídající další krok.</p>
<h2>ADHD a další obtíže</h2>
<p>Screeningový dotazník může upozornit na příznaky, ale diagnózu nepotvrzuje. Diagnostika ADHD a rozhodnutí o léčbě vyžadují odborné klinické posouzení.</p>
<h2>Soukromí</h2>
<p>Zdravotníci mají povinnost mlčenlivosti. Její rozsah a zákonné výjimky se řídí českými právními předpisy; konkrétní postup vysvětlí poskytovatel.</p>
<p>Zdroje: <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP: zdravotnická záchranná služba</a>, <a href="https://www.nzip.cz/clanek/239-prava-ditete">NZIP: práva dítěte</a>, <a href="https://www.nzip.cz/clanek/677-adhd-u-dospelych">NZIP: ADHD u dospělých</a> a <a href="https://mzd.gov.cz/wp-content/uploads/wepub/3478/8936/radce-pacienta.pdf">Ministerstvo zdravotnictví: Rádce pacienta</a>.</p>`,
    faqs: [
      {
        id: "cmr85y1lm002270juhocgavdd",
        question: "Co zahrnuje online konzultace duševního zdraví?",
        answer: "Jde o lékařské posouzení obtíží, jejich průběhu, dopadu a možných dalších kroků. Služba není psychoterapie, krizová linka ani automatická psychiatrická diagnóza.",
      },
      {
        id: "cmr85y1lm002370jul5kq2re1",
        question: "Může mě online lékař doporučit k psychiatrovi?",
        answer: "Pokud lékař vyhodnotí specializované vyšetření jako vhodné, doporučí další postup a vysvětlí dostupné možnosti. Objednání ani přijetí specialistou nelze předem zaručit.",
      },
      {
        id: "cmr85y1ln002470juv37t93ib",
        question: "Je online konzultace duševního zdraví důvěrná?",
        answer: "Zdravotníci mají povinnost mlčenlivosti. Její rozsah a zákonné výjimky se řídí českými právními předpisy; konkrétní postup vysvětlí poskytovatel.",
      },
      {
        id: "cmr85y1ln002570ju2j62y5fl",
        question: "Nahrazuje online konzultace psychoterapii?",
        answer: "Ne. Lékařská konzultace může doplnit péči terapeuta nebo pomoci určit další postup, ale nenahrazuje probíhající psychoterapii ani specializovanou psychiatrickou péči.",
      },
      {
        id: "cmr85y1ln002670jugx5wqmqm",
        question: "Je služba vhodná pro nezletilé?",
        answer: "Vhodnost, potřebný souhlas a způsob zapojení rodiče, zákonného zástupce a nezletilého se posuzují individuálně podle věku, vyspělosti, obtíží, okolností a pravidel služby.",
      },
      {
        id: "cmr85y1ln002770ju1g7p03g7",
        question: "Co mám dělat při psychické krizi nebo bezprostředním ohrožení?",
        answer: "Tato služba není určena pro krizi. Při bezprostředním ohrožení sebe nebo jiné osoby volejte 155 nebo 112 nebo vyhledejte nejbližší akutní péči.",
      },
      {
        id: "cmr85y1ln002870juwlpqv3mh",
        question: "Může online test nebo konzultace potvrdit ADHD?",
        answer: "Ne. Screening může upozornit na příznaky, ale diagnózu nepotvrzuje. Diagnostika ADHD a rozhodnutí o léčbě vyžadují odborné klinické posouzení.",
      },
    ],
  },
  {
    serviceId: "cmr85xvtl001370jue9ackw9g",
    expectedServiceUpdatedAt: "2026-07-19T05:02:33.212Z",
    expectedSourceSha256: "908d4aa98d9de6809215d296d2510c7295aeb616a7c3e568645c86133bbaa76c",
    countryCode: "cz",
    locale: "CS",
    slug: "kontrola-vahy-online",
    primaryKeyword: "hubnutí s lékařem",
    secondaryKeywords: ["kontrola váhy online", "lékařská konzultace hubnutí"],
    expectedFaqIds: ["cmr85xw10001470ju89mfykcy", "cmr85xw10001570jux5bcfn9b", "cmr85xw10001670jufog86gl9", "cmr85xw10001770junnpmy0y5", "cmr85xw10001870jub9lqn5en"],
    summary: "Online konzultace k bezpečnému řízení hmotnosti. Lékař zhodnotí zdravotní stav, dosavadní postup a vhodná vyšetření; konkrétní léčbu nelze slíbit předem.",
    seoTitle: "Hubnutí s lékařem | Online konzultace",
    seoDescription: "Online konzultace k bezpečnému řízení hmotnosti. Lékař zhodnotí zdravotní stav, dosavadní postup a vhodná vyšetření; léčbu nelze slíbit předem.",
    heroTitle: "Hubnutí s lékařem online",
    heroDescription: "Online konzultace k bezpečnému řízení hmotnosti. Lékař zhodnotí zdravotní stav, dosavadní postup a vhodná vyšetření; konkrétní léčbu nelze slíbit předem.",
    faqs: [],
  },
  {
    serviceId: "cmr85y394002e70ju6x2wqb0h",
    expectedServiceUpdatedAt: "2026-07-19T05:02:27.908Z",
    expectedSourceSha256: "91f36115673d9d97f3a73cfb207c7e31a5049f825a9371c50bbc097620ee5966",
    countryCode: "cz",
    locale: "CS",
    slug: "kozni-konzultace-praha",
    primaryKeyword: "kožní lékař online",
    secondaryKeywords: ["kozni online", "online dermatolog", "kožní konzultace Praha"],
    expectedFaqIds: ["cmr85y3gk002f70juijk1cwpx", "cmr85y3gk002g70juoihnr73r", "cmr85y3gk002h70jugufwixmk", "cmr85y3gk002i70ju9c50fovc", "cmr85y3gk002j70juiffreilb", "cmr85y3gk002k70ju62jwsib4"],
    summary: "Online konzultace kožních potíží s lékařem. Připravte si kvalitní fotografie a průběh obtíží; lékař posoudí, zda je nutná dermatoskopie nebo osobní vyšetření.",
    seoTitle: "Kožní lékař online | Dermatologická konzultace",
    seoDescription: "Konzultujte kožní potíže online s lékařem. Zjistěte, jak připravit fotografie a kdy je nutné osobní dermatologické vyšetření.",
    heroTitle: "Kožní konzultace online",
    heroDescription: "Online konzultace kožních potíží s lékařem. Připravte si kvalitní fotografie a průběh obtíží; lékař posoudí, zda je nutná dermatoskopie nebo osobní vyšetření.",
    detailBody: `<p><strong>Při závažné alergické reakci, potížích s dýcháním, rozsáhlém puchýřování nebo rychlém celkovém zhoršení volejte 155 nebo 112.</strong></p>
<h2>Jak probíhá kožní konzultace online</h2>
<p>Lékař probere vznik a vývoj potíží, další příznaky, používané přípravky a léky. Kvalitní fotografie mohou pomoci s orientačním posouzením, ale jejich výpovědní hodnota závisí na světle, ostrosti a zobrazené oblasti.</p>
<h2>Omezení vyšetření na dálku</h2>
<p>Fotografie ani videohovor nenahrazují pohmat, dermatoskopii, odběr nebo laboratorní vyšetření. Lékař může doporučit osobní dermatologické nebo jiné vyšetření, pokud na dálku nelze postup určit bezpečně.</p>
<h2>Léčba, recept a doporučení</h2>
<p>Konkrétní léčbu, recept nebo doporučení lze navrhnout pouze podle klinického posouzení. Objednání konzultace nezaručuje diagnózu, recept ani dokument.</p>
<p>Zdroje: <a href="https://ncez.mzcr.cz/cs/milnik-c-3-pravidladokumentypodklady-interoperabilita-telemedicina/pravidla-pro-rozvoj-telemediciny">NCEZ: pravidla pro telemedicínu</a> a <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP: zdravotnická záchranná služba</a>.</p>`,
    faqs: [
      {
        id: "cmr85y3gk002f70juijk1cwpx",
        question: "Lze kožní problém spolehlivě posoudit online?",
        answer: "Některé kožní potíže lze předběžně posoudit z anamnézy a kvalitních fotografií. Jiné vyžadují pohmat, dermatoskopii, odběr nebo osobní vyšetření; diagnózu nelze z fotografie zaručit.",
      },
      {
        id: "cmr85y3gk002g70juoihnr73r",
        question: "Může online lékař doporučit léčbu akné?",
        answer: "Lékař může po posouzení doporučit vhodný další postup. Konkrétní léčba nebo recept závisí na závažnosti, předchozí léčbě, dalších onemocněních a na tom, zda je posouzení na dálku dostačující.",
      },
      {
        id: "cmr85y3gk002h70jugufwixmk",
        question: "Mohu přes video ukázat změněné znaménko?",
        answer: "Fotografie může pomoci s prvním posouzením, ale podezřelé nebo měnící se znaménko často vyžaduje osobní vyšetření a dermatoskopii. Online konzultace nemůže vyloučit závažné onemocnění.",
      },
      {
        id: "cmr85y3gk002i70ju9c50fovc",
        question: "Je kožní konzultace online vhodná pro dítě s ekzémem?",
        answer: "Vhodnost a způsob zapojení rodiče, zákonného zástupce a dítěte se posuzují podle věku, vyspělosti, průběhu potíží, okolností a pravidel služby. Při závažném či nejasném stavu je nutné osobní vyšetření.",
      },
      {
        id: "cmr85y3gk002j70juiffreilb",
        question: "Dostanu po kožní konzultaci doporučení ke specialistovi?",
        answer: "Lékař může doporučit osobní dermatologické nebo jiné vyšetření, pokud je klinicky potřebné. Vystavení konkrétního doporučení ani jeho načasování nelze předem zaručit.",
      },
      {
        id: "cmr85y3gk002k70ju62jwsib4",
        question: "Kdy je kožní problém akutní?",
        answer: "Při potížích s dýcháním, otoku obličeje nebo jazyka, rozsáhlém puchýřování, poruše vědomí nebo rychlém celkovém zhoršení volejte 155 nebo 112.",
      },
    ],
  },
  {
    serviceId: "cmr85xq6u000070jufztsgfec",
    expectedServiceUpdatedAt: "2026-09-01T18:18:02.359Z",
    expectedSourceSha256: "c71ac9b6b975743c102646def4c4e1839d04bc15d5ae414f7103adcf35ffcc58",
    countryCode: "cz",
    locale: "CS",
    slug: "lekar-online-praha",
    primaryKeyword: "lékař online Praha",
    secondaryKeywords: ["soukromý lékař Praha", "online konzultace Praha"],
    expectedFaqIds: ["cmr85xqeo000170ju6qb7bzbb", "cmr85xqeo000270jug0dgtk42", "cmr85xqeo000370ju5ryyh241", "cmr85xqeo000470jukz64egnl", "cmr85xqeo000570july81xdfm", "cmr85xqeo000670ju725p211x", "cmr85xqeo000770jue4d5moju", "cmr85xqeo000870ju1d7eavt5"],
    summary: "Online videokonzultace s lékařem pro pacienty v Praze a celém Česku. Lékař posoudí potíže, vysvětlí další postup a doporučí osobní péči, pokud je nutná.",
    seoTitle: "Lékař online Praha | Video konzultace",
    seoDescription: "Online videokonzultace s lékařem pro pacienty v Praze a celém Česku. Lékař posoudí potíže a doporučí vhodný další postup.",
    heroTitle: "Lékař online v Praze",
    heroDescription: "Online videokonzultace s lékařem pro pacienty v Praze a celém Česku. Lékař posoudí potíže, vysvětlí další postup a doporučí osobní péči, pokud je nutná.",
    detailBody: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Co zahrnuje online konzultace</h2>
<p>Lékař probere vaše příznaky, anamnézu, užívané léky a dostupné zdravotní zprávy. Poté vysvětlí, zda lze doporučit postup na dálku, nebo je potřeba osobní vyšetření.</p>
<h2>Recepty, neschopenka a doporučení</h2>
<p>eRecept, eNeschopenku nebo doporučení lze vystavit pouze tehdy, pokud je to po klinickém posouzení medicínsky a administrativně odůvodněné. Objednání konzultace žádný dokument ani léčbu nezaručuje.</p>
<h2>Termín a délka konzultace</h2>
<p>Aktuální volné termíny a plánovaná délka se zobrazují v rezervačním kalendáři. Dostupnost se může měnit.</p>
<p>Zdroje: <a href="https://ncez.mzcr.cz/cs/milnik-c-3-pravidladokumentypodklady-interoperabilita-telemedicina/pravidla-pro-rozvoj-telemediciny">NCEZ: pravidla pro telemedicínu</a> a <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP: zdravotnická záchranná služba</a>.</p>`,
    faqs: [
      {
        id: "cmr85xqeo000170ju6qb7bzbb",
        question: "Jak dlouho trvá online konzultace s lékařem?",
        answer: "Plánovaná délka konzultace se zobrazí při rezervaci. Lékař během vyhrazeného času posoudí dostupné informace a podle potřeby doporučí další konzultaci nebo osobní vyšetření.",
      },
      {
        id: "cmr85xqeo000270jug0dgtk42",
        question: "Může online lékař vystavit eRecept?",
        answer: "Lékař může eRecept vystavit, pokud je lék po klinickém posouzení vhodný a lze jej bezpečně předepsat na dálku. Objednání konzultace vystavení receptu nezaručuje.",
      },
      {
        id: "cmr85xqeo000370ju5ryyh241",
        question: "Mohu dostat eNeschopenku přes online konzultaci?",
        answer: "Lékař může eNeschopenku vystavit pouze tehdy, pokud je pracovní neschopnost po klinickém posouzení odůvodněná a splňuje příslušné podmínky. Vystavení není automatické.",
      },
      {
        id: "cmr85xqeo000470jukz64egnl",
        question: "Co když nesouhlasím s doporučením lékaře?",
        answer: "Sdělte lékaři své obavy a preference. Lékař vysvětlí důvody doporučení, možné alternativy a situace, kdy je nutné osobní nebo akutní vyšetření.",
      },
      {
        id: "cmr85xqeo000570july81xdfm",
        question: "Musím být pojištěn u české zdravotní pojišťovny?",
        answer: "Služba je hrazena přímo pacientem. Případnou úhradu soukromou pojišťovnou nebo zaměstnavatelem si ověřte před rezervací přímo u příslušné organizace.",
      },
      {
        id: "cmr85xqeo000670ju725p211x",
        question: "Musím být v Praze, abych mohl využít online lékaře?",
        answer: "Službu lze využít z České republiky, pokud máte stabilní připojení a zařízení s kamerou. Vhodnost online posouzení závisí na zdravotních potížích a okolnostech.",
      },
      {
        id: "cmr85xqeo000770jue4d5moju",
        question: "Jak rychle získám termín online konzultace?",
        answer: "Aktuální volné termíny se zobrazují v rezervačním kalendáři a mohou se měnit. Rezervace je potvrzena až po dokončení objednávky.",
      },
      {
        id: "cmr85xqeo000870ju1d7eavt5",
        question: "Co když moje potíže vyžadují osobní vyšetření?",
        answer: "Lékař vysvětlí, proč online posouzení nestačí, a doporučí odpovídající osobní nebo akutní péči. Při závažném zhoršení volejte 155 nebo 112.",
      },
    ],
  },
  {
    serviceId: "cmr85xq6u000070jufztsgfec",
    expectedServiceUpdatedAt: "2026-09-01T23:38:25.814Z",
    expectedSourceSha256: "929eb8ac281ad5383eb468a1783457c7aae55d5a87d576a67e16135b1a0b10bb",
    countryCode: "cz",
    locale: "EN",
    slug: "lekar-online-praha",
    primaryKeyword: "English speaking doctor Prague",
    secondaryKeywords: ["doctor for foreigners Prague", "private doctor Prague", "online doctor Prague"],
    expectedFaqIds: ["cmr85xqeo000170ju6qb7bzbb", "cmr85xqeo000270jug0dgtk42", "cmr85xqeo000370ju5ryyh241", "cmr85xqeo000470jukz64egnl", "cmr85xqeo000570july81xdfm", "cmr85xqeo000670ju725p211x", "cmr85xqeo000770jue4d5moju", "cmr85xqeo000870ju1d7eavt5"],
    summary: "Book an online consultation with an English-speaking doctor registered in Czechia. The doctor will assess your symptoms and advise whether remote or in-person care is appropriate.",
    seoTitle: "English-Speaking Doctor in Prague | Online Consultation",
    seoDescription: "Book an online consultation with a Czech-registered, English-speaking doctor. See scope, live availability and when in-person or urgent care is needed.",
    heroTitle: "English-speaking online doctor in Prague",
    heroDescription: "Book an online consultation with an English-speaking doctor registered in Czechia. The doctor will assess your symptoms and advise whether remote or in-person care is appropriate.",
    detailBody: `<p><strong>For a sudden or serious deterioration, call 155 or 112. An online consultation is not an emergency service.</strong></p>
<h2>What an English-speaking online doctor can assess</h2>
<p>The doctor will review your symptoms, medical history, current medicines and any records you provide. They will explain whether remote advice is appropriate or an in-person examination is needed.</p>
<h2>Prescriptions and medical documents</h2>
<p>An ePrescription, sick note or referral may be issued only when clinically appropriate and permitted after remote assessment. Booking a consultation does not guarantee medicine, a document or a particular outcome.</p>
<h2>Appointments</h2>
<p>Current appointment times and the scheduled consultation length are shown in the booking calendar. Availability can change.</p>
<p>Sources: <a href="https://ncez.mzcr.cz/cs/milnik-c-3-pravidladokumentypodklady-interoperabilita-telemedicina/pravidla-pro-rozvoj-telemediciny">NCEZ telemedicine guidance</a> and <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP emergency medical service guidance</a>.</p>`,
    faqs: [
      {
        id: "cmr85xqeo000170ju6qb7bzbb",
        question: "How long does an online doctor consultation last?",
        answer: "The scheduled length is shown when you book. The doctor will assess the available information during that time and may recommend a follow-up or an in-person examination if needed.",
      },
      {
        id: "cmr85xqeo000270jug0dgtk42",
        question: "Can an English-speaking doctor issue an ePrescription?",
        answer: "The doctor may issue an ePrescription when the medicine is clinically appropriate and can be prescribed safely after remote assessment. Booking does not guarantee a prescription.",
      },
      {
        id: "cmr85xqeo000370ju5ryyh241",
        question: "Can I get a Czech sick note through this service?",
        answer: "A doctor may issue an electronic sick note only when incapacity for work is clinically justified and the relevant requirements are met. Issuance is not automatic.",
      },
      {
        id: "cmr85xqeo000470jukz64egnl",
        question: "What if I disagree with the doctor's recommendation?",
        answer: "Tell the doctor about your concerns and preferences. They will explain the reasons for the recommendation, possible alternatives and when in-person or urgent care is needed.",
      },
      {
        id: "cmr85xqeo000570july81xdfm",
        question: "Do I need Czech public health insurance?",
        answer: "This is a private, self-pay service. Check any reimbursement from a private insurer or employer directly with that organisation before booking.",
      },
      {
        id: "cmr85xqeo000670ju725p211x",
        question: "Do I need to be in Prague for the online consultation?",
        answer: "You can use the service from within Czechia with a stable internet connection and a camera-enabled device. Suitability for remote assessment depends on your symptoms and circumstances.",
      },
      {
        id: "cmr85xqeo000770jue4d5moju",
        question: "How quickly can I book an English-speaking doctor?",
        answer: "Current appointment times are shown in the booking calendar and can change. Your appointment is confirmed only after you complete the booking process.",
      },
      {
        id: "cmr85xqeo000870ju1d7eavt5",
        question: "What if I need an in-person examination?",
        answer: "The doctor will explain why remote assessment is not enough and recommend appropriate in-person or urgent care. For a serious deterioration, call 155 or 112.",
      },
    ],
  },
  {
    serviceId: "cmr85xxof001e70ju4i7habh8",
    expectedServiceUpdatedAt: "2026-07-19T05:02:13.708Z",
    expectedSourceSha256: "76dd36fd05a98b345442341c8dec8e1eff3691822c13c080c04e65db612c53c5",
    countryCode: "cz",
    locale: "CS",
    slug: "muzske-zdravi-online",
    primaryKeyword: "zdraví mužů online",
    secondaryKeywords: ["erektilní dysfunkce konzultace", "mužské zdraví"],
    expectedFaqIds: ["cmr85xxvu001f70jukfmypz3u", "cmr85xxvu001g70jush18bon2", "cmr85xxvu001h70juavn4766t", "cmr85xxvu001i70jucxdj5obv", "cmr85xxvu001j70julp1xw1lr"],
    summary: "Diskrétní online konzultace mužských zdravotních obtíží. Lékař posoudí možné příčiny a další postup; recepty a vyšetření závisejí na klinickém posouzení.",
    seoTitle: "Zdraví mužů online | Diskrétní konzultace",
    seoDescription: "Diskrétní online konzultace mužských zdravotních obtíží. Lékař posoudí možné příčiny a další postup; léčba závisí na klinickém posouzení.",
    heroTitle: "Zdraví mužů online",
    heroDescription: "Diskrétní online konzultace mužských zdravotních obtíží. Lékař posoudí možné příčiny a další postup; recepty a vyšetření závisejí na klinickém posouzení.",
    faqs: [],
  },
  {
    serviceId: "cmr85y8u3003h70jufxhjcrip",
    expectedServiceUpdatedAt: "2026-07-19T05:02:11.944Z",
    expectedSourceSha256: "03ad4dd643b6395710293a2f0583e25e386958f2b1f23ee1d34a3e25aba574bf",
    countryCode: "cz",
    locale: "CS",
    slug: "vypadavani-vlasu-online",
    primaryKeyword: "vypadávání vlasů doktor",
    secondaryKeywords: ["vypadávání vlasů lékař", "vypadávání vlasů online"],
    expectedFaqIds: ["cmr85y91h003i70ju66607wzd", "cmr85y91h003j70jubcw6u7x9", "cmr85y91h003k70julee55r86", "cmr85y91h003l70juavudt1go", "cmr85y91h003m70juglcrqpa7", "cmr85y91h003n70jue6i9i9f0"],
    summary: "Online konzultace vypadávání nebo řídnutí vlasů. Lékař zhodnotí průběh, možné příčiny a potřebu vyšetření; léčba nebo recept nejsou automatické.",
    seoTitle: "Vypadávání vlasů | Online konzultace s lékařem",
    seoDescription: "Online konzultace vypadávání nebo řídnutí vlasů. Lékař posoudí průběh, možné příčiny a potřebu vyšetření; léčba není automatická.",
    heroTitle: "Vypadávání vlasů: online konzultace",
    heroDescription: "Online konzultace vypadávání nebo řídnutí vlasů. Lékař zhodnotí průběh, možné příčiny a potřebu vyšetření; léčba nebo recept nejsou automatické.",
    faqs: [],
  },
  {
    serviceId: "cmr85xzj5001p70juetn2njoa",
    expectedServiceUpdatedAt: "2026-07-19T05:02:34.969Z",
    expectedSourceSha256: "1003e0d10b5ce325311a4230510233f3a064e62440e179eb5ceea963a87a7a5e",
    countryCode: "cz",
    locale: "CS",
    slug: "zenske-zdravi-online",
    primaryKeyword: "zdraví žen online",
    secondaryKeywords: ["ženské zdraví konzultace", "menopauza online konzultace"],
    expectedFaqIds: ["cmr85xzql001q70juqt9z51qo", "cmr85xzql001r70juv4vyt8wj", "cmr85xzql001s70ju090a9zh8", "cmr85xzql001t70juc83sjpe9", "cmr85xzql001u70juwk6onann", "cmr85xzql001v70juqsfgzvwt"],
    summary: "Diskrétní online konzultace ženských zdravotních obtíží. Lékař posoudí situaci a doporučí další postup; některé potíže vyžadují osobní gynekologické vyšetření.",
    seoTitle: "Zdraví žen online | Diskrétní konzultace",
    seoDescription: "Diskrétní online konzultace ženských zdravotních obtíží. Lékař doporučí další postup; některé potíže vyžadují osobní gynekologické vyšetření.",
    heroTitle: "Zdraví žen online",
    heroDescription: "Diskrétní online konzultace ženských zdravotních obtíží. Lékař posoudí situaci a doporučí další postup; některé potíže vyžadují osobní gynekologické vyšetření.",
    faqs: [],
  },
] as const satisfies readonly CzechiaSeoServiceDraft[];

const sickNote = {
  serviceId: "cmr85xs2p000e70juwmch637u",
  expectedServiceUpdatedAt: "2026-07-19T05:02:26.121Z",
  expectedSourceSha256: "880fd7d374b062af8df380b46b24d1a07c7187f570f2307aba679336203834cc",
  countryCode: "cz",
  locale: "CS",
  slug: "neschopenka-online",
  primaryKeyword: "online neschopenka",
  secondaryKeywords: ["neschopenka online", "lékařská neschopenka online"],
  expectedFaqIds: [
    "cmr85xsa6000f70juiww70ryi", "cmr85xsa7000g70juxfnb13c0", "cmr85xsa7000h70jukgav4lq6",
    "cmr85xsa7000i70juhcv8uf4r", "cmr85xsa7000j70juz48nt8zz", "cmr85xsa7000k70ju3eqob21a",
    "cmr85xsa7000l70ju0rerevdi",
  ],
  name: "Online neschopenka",
  summary:
    "Online konzultace k posouzení pracovní neschopnosti. Lékař rozhodne podle zdravotního stavu a povahy práce; vystavení eNeschopenky není automatické.",
  seoTitle: "Online neschopenka | Posouzení lékařem",
  seoDescription:
    "Online konzultace k posouzení pracovní neschopnosti. Lékař rozhodne podle zdravotního stavu; vystavení eNeschopenky není automatické.",
  heroTitle: "Online posouzení pracovní neschopnosti",
  heroDescription:
    "Při videokonzultaci lékař posoudí váš zdravotní stav a povahu práce. Pokud vyšetření na dálku nestačí, doporučí osobní péči. eNeschopenku lze vystavit jen tehdy, je-li pracovní neschopnost medicínsky odůvodněná.",
  detailBody: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Co lékař při konzultaci posoudí</h2>
<p>Lékař se zeptá na vaše potíže, jejich průběh, dosavadní léčbu a nároky vaší práce. Zhodnotí také, zda lze stav posoudit při videokonzultaci. Pokud potřebuje fyzikální vyšetření, odběry nebo jiné vyšetření na místě, doporučí osobní návštěvu.</p>
<h2>Co si připravit</h2>
<ul><li>doklad totožnosti a údaje vyžádané při rezervaci,</li><li>seznam užívaných léků a informace o alergiích,</li><li>stručný průběh potíží včetně data jejich začátku,</li><li>popis práce a činností, které nyní nemůžete vykonávat,</li><li>dostupné lékařské zprávy nebo výsledky související s potížemi.</li></ul>
<h2>Jaký může být výsledek posouzení</h2>
<p>Pokud lékař po odpovídajícím vyšetření uzná dočasnou pracovní neschopnost, může rozhodnutí zapsat do systému eNeschopenka a předat příslušné správě sociálního zabezpečení. Vystavení dokladu, jeho délku ani zpětné datum nelze slíbit před konzultací.</p>
<p>ČSSZ uvádí, že zaměstnanec musí o překážce v práci neprodleně informovat zaměstnavatele. Elektronická notifikace zaměstnavateli závisí na aktivaci služby a na zpracování údajů v systému ČSSZ. Podrobnosti najdete v <a href="https://www.cssz.gov.cz/web/eneschopenka">oficiálních informacích ČSSZ k eNeschopence</a>.</p>
<h2>Neschopenka a nárok na nemocenské nejsou totéž</h2>
<p>Lékař posuzuje zdravotní důvod dočasné pracovní neschopnosti. Účast na nemocenském pojištění, náhradu mzdy a výplatu dávky řeší zaměstnavatel a ČSSZ podle aktuálních pravidel. Tato konzultace neurčuje nárok ani výši dávky.</p>
<h2>Průběh eNeschopenky krok za krokem</h2>
<p>Administrativní postup pro zaměstnance, zaměstnavatele, lékaře a ČSSZ popisuje samostatný článek <a href="/czechia/cs/blog/neschopenka-jak-funguje-eneschopenka">Jak funguje eNeschopenka</a>. Tato stránka slouží k objednání lékařského posouzení.</p>
<h2>Kdy zvolit osobní nebo akutní péči</h2>
<p>Osobní vyšetření může být nutné při dušnosti, bolesti na hrudi, poruše vědomí, silné bolesti, významném zhoršení stavu nebo tehdy, když lékař nemá při videokonzultaci dost informací. Při bezprostředním ohrožení života volejte 155 nebo 112.</p>`,
  ctaLabel: "Objednat posouzení",
  faqs: [
    {
      id: "cmr85xsa6000f70juiww70ryi",
      question: "Je eNeschopenka po konzultaci vystavena automaticky?",
      answer:
        "Ne. Lékař nejprve posoudí zdravotní stav, povahu práce a vhodnost vyšetření na dálku. eNeschopenku může vystavit pouze tehdy, pokud je dočasná pracovní neschopnost medicínsky odůvodněná.",
    },
    {
      id: "cmr85xsa7000g70juxfnb13c0",
      question: "Co si mám připravit k online posouzení neschopenky?",
      answer:
        "Připravte si doklad totožnosti, údaje vyžádané při rezervaci, seznam léků, informace o alergiích, průběh potíží, popis své práce a dostupné lékařské zprávy.",
    },
    {
      id: "cmr85xsa7000h70jukgav4lq6",
      question: "Rozhodne lékař také o mém nároku na nemocenské?",
      answer:
        "Ne. Lékař posuzuje zdravotní důvod dočasné pracovní neschopnosti. Účast na nemocenském pojištění a nárok na dávku se řídí aktuálními pravidly ČSSZ a pracovním vztahem.",
    },
    {
      id: "cmr85xsa7000i70juhcv8uf4r",
      question: "Může online posouzení využít OSVČ?",
      answer:
        "Konzultaci si objednat můžete. Lékař posoudí zdravotní stav; případný nárok na nemocenské je samostatná otázka nemocenského pojištění, kterou je potřeba ověřit u ČSSZ.",
    },
    {
      id: "cmr85xsa7000j70juz48nt8zz",
      question: "Lze eNeschopenku vystavit zpětně?",
      answer:
        "Zpětné vystavení je omezené zákonnými podmínkami a nelze je slíbit předem. Lékaři při konzultaci sdělte, kdy potíže začaly a zda už proběhlo vyšetření.",
    },
    {
      id: "cmr85xsa7000k70ju3eqob21a",
      question: "Musím o pracovní neschopnosti informovat zaměstnavatele?",
      answer:
        "Ano. ČSSZ uvádí, že zaměstnanec musí zaměstnavatele o překážce v práci neprodleně informovat. Údaje o rozhodnutí předává lékař elektronicky; notifikace zaměstnavateli závisí na nastavení a zpracování v systému ČSSZ.",
    },
    {
      id: "cmr85xsa7000l70ju0rerevdi",
      question: "Jak rychle se eNeschopenka objeví v systému ČSSZ, pokud ji lékař vystaví?",
      answer:
        "Pokud lékař eNeschopenku vystaví, odešle údaje ČSSZ elektronicky. Zobrazení a notifikace závisejí na konkrétní službě ČSSZ, jejím nastavení a zpracování. Konzultace nemůže slíbit konkrétní čas; zaměstnavatele informujte neprodleně.",
    },
  ],
} satisfies CzechiaSeoServiceDraft;

const treatmentRenewal = {
  serviceId: "cmr85xtxo000r70juhan2iood",
  expectedServiceUpdatedAt: "2026-07-19T05:02:31.451Z",
  expectedSourceSha256: "8bd648915a8dce6651a6be34a161f3948b9d2861c39e41a305a4ed4805e74ad8",
  countryCode: "cz",
  locale: "CS",
  slug: "obnoveni-lecby",
  primaryKeyword: "obnovení receptu online",
  secondaryKeywords: ["obnova léčby online", "eRecept online", "online konzultace kvůli receptu"],
  expectedFaqIds: [
    "cmr85xu55000s70juvfpdxhi4", "cmr85xu55000t70jusnndkqhm", "cmr85xu55000u70jucleqlqkr",
    "cmr85xu55000v70ju4q27csa4", "cmr85xu55000w70ju09qbtii5", "cmr85xu55000x70jus9xjlihu",
  ],
  name: "Obnovení léčby a receptu online",
  summary:
    "Online konzultace k pokračování zavedené léčby. Lékař posoudí dokumentaci, aktuální stav a bezpečnost dalšího postupu; vystavení eReceptu není automatické.",
  seoTitle: "Obnovení receptu online | Posouzení léčby lékařem",
  seoDescription:
    "Online konzultace k pokračování zavedené léčby. Lékař posoudí dokumentaci, bezpečnost a další postup; vystavení eReceptu není automatické.",
  heroTitle: "Obnovení léčby a receptu online",
  heroDescription:
    "Lékař při videokonzultaci zkontroluje dosavadní léčbu, dokumentaci, aktuální potíže a bezpečnost pokračování. eRecept vystaví pouze tehdy, pokud je další léčba vhodná a má pro rozhodnutí dost informací.",
  detailBody: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Komu může konzultace pomoci</h2>
<p>Služba je určena k posouzení pokračování zavedené léčby u stabilního stavu. Lékař potřebuje znát dosavadní diagnózu, užívané léky a průběh léčby. Nové nebo výrazně změněné potíže mohou vyžadovat širší konzultaci či osobní vyšetření.</p>
<h2>Co si připravit</h2>
<ul><li>seznam všech léků včetně dávkování a délky užívání,</li><li>poslední lékařskou zprávu nebo doporučení předepisujícího lékaře,</li><li>výsledky kontrolních odběrů a domácí měření, pokud se léčby týkají,</li><li>informace o alergiích, nežádoucích účincích a nových potížích,</li><li>údaje o dalších lécích a doplňcích kvůli možným interakcím.</li></ul>
<h2>Jak lékař rozhoduje</h2>
<p>Lékař ověří, zda léčba stále odpovídá vašemu zdravotnímu stavu. Zohlední účinek, nežádoucí účinky, možné interakce a potřebu kontrolních vyšetření. Pokud nemá dostatek informací nebo léčba vyžaduje vyšetření na místě, doporučí jiný postup.</p>
<h2>eRecept není automatickou součástí objednávky</h2>
<p>Pokud je pokračování léčby po posouzení vhodné, lékař může vystavit eRecept. Elektronický recept je uložen v centrálním systému a pacient dostane jeho identifikátor pro výdej v lékárně. Způsob předání identifikátoru a dostupnost konkrétního léčivého přípravku se mohou lišit.</p>
<p>Informace o systému najdete na oficiálním portálu <a href="https://www.epreskripce.cz/">ePreskripce</a>. Konzultace nezaručuje předepsání konkrétního léku, dávky ani počtu balení.</p>
<h2>Kdy je potřeba jiný postup</h2>
<p>Osobní kontrola nebo vyšetření může být nutné při změně příznaků, chybějící dokumentaci, potřebě fyzikálního vyšetření či odběrů nebo u léčiv vyžadujících zvláštní dohled. Lékař může také doporučit návštěvu původního předepisujícího lékaře nebo specialisty.</p>
<p>Pokud řešíte nový zdravotní problém, využijte <a href="/czechia/cs/gp-consultation-online">online konzultaci s praktickým lékařem</a>. Při bezprostředním ohrožení života volejte 155 nebo 112.</p>`,
  ctaLabel: "Objednat posouzení léčby",
  faqs: [
    {
      id: "cmr85xu55000s70juvfpdxhi4",
      question: "Je recept po konzultaci obnoven automaticky?",
      answer:
        "Ne. Lékař nejprve zkontroluje dosavadní léčbu, aktuální stav, možné nežádoucí účinky a dostupnou dokumentaci. eRecept může vystavit pouze tehdy, pokud je pokračování léčby vhodné.",
    },
    {
      id: "cmr85xu55000t70jusnndkqhm",
      question: "Lze při videokonzultaci obnovit každý lék?",
      answer:
        "Ne. Některé léky vyžadují osobní vyšetření, laboratorní kontrolu, zvláštní dohled nebo návštěvu původního předepisujícího lékaře. O vhodném postupu rozhodne lékař podle konkrétní situace.",
    },
    {
      id: "cmr85xu55000u70jucleqlqkr",
      question: "Jak dostanu eRecept, pokud ho lékař vystaví?",
      answer:
        "Elektronický recept má jedinečný identifikátor, který slouží k výdeji v lékárně. Lékař nebo služba vám sdělí dostupný způsob jeho předání. Samotná objednávka nezaručuje vystavení receptu.",
    },
    {
      id: "cmr85xu55000v70ju4q27csa4",
      question: "Co si mám připravit k posouzení léčby?",
      answer:
        "Připravte si seznam léků a dávkování, poslední lékařskou zprávu, relevantní výsledky, informace o alergiích a nežádoucích účincích a přehled dalších léků či doplňků.",
    },
    {
      id: "cmr85xu55000w70ju09qbtii5",
      question: "Co když se můj stav před obnovením receptu změnil?",
      answer:
        "Popište změnu hned na začátku konzultace. Lékař posoudí, zda stačí videokonzultace, nebo je bezpečnější širší či osobní vyšetření. Při náhlém závažném zhoršení volejte 155 nebo 112.",
    },
    {
      id: "cmr85xu55000x70jus9xjlihu",
      question: "Mohu si objednat obnovení léčby bez registrovaného praktického lékaře?",
      answer:
        "Ano, konzultaci si objednat můžete. Rozhodnutí o pokračování léčby závisí na dostupné dokumentaci a klinickém posouzení. Služba nenahrazuje pravidelné kontroly ani dlouhodobou péči praktického lékaře.",
    },
  ],
} satisfies CzechiaSeoServiceDraft;

export const CZECHIA_SEO_SERVICE_DRAFTS: readonly CzechiaSeoServiceDraft[] = [
  ...metadataDrafts.slice(0, 12),
  sickNote,
  treatmentRenewal,
  ...metadataDrafts.slice(12),
];

function approvalPayload(draft: CzechiaSeoServiceDraft) {
  return {
    slug: draft.slug,
    locale: draft.locale,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
    name: draft.name,
    summary: draft.summary,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    heroTitle: draft.heroTitle,
    heroDescription: draft.heroDescription,
    detailBody: draft.detailBody,
    ctaLabel: draft.ctaLabel,
    faqs: draft.faqs,
  };
}

export function czechiaSeoApprovalSha256(draft: CzechiaSeoServiceDraft): string {
  return createHash("sha256").update(JSON.stringify(approvalPayload(draft))).digest("hex");
}

export function czechiaSeoConfirmationToken(draft: CzechiaSeoServiceDraft): string {
  return `CZ-SEO-SERVICE:${draft.locale}:${draft.slug}:${czechiaSeoApprovalSha256(draft).slice(0, 16)}`;
}

export function czechiaCalendarDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function parseReviewDate(value: string | undefined, label: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid calendar date`);
  }
  if (value > czechiaCalendarDate()) {
    throw new Error(`${label} cannot be in the future`);
  }
  return date;
}

export function parseCzechiaSeoReviewDate(value: string | undefined): Date | null {
  return parseReviewDate(value, "Review date");
}

export function parseCzechiaSeoNativeReviewDate(value: string | undefined): Date | null {
  return parseReviewDate(value, "Native review date");
}

export function assertCzechiaSeoApplyGate(
  apply: boolean,
  draft: CzechiaSeoServiceDraft,
  reviewedAt: Date | null,
  providedHash: string | null,
  reviewerDoctorId: string | null,
  confirmation: string | null,
  clinicalReviewStatus: string | null = null,
  nativeReviewerId: string | null = null,
  nativeReviewedAt: Date | null = null,
  now: Date = new Date(),
): void {
  if (!apply) return;
  if (!reviewedAt) throw new Error("Refusing to apply without a real clinical review date");
  if (providedHash !== czechiaSeoApprovalSha256(draft)) {
    throw new Error("Refusing to apply without approval for the exact reviewed copy");
  }
  if (!reviewerDoctorId) throw new Error("Refusing to apply without a linked reviewer doctor");
  if (confirmation !== czechiaSeoConfirmationToken(draft)) {
    throw new Error("Refusing to apply without the exact confirmation token");
  }
  if (draft.locale === "EN" && !nativeReviewerId?.trim()) {
    throw new Error("Refusing to apply English copy without a native reviewer ID");
  }
  if (draft.locale === "EN" && !nativeReviewedAt) {
    throw new Error("Refusing to apply English copy without a native review date");
  }
  if (draft.locale === "EN" && Number.isNaN(nativeReviewedAt!.getTime())) {
    throw new Error("Refusing to apply English copy without a valid native review date");
  }
  if (
    draft.locale === "EN" &&
    nativeReviewedAt!.toISOString().slice(0, 10) > czechiaCalendarDate(now)
  ) {
    throw new Error("Refusing to apply English copy with a future native review date");
  }
  if (clinicalReviewStatus !== "approved") {
    throw new Error("Refusing to apply until the clinical review register marks this exact asset approved");
  }
}

export function validateCzechiaSeoServiceDraft(draft: CzechiaSeoServiceDraft): string[] {
  const errors: string[] = [];
  const text = JSON.stringify(draft);
  if (draft.seoTitle.length > 60) errors.push("SEO title exceeds 60 characters");
  if (draft.seoDescription.length < 110 || draft.seoDescription.length > 160) {
    errors.push("SEO description must be 110-160 characters");
  }
  if (draft.detailBody && !/155.*112|112.*155/.test(draft.detailBody)) {
    errors.push("Emergency numbers are missing");
  }
  if (draft.faqs.length > 0 && draft.faqs.length < 5) {
    errors.push("At least five visible FAQs are required when FAQs are rewritten");
  }
  if (/term[ií]n (ještě )?dnes|ve stejný den|bez čekání/i.test(text)) {
    errors.push("Availability promise found");
  }
  if (/vystaví potřebné žádanky|stejnou klinickou platnost|neschopenka ihned/i.test(text)) {
    errors.push("Unconditional medical promise found");
  }
  if (/[—–]/.test(text)) errors.push("Deslop failed: dash-heavy copy remains");
  if (/zde je|pojďme|v dnešní|stojí za zmínku|zásadně|robustní|landscape/i.test(text)) {
    errors.push("Deslop failed: formulaic phrasing remains");
  }
  return errors;
}
