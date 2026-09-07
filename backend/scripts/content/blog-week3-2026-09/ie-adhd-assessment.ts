/**
 * Ireland — Week 3 editorial article.
 *
 * Primary keyword: "adhd assessment ireland" — 1,900/mo, KD 0, informational.
 * Secondary: "adult adhd assessment ireland" — 480/mo, KD 0;
 *            "who can diagnose adhd in ireland" — 50/mo, KD 0.
 * Parent: "adhd ireland" 5,400/mo, KD 15.
 * OpenSEO research 2026-09-07 (location 2372, en). SERP: ADHD Ireland
 * charity, private clinics (local pack), one consultant site. No page
 * explains the public-versus-private choice neutrally — that is the angle.
 *
 * Facts anchored to NICE NG87 (NCBI mirror), the BJPsych Bulletin and
 * Irish Journal of Psychological Medicine papers on the HSE National
 * Clinical Programme, ISHA's programme summary and the Irish Examiner
 * report on the Cork/Kerry referral pause, all read 2026-09-07. Private
 * prices are deliberately given as a broad range only. HSE pages were
 * unreachable on the research day and must be re-checked before
 * publication.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const NICE_NG87 = "https://www.ncbi.nlm.nih.gov/books/NBK493361/";
const HSE_PROGRAMME = "https://adult.adhdirl.ie/amp/about-hse-clinical-programme-adhd";
const ISHA_SUMMARY = "https://www.isha.ie/article/new-hse-national-clinical-programme-adhd-adults-27";
const BJPSYCH =
  "https://www.cambridge.org/core/journals/bjpsych-bulletin/article/adult-adhd-in-the-republic-of-ireland-the-evolving-response/B6211EAB48560C5922A31423065C8F49";
const IJPM_PATHWAY =
  "https://www.cambridge.org/core/journals/irish-journal-of-psychological-medicine/article/evaluation-of-the-referral-pathway-to-irish-specialist-adult-attention-deficit-hyperactivity-disorder-services/537B79B14E0276290367E175359B2866";
const EXAMINER_CORK = "https://www.irishexaminer.com/news/arid-41493401.html";
const ADHD_IRELAND = "https://adhdireland.ie/general-information/diagnosis/";

const base = "https://www.myglobalhealth.online/ireland/en";
const links = {
  blog: `${base}/blog`,
  doctors: `${base}/doctors`,
  contact: `${base}/contact`,
  service: `${base}/services/mental-health-consultation`,
  psychiatry: `${base}/services/psychiatry-specialist-consultation`,
  gpGuide: `${base}/blog/when-to-see-a-gp-online-vs-in-person`,
};
const AUTHOR = { initials: "GH", name: "Global Health Medical Team", line: "Global Health" } as const;

const en: LocalePost = {
  locale: "EN",
  slug: "adult-adhd-assessment-ireland-public-private-routes",
  title: "Adult ADHD assessment in Ireland: the public route, the private route and what actually happens in the room",
  excerpt:
    "How an adult gets assessed for ADHD in Ireland, why the HSE pathway goes through your local mental health team first, what a private assessment costs, and what a proper assessment involves.",
  seoTitle: "Adult ADHD assessment in Ireland: routes and cost",
  seoDescription:
    "Public HSE pathway, private assessment costs, who can diagnose ADHD in Ireland and what a NICE-standard adult ADHD assessment involves.",
  category: "Mental Health",
  article: {
    lang: "en-IE",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Mental Health",
    categoryHref: links.blog,
    eyebrow: "Ireland · Adult ADHD guide",
    h1: "Adult ADHD assessment in Ireland: how it works and what it costs",
    deck: "The public route is free and slow. The private route is quick and costs several hundred euro. The assessment itself should look the same either way.",
    intro:
      "An <strong>adult ADHD assessment in Ireland</strong> starts with a GP referral. On the public route the GP refers you to your local adult Community Mental Health Team, which treats any other significant mental illness first and then refers on to a HSE Adult ADHD team, where a psychiatrist trained in ADHD carries out the assessment. Privately, you book a consultant psychiatrist or a psychologist-led clinic directly, at roughly EUR 600 to 1,600. Either way, the diagnosis rests on a structured interview and a developmental history, never on a questionnaire alone.",
    facts: [
      "Public route: GP → Community Mental Health Team → HSE Adult ADHD team",
      "Private route: direct booking, typically EUR 600–1,600 (ADHD Ireland range)",
      "Medication can only be started by a clinician with ADHD training and expertise",
    ],
    primaryCta: { label: "HSE Adult ADHD programme", href: HSE_PROGRAMME },
    secondaryCta: { label: "ADHD Ireland: getting a diagnosis", href: ADHD_IRELAND },
    panelChip: "Before you book anything",
    panelParas: [
      "A free online screener can tell you whether an assessment is worth pursuing. It cannot tell you that you have ADHD.",
      "Ask any private clinic who will see you, whether a consultant psychiatrist signs the report, and whether they offer shared care with your GP for medication.",
      "If you already attend a mental health team, ask them about the ADHD pathway before paying privately.",
    ],
    author: AUTHOR,
    reviewLine: "Clinical and editorial review is required before publication.",
    navLabel: "In this guide",
    sections: [
      {
        id: "public-route",
        nav: "The public route",
        eyebrow: "HSE National Clinical Programme",
        h2: "The HSE route: what the pathway looks like",
        blocks: [
          lead("Ireland has had a National Clinical Programme for ADHD in Adults since 2021. It is free, and it does not yet cover every county."),
          p("The pathway is deliberately indirect. Your GP does not refer you to an ADHD clinic. The referral goes to the adult Community Mental Health Team for your area. That team's job is to check for, and treat, any other significant condition first: depression, anxiety disorders, bipolar disorder, psychosis. Only then does the team refer you onward to the specialist Adult ADHD team, where a consultant psychiatrist with specific ADHD training leads a multidisciplinary assessment."),
          p("That ordering has a clinical reason. Untreated depression or anxiety mimics ADHD. In the pathway evaluation published in 2025 (using 2023 data from three pilot teams), 25% of people referred for ADHD needed treatment for another condition first."),
          ul([
            "<strong>Coverage:</strong> teams exist in named catchments such as Sligo, Leitrim and Donegal; Limerick, Clare and North Tipperary; Dún Laoghaire, south-east Dublin and Wicklow; and Cork. Not every county has one yet.",
            "<strong>Demand:</strong> the same evaluation found the pilot teams receiving three to four times more referrals than they could assess.",
            "<strong>Local pauses happen:</strong> in October 2024 the HSE stopped taking new ADHD referrals in Cork and Kerry. Ask your GP about your area today.",
          ]),
          cite("Sources: <a href=\"" + ISHA_SUMMARY + "\" rel=\"nofollow noopener\" target=\"_blank\">ISHA summary of the HSE programme</a>, <a href=\"" + IJPM_PATHWAY + "\" rel=\"nofollow noopener\" target=\"_blank\">Irish Journal of Psychological Medicine pathway evaluation (2025)</a> and the <a href=\"" + EXAMINER_CORK + "\" rel=\"nofollow noopener\" target=\"_blank\">Irish Examiner, 11 October 2024</a>. Accessed 7 September 2026."),
        ],
      },
      {
        id: "waiting-times",
        nav: "Waiting times",
        eyebrow: "What the evidence shows",
        h2: "How long is the wait?",
        blocks: [
          lead("The HSE does not publish a national waiting-time figure for adult ADHD."),
          p("What is documented: when Cork and Kerry paused referrals in October 2024, the Irish Examiner reported 413 people waiting in Cork city and north Cork and 217 in Kerry and west Cork, with teams staffed at 4.5 posts against the 6 required. Private clinics on the first page of Google for this search advertise waits of a week or two. Before paying for that speed, read the next two sections. A fast assessment your GP will not act on solves nothing."),
        ],
      },
      {
        id: "private-route",
        nav: "Going private",
        eyebrow: "Cost and what to check",
        h2: "Private ADHD assessment in Ireland: cost and questions to ask",
        blocks: [
          lead("ADHD Ireland puts private assessments at EUR 600 to 1,600. Where you land in that range depends mostly on who does the assessing."),
          ul([
            "<strong>Consultant psychiatrist:</strong> can diagnose and prescribe. Usually the upper part of the range, and often the only route that leads smoothly to medication.",
            "<strong>Psychologist-led assessment:</strong> can diagnose, cannot prescribe. If you later want medication, a psychiatrist may need to review or repeat the assessment.",
            "<strong>Multidisciplinary clinic:</strong> a mix of the two, sometimes at a lower price. Check who signs the final report.",
          ]),
          p("Ask three questions before booking. Will a consultant psychiatrist sign the report? If medication is recommended, who prescribes it, and for how long before it is handed to my GP? And has my GP agreed to take over? A clinic that cannot arrange a handover leaves you paying for every repeat review. Keep receipts, and check the current Revenue rules on medical-expense relief yourself rather than relying on a clinic's claim."),
          warn("Watch for", "Assessments completed in a single short video call, or built mainly around a self-report questionnaire, do not meet the NICE standard described below. A diagnosis made that way may not be accepted by the HSE, by your GP or by an employer."),
        ],
      },
      {
        id: "what-happens",
        nav: "What an assessment involves",
        eyebrow: "NICE NG87 standard",
        h2: "What a proper adult ADHD assessment involves",
        blocks: [
          lead("Irish services work to the NICE guideline. It says the diagnosis must be made by a specialist and must not rest on rating scales alone."),
          p("Expect a long appointment, or two. The clinician takes a full psychiatric and developmental history back to childhood, because symptoms must have been present early, and will want an informant where possible: a parent, partner or old school reports. They check impairment in more than one setting. Structured interviews such as the DIVA and rating scales are used inside that process; NICE says the diagnosis must not rest on rating scales alone. The free ASRS questionnaire you may have done was designed by a WHO work group as a screener, so a positive result is a reason to seek assessment, nothing more."),
          cite("<a href=\"" + NICE_NG87 + "\" rel=\"nofollow noopener\" target=\"_blank\">NICE NG87, recommendations 1.3.1 and 1.7.1</a>; <a href=\"" + BJPSYCH + "\" rel=\"nofollow noopener\" target=\"_blank\">BJPsych Bulletin, Adult ADHD in the Republic of Ireland</a>."),
        ],
      },
      {
        id: "medication",
        nav: "Medication and your GP",
        eyebrow: "Who prescribes",
        h2: "Medication: who can start it and who continues it",
        blocks: [
          lead("Under NICE, ADHD medication is only started by a professional with training and expertise in diagnosing and managing ADHD. In the HSE programme that is the consultant-led ADHD team."),
          p("The HSE model of care then hands prescribing and physical monitoring back to the GP or local mental health team, with annual recall to the ADHD clinic. A GP also helps before any of this: ruling out sleep problems, thyroid disease or anaemia, treating low mood, and writing the referral letter. A <a href=\"" + links.service + "\">mental health consultation</a> with a Global Health GP can cover that first conversation, and a <a href=\"" + links.psychiatry + "\">psychiatry consultation</a> is available where a specialist opinion is needed. Neither replaces a specialist ADHD assessment, and a single consultation cannot produce an ADHD diagnosis or a stimulant prescription."),
        ],
      },
    ],
    linksEyebrow: "Global Health Ireland",
    linksH2: "Where to start",
    linksLead: "A GP can rule out look-alike conditions and refer you. The assessment itself is specialist work.",
    links: [
      { label: "Mental health consultation", href: links.service },
      { label: "Psychiatry specialist consultation", href: links.psychiatry },
      { label: "When to see a GP online vs in person", href: links.gpGuide },
      { label: "Doctors in Ireland", href: links.doctors },
      { label: "Contact Global Health", href: links.contact },
    ],
    ctaBox: {
      h3: "Want to talk it through with a GP first?",
      text: "A GP consultation can assess your symptoms, check for other causes and prepare a referral. It is not an ADHD diagnosis.",
      primary: { label: "Book a mental health consultation", href: links.service },
      secondary: { label: "View doctors", href: links.doctors },
    },
    sourcesEyebrow: "Sources",
    sourcesH2: "Sources for this guide",
    sourcesLead: "Clinical standards from NICE; Irish service facts from peer-reviewed evaluations and the HSE programme. All checked 7 September 2026.",
    sources: [
      { label: "NICE NG87 — ADHD: diagnosis and management", href: NICE_NG87 },
      { label: "HSE National Clinical Programme for ADHD in Adults", href: HSE_PROGRAMME },
      { label: "ISHA — summary of the HSE adult ADHD programme", href: ISHA_SUMMARY },
      { label: "BJPsych Bulletin — Adult ADHD in the Republic of Ireland", href: BJPSYCH },
      { label: "Irish Journal of Psychological Medicine — referral pathway evaluation", href: IJPM_PATHWAY },
      { label: "Irish Examiner — Cork and Kerry referral pause, October 2024", href: EXAMINER_CORK },
      { label: "ADHD Ireland — Diagnosis", href: ADHD_IRELAND },
    ],
    sourcesNote: "Service coverage and waiting positions change. Confirm the current situation with your GP or local mental health team.",
    faqEyebrow: "Frequently asked questions",
    faqH2: "Adult ADHD assessment in Ireland",
    faqs: [
      { q: "Can a GP diagnose ADHD in Ireland?", a: "No. A GP assesses, excludes other causes and refers, and may continue prescribing after a specialist stabilises treatment. The diagnosis is made by a psychiatrist or, privately, a psychologist." },
      { q: "Is a psychologist's ADHD diagnosis enough to get medication?", a: "Not on its own. Only a doctor can prescribe, and a psychiatrist will usually want to review or repeat the assessment before starting medication." },
      { q: "How much does a private ADHD assessment cost in Ireland?", a: "ADHD Ireland gives a range of about EUR 600 to 1,600. Consultant-psychiatrist assessments sit towards the top; psychologist-led ones lower. Ask what is included and who signs the report." },
      { q: "Does a positive ASRS score mean I have ADHD?", a: "No. The ASRS is a screening tool. A positive score is a reason to seek an assessment, not a diagnosis." },
    ],
    disclaimerTitle: "Medical information",
    disclaimer:
      "AI-assisted article pending clinical and editorial review. General information as of September 2026, not a diagnosis, a referral decision or a guarantee of assessment, medication or HSE service availability.",
  } satisfies Article,
};

export const IE_ADHD_ASSESSMENT: PostSet = {
  key: "ie-adhd-assessment",
  countryCode: "ie",
  targetKeyword: "adhd assessment ireland",
  searchVolume: 1900,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO 2026-09-07 (2372/en): 'adhd assessment ireland' 1,900/KD0; 'adult adhd assessment ireland' 480/KD0; 'private assessment for adhd ireland' 260/KD3; 'adhd diagnosis ireland cost' 110/KD0; parent 'adhd ireland' 5,400/KD15. Named in editorial-plan §7.3 as a strongest net-new candidate. No existing post covers ADHD in any market.",
  serviceSlug: "mental-health-consultation",
  authorDoctorId: "cmp5r0if3002kssjug743x0p6",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqas8yh9000b01pgpc0yp1la",
  reviewerDisplayName: "Dr Ahmed Maklad",
  posts: [en],
};
