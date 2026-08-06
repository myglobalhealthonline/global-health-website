/**
 * Ireland home test kit catalogue — Randox home kits sold in the Republic of
 * Ireland, as listed on randoxhealth.com/en-IE (checked 2026-08-06).
 *
 * `priceCents` mirrors Randox's own IE retail price in EUR. Set your own
 * margin before activating a row — every row seeds with isActive: false.
 *
 * Copy below is written for Global Health. Product facts (biomarkers, sample
 * type, turnaround) come from Randox; the prose does not.
 *
 * Not sold in Ireland by Randox (en-IE returns 400), so deliberately absent:
 * Confidante home STI test, Food Sensitivity test, Type 1 Diabetes Risk test.
 */

export type KitFaq = { question: string; answer: string };

export type RandoxKit = {
  /** Our slug on /ireland/en/tests/<slug>. */
  slug: string;
  /** Randox en-IE product slug — provenance for re-checking price/turnaround. */
  randoxSlug: string;
  /** Source image on Randox's CDN; downloaded + rehosted by the seed script. */
  imageUrl: string;
  title: string;
  /** Randox en-IE retail price, EUR cents. Confirm margin before activating. */
  priceCents: number;
  shortDescription: string;
  sampleType: string;
  resultsTimeline: string;
  detailIntro: string;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  seoTitle: string;
  seoDescription: string;
  faqs: KitFaq[];
  sortOrder: number;
};

export type KitFlow = "quickdraw" | "saliva" | "stool" | "nail";

const CDN = "https://stesrhplatforma071.blob.core.windows.net/images/Images/HTK";

const QUICKDRAW_SAMPLE = "Blood — QuickDraw upper-arm collection kit (no finger-pricking)";
const SALIVA_SAMPLE = "Saliva — DNA collection kit included";
const BLOOD_TIMELINE = "2–3 working days from arrival at the lab";
const DNA_TIMELINE = "1–2 weeks from arrival at the lab";
const LONG_TIMELINE = "4–6 weeks from arrival at the lab";

const RANDOX = "Provided and analysed by Randox, a UKAS-accredited laboratory.";

/** Shared closing paragraph — mirrors the compliance wording on the hub page. */
const FOLLOW_UP =
  "Your results are delivered to you directly by Randox. If you would like them explained, you can book an optional follow-up consultation with an IMC-registered Global Health doctor from €45.";

const quickdrawFaq = (): KitFaq[] => [
  {
    question: "Is this a finger-prick test?",
    answer:
      "No. The kit uses a QuickDraw collection device placed on your upper arm, so there is no finger-pricking. Step-by-step instructions are included.",
  },
  {
    question: "How long do results take?",
    answer:
      "Randox reports results 2–3 working days after your sample arrives at the laboratory. Activate your kit and post it back the same day you collect the sample.",
  },
  {
    question: "Is a doctor's review included?",
    answer:
      "No. The price covers the kit and its laboratory analysis, and your results come to you directly from Randox. A follow-up consultation with an IMC-registered Global Health doctor is booked separately, from €45.",
  },
];

const dnaFaq = (): KitFaq[] => [
  {
    question: "How is the sample collected?",
    answer:
      "With a saliva swab. There is no blood sample and no needle — full instructions are included in the kit.",
  },
  {
    question: "Does a genetic result mean I have the condition?",
    answer:
      "No. Genetic testing tells you whether you carry particular risk markers, not whether you have or will develop the condition. It is a risk indicator, not a diagnosis.",
  },
  {
    question: "Is a doctor's review included?",
    answer:
      "No. Your result comes to you directly from Randox. If you would like it explained, book an optional follow-up consultation with an IMC-registered Global Health doctor from €45.",
  },
];

