export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  publishedAt: string;
  readingTime: number;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-telemedicine",
    title: "What Is Telemedicine and How Does It Work?",
    category: "Telemedicine",
    author: "Global Health Editorial Team",
    publishedAt: "2026-04-10",
    readingTime: 5,
    excerpt:
      "Telemedicine lets you consult a licensed doctor from anywhere — no waiting room, no travel. Here is how it works and who it is designed for.",
    body: `
<p>Telemedicine is the delivery of healthcare services using digital communication technologies — video calls, secure messaging, and online portals — that connect patients with licensed medical professionals remotely.</p>

<h2>How a telemedicine consultation works</h2>
<ol>
  <li><strong>Book online.</strong> Choose your country, consultation type, and preferred time. Payments are handled securely before or after your session.</li>
  <li><strong>Share your details.</strong> Upload any relevant documents, test results, or a brief medical history through the patient portal.</li>
  <li><strong>Meet your doctor.</strong> Join a private video or phone call with a locally-registered GP or specialist at the scheduled time.</li>
  <li><strong>Receive your care plan.</strong> Your doctor can issue referrals, prescriptions (where permitted), sick notes, and follow-up instructions — all sent securely to your account.</li>
</ol>

<h2>What telemedicine can and cannot do</h2>
<p>Telemedicine is well-suited for:</p>
<ul>
  <li>General GP consultations — colds, infections, ongoing medication reviews</li>
  <li>Mental health assessments and therapy follow-ups</li>
  <li>Specialist consultations: cardiology, dermatology, nutrition, and more</li>
  <li>Travel health advice and vaccinations guidance</li>
  <li>Sick-leave certificates and insurance forms</li>
</ul>
<p>Telemedicine is <em>not</em> a replacement for emergency care. If you have chest pain, difficulty breathing, or a serious injury, call emergency services immediately.</p>

<h2>Is it safe and legal?</h2>
<p>Every Global Health doctor is fully registered with the medical authority of the country they practice in. Consultations are conducted over encrypted video connections, and your data is stored in GDPR-compliant infrastructure.</p>
    `,
  },
  {
    slug: "prepare-first-online-consultation",
    title: "How to Prepare for Your First Online Consultation",
    category: "Patient Guide",
    author: "Global Health Editorial Team",
    publishedAt: "2026-04-18",
    readingTime: 4,
    excerpt:
      "A few minutes of preparation before your video call can make the difference between a rushed appointment and one that truly addresses your needs.",
    body: `
<p>Whether you are booking a GP visit or a specialist session, a little preparation goes a long way. Here is a checklist to help you get the most from your first online consultation.</p>

<h2>Before the appointment</h2>
<ul>
  <li><strong>List your symptoms.</strong> Write down when they started, how severe they are on a scale of 1–10, and anything that makes them better or worse.</li>
  <li><strong>Gather your medication list.</strong> Include the drug name, dose, and how often you take it — even supplements and over-the-counter medicines.</li>
  <li><strong>Upload relevant documents.</strong> Previous test results, specialist letters, or imaging reports can be uploaded to the patient portal before your call. Your doctor can review them in advance.</li>
  <li><strong>Know your medical history.</strong> Chronic conditions, past surgeries, allergies — jot down the key points so you are not scrambling during the call.</li>
</ul>

<h2>At the time of your call</h2>
<ul>
  <li>Find a quiet, private room with good lighting — face the window if possible.</li>
  <li>Use a stable internet connection (Wi-Fi preferred over mobile data).</li>
  <li>Have your ID or PPSN/health number nearby in case registration is needed.</li>
  <li>Keep a notepad ready to write down advice, medication changes, or referrals.</li>
</ul>

<h2>After the consultation</h2>
<p>Your doctor's notes and any prescriptions will appear in your account shortly after the call. If anything is unclear, you can follow up through the chat in your patient portal. For time-sensitive questions, contact the clinic directly.</p>
    `,
  },
  {
    slug: "online-prescriptions-europe",
    title: "Understanding Online Prescriptions in Europe",
    category: "Prescriptions",
    author: "Global Health Editorial Team",
    publishedAt: "2026-04-25",
    readingTime: 6,
    excerpt:
      "Can a doctor issue a prescription over a video call? The short answer is yes — with important country-specific rules that every patient should know.",
    body: `
<p>Online prescriptions are legally valid in most European countries, provided they are issued by a registered doctor following a proper clinical assessment. Here is what you need to know.</p>

<h2>The legal framework</h2>
<p>Under EU Directive 2011/24/EU on patients' rights in cross-border healthcare, prescriptions issued in one member state must be recognised in all others for non-controlled substances. Each country still sets its own rules for controlled medications (Schedule drugs).</p>
<p>At Global Health, every prescription is issued by a doctor registered in your country of consultation — meaning Irish prescriptions are signed by Irish-registered GPs, Portuguese prescriptions by Portuguese-registered doctors, and so on.</p>

<h2>How the process works</h2>
<ol>
  <li>Your doctor assesses your condition during the online consultation.</li>
  <li>If appropriate, a prescription is generated and digitally signed.</li>
  <li>The prescription is sent to your account and, in countries with electronic prescription systems (like Ireland's PCRS or Portugal's PEM), directly to your preferred pharmacy.</li>
  <li>In countries without full e-prescription integration, a PDF is available to print and present at any pharmacy.</li>
</ol>

<h2>What can and cannot be prescribed online?</h2>
<p>Most common medications — antibiotics, blood pressure drugs, oral contraceptives, inhalers, and chronic-disease management drugs — can be prescribed after an online consultation. Controlled substances (opioids, benzodiazepines, certain stimulants) are generally restricted to in-person assessments and cannot be issued via telemedicine.</p>

<h2>Repeat prescriptions</h2>
<p>If you are on a stable long-term medication, repeat prescription appointments are quick — typically 10–15 minutes — and can be done via video or in some cases through an asynchronous review where you complete a short questionnaire. Your doctor decides which pathway is appropriate based on clinical safety.</p>
    `,
  },
  {
    slug: "benefits-remote-health-monitoring",
    title: "Benefits of Remote Health Monitoring",
    category: "Health Education",
    author: "Global Health Editorial Team",
    publishedAt: "2026-05-02",
    readingTime: 5,
    excerpt:
      "Wearable devices and connected health tools have turned passive data into actionable clinical insight. Here is how remote monitoring is changing chronic care.",
    body: `
<p>Remote patient monitoring (RPM) uses devices — blood pressure cuffs, glucose monitors, pulse oximeters, ECG patches — to collect health data outside of traditional clinical settings and share it in near real-time with a healthcare team.</p>

<h2>Key benefits</h2>
<h3>Earlier detection of deterioration</h3>
<p>For patients with hypertension, diabetes, or heart failure, continuous monitoring catches subtle trends — a slow rise in fasting glucose, a gradual blood pressure creep — weeks before a crisis event. Studies consistently show RPM reduces emergency admissions by 15–30% in high-risk populations.</p>

<h3>More accurate clinical picture</h3>
<p>White-coat hypertension (blood pressure elevated only in a clinic setting) affects an estimated 15–30% of patients diagnosed with high blood pressure. Home readings over 7–14 days give a far more accurate baseline than a single office measurement.</p>

<h3>Better medication adherence</h3>
<p>When patients see their own data — and know their doctor is reviewing it — adherence to treatment plans improves. The feedback loop between tracking and behaviour change is well-documented in diabetes self-management research.</p>

<h3>Reduced travel and appointment burden</h3>
<p>Quarterly check-ins for stable chronic conditions can often be replaced by data review sessions where the doctor assesses trends and adjusts prescriptions without the patient needing to travel. This is especially valuable for elderly patients and those in rural areas.</p>

<h2>How Global Health uses monitoring data</h2>
<p>Patients can upload device readings (CSV exports or manual logs) directly to their appointment in the patient portal. Your doctor reviews these before the consultation, allowing the video call to focus on interpretation and care planning rather than data collection.</p>
    `,
  },
  {
    slug: "how-to-request-health-test-online",
    title: "How to Request a Health Test Online",
    category: "Health Tests",
    author: "Global Health Editorial Team",
    publishedAt: "2026-05-10",
    readingTime: 4,
    excerpt:
      "Bloods, urine analysis, STI screens, thyroid panels — you can get most routine tests ordered online without visiting a GP in person first.",
    body: `
<p>A doctor's referral (or request form) is required for most laboratory tests in Europe. Through an online consultation, a Global Health doctor can assess your symptoms and issue the necessary request — often within 24 hours of booking.</p>

<h2>Common tests ordered online</h2>
<ul>
  <li><strong>Full blood count (FBC)</strong> — anaemia, infection, immune issues</li>
  <li><strong>Comprehensive metabolic panel</strong> — liver, kidneys, electrolytes</li>
  <li><strong>Thyroid function tests (TFT / TSH)</strong></li>
  <li><strong>Lipid panel</strong> — cholesterol and cardiovascular risk</li>
  <li><strong>HbA1c</strong> — diabetes monitoring or screening</li>
  <li><strong>STI screening panels</strong> — HIV, hepatitis B/C, syphilis, gonorrhoea, chlamydia</li>
  <li><strong>Hormonal panels</strong> — testosterone, oestrogen, FSH, LH</li>
  <li><strong>Vitamin levels</strong> — B12, D, folate, ferritin</li>
</ul>

<h2>Step-by-step process</h2>
<ol>
  <li><strong>Book a Health Test consultation.</strong> Select the relevant test or describe your symptoms so the doctor can advise which tests are appropriate.</li>
  <li><strong>Video assessment.</strong> A short consultation (typically 10–15 minutes) to clinically justify the request and rule out red-flag symptoms requiring urgent care.</li>
  <li><strong>Receive your request form.</strong> A signed laboratory request is uploaded to your account, usually within hours. Print it or use the digital version at the lab.</li>
  <li><strong>Go to any accredited lab.</strong> Most public and private labs across Europe accept third-party requests. Some cities have walk-in labs; others require an appointment.</li>
  <li><strong>Review results with your doctor.</strong> Upload results to your portal, or book a short follow-up consultation to discuss findings and next steps.</li>
</ol>

<h2>Home testing kits</h2>
<p>For certain tests — UTI screens, basic STI panels, and some hormonal markers — certified home test kits can be ordered and results submitted digitally. Your doctor reviews the report and follows up through the patient portal.</p>
    `,
  },
];
