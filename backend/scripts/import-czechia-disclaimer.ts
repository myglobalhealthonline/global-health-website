/**
 * Import the Czech Republic Medical Disclaimer, parsed from
 * "GlobalHealth_Disclaimer_CzechRepublic.docx" (bilingual CS-first, July 2026).
 *
 *   node --env-file=.env --import tsx scripts/import-czechia-disclaimer.ts          # dry-run
 *   node --env-file=.env --import tsx scripts/import-czechia-disclaimer.ts --apply
 *
 * Writes:
 *  - CountryLegalDocument (MEDICAL_DISCLAIMER) full standalone page, locale "cs" and "en".
 *    Served at /czech-republic/{cs,en}/legal/medical-disclaimer. Idempotent upsert.
 *  - CountryLegalProfile.shortDisclaimer/fullDisclaimer base columns (CZ's default
 *    locale is CS, so the base columns hold the Czech copy) + a
 *    CountryDisclaimerTranslation(locale=EN) override — replaces the placeholder
 *    English-only draft previously seeded by seed-country-disclaimers.ts (that
 *    script's `cz` entry has been removed to avoid the two scripts fighting over
 *    the same row).
 *
 * Source-doc note: §2/§11 of the source docx has one internal inconsistency — the
 * Czech sentence names the verification URL "ordemdosmedicos.pt" (a Portuguese
 * registry domain, clearly a copy-paste artifact) while the English sentence
 * correctly says "clk.cz". Corrected to clk.cz in both languages here per
 * instruction — this is the only deliberate deviation from the source text.
 */
import { LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "cz";
const APPLY = process.argv.includes("--apply");

const TITLE_CS = "Zdravotní prohlášení";
const TITLE_EN = "Medical Disclaimer";

const DISCLAIMER_HTML_CS = [
  "<p>Tento Zdravotní prohlášení se vztahuje na všechny klinické služby poskytované prostřednictvím platformy Global Health v České republice, dostupné na myglobalhealth.online. Objednáním konzultace nebo využitím jakékoli klinické služby prostřednictvím této platformy uživatel potvrzuje, že si přečetl, porozuměl a přijímá podmínky stanovené v tomto dokumentu.</p>",
  "<p>Toto prohlášení se vztahuje na všechny služby poskytované v České republice, včetně konzultací všeobecné medicíny, specializovaných konzultací a konzultací spřízněných zdravotnických profesí. Na služby poskytované na jiných trzích — Irsko, Portugalsko, Španělsko, Rumunsko a Brazílie — se vztahují jejich vlastní prohlášení, dostupná na příslušných stránkách jednotlivých zemí této platformy.</p>",
  "<p><em>Poslední aktualizace: červenec 2026</em></p>",

  "<h2>⚠ Zdravotní emergence — přečtěte si nejdříve</h2>",
  "<p><strong>Videokonzultace nejsou vhodné pro zdravotní emergence.</strong></p>",
  "<p>Pokud vy nebo někdo ve vašem okolí prožívá zdravotní emergenci — včetně bolesti na hrudi, potíží s dýcháním, příznaků cévní mozkové příhody, ztráty vědomí, závažné alergické reakce nebo jakéhokoliv jiného stavu ohrožujícího život — neobjednávejte se na online konzultaci.</p>",
  '<p><strong>Volejte <a href="tel:155">155</a> (záchranná služba) nebo <a href="tel:112">112</a> okamžitě, nebo se dostavte na nejbližší pohotovost.</strong></p>',
  "<p>Krizové linky duševního zdraví:</p>",
  "<ul>" +
    '<li>Linka první psychické pomoci — <a href="tel:116123">116 123</a> (zdarma, 24/7)</li>' +
    '<li>Centrum krizové intervence — <a href="tel:284016666">284 016 666</a> (Praha, 24/7)</li>' +
    "</ul>",

  "<h2>1. Obecné prohlášení — všechny služby</h2>",
  "<p>Všechny klinické služby poskytované prostřednictvím Global Health v České republice jsou realizovány v souladu s českými normami telemedicíny a lékařské praxe, lékaři a zdravotními pracovníky registrovanými v příslušném regulačním orgánu.</p>",
  "<p>Klinická hodnocení provedená prostřednictvím této platformy jsou hodnocení na dálku. Jsou vedena podle stejných odborných standardů jako osobní péče, ale mají inherentní omezení — fyzické vyšetření, určité diagnostické postupy a urgentní intervence nelze poskytnout na dálku. Klinický pracovník jasně informuje uživatele, pokud jeho prezentace vyžaduje osobní hodnocení.</p>",
  "<p>Všechna klinická doporučení, doporučení ke specialistům, eRecepty a dokumentace jsou vydávány výhradně na základě odborného uvážení lékaře nebo zdravotního pracovníka po úplném posouzení. Žádný klinický výsledek — včetně vydání eReceptu, doporučení, atestace pracovní neschopnosti nebo jakékoliv jiné klinické dokumentace — nelze předem potvrdit ani zaručit.</p>",

  "<h2>2. Služby všeobecné medicíny</h2>",
  "<p>Služby všeobecné medicíny poskytované prostřednictvím Global Health v České republice jsou realizovány v souladu s českými normami telemedicíny a lékařské praxe.</p>",
  '<p>Všichni lékaři poskytující služby všeobecné medicíny prostřednictvím této platformy jsou registrováni v České lékařské komoře (ČLK). Čísla registrace jsou uvedena v profilu každého lékaře a lze je ověřit na <a href="https://clk.cz">clk.cz</a>.</p>',
  "<p>Platné pro všechny služby všeobecné medicíny:</p>",
  "<ul>" +
    "<li>Fyzické vyšetření nelze provést na dálku. Lékař provádí hodnocení na základě zdravotní anamnézy a vizuálního pozorování během videohovoru. Pokud je fyzické vyšetření klinicky nutné, lékař poradí o vhodném osobním hodnocení.</li>" +
    "<li>Určitá doplňková vyšetření — včetně krevních testů, zobrazovacích metod a EKG — vyžadují osobní návštěvu. Lékař může posoudit nutnost těchto vyšetření a koordinovat příslušné žádanky.</li>" +
    "<li>Naši lékaři standardně nepředepisují kontrolované látky prostřednictvím videokonzultací.</li>" +
    "</ul>",
  "<p>Klinická rozhodnutí — včetně vydání eReceptu, doporučení, atestací pracovní neschopnosti a jiné klinické dokumentace — jsou přijímána výhradně na základě odborného uvážení lékaře po úplném hodnocení.</p>",

  "<h2>3. eRecept a pracovní neschopnost</h2>",
  "<p>Elektronické recepty (eRecept) jsou vydávány v souladu se zákonem č. 378/2007 Sb. o léčivech a příslušnými předpisy SÚKL. eRecept je vydáván jako elektronický kód, který pacient obdrží a uplatní v jakékoli lékárně v České republice dle svého výběru.</p>",
  "<p>Elektronická neschopenka (eNeschopenka) je vydávána v souladu se zákonem č. 187/2006 Sb. o nemocenském pojištění. K vystavení eNeschopenky je nutné rodné číslo pacienta a pacient musí být evidován v systému ČSSZ.</p>",
  "<p>Nárok na nemocenskou závisí na druhu pracovního poměru — HPP, DPČ nad 4 500 Kč měsíčně, DPP nad 12 000 Kč měsíčně (hranice pro rok 2026), nebo OSVČ s dobrovolným nemocenským pojištěním. Lékař poradí ohledně nároku v konkrétní situaci pacienta.</p>",
  "<p>Zpětné atestace pracovní neschopnosti nejsou standardně vydávány. Lékaři nemohou klinicky certifikovat období nemoci, které klinicky neposoudili v době nemoci. Rozhodnutí o vydání eNeschopenky je vždy výhradně klinické rozhodnutí lékaře po úplném posouzení.</p>",

  "<h2>4. Specializované lékařské služby</h2>",
  '<p>Specializované konzultace poskytované prostřednictvím této platformy jsou realizovány lékaři registrovanými v příslušném Kolegiu specialistů České lékařské komory. Čísla registrace jsou uvedena v profilu každého specialisty a lze je ověřit na <a href="https://clk.cz">clk.cz</a>.</p>',
  "<p>Další omezení rozsahu platí pro specializované služby:</p>",
  "<ul>" +
    "<li>Úplné specializované fyzické vyšetření — včetně srdeční auskultace, úplného neurologického vyšetření a úplného pediatrického hodnocení — nelze provést na dálku.</li>" +
    "<li>Izotretinoin musí být v České republice předepsán dermatologem dle příbalového letáku přípravku a nelze ho zahájit prostřednictvím této služby.</li>" +
    "<li>Nedobrovolné psychiatrické hodnocení nebo léčba dle zákona č. 372/2011 Sb. nemohou být prováděny prostřednictvím konzultace na dálku.</li>" +
    "<li>Onkologické konzultace poskytované prostřednictvím této platformy zahrnují druhý lékařský názor a podporu — nezahrnují podávání chemoterapie ani jiné systémové terapie, které vyžadují osobní podání ve specializované jednotce.</li>" +
    "</ul>",

  "<h2>5. Pediatrické služby a ochrana dětí</h2>",
  "<p>Platí následující podmínky specifické pro všechny pediatrické konzultace poskytované prostřednictvím této platformy:</p>",
  "<ul>" +
    "<li>Všechny pediatrické konzultace pro pacienty mladší 16 let vyžadují přítomnost rodiče nebo zákonného zástupce po celou dobu konzultace a jejich informovaný souhlas, v souladu se zákonem č. 89/2012 Sb. (občanský zákoník) a zákonem č. 359/1999 Sb. o sociálně-právní ochraně dětí.</li>" +
    "<li>U adolescentů ve věku 16 let a starších lékař individuálně posoudí způsobilost k souhlasu v souladu s českými lékařskými a právními normami.</li>" +
    "<li>Naši klinickí pracovníci jsou vázáni zákonem č. 359/1999 Sb. o sociálně-právní ochraně dětí. Pokud konzultace vzbudí obavy ohledně ochrany dětí, je klinický pracovník právně a profesně povinen jednat v souladu s touto legislativou, což může zahrnovat zapojení příslušného orgánu sociálně-právní ochrany dětí (OSPOD). Tato povinnost má přednost před důvěrností.</li>" +
    "<li>Horečka u kojence mladšího 3 měsíců je zdravotní emergence vyžadující okamžité osobní posouzení. Nezajednávejte se na videokonzultaci pro tuto prezentaci — volejte 155 nebo 112 a dostavte se na nejbližší pohotovost.</li>" +
    "</ul>",

  "<h2>6. Služby duševního zdraví</h2>",
  "<p>Konzultace duševního zdraví jsou poskytovány na úrovni praktického lékaře lékaři registrovanými v ČLK. Platí následující omezení rozsahu:</p>",
  "<ul>" +
    "<li>Tato služba poskytuje hodnocení duševního zdraví na úrovni praktického lékaře — není to krizová intervenční služba, poradenská ani psychoterapeutická služba, ani psychiatrická služba.</li>" +
    "<li>Nedobrovolné psychiatrické hodnocení nebo léčba dle platných českých zákonů nemohou být zahájeny prostřednictvím této služby. Pokud může být nedobrovolné hodnocení nutné, klinický pracovník okamžitě odkáže na příslušnou osobní službu.</li>" +
    "<li>Důvěrnost je udržována v souladu s profesními standardy ČLK a předpisy GDPR. V omezených okolnostech — kdy existuje vážné a bezprostřední riziko pro život — mohou být povinnosti důvěrnosti pečlivě zváženy. Klinický pracovník prodiskutuje důvěrnost na začátku první konzultace.</li>" +
    "</ul>",
  "<p><strong>Krizové linky duševního zdraví — Česká republika.</strong> Pokud jste v krizi nebo máte myšlenky na sebevraždu či sebepoškození:</p>",
  "<ul>" +
    '<li>Linka první psychické pomoci — <a href="tel:116123">116 123</a> (zdarma, 24/7)</li>' +
    '<li>Centrum krizové intervence — <a href="tel:284016666">284 016 666</a> (Praha, 24/7)</li>' +
    '<li>Záchranná služba — <a href="tel:112">112</a></li>' +
    "</ul>",

  "<h2>7. Služby zdraví žen</h2>",
  "<p>Platí následující omezení rozsahu specifická pro konzultace zdraví žen poskytované prostřednictvím této platformy:</p>",
  "<ul>" +
    "<li>Přerušení těhotenství v České republice vyžaduje osobní návštěvu licencovaného zařízení dle zákona č. 66/1986 Sb. Tuto službu nelze zajistit prostřednictvím telemedicínské konzultace.</li>" +
    "<li>Hormonální antikoncepce a hormonální substituční terapie mohou být posouzeny a zahájeny na úrovni praktického lékaře, kde je to klinicky vhodné. Všechna doporučení jsou vydávána výhradně dle odborného uvážení lékaře po úplném posouzení.</li>" +
    "</ul>",

  "<h2>8. Služby cestovní medicíny</h2>",
  "<p>Platí následující omezení rozsahu specifická pro konzultace cestovní medicíny:</p>",
  "<ul>" +
    "<li>Tato služba poskytuje klinické hodnocení cestovního zdraví a individuální plánování očkování — nezahrnuje fyzické podávání vakcín.</li>" +
    "<li>Očkování proti žluté zimnici a Mezinárodní osvědčení o očkování musí být podáno a vydáno osobně v očkovacím centru autorizovaném příslušnou Krajskou hygienickou stanicí (KHS). Tuto službu nelze zajistit prostřednictvím telemedicínské konzultace.</li>" +
    "<li>Doporučení pro cestovní zdraví jsou specifická pro destinaci a mohou se měnit — pacienti by měli potvrdit aktuální vstupní požadavky u velvyslanectví nebo konzulátu země určení před cestou.</li>" +
    "</ul>",

  "<h2>9. Služby konzultace vlasů a kůže</h2>",
  "<p>Platí následující omezení rozsahu specifická pro konzultace vypadávání vlasů a kožní konzultace:</p>",
  "<ul>" +
    "<li>Kožní hodnocení prostřednictvím videohovoru má inherentní omezení. Stavy vyžadující dermatoskopii, biopsii, epikutánní testy nebo osobní odborné vyšetření nelze plně posoudit na dálku.</li>" +
    "<li>Izotretinoin musí být v České republice předepsán dermatologem dle příbalového letáku přípravku a nelze ho zahájit prostřednictvím této služby.</li>" +
    "<li>Výsledky léčby vypadávání vlasů se u jednotlivců liší a nelze je zaručit.</li>" +
    "</ul>",

  "<h2>10. Doporučení a soukromá diagnostická vyšetření</h2>",
  "<p>Platí následující podmínky specifické pro doporučovací a vyšetřovací služby:</p>",
  "<ul>" +
    "<li>Tato služba poskytuje soukromé doporučující dopisy a soukromé žádanky na vyšetření — neposkytuje doporučení v rámci veřejného zdravotního systému, která vyžadují registrovaného praktického lékaře v českém veřejném systému.</li>" +
    "<li>Global Health nezaručuje specialistické termíny, dostupnost laboratoří ani dostupnost zobrazovacích metod.</li>" +
    "<li>Klinická dokumentace je vydávána výhradně dle odborného uvážení lékaře po úplném posouzení.</li>" +
    "</ul>",

  "<h2>11. Regulační registrace a ověření</h2>",
  "<p>Platné jsou následující regulační registrace pro služby Global Health v České republice:</p>",
  "<ul>" +
    '<li>Lékaři — registrováni v České lékařské komoře (ČLK). Čísla registrace jsou uvedena ve všech profilech lékařů. Ověřit na <a href="https://clk.cz">clk.cz</a>.</li>' +
    '<li>Lékaři specialisté — registrováni v příslušném Kolegiu specialistů ČLK. Ověřit na <a href="https://clk.cz">clk.cz</a>.</li>' +
    '<li>Recepty — vydávány v souladu se zákonem č. 378/2007 Sb. o léčivech a předpisy SÚKL. Ověřit na <a href="https://sukl.gov.cz">sukl.gov.cz</a>.</li>' +
    "<li>Telemedicína — regulována zákonem č. 372/2011 Sb. o zdravotních službách ve znění pozdějších předpisů a vyhláškou č. 30/2025 Sb. o telemedicínských zdravotních službách.</li>" +
    "<li>Ochrana dětí — v souladu se zákonem č. 359/1999 Sb. o sociálně-právní ochraně dětí.</li>" +
    '<li>Ochrana údajů — pod dohledem Úřadu pro ochranu osobních údajů (ÚOOÚ). Ověřit na <a href="https://uoou.gov.cz">uoou.gov.cz</a>.</li>' +
    "</ul>",
  "<p>Právní entita provozující služby Global Health v České republice je Global Guest s.r.o. (IČO: 19071680), registrovaná v České republice, provozující služby telemedicíny v souladu se zákonem č. 372/2011 Sb. a příslušnými předpisy, a dále v Irsku, Portugalsku, Španělsku, Rumunsku a Brazílii.</p>",

  "<h2>12. Ochrana osobních údajů a důvěrnost</h2>",
  "<p>Všechny údaje pacientů shromažďované prostřednictvím této platformy jsou zpracovávány v souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb. o zpracování osobních údajů.</p>",
  "<p>Všechny konzultace jsou realizovány prostřednictvím videohovoru se šifrováním end-to-end. Klinické záznamy jsou bezpečně uloženy v souladu s českými požadavky na vedení zdravotnické dokumentace.</p>",
  "<p>Informace o pacientovi nejsou sdíleny s třetími stranami bez výslovného souhlasu pacienta, s výjimkou případů vyžadovaných zákonem — včetně povinnosti ochrany dětí, požadavků povinného hlášení nebo kdy vážné riziko pro život nebo bezpečnost třetích osob vyžaduje zpřístupnění.</p>",
  '<p>Pacient má právo na přístup, opravu a žádost o výmaz svých osobních údajů, s výhradou platných právních a profesních povinností vedení záznamů. Žádosti subjektu údajů lze směrovat na <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a>.</p>',
  '<p>Náš Pověřenec pro ochranu osobních údajů (DPO) je Dr. Ahmed Maklad, kontaktovatelný na <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a>.</p>',
  "<p>Global Health je registrován u Úřadu pro ochranu osobních údajů (ÚOOÚ). Naše úplné Zásady ochrany osobních údajů jsou dostupné na myglobalhealth.online/privacy.</p>",

  "<h2>13. Omezení odpovědnosti</h2>",
  "<p>Global Health a jeho klinickí pracovníci vynakládají veškerou přiměřenou péči a odbornou způsobilost při poskytování klinických služeb prostřednictvím této platformy. Platí následující omezení odpovědnosti:</p>",
  "<ul>" +
    "<li>Global Health a jeho klinickí pracovníci nejsou odpovědní za klinické výsledky vyplývající z inherentních omezení hodnocení na dálku, když tato omezení byla jasně sdělena a profesionál vykonával přiměřenou péči a odbornou způsobilost.</li>" +
    "<li>Global Health není odpovědný za výsledky vyplývající z opomenutí pacienta poskytnout relevantní klinické informace — zdravotní anamnézu, aktuální medikaci nebo jiné klinicky významné informace — během konzultace.</li>" +
    "<li>Global Health není odpovědný za výsledky vyplývající z nedodržení klinického poradenství nebo bezpečnostních pokynů ze strany pacienta.</li>" +
    "</ul>",
  "<p>Nic v tomto prohlášení neomezuje ani nevylučuje odpovědnost za smrt nebo osobní újmu vyplývající z nedbalosti, podvodu nebo jakékoliv jiné odpovědnosti, která nemůže být omezena nebo vyloučena dle českého práva.</p>",

  "<h2>14. Stížnosti</h2>",
  "<p>Global Health se zavazuje poskytovat bezpečnou a vysoce kvalitní klinickou péči. Pokud máte stížnost ohledně jakéhokoliv aspektu obdržené služby, kontaktujte nás v první instanci:</p>",
  '<p>Email: <a href="mailto:stiznosti@myglobalhealth.online">stiznosti@myglobalhealth.online</a></p>',
  "<p>Potvrdíme přijetí stížnosti do 5 pracovních dnů a poskytneme úplnou písemnou odpověď do 30 pracovních dnů.</p>",
  "<p>Pokud nejste spokojeni s naší odpovědí, můžete směrovat záležitost na:</p>",
  "<ul>" +
    '<li>Česká lékařská komora (ČLK) — pro stížnosti ohledně profesního chování registrovaného lékaře: <a href="https://clk.cz">clk.cz</a></li>' +
    '<li>SÚKL — Státní ústav pro kontrolu léčiv — pro stížnosti ohledně předepisování: <a href="https://sukl.gov.cz">sukl.gov.cz</a></li>' +
    '<li>Úřad pro ochranu osobních údajů (ÚOOÚ) — pro stížnosti ohledně ochrany osobních údajů: <a href="https://uoou.gov.cz">uoou.gov.cz</a></li>' +
    "</ul>",

  "<h2>15. Kontaktní informace pro emergence — Česká republika</h2>",
  '<p><strong>Zdravotní emergence:</strong> volejte <a href="tel:155">155</a> (záchranná služba) nebo <a href="tel:112">112</a>, nebo se dostavte na nejbližší pohotovost.</p>',
  "<p>Krize duševního zdraví:</p>",
  "<ul>" +
    '<li>Linka první psychické pomoci — <a href="tel:116123">116 123</a> (zdarma, 24/7)</li>' +
    '<li>Centrum krizové intervence — <a href="tel:284016666">284 016 666</a> (Praha, 24/7)</li>' +
    "</ul>",
  '<p>Ochrana dětí — pokud je dítě v bezprostředním nebezpečí: volejte <a href="tel:112">112</a>. OSPOD — Orgán sociálně-právní ochrany dětí vaší spádové oblasti.</p>',
  '<p>Toxikologické informace / otravy: Toxikologické informační středisko — <a href="tel:224919293">224 919 293</a> (24/7).</p>',
  '<p>Toto prohlášení je pravidelně přezkoumáváno a aktualizováno. Verze prezentovaná na platformě v době konzultace je platnou verzí. Pro dotazy ohledně tohoto prohlášení nás kontaktujte na <a href="mailto:info@myglobalhealth.online">info@myglobalhealth.online</a>.</p>',
  "<p><em>Global Health Česká republika | myglobalhealth.online | Global Guest s.r.o. (IČO: 19071680) | © 2026</em></p>",
].join("");

const DISCLAIMER_HTML_EN = [
  "<p>This Medical Disclaimer governs all clinical services provided through the Global Health platform in the Czech Republic, accessible at myglobalhealth.online. By booking a consultation or using any clinical service through this platform, the user acknowledges that they have read, understood, and accept the terms set out in this document.</p>",
  "<p>This disclaimer applies to all services provided in the Czech Republic, including general medicine consultations, specialist consultations, and allied health professional consultations. Separate disclaimers apply to services provided in other markets — Ireland, Portugal, Spain, Romania, and Brazil — available on the respective country pages of this platform.</p>",
  "<p><em>Last updated: July 2026</em></p>",

  "<h2>⚠ Medical Emergency — Read First</h2>",
  "<p><strong>Video consultations are not suitable for medical emergencies.</strong></p>",
  "<p>If you or someone near you is experiencing a medical emergency — including chest pain, difficulty breathing, symptoms of stroke, loss of consciousness, severe allergic reaction, or any other life-threatening condition — do not book an online consultation.</p>",
  '<p><strong>Call <a href="tel:155">155</a> (ambulance) or <a href="tel:112">112</a> immediately, or attend your nearest emergency department.</strong></p>',
  "<p>Mental health crisis lines:</p>",
  "<ul>" +
    '<li>Linka první psychické pomoci (First Psychological Aid Line) — <a href="tel:116123">116 123</a> (free, 24/7)</li>' +
    '<li>Crisis Intervention Centre — <a href="tel:284016666">284 016 666</a> (Prague, 24/7)</li>' +
    "</ul>",

  "<h2>1. General Declaration — All Services</h2>",
  "<p>All clinical services provided through Global Health in the Czech Republic are conducted in compliance with Czech telemedicine and medical practice standards, by doctors and health professionals registered with the relevant regulatory body.</p>",
  "<p>Clinical assessments conducted through this platform are remote assessments. They are conducted to the same professional standards as in-person care, but have inherent limitations — physical examination, certain diagnostic procedures, and emergency interventions cannot be provided remotely. The clinical professional clearly informs the user if their presentation requires in-person assessment.</p>",
  "<p>All clinical recommendations, specialist referrals, eRecepty (electronic prescriptions), and documentation are issued solely at the professional discretion of the doctor or health professional following full assessment. No clinical outcome — including the issuance of an eRecept, referral, sick leave certification, or any other clinical documentation — can be confirmed or guaranteed in advance.</p>",

  "<h2>2. General Medical Services</h2>",
  "<p>General medical services provided through Global Health in the Czech Republic are conducted in compliance with Czech telemedicine and medical practice standards.</p>",
  '<p>All doctors providing general medical services through this platform are registered with the Czech Medical Chamber (ČLK). Registration numbers are displayed on every doctor profile and can be verified at <a href="https://clk.cz">clk.cz</a>.</p>',
  "<p>Applicable to all general medical services:</p>",
  "<ul>" +
    "<li>Physical examination cannot be conducted remotely. The doctor conducts the assessment based on medical history and visual observation during the video call. When physical examination is clinically necessary, the doctor advises on appropriate in-person assessment.</li>" +
    "<li>Certain supplementary investigations — including blood tests, imaging, and ECG — require an in-person visit. The doctor may assess the necessity of these investigations and coordinate the relevant requests.</li>" +
    "<li>Our doctors do not routinely prescribe controlled substances through video consultations.</li>" +
    "</ul>",
  "<p>Clinical decisions — including the issuance of an eRecept, referral, sick leave certification, and other clinical documentation — are made solely at the doctor's professional discretion following full assessment.</p>",

  "<h2>3. eRecept and Sick Leave</h2>",
  "<p>Electronic prescriptions (eRecept) are issued in accordance with Act No. 378/2007 Coll. on Pharmaceuticals and relevant SÚKL regulations. The eRecept is issued as an electronic code, which the patient receives and presents at any pharmacy of their choice in the Czech Republic.</p>",
  "<p>Electronic sick leave certification (eNeschopenka) is issued in accordance with Act No. 187/2006 Coll. on Sickness Insurance. The patient's Czech birth number (rodné číslo) is required, and the patient must be registered in the ČSSZ system.</p>",
  "<p>Entitlement to sickness benefit depends on the type of employment — HPP (standard employment contract), DPČ above CZK 4,500/month, DPP above CZK 12,000/month (2026 thresholds), or self-employed (OSVČ) with voluntary sickness insurance. The doctor will advise on entitlement for the patient's specific situation.</p>",
  "<p>Retroactive sick leave certification is not routinely issued. Doctors cannot clinically certify a period of illness they did not assess at the time. The decision to issue an eNeschopenka is always a clinical decision made by the doctor following full assessment.</p>",

  "<h2>4. Specialist Medical Services</h2>",
  '<p>Specialist consultations provided through this platform are conducted by doctors registered with the relevant specialist college of the Czech Medical Chamber. Registration numbers are displayed on every specialist profile and can be verified at <a href="https://clk.cz">clk.cz</a>.</p>',
  "<p>Additional scope limitations apply to specialist services:</p>",
  "<ul>" +
    "<li>Full specialist physical examination — including cardiac auscultation, complete neurological examination, and complete paediatric assessment — cannot be conducted remotely.</li>" +
    "<li>Isotretinoin must be prescribed by a dermatologist in the Czech Republic as specified in the product authorisation and cannot be initiated through this service.</li>" +
    "<li>Involuntary psychiatric assessment or treatment under Act No. 372/2011 Coll. cannot be conducted through a remote consultation.</li>" +
    "<li>Oncology consultations provided through this platform include second opinion and support — they do not include administration of chemotherapy or other systemic therapies, which require in-person administration at a specialised unit.</li>" +
    "</ul>",

  "<h2>5. Paediatric Services and Child Protection</h2>",
  "<p>The following conditions apply specifically to all paediatric consultations provided through this platform:</p>",
  "<ul>" +
    "<li>All paediatric consultations for patients under 16 require the presence of a parent or guardian throughout the consultation and their informed consent, in accordance with Act No. 89/2012 Coll. (Civil Code) and Act No. 359/1999 Coll. on Social and Legal Protection of Children.</li>" +
    "<li>For adolescent patients aged 16 and over, the doctor individually assesses capacity to consent in accordance with Czech medical and legal standards.</li>" +
    "<li>Our clinical professionals are bound by Act No. 359/1999 Coll. on Social and Legal Protection of Children. Where a consultation raises child protection concerns, the clinical professional is legally and professionally obliged to act in accordance with this legislation, which may involve the relevant OSPOD (Social and Legal Protection of Children authority). This obligation takes precedence over confidentiality.</li>" +
    "<li>Fever in infants under 3 months of age is a medical emergency requiring immediate in-person assessment. Do not book a video consultation for this presentation — call 155 or 112 and attend your nearest emergency department.</li>" +
    "</ul>",

  "<h2>6. Mental Health Services</h2>",
  "<p>Mental health consultations are provided at GP level by doctors registered with the ČLK. The following scope limitations apply:</p>",
  "<ul>" +
    "<li>This service provides GP-level mental health assessment — it is not a crisis intervention service, counselling or psychotherapy service, or psychiatric service.</li>" +
    "<li>Involuntary psychiatric assessment or treatment under applicable Czech law cannot be initiated through this service. Where involuntary assessment may be necessary, the clinical professional refers immediately to the appropriate in-person service.</li>" +
    "<li>Confidentiality is maintained in accordance with ČLK professional standards and GDPR regulations. In limited circumstances — when there is serious and immediate risk to life — confidentiality obligations may need to be carefully considered. The clinical professional discusses confidentiality at the outset of the first consultation.</li>" +
    "</ul>",
  "<p><strong>Mental health crisis lines — Czech Republic.</strong> If you are in crisis or having thoughts of suicide or self-harm:</p>",
  "<ul>" +
    '<li>Linka první psychické pomoci — <a href="tel:116123">116 123</a> (free, 24/7)</li>' +
    '<li>Crisis Intervention Centre — <a href="tel:284016666">284 016 666</a> (Prague, 24/7)</li>' +
    '<li>Emergency services — <a href="tel:112">112</a></li>' +
    "</ul>",

  "<h2>7. Women's Health Services</h2>",
  "<p>The following scope limitations apply specifically to women's health consultations provided through this platform:</p>",
  "<ul>" +
    "<li>Termination of pregnancy in the Czech Republic requires in-person attendance at a licensed facility under Act No. 66/1986 Coll. This cannot be arranged through a telemedicine consultation.</li>" +
    "<li>Hormonal contraception and hormone replacement therapy may be assessed and initiated at GP level where clinically appropriate. All recommendations are issued solely at the doctor's professional discretion following full assessment.</li>" +
    "</ul>",

  "<h2>8. Travel Health Services</h2>",
  "<p>The following scope limitations apply specifically to travel medicine consultations:</p>",
  "<ul>" +
    "<li>This service provides clinical travel health assessment and personalised vaccination planning — it does not include physical vaccine administration.</li>" +
    "<li>Yellow fever vaccination and the International Certificate of Vaccination must be administered and issued in person at a vaccination centre authorised by the relevant Regional Public Health Authority (Krajská hygienická stanice, KHS). This cannot be arranged through a telemedicine consultation.</li>" +
    "<li>Travel health guidance is destination-specific and may change — patients should confirm current entry requirements with the embassy or consulate of their destination country before travelling.</li>" +
    "</ul>",

  "<h2>9. Hair Loss and Skin Consultation Services</h2>",
  "<p>The following scope limitations apply specifically to hair loss and skin consultations:</p>",
  "<ul>" +
    "<li>Skin assessment through video has inherent limitations. Conditions requiring dermoscopy, biopsy, patch testing, or in-person specialist examination cannot be fully assessed remotely.</li>" +
    "<li>Isotretinoin must be prescribed by a dermatologist in the Czech Republic as specified in the product authorisation and cannot be initiated through this service.</li>" +
    "<li>Hair loss treatment outcomes vary between individuals and cannot be guaranteed.</li>" +
    "</ul>",

  "<h2>10. Referrals and Private Diagnostic Investigations</h2>",
  "<p>The following conditions apply specifically to referral and investigation services:</p>",
  "<ul>" +
    "<li>This service provides private referral letters and private investigation requests — it does not provide public-system specialist referrals, which require a registered Czech GP.</li>" +
    "<li>Global Health does not guarantee specialist appointments, laboratory availability, or imaging availability.</li>" +
    "<li>Clinical documentation is issued solely at the doctor's professional discretion following full assessment.</li>" +
    "</ul>",

  "<h2>11. Regulatory Registration and Verification</h2>",
  "<p>The following regulatory registrations apply to Global Health services in the Czech Republic:</p>",
  "<ul>" +
    '<li>Doctors — registered with the Czech Medical Chamber (ČLK). Registration numbers displayed on all doctor profiles. Verify at <a href="https://clk.cz">clk.cz</a>.</li>' +
    '<li>Specialist doctors — registered with the relevant specialist college of the ČLK. Verify at <a href="https://clk.cz">clk.cz</a>.</li>' +
    '<li>Prescriptions — issued in accordance with Act No. 378/2007 Coll. on Pharmaceuticals and SÚKL regulations. Verify at <a href="https://sukl.gov.cz">sukl.gov.cz</a>.</li>' +
    "<li>Telemedicine — regulated under Act No. 372/2011 Coll. on Health Services as amended and Decree No. 30/2025 Coll. on telemedicine health services.</li>" +
    "<li>Child protection — in accordance with Act No. 359/1999 Coll. on Social and Legal Protection of Children.</li>" +
    '<li>Data protection — supervised by the Office for Personal Data Protection (ÚOOÚ). Verify at <a href="https://uoou.gov.cz">uoou.gov.cz</a>.</li>' +
    "</ul>",
  "<p>The legal entity operating Global Health services in the Czech Republic is Global Guest s.r.o. (IČO: 19071680), registered in the Czech Republic, operating telemedicine services in accordance with Act No. 372/2011 Coll. and applicable regulations, and also in Ireland, Portugal, Spain, Romania, and Brazil.</p>",

  "<h2>12. Data Protection and Confidentiality</h2>",
  "<p>All patient data collected through this platform is processed in accordance with Regulation (EU) 2016/679 (GDPR) and Act No. 110/2019 Coll. on Personal Data Processing.</p>",
  "<p>All consultations are conducted by end-to-end encrypted video call. Clinical records are stored securely in accordance with Czech medical records requirements.</p>",
  "<p>Patient information is not shared with third parties without explicit patient consent, except where required by law — including child protection obligations, mandatory reporting requirements, or when serious risk to the life or safety of others requires disclosure.</p>",
  '<p>The patient has the right to access, rectify, and request erasure of their personal data, subject to applicable legal and professional record-keeping obligations. Data subject requests may be directed to <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a>.</p>',
  '<p>Our Data Protection Officer (DPO) is Dr. Ahmed Maklad, contactable at <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a>.</p>',
  "<p>Global Health is registered with the Office for Personal Data Protection (ÚOOÚ). Our full Privacy Policy is available at myglobalhealth.online/privacy.</p>",

  "<h2>13. Limitation of Liability</h2>",
  "<p>Global Health and its clinical professionals exercise all reasonable care and professional competence in providing clinical services through this platform. The following limitations of liability apply:</p>",
  "<ul>" +
    "<li>Global Health and its clinical professionals are not liable for clinical outcomes arising from the inherent limitations of remote assessment, where those limitations were clearly communicated and the professional exercised reasonable care and competence.</li>" +
    "<li>Global Health is not liable for outcomes arising from the patient's omission of relevant clinical information — medical history, current medication, or other clinically significant information — during a consultation.</li>" +
    "<li>Global Health is not liable for outcomes arising from the patient's failure to follow clinical advice or safety instructions.</li>" +
    "</ul>",
  "<p>Nothing in this disclaimer limits or excludes liability for death or personal injury arising from negligence, fraud, or any other liability that cannot be limited or excluded under Czech law.</p>",

  "<h2>14. Complaints</h2>",
  "<p>Global Health is committed to providing safe and high-quality clinical care. If you have a complaint about any aspect of the service received, contact us in the first instance:</p>",
  '<p>Email: <a href="mailto:complaints@myglobalhealth.online">complaints@myglobalhealth.online</a></p>',
  "<p>We confirm receipt of complaints within 5 working days and provide a full written response within 30 working days.</p>",
  "<p>If you are not satisfied with our response, you may direct the matter to:</p>",
  "<ul>" +
    '<li>Czech Medical Chamber (ČLK) — for complaints about the professional conduct of a registered doctor: <a href="https://clk.cz">clk.cz</a></li>' +
    '<li>SÚKL — State Institute for Drug Control — for complaints about prescribing: <a href="https://sukl.gov.cz">sukl.gov.cz</a></li>' +
    '<li>Office for Personal Data Protection (ÚOOÚ) — for data protection complaints: <a href="https://uoou.gov.cz">uoou.gov.cz</a></li>' +
    "</ul>",

  "<h2>15. Emergency Contact Information — Czech Republic</h2>",
  '<p><strong>Medical emergency:</strong> call <a href="tel:155">155</a> (ambulance) or <a href="tel:112">112</a>, or attend your nearest emergency department.</p>',
  "<p>Mental health crisis:</p>",
  "<ul>" +
    '<li>Linka první psychické pomoci — <a href="tel:116123">116 123</a> (free, 24/7)</li>' +
    '<li>Crisis Intervention Centre — <a href="tel:284016666">284 016 666</a> (Prague, 24/7)</li>' +
    "</ul>",
  '<p>Child protection — if a child is in immediate danger: call <a href="tel:112">112</a>. OSPOD — the Social and Legal Protection of Children authority for your area.</p>',
  '<p>Poison control: Toxicological Information Centre — <a href="tel:224919293">224 919 293</a> (24/7).</p>',
  '<p>This disclaimer is reviewed and updated periodically. The version presented on the platform at the time of consultation is the applicable version. For questions about this disclaimer, contact us at <a href="mailto:info@myglobalhealth.online">info@myglobalhealth.online</a>.</p>',
  "<p><em>Global Health Czech Republic | myglobalhealth.online | Global Guest s.r.o. (IČO: 19071680) | © 2026</em></p>",
].join("");

// Condensed copies for CountryLegalProfile.shortDisclaimer/fullDisclaimer — mirrors
// the compact paragraph style already used for ie/pt/es/ro/br in
// seed-country-disclaimers.ts. CZ's defaultLocale is CS, so the base columns hold
// Czech; the EN translation row is the CountryDisclaimerTranslation override.
const PROFILE_FULL_CS = [
  "Všechny klinické služby poskytované prostřednictvím Global Health v České republice jsou realizovány v souladu se zákonem č. 372/2011 Sb. o zdravotních službách a vyhláškou č. 30/2025 Sb. o telemedicínských zdravotních službách, lékaři a zdravotními pracovníky registrovanými v České lékařské komoře (ČLK).",
  "Naši online lékaři provádějí klinická hodnocení na dálku a mohou poskytnout doporučení k léčbě, eRecepty, doporučení ke specialistům nebo lékařskou dokumentaci pouze tehdy, je-li to klinicky vhodné, a výhradně na základě odborného uvážení lékaře. Naši lékaři standardně nepředepisují kontrolované látky prostřednictvím videokonzultací.",
  "Elektronické recepty (eRecept) jsou vydávány v souladu se zákonem č. 378/2007 Sb. o léčivech a předpisy SÚKL. Elektronická neschopenka (eNeschopenka) je vydávána v souladu se zákonem č. 187/2006 Sb. o nemocenském pojištění a vyžaduje rodné číslo pacienta evidovaného v systému ČSSZ; k jejímu vystavení je vždy nutné osobní klinické posouzení ošetřujícím lékařem — nelze ji vystavit pouze na žádost.",
  "Zpětné atestace pracovní neschopnosti nejsou standardně vydávány, jelikož lékaři nemohou klinicky certifikovat období nemoci, které klinicky neposoudili v době nemoci.",
  "Všechny pediatrické konzultace pro pacienty mladší 16 let vyžadují přítomnost rodiče nebo zákonného zástupce a jejich informovaný souhlas. Naši klinickí pracovníci jsou vázáni zákonem č. 359/1999 Sb. o sociálně-právní ochraně dětí; pokud konzultace vzbudí obavy o ochranu dítěte, může být zapojen příslušný orgán sociálně-právní ochrany dětí (OSPOD).",
  "Veškeré údaje pacientů jsou zpracovávány v souladu s Nařízením (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb. o zpracování osobních údajů, pod dohledem Úřadu pro ochranu osobních údajů (ÚOOÚ).",
  "Online konzultace nejsou vhodné pro zdravotní emergence. V případě ohrožení života volejte 155 (záchranná služba) nebo 112 okamžitě. Krizová linka duševního zdraví: Linka první psychické pomoci 116 123 (zdarma, 24/7).",
].join("\n\n");

const PROFILE_SHORT_CS = [
  "Všechny služby v České republice jsou poskytovány na úrovni praktického lékaře lékaři registrovanými v České lékařské komoře (ČLK), v souladu se zákonem č. 372/2011 Sb. a vyhláškou č. 30/2025 Sb. o telemedicíně.",
  "eRecepty, doporučení ke specialistům a lékařská dokumentace jsou vydávány pouze tehdy, je-li to klinicky vhodné, a výhradně na základě odborného uvážení lékaře. Naši lékaři standardně nepředepisují kontrolované látky prostřednictvím videokonzultací.",
  "Elektronická neschopenka (eNeschopenka) uznávaná ČSSZ může být vystavena pouze ošetřujícím lékařem, který pacienta vyšetřil, nikoli pouze na žádost. Zpětné atestace nejsou standardně vydávány.",
].join("\n\n");

const PROFILE_FULL_EN = [
  "All clinical services provided through Global Health in the Czech Republic are conducted in compliance with Act No. 372/2011 Coll. on Health Services and Decree No. 30/2025 Coll. on telemedicine health services, by doctors and health professionals registered with the Czech Medical Chamber (ČLK).",
  "Our online doctors conduct remote clinical assessments and may provide treatment recommendations, eRecepty (electronic prescriptions), specialist referrals, or medical documentation only when clinically appropriate and solely at the doctor's professional discretion. Our doctors do not routinely prescribe controlled substances through video consultations.",
  "Electronic prescriptions (eRecept) are issued in accordance with Act No. 378/2007 Coll. on Pharmaceuticals and SÚKL regulations. Electronic sick leave certification (eNeschopenka) is issued in accordance with Act No. 187/2006 Coll. on Sickness Insurance and requires the patient's Czech birth number and registration in the ČSSZ system; issuing it always requires a genuine clinical assessment by the attending physician — it cannot be issued on request alone.",
  "Retroactive sick leave certification is not routinely issued, as doctors cannot clinically certify a period of illness they did not assess at the time.",
  "All paediatric consultations for patients under 16 require the presence of a parent or guardian and their informed consent. Our clinical professionals are bound by Act No. 359/1999 Coll. on Social and Legal Protection of Children; where a consultation raises child protection concerns, the relevant OSPOD authority may be involved.",
  "All patient data is processed in accordance with Regulation (EU) 2016/679 (GDPR) and Act No. 110/2019 Coll. on Personal Data Processing, supervised by the Office for Personal Data Protection (ÚOOÚ).",
  "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 155 (ambulance) or 112 immediately. Mental health crisis line: Linka první psychické pomoci 116 123 (free, 24/7).",
].join("\n\n");

const PROFILE_SHORT_EN = [
  "All services in the Czech Republic are provided at GP level by doctors registered with the Czech Medical Chamber (ČLK), in accordance with Act No. 372/2011 Coll. and Decree No. 30/2025 Coll. on telemedicine.",
  "eRecepty, specialist referrals, and medical documentation are issued only when clinically appropriate and solely at the doctor's professional discretion. Our doctors do not routinely prescribe controlled substances through video consultations.",
  "An eNeschopenka (electronic sick note) recognised by the ČSSZ may only be issued by the attending physician who has examined the patient, not on request alone. Retroactive certificates are not routinely issued.",
].join("\n\n");

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  console.log(`DISCLAIMER  /czech-republic/cs/legal/medical-disclaimer  "${TITLE_CS}"  (${DISCLAIMER_HTML_CS.length} chars)`);
  console.log(`DISCLAIMER  /czech-republic/en/legal/medical-disclaimer  "${TITLE_EN}"  (${DISCLAIMER_HTML_EN.length} chars)`);
  console.log(`PROFILE     shortDisclaimer(cs)=${PROFILE_SHORT_CS.length} fullDisclaimer(cs)=${PROFILE_FULL_CS.length}`);
  console.log(`PROFILE     shortDisclaimer(en)=${PROFILE_SHORT_EN.length} fullDisclaimer(en)=${PROFILE_FULL_EN.length}`);

  if (!APPLY) {
    console.log("\nDRY-RUN (no writes). Pass --apply.");
    await prisma.$disconnect();
    return;
  }

  await prisma.countryLegalDocument.upsert({
    where: { countryId_type_locale: { countryId: country.id, type: LegalDocumentType.MEDICAL_DISCLAIMER, locale: "cs" } },
    create: { countryId: country.id, type: LegalDocumentType.MEDICAL_DISCLAIMER, title: TITLE_CS, content: DISCLAIMER_HTML_CS, isPublished: true, publishedAt: new Date(), locale: "cs" },
    update: { title: TITLE_CS, content: DISCLAIMER_HTML_CS, isPublished: true, publishedAt: new Date(), version: { increment: 1 } },
  });
  await prisma.countryLegalDocument.upsert({
    where: { countryId_type_locale: { countryId: country.id, type: LegalDocumentType.MEDICAL_DISCLAIMER, locale: "en" } },
    create: { countryId: country.id, type: LegalDocumentType.MEDICAL_DISCLAIMER, title: TITLE_EN, content: DISCLAIMER_HTML_EN, isPublished: true, publishedAt: new Date(), locale: "en" },
    update: { title: TITLE_EN, content: DISCLAIMER_HTML_EN, isPublished: true, publishedAt: new Date(), version: { increment: 1 } },
  });

  const profile = await prisma.countryLegalProfile.upsert({
    where: { countryId: country.id },
    create: { countryId: country.id, shortDisclaimer: PROFILE_SHORT_CS, fullDisclaimer: PROFILE_FULL_CS },
    update: { shortDisclaimer: PROFILE_SHORT_CS, fullDisclaimer: PROFILE_FULL_CS },
  });
  await prisma.countryDisclaimerTranslation.upsert({
    where: { legalProfileId_locale: { legalProfileId: profile.id, locale: "EN" } },
    create: { legalProfileId: profile.id, locale: "EN", shortDisclaimer: PROFILE_SHORT_EN, fullDisclaimer: PROFILE_FULL_EN },
    update: { shortDisclaimer: PROFILE_SHORT_EN, fullDisclaimer: PROFILE_FULL_EN },
  });

  console.log("\nAPPLIED.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