export const IRELAND_RANDOX_KITS: RandoxKit[] = [
  {
    slug: "general-health-test",
    randoxSlug: "general-health-test",
    imageUrl: `${CDN}/female/general-health.webp`,
    title: "General Health Test",
    priceCents: 9100,
    shortDescription: `A broad home blood test covering up to 24 biomarkers across eight areas of health — heart, diabetes, liver, kidney, thyroid, iron, nutrition and muscle. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `The General Health Test is a single home blood test that gives you a wide baseline picture of how your body is working. One sample, collected from your upper arm with the QuickDraw device supplied in the kit, covers up to 24 biomarkers grouped into eight areas of health. Post it back to the Randox laboratory in the freepost envelope included. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Heart health — cholesterol and related lipid markers",
      "Diabetes health — blood sugar control markers",
      "Liver health",
      "Kidney health",
      "Thyroid health",
      "Iron status",
      "Nutritional health",
      "Muscle health",
    ],
    whyGetTested: [
      "A general baseline check when you have no specific symptoms",
      "Fatigue, low energy, or feeling generally run down",
      "Family history of high cholesterol, diabetes, or thyroid problems",
      "Checking the effect of a change in diet, training, or lifestyle",
      "You would rather not take time off to attend a clinic",
    ],
    seoTitle: "General Health Blood Test Ireland — 24 Biomarkers at Home | Global Health",
    seoDescription:
      "Order a Randox General Health home blood test in Ireland. Up to 24 biomarkers across heart, diabetes, liver, kidney, thyroid, iron, nutrition and muscle health. Collect at home, results in 2–3 working days.",
    faqs: [
      {
        question: "What does the General Health Test measure?",
        answer:
          "Up to 24 biomarkers grouped into eight areas: heart, diabetes, liver, kidney, thyroid, iron status, nutritional health and muscle health. It is designed as a broad baseline rather than a deep look at any one system.",
      },
      {
        question: "Do I need to fast before this test?",
        answer:
          "Fasting for around 8 hours is recommended, and you should be well hydrated on the morning of collection. If you take biotin (vitamin B7) supplements, stop them 48 hours beforehand unless they were prescribed — biotin interferes with several laboratory results.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 10,
  },
  {
    slug: "heart-health-cholesterol-test",
    randoxSlug: "heart-health-test",
    imageUrl: `${CDN}/female/Heart_Health.webp`,
    title: "Heart Health (Cholesterol) Test",
    priceCents: 5200,
    shortDescription: `A home blood test measuring five markers of heart health, including total, HDL and LDL cholesterol and triglycerides. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `High cholesterol usually causes no symptoms, so a blood test is the only way to know your levels. This kit measures five markers used to assess cardiovascular risk, from a sample you collect at home with the QuickDraw device. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Total Cholesterol",
      "HDL Cholesterol",
      "LDL Cholesterol",
      "Total Cholesterol / HDL Cholesterol ratio",
      "Triglycerides",
    ],
    whyGetTested: [
      "Family history of heart disease, stroke, or high cholesterol",
      "Checking whether a diet or exercise change has moved your numbers",
      "You smoke, drink regularly, or have a less active lifestyle",
      "You have diabetes or are carrying extra weight",
      "Routine cardiovascular risk check",
    ],
    seoTitle: "Cholesterol Home Test Ireland — Heart Health Blood Test | Global Health",
    seoDescription:
      "Order a Randox heart health home blood test in Ireland. Total, HDL and LDL cholesterol plus triglycerides, collected at home with no finger-pricking. Results in 2–3 working days.",
    faqs: [
      {
        question: "Do I need to fast before a cholesterol test?",
        answer:
          "Fasting for around 8 hours before collecting your sample is recommended. Water is fine during the fast.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 20,
  },
  {
    slug: "female-hormone-test",
    randoxSlug: "female-hormone-Quickdraw",
    imageUrl: `${CDN}/female/female-health.webp`,
    title: "Female Hormone Test",
    priceCents: 5200,
    shortDescription: `A home blood test measuring eight hormones involved in mood, energy, metabolism and the menstrual cycle. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `Hormone levels shift across the menstrual cycle and across life stages, and they influence mood, energy, weight and fertility. This kit measures eight hormones from a single sample you collect at home. Timing matters — if you have a regular cycle, collect your sample on day 3 unless advised otherwise. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Follicle Stimulating Hormone (FSH)",
      "Luteinising Hormone (LH)",
      "Oestradiol",
      "Progesterone",
      "Prolactin",
      "Testosterone",
      "Free Androgen Index",
      "Sex Hormone Binding Globulin (SHBG)",
    ],
    whyGetTested: [
      "Irregular, absent, or unusually heavy periods",
      "Difficulty conceiving, or planning a pregnancy",
      "Unexplained fatigue, low mood, or weight changes",
      "Acne, unwanted hair growth, or hair thinning",
      "Symptoms that may point to perimenopause",
    ],
    seoTitle: "Female Hormone Blood Test Ireland — 8 Hormones at Home | Global Health",
    seoDescription:
      "Order a Randox female hormone home blood test in Ireland. Eight hormones including FSH, LH, oestradiol, progesterone and testosterone. Collected at home, results in 2–3 working days.",
    faqs: [
      {
        question: "When in my cycle should I take the sample?",
        answer:
          "If your cycle is regular, day 3 (counting the first day of your period as day 1) is the usual point for hormone testing. If your cycle is irregular or absent, collect the sample at a time that suits you and note the date.",
      },
      {
        question: "Can I test while on the contraceptive pill?",
        answer:
          "Hormonal contraception changes several of these results, so they may be difficult to interpret. If you are on the pill, discuss timing with a doctor before ordering.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 30,
  },
  {
    slug: "male-hormone-test",
    randoxSlug: "male-hormone-quickdraw",
    imageUrl: `${CDN}/female/Male_Hormone.webp`,
    title: "Male Hormone Test",
    priceCents: 5200,
    shortDescription: `A home blood test measuring eight hormones including total and free testosterone. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `Testosterone and the hormones around it affect energy, mood, muscle mass, body composition and libido. This kit measures eight of them, including total and free testosterone, from a sample you collect at home. Testosterone peaks in the morning, so collect your sample before 10am. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Testosterone",
      "Free Testosterone",
      "Sex Hormone Binding Globulin (SHBG)",
      "Albumin",
      "Follicle Stimulating Hormone (FSH)",
      "Luteinising Hormone (LH)",
      "Oestradiol",
      "Prolactin",
    ],
    whyGetTested: [
      "Persistent fatigue or low mood",
      "Reduced libido or erectile difficulties",
      "Loss of muscle mass, or difficulty building it",
      "Unexplained weight gain",
      "Fertility questions",
    ],
    seoTitle: "Testosterone & Male Hormone Test Ireland — At Home | Global Health",
    seoDescription:
      "Order a Randox male hormone home blood test in Ireland. Eight hormones including total and free testosterone, FSH, LH and SHBG. Collected at home, results in 2–3 working days.",
    faqs: [
      {
        question: "What time of day should I collect the sample?",
        answer:
          "Before 10am. Testosterone follows a daily rhythm and is highest in the morning, so a later sample can read misleadingly low. Fasting for around 8 hours is also recommended.",
      },
      {
        question: "I use a testosterone gel or cream — does that affect the test?",
        answer:
          "Yes. Apply it after collecting your sample, not before, and wash your hands thoroughly beforehand — residue on the skin can contaminate the sample and give a falsely high result.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 40,
  },
  {
    slug: "psa-prostate-test",
    randoxSlug: "psa-home-test",
    imageUrl: `${CDN}/male/psa.webp`,
    title: "PSA (Prostate) Test",
    priceCents: 5200,
    shortDescription: `A home blood test measuring Prostate Specific Antigen (PSA), a marker used in assessing prostate health. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `PSA is a protein produced by the prostate. A raised level can have several causes — an enlarged prostate, infection, recent exercise or ejaculation, as well as prostate cancer — so PSA is a starting point for further assessment, not a diagnosis on its own. ${FOLLOW_UP}`,
    whatThisTestCovers: ["Prostate Specific Antigen (PSA)"],
    whyGetTested: [
      "Aged over 50, or over 45 with a family history of prostate cancer",
      "Urinary changes — frequency, urgency, a weak stream, or getting up at night",
      "You would like a baseline PSA reading to track over time",
      "Following up a previous PSA result at home",
    ],
    seoTitle: "PSA Test Ireland — Home Prostate Blood Test | Global Health",
    seoDescription:
      "Order a Randox PSA home blood test in Ireland. Measure your Prostate Specific Antigen level from home with no finger-pricking. Results in 2–3 working days.",
    faqs: [
      {
        question: "Is there anything to avoid before a PSA test?",
        answer:
          "Yes. For 48 hours before collecting your sample, avoid ejaculation, vigorous exercise and cycling, and do not test within six weeks of a prostate biopsy or a urinary infection. Each of these can raise PSA temporarily.",
      },
      {
        question: "Does a raised PSA mean cancer?",
        answer:
          "No. PSA rises for several benign reasons, including an enlarged prostate and infection. A raised result means the next step is a medical assessment, not that cancer is present.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 50,
  },
  {
    slug: "amh-fertility-test",
    randoxSlug: "amh-home-test",
    imageUrl: `${CDN}/female/AMH.webp`,
    title: "AMH (Ovarian Reserve) Test",
    priceCents: 7200,
    shortDescription: `A home blood test measuring Anti-Müllerian Hormone (AMH), used as an indicator of ovarian reserve. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `AMH is produced by follicles in the ovaries, and the level gives an indication of ovarian reserve — roughly, how many eggs remain. It is one input into fertility planning, alongside age and other factors. AMH does not predict whether or when you will conceive naturally. ${FOLLOW_UP}`,
    whatThisTestCovers: ["Anti-Müllerian Hormone (AMH)"],
    whyGetTested: [
      "Planning a pregnancy now or later",
      "Considering IVF or egg freezing",
      "Curious how your ovarian reserve compares with your age group",
      "Irregular cycles or a diagnosis of PCOS",
    ],
    seoTitle: "AMH Test Ireland — Home Ovarian Reserve Blood Test | Global Health",
    seoDescription:
      "Order a Randox AMH home blood test in Ireland to check your ovarian reserve. Collected at home with no finger-pricking, results in 2–3 working days.",
    faqs: [
      {
        question: "Does it matter when in my cycle I test?",
        answer:
          "AMH is relatively stable across the cycle, so it can be collected on any day. Note the date of collection anyway — it helps when a doctor interprets the result.",
      },
      {
        question: "Does hormonal contraception affect AMH?",
        answer:
          "It can lower the reading. If you are on the pill or another hormonal contraceptive, mention it when discussing your result.",
      },
      {
        question: "Does AMH tell me whether I can conceive?",
        answer:
          "No. AMH indicates ovarian reserve, not fertility as a whole, and it cannot predict natural conception. It is most useful alongside a clinical assessment.",
      },
      ...quickdrawFaq().slice(2),
    ],
    sortOrder: 60,
  },
  {
    slug: "vitamin-d-test",
    randoxSlug: "vitamin-d-test",
    imageUrl: `${CDN}/female/VitaminD.webp`,
    title: "Vitamin D Test",
    priceCents: 5200,
    shortDescription: `A home blood test measuring your vitamin D level, which affects bone strength, muscle function and mood. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `Ireland sits far enough north that skin cannot make meaningful vitamin D from sunlight for much of the year, which makes low levels common — particularly over winter. This kit measures your level from a sample you collect at home. ${FOLLOW_UP}`,
    whatThisTestCovers: ["Vitamin D (25-OH)"],
    whyGetTested: [
      "Tiredness, low mood, or aching muscles",
      "Bone or joint pain, or a history of fractures",
      "Little time outdoors, or covered skin",
      "Already supplementing and want to check the dose is working",
      "Pregnancy, or planning one",
    ],
    seoTitle: "Vitamin D Test Ireland — Home Blood Test | Global Health",
    seoDescription:
      "Order a Randox vitamin D home blood test in Ireland. Check your level from home with no finger-pricking. Results in 2–3 working days.",
    faqs: [
      {
        question: "Should I stop my supplement before testing?",
        answer:
          "No — if you want to know whether your current dose is enough, keep taking it as usual and note the dose when you review the result.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 70,
  },
  {
    slug: "vitamin-b12-test",
    randoxSlug: "vitamin-b12-test",
    imageUrl: `${CDN}/female/Vitamin_B12.webp`,
    title: "Vitamin B12 Test",
    priceCents: 5200,
    shortDescription: `A home blood test measuring your vitamin B12 level. Low B12 can show up as tiredness, low mood, or difficulty concentrating. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `Vitamin B12 is needed to make red blood cells and to keep the nervous system working. Deficiency builds slowly and often reads as ordinary tiredness. It is more common on a vegetarian or vegan diet, after 60, and in people taking metformin or long-term acid-reducing medication. ${FOLLOW_UP}`,
    whatThisTestCovers: ["Vitamin B12"],
    whyGetTested: [
      "Persistent tiredness or weakness",
      "Pins and needles, numbness, or balance problems",
      "Difficulty concentrating, or low mood",
      "A vegetarian or vegan diet",
      "Long-term metformin or acid-reducing medication",
    ],
    seoTitle: "Vitamin B12 Test Ireland — Home Blood Test | Global Health",
    seoDescription:
      "Order a Randox vitamin B12 home blood test in Ireland. Check for B12 deficiency from home with no finger-pricking. Results in 2–3 working days.",
    faqs: [
      {
        question: "Should I stop my B12 supplement first?",
        answer:
          "Recent supplements raise the reading, so a result taken while supplementing reflects the supplement rather than your baseline. If you want a baseline, discuss timing with a doctor before stopping anything.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 80,
  },
  {
    slug: "gut-microbiome-test",
    randoxSlug: "gut-microbiome-test",
    imageUrl: `${CDN}/female/gut-microbiome.webp`,
    title: "Gut Microbiome Test",
    priceCents: 23100,
    shortDescription: `A home stool test that profiles the bacteria, viruses and archaea living in your gut, with personalised dietary insights. ${RANDOX}`,
    sampleType: "Stool — home collection kit included",
    resultsTimeline: LONG_TIMELINE,
    detailIntro: `Your gut microbiome influences digestion, immunity and mood. This kit sequences the organisms present in a stool sample you collect at home and returns a profile of your microbial composition with insights you can act on. It is a wellbeing profile, not a diagnostic test for gut disease. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Bacterial composition",
      "Viral composition",
      "Archaeal composition",
      "Personalised dietary insights based on your profile",
    ],
    whyGetTested: [
      "Bloating, irregularity, or general digestive discomfort",
      "Interest in how your diet is shaping your gut",
      "Rebuilding after a course of antibiotics",
      "A broader interest in immunity and energy",
    ],
    seoTitle: "Gut Microbiome Test Ireland — Home Stool Test | Global Health",
    seoDescription:
      "Order a Randox gut microbiome home test in Ireland. Profile the bacteria, viruses and archaea in your gut from a home stool sample, with personalised dietary insights.",
    faqs: [
      {
        question: "How is the sample collected?",
        answer:
          "With a stool collection kit you use at home. Everything you need, including the freepost return packaging, is in the box.",
      },
      {
        question: "How long do results take?",
        answer:
          "Sequencing takes longer than a routine blood test — expect 4–6 weeks from the point your sample reaches the laboratory.",
      },
      {
        question: "Will this diagnose IBS or coeliac disease?",
        answer:
          "No. It profiles the organisms in your gut and gives dietary insights. It is not a diagnostic test — persistent digestive symptoms should be assessed by a doctor.",
      },
    ],
    sortOrder: 90,
  },
  {
    slug: "nutrition-lifestyle-dna-test",
    randoxSlug: "nutrition-lifestyle-dna-home-test-kit",
    imageUrl: `${CDN}/female/nutritional-lifestyle.webp`,
    title: "Nutrition & Lifestyle DNA Test",
    priceCents: 22100,
    shortDescription: `A home DNA test analysing up to 40 genes linked to diet, exercise response and wellbeing, from a saliva sample. ${RANDOX}`,
    sampleType: SALIVA_SAMPLE,
    resultsTimeline: LONG_TIMELINE,
    detailIntro: `Genetics influence how you process caffeine, lactose, fats and vitamins, and how your body responds to different kinds of training. This kit analyses up to 40 genes from a saliva sample and turns them into practical guidance on diet, exercise and wellbeing. Your DNA does not change, so this is a one-off test. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Diet and nutrition — including caffeine, lactose and vitamin metabolism",
      "Athletic performance — endurance, power, and recovery traits",
      "Health and wellbeing traits",
    ],
    whyGetTested: [
      "Tailoring a diet to how your body actually processes food",
      "Choosing training that suits your physiology",
      "Understanding why a standard plan has not worked for you",
      "A one-off test you never need to repeat",
    ],
    seoTitle: "Nutrition & Lifestyle DNA Test Ireland — Home Kit | Global Health",
    seoDescription:
      "Order a Randox nutrition and lifestyle DNA home test in Ireland. Up to 40 genes analysed from a saliva sample, with diet, exercise and wellbeing insights.",
    faqs: [
      {
        question: "Do I need to repeat this test?",
        answer: "No. Your DNA does not change, so this is a one-off test.",
      },
      {
        question: "Does this test for diseases?",
        answer:
          "No. It covers diet, exercise response and wellbeing traits. It is not a medical or diagnostic genetic test.",
      },
      ...dnaFaq().slice(0, 1),
      ...dnaFaq().slice(2),
    ],
    sortOrder: 100,
  },
  {
    slug: "genetic-haemochromatosis-test",
    randoxSlug: "haemochromatosis-home-test-kit",
    imageUrl: `${CDN}/female/genetic-haemochromotosis.webp`,
    title: "Genetic Haemochromatosis Test",
    priceCents: 9100,
    shortDescription: `A home DNA test screening the three HFE gene mutations linked to hereditary haemochromatosis (iron overload), from a saliva sample. ${RANDOX}`,
    sampleType: SALIVA_SAMPLE,
    resultsTimeline: DNA_TIMELINE,
    detailIntro: `Hereditary haemochromatosis causes the body to absorb too much iron, which builds up over years and can damage the liver, heart and pancreas. Ireland has among the highest carrier rates in the world. This test screens the three HFE mutations most often responsible, from a saliva sample you collect at home. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "HFE gene mutation C282Y",
      "HFE gene mutation H63D",
      "HFE gene mutation S65C",
    ],
    whyGetTested: [
      "A family history of haemochromatosis or unexplained liver disease",
      "Persistent fatigue or joint pain with no clear cause",
      "A previous blood test showing raised iron or ferritin",
      "Irish ancestry — carrier rates here are unusually high",
    ],
    seoTitle: "Haemochromatosis Genetic Test Ireland — Home DNA Kit | Global Health",
    seoDescription:
      "Order a Randox haemochromatosis genetic home test in Ireland. Screens the C282Y, H63D and S65C HFE mutations from a saliva sample. Results in 1–2 weeks.",
    faqs: [
      {
        question: "Why does this matter particularly in Ireland?",
        answer:
          "Hereditary haemochromatosis is more common in people of Irish descent than almost anywhere else, and it is treatable — which is why knowing your carrier status is useful.",
      },
      ...dnaFaq(),
    ],
    sortOrder: 110,
  },
  {
    slug: "genetic-coeliac-disease-test",
    randoxSlug: "coeliac-disease-home-test-kit",
    imageUrl: `${CDN}/female/genetic-coeliac-disease.webp`,
    title: "Genetic Coeliac Disease Test",
    priceCents: 11700,
    shortDescription: `A home DNA test screening for the HLA-DQ risk markers associated with coeliac disease, from a saliva sample. ${RANDOX}`,
    sampleType: SALIVA_SAMPLE,
    resultsTimeline: DNA_TIMELINE,
    detailIntro: `Almost everyone who develops coeliac disease carries an HLA-DQ risk marker, so a negative result makes coeliac disease very unlikely. A positive result does not mean you have it — many carriers never develop the condition — but it means the possibility is worth pursuing. Unlike antibody testing, this test is unaffected by whether you are currently eating gluten. ${FOLLOW_UP}`,
    whatThisTestCovers: ["HLA-DQ risk markers (HLA-DQ2 / HLA-DQ8)"],
    whyGetTested: [
      "A family history of coeliac disease",
      "Digestive symptoms after eating gluten",
      "You already avoid gluten, which makes antibody testing unreliable",
      "Unexplained iron deficiency, fatigue, or weight loss",
    ],
    seoTitle: "Coeliac Disease Genetic Test Ireland — Home DNA Kit | Global Health",
    seoDescription:
      "Order a Randox coeliac disease genetic home test in Ireland. Screens the HLA-DQ risk markers from a saliva sample, valid even on a gluten-free diet. Results in 1–2 weeks.",
    faqs: [
      {
        question: "Do I need to be eating gluten for this test?",
        answer:
          "No. Antibody blood tests need you to be eating gluten to be accurate; a genetic test does not, because your DNA does not change with your diet.",
      },
      {
        question: "Does a positive result mean I have coeliac disease?",
        answer:
          "No. Many people carry the HLA-DQ markers and never develop the condition. A positive result means coeliac disease is possible and worth investigating with a doctor; a negative result makes it very unlikely.",
      },
      ...dnaFaq().slice(0, 1),
      ...dnaFaq().slice(2),
    ],
    sortOrder: 120,
  },
  {
    slug: "genetic-lactose-intolerance-test",
    randoxSlug: "lactose-intolerance-home-test-kit",
    imageUrl: `${CDN}/female/Genetic_Lactose_Intolerance_Test.webp`,
    title: "Genetic Lactose Intolerance Test",
    priceCents: 11700,
    shortDescription: `A home DNA test screening the C13910T and G22018A genetic markers linked to adult lactose intolerance, from a saliva sample. ${RANDOX}`,
    sampleType: SALIVA_SAMPLE,
    resultsTimeline: DNA_TIMELINE,
    detailIntro: `Most people gradually lose the ability to digest lactose after childhood; whether you keep it is largely genetic. This test screens the two markers most associated with adult lactase persistence, from a saliva sample you collect at home — no elimination diet or drink challenge required. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Genetic marker C13910T",
      "Genetic marker G22018A",
    ],
    whyGetTested: [
      "Bloating, cramps, or wind after milk or dairy",
      "Deciding whether cutting out dairy is worth it",
      "Symptoms that come and go with no obvious trigger",
      "A family history of lactose intolerance",
    ],
    seoTitle: "Lactose Intolerance Genetic Test Ireland — Home DNA Kit | Global Health",
    seoDescription:
      "Order a Randox lactose intolerance genetic home test in Ireland. Screens the C13910T and G22018A markers from a saliva sample. Results in 1–2 weeks.",
    faqs: [
      {
        question: "How is this different from a lactose tolerance test?",
        answer:
          "A tolerance test measures your reaction after drinking lactose. This one reads the genetic markers behind that reaction instead, so there is nothing to drink and no symptoms to sit through.",
      },
      {
        question: "Does a result explain all my symptoms?",
        answer:
          "Not necessarily. Bloating and cramps have several causes, including a milk protein allergy and IBS. A genetic result is one piece of the picture — persistent symptoms should be assessed by a doctor.",
      },
      ...dnaFaq().slice(0, 1),
      ...dnaFaq().slice(2),
    ],
    sortOrder: 130,
  },
  {
    slug: "fracture-risk-assessment-test",
    randoxSlug: "fracture-risk-assessment-test-kit",
    imageUrl: `${CDN}/female/Osentia_Fracture_Risk.webp`,
    title: "Osentia Fracture Risk Assessment",
    priceCents: 9100,
    shortDescription: `A home test that assesses your risk of fragility fractures — a common sign of osteoporosis — from a nail clipping. No blood sample. ${RANDOX}`,
    sampleType: "Nail clipping — home collection kit included",
    resultsTimeline: "7 working days from arrival at the lab",
    detailIntro: `Osteoporosis is usually silent until a bone breaks. The Osentia test analyses the protein structure of a nail clipping to estimate your risk of a fragility fracture, from a sample you collect at home with nail clippers. It is a risk assessment, not a bone density scan. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "Fragility fracture risk assessment from nail keratin analysis",
    ],
    whyGetTested: [
      "Post-menopause, when bone loss speeds up",
      "A family history of osteoporosis or hip fracture",
      "A previous fracture from a minor fall",
      "Long-term steroid use, or a condition affecting bone",
      "You would like a risk indicator without a hospital scan",
    ],
    seoTitle: "Osteoporosis Fracture Risk Test Ireland — Home Kit | Global Health",
    seoDescription:
      "Order the Randox Osentia fracture risk home test in Ireland. Assesses fragility fracture risk from a nail clipping — no blood sample. Results in 7 working days.",
    faqs: [
      {
        question: "How is the sample collected?",
        answer:
          "You clip your fingernails into the container provided. There is no blood sample and no needle.",
      },
      {
        question: "Is this the same as a DEXA scan?",
        answer:
          "No. A DEXA scan measures bone density in hospital. This test estimates fracture risk from nail protein structure — useful as an indicator, and a reason to seek a scan if your risk comes back raised.",
      },
      {
        question: "Is a doctor's review included?",
        answer:
          "No. Your result comes to you directly from Randox. A follow-up consultation with an IMC-registered Global Health doctor is booked separately, from €45.",
      },
    ],
    sortOrder: 140,
  },
  {
    slug: "type-1-diabetes-risk-test",
    randoxSlug: "type-1-diabetes-home-test",
    imageUrl: `${CDN}/female/Type1_Diabetes_Risk.webp`,
    title: "Type 1 Diabetes Risk Test",
    // ESTIMATED. Randox lists this kit in the en-IE sitemap, but the product
    // itself returns error 400 on their IE storefront, so no EUR price is
    // published. £88 in GB, converted at the GB→IE ratio their other kits use
    // (~1.11). Confirm with Randox before relying on the margin.
    priceCents: 9800,
    shortDescription: `A home blood test screening 10 genetic variants to calculate a Type 1 diabetes genetic risk score. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
    sampleType: QUICKDRAW_SAMPLE,
    resultsTimeline: BLOOD_TIMELINE,
    detailIntro: `Type 1 diabetes has a strong genetic component, and most new diagnoses happen in people with no family history of it. This test screens 10 genetic variants and combines them into a single risk score, from a sample you collect at home. A raised score means higher genetic susceptibility — not that you have or will develop the condition. ${FOLLOW_UP}`,
    whatThisTestCovers: [
      "10 genetic variants associated with Type 1 diabetes",
      "A combined genetic risk score based on those variants",
    ],
    whyGetTested: [
      "A family history of Type 1 diabetes",
      "You want to know your child's or your own genetic susceptibility",
      "Early awareness so symptoms are recognised sooner",
      "Distinguishing likely Type 1 from Type 2 susceptibility",
    ],
    seoTitle: "Type 1 Diabetes Risk Test Ireland — Home Genetic Test | Global Health",
    seoDescription:
      "Order a Randox Type 1 diabetes genetic risk home test in Ireland. 10 genetic variants screened to produce a risk score, collected at home with no finger-pricking.",
    faqs: [
      {
        question: "Does a high score mean I will develop Type 1 diabetes?",
        answer:
          "No. The score describes genetic susceptibility, not a diagnosis or a prediction. Most people with a raised score never develop the condition — but knowing means symptoms get recognised early rather than late.",
      },
      {
        question: "Can this test be used for a child?",
        answer:
          "Most Type 1 diabetes is diagnosed in childhood, so family risk is a common reason to test. Discuss testing a child with a doctor first — the sample collection device is designed for adults.",
      },
      ...quickdrawFaq(),
    ],
    sortOrder: 150,
  },
];

/**
 * "How it works" steps + "What to know before testing" notes, keyed by our
 * slug. Kept out of the kit objects because the steps are per-collection-flow,
 * not per-product — 15 kits share four flows between them.
 *
 * The seed script renders these into `extraSections`, which the detail page
 * already renders as titled prose blocks (ImportantInfoSection).
 */
const STEPS: Record<KitFlow, string[]> = {
  quickdraw: [
    "Order your kit. It is dispatched to your address, with everything you need in the box.",
    "Collect your sample. Place the QuickDraw device on your upper arm and follow the instructions — no finger-pricking, and it takes a few minutes.",
    "Activate and post it back. Register your kit, seal the prepaid envelope and drop it at any post box the same day you collect.",
    "Get your results. Randox delivers them digitally once the laboratory has analysed your sample.",
  ],
  saliva: [
    "Order your kit. It is dispatched to your address, with everything you need in the box.",
    "Collect your sample. Swab the inside of your cheek as the instructions describe — no blood and no needle.",
    "Activate and post it back. Register your kit, seal the prepaid envelope and drop it at any post box.",
    "Get your results. Randox delivers them digitally once the laboratory has analysed your sample.",
  ],
  stool: [
    "Order your kit. It is dispatched to your address, with everything you need in the box.",
    "Collect your sample at home using the collection container and instructions provided.",
    "Activate and post it back. Register your kit, seal the prepaid packaging and post it as soon as you have collected.",
    "Get your results. Randox delivers them digitally once sequencing is complete.",
  ],
  nail: [
    "Order your kit. It is dispatched to your address, with everything you need in the box.",
    "Collect your sample by clipping your fingernails into the container provided — no blood and no needle.",
    "Activate and post it back. Register your kit, seal the prepaid envelope and drop it at any post box.",
    "Get your results. Randox delivers them digitally once the laboratory has analysed your sample.",
  ],
};

const HYDRATE =
  "On the morning of collection, drink plenty of water. Being well hydrated improves circulation and makes it easier to collect a clean sample.";
const FASTING =
  "Fast for 8 hours before collecting your sample. Water is fine throughout. Eat a light meal before the fast starts and avoid alcohol.";
const BIOTIN =
  "If you take biotin (vitamin B7), whether on its own or in a multivitamin, stop 48 hours before testing — it interferes with several laboratory results. If it was prescribed, speak to your doctor before stopping anything.";
const CYCLE =
  "Collect your sample two to five days after your period starts, ideally on day three.";
const PILL =
  "Hormonal contraception affects these results. If you have recently stopped the pill, wait until your cycle has settled back into its normal rhythm before testing.";

export const KIT_PREP: Record<string, { flow: KitFlow; beforeTesting: string[] }> = {
  "general-health-test": { flow: "quickdraw", beforeTesting: [FASTING, HYDRATE, BIOTIN] },
  "heart-health-cholesterol-test": { flow: "quickdraw", beforeTesting: [FASTING, HYDRATE] },
  "female-hormone-test": { flow: "quickdraw", beforeTesting: [CYCLE, PILL, HYDRATE, BIOTIN,
    "If you use HRT as a gel, spray or cream, keep taking it as usual — but wear gloves to apply it, and never apply it to the arm you collect from.",
  ] },
  "male-hormone-test": { flow: "quickdraw", beforeTesting: [
    "Collect your sample in the morning, before 10am. Testosterone is highest early in the day, so a later sample can read misleadingly low.",
    FASTING, HYDRATE,
    "If you use hormone gels, creams or patches, apply them after collecting — never before — and do not collect from an arm you apply them to.",
    BIOTIN,
  ] },
  "thyroid-function-test": { flow: "quickdraw", beforeTesting: [HYDRATE, BIOTIN] },
  "psa-prostate-test": { flow: "quickdraw", beforeTesting: [
    "Avoid vigorous exercise, cycling and sexual activity for 48 hours before collecting — each raises PSA temporarily.",
    "Wait at least 48 hours after a digital rectal examination, and six weeks after a prostate biopsy or urinary infection.",
    HYDRATE,
  ] },
  "amh-fertility-test": { flow: "quickdraw", beforeTesting: [CYCLE, PILL, HYDRATE, BIOTIN] },
  "vitamin-d-test": { flow: "quickdraw", beforeTesting: [HYDRATE,
    "Keep taking your usual supplement if you want to know whether the dose is working, and note the dose when you read your result.",
  ] },
  "vitamin-b12-test": { flow: "quickdraw", beforeTesting: [HYDRATE,
    "Recent B12 supplements raise the reading. If you want a baseline rather than a check on your supplement, speak to a doctor about timing first.",
  ] },
  "type-1-diabetes-risk-test": { flow: "quickdraw", beforeTesting: [HYDRATE] },
  "gut-microbiome-test": { flow: "stool", beforeTesting: [
    "Eat normally in the days before collecting — an unusual diet gives an unrepresentative picture of your gut.",
    "If you have recently finished a course of antibiotics, wait at least four weeks so your microbiome has settled.",
    "Post your sample the same day you collect it.",
  ] },
  "nutrition-lifestyle-dna-test": { flow: "saliva", beforeTesting: [
    "Do not eat, drink, smoke or chew gum for 30 minutes before collecting your saliva sample.",
  ] },
  "genetic-haemochromatosis-test": { flow: "saliva", beforeTesting: [
    "Do not eat, drink, smoke or chew gum for 30 minutes before collecting your saliva sample.",
  ] },
  "genetic-coeliac-disease-test": { flow: "saliva", beforeTesting: [
    "Do not eat, drink, smoke or chew gum for 30 minutes before collecting your saliva sample.",
    "You do not need to be eating gluten for this test. Unlike an antibody blood test, a genetic result is unaffected by your diet.",
  ] },
  "genetic-lactose-intolerance-test": { flow: "saliva", beforeTesting: [
    "Do not eat, drink, smoke or chew gum for 30 minutes before collecting your saliva sample.",
    "There is nothing to drink and no symptoms to sit through — this reads the genetic markers, not your reaction to lactose.",
  ] },
  "fracture-risk-assessment-test": { flow: "nail", beforeTesting: [
    "Grow your fingernails for a few days beforehand — the laboratory needs enough clipping to work with.",
    "Remove nail polish and any gel or acrylic before collecting.",
  ] },
};

/** Build the two `extraSections` blocks the detail page renders. */
export function buildExtraSections(slug: string): Array<{ title: string; body: string }> {
  const prep = KIT_PREP[slug];
  if (!prep) return [];
  const sections = [
    { title: "How it works", body: STEPS[prep.flow].join("\n\n") },
  ];
  if (prep.beforeTesting.length > 0) {
    sections.push({ title: "What to know before testing", body: prep.beforeTesting.join("\n\n") });
  }
  return sections;
}

/**
 * Randox's IE thyroid kit maps onto our existing `thyroid-function-test` row,
 * so it is listed here separately: the seed script refreshes that row's copy
 * but never touches its price or isActive flag.
 */
export const THYROID_REFRESH = {
  slug: "thyroid-function-test",
  randoxSlug: "thyroid-function-home-test",
  randoxPriceCents: 5200,
  imageUrl: `${CDN}/female/Thyroid.webp`,
  sampleType: QUICKDRAW_SAMPLE,
  resultsTimeline: BLOOD_TIMELINE,
  shortDescription: `A home blood test measuring five thyroid markers — TSH, Free T3, Free T4, Anti-TPO and Anti-TG — to assess thyroid function and autoimmune thyroid activity. Collected from your upper arm, no finger-pricking. ${RANDOX}`,
  whatThisTestCovers: [
    "Thyroid Stimulating Hormone (TSH)",
    "Free T4 (Thyroxine)",
    "Free T3 (Triiodothyronine)",
    "Thyroid Peroxidase Antibodies (Anti-TPO)",
    "Thyroglobulin Antibodies (Anti-TG)",
  ],
};
