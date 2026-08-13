/**
 * Ireland doctors datasheet — transcribed faithfully from the July 2026
 * "Doctor Profile Data Sheet" docx extraction (23 profiles found in sheet).
 * HTML entities decoded; paragraph breaks preserved as \n\n; bullets as "• " lines.
 *
 * Consumed by scripts/applied/patch-ireland-doctors-datasheet.ts.
 *
 * dbSlug is the AUTHORITATIVE DB slug (some sheet slugs differ).
 * Doctors known to be missing from the DB are still transcribed; the patch
 * script warns and skips them.
 */

export type DoctorFaqSheet = { question: string; answer: string };

export type DoctorSheet = {
  /** DB slug to look up (prisma.doctor.findFirst({ where: { slug } })) */
  dbSlug: string;
  /** Sheet slug/name, for traceability when it differs from dbSlug */
  sheetSlug: string;
  displayName: string;
  /** Sheet "Specialty label" -> Doctor.title */
  specialty: string;
  seoTitle: string;
  seoDescription: string;
  bio: string;
  qualifications: string[];
  languages: string[];
  faqs: DoctorFaqSheet[];
};

export const IRELAND_DOCTORS: DoctorSheet[] = [
  {
    dbSlug: "dr-grainne-ahern",
    sheetSlug: "dr-grainne-ahern",
    displayName: "Dr Gráinne Ahern",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Gráinne Ahern — GP | IMC 408777 | Women's Health & Dermoscopy | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Gráinne Ahern — IMC-registered GP in Ireland (IMC 408777). MICGP. Advanced LARC certification. Certificate of Dermoscopy. Women's health specialist. Same-day appointments available.",
    bio: `Dr. Gráinne Ahern is an experienced General Practitioner with specialist-level expertise in women's health, contraception and dermatology — combining the accessibility of a family GP with the depth of a clinician who has dedicated significant postgraduate training to her areas of interest.

She graduated from University College Dublin with a Bachelor of Medicine, Bachelor of Surgery, and Bachelor of Obstetrics (MB, BCh, BAO), achieving First Class Honours in Psychiatry, Obstetrics, and Gynaecology. She also holds a Bachelor of Laws (LLB) with First Class Honours from Trinity College Dublin — an unusual combination that reflects both academic breadth and a deep understanding of patient rights and healthcare ethics.

Following her internship at Galway University Hospital, Dr. Ahern completed hospital rotations in general medicine, paediatrics, psychiatry and obstetrics, before specialising in general practice. She is a Member of the Irish College of General Practitioners (MICGP) and currently also practices at Knocknacarra Family Care in Galway, where she has led chronic disease management programmes and community vaccination clinics.

Her advanced certifications set her apart within general practice. She holds advanced certification in Long-Acting Reversible Contraception (LARC) and serves as a LARC tutor trainee — meaning she not only places these devices but trains other clinicians to do so. She also holds a Certificate of Dermoscopy from the Skin Cancer College Australia, allowing her to assess skin lesions with the same diagnostic tools used by dermatologists.

Dr. Ahern serves on the panel of Special Visitors for the Decision Support Service and has received the John F. Cunningham Medal and the Kieran O'Driscoll Gold Medal in Obstetrics and Gynaecology for excellence in clinical training.

What she treats:
• Women's health — contraception (including LARC insertion and removal), hormonal health, menstrual concerns, perimenopause and menopause
• Skin concerns — acne, eczema, rashes, dermoscopy assessment of suspicious lesions
• Chronic disease management — hypertension, diabetes, thyroid disorders, high cholesterol
• Acute illness — respiratory infections, fever, flu, sore throat, UTIs
• Mental health — anxiety, depression, stress management
• Preventive care — health assessments, screening referrals, lifestyle counselling
• Paediatric concerns — child health queries, developmental concerns, vaccination guidance
• Sick notes, medical certificates and prescription renewals

Her approach:
Dr. Ahern is known for her patient-centred approach — combining clinical rigour with clear communication and a genuine focus on prevention and early diagnosis. Her dual background in medicine and law gives her a distinctive understanding of patient rights, informed consent and healthcare ethics.

Languages: English`,
    qualifications: [
      "MB, BCh, BAO — University College Dublin (First Class Honours in Psychiatry, O&G)",
      "LLB with First Class Honours — Trinity College Dublin",
      "Member of the Irish College of General Practitioners (MICGP)",
      "Advanced Certification in Long-Acting Reversible Contraception (LARC)",
      "Certificate of Dermoscopy — Skin Cancer College Australia",
      "LARC Tutor Trainee",
      "Special Visitor Panel — Decision Support Service",
      "John F. Cunningham Medal",
      "Kieran O'Driscoll Gold Medal in Obstetrics and Gynaecology",
      "Registered with the Irish Medical Council (IMC 408777 — Specialist Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question: "Is Dr Gráinne Ahern registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Gráinne Ahern holds active registration with the Irish Medical Council — IMC number 408777 on the Specialist Division. You can verify this registration at medicalcouncil.ie. The Specialist Division registration reflects her MICGP qualification, which is the postgraduate standard for general practice in Ireland.",
      },
      {
        question: "What makes Dr Ahern's GP profile different from a standard GP?",
        answer:
          "Dr Ahern brings specialist-level certification to general practice. She holds advanced certification in Long-Acting Reversible Contraception (LARC) and serves as a LARC tutor trainee — meaning she both inserts and removes these devices and trains other clinicians to do so. She also holds a Certificate of Dermoscopy from the Skin Cancer College Australia, allowing her to assess suspicious skin lesions with the same diagnostic tools used by dermatologists. For patients with specific women's health or skin concerns, this depth of expertise within a GP consultation is unusual.",
      },
      {
        question: "What does Dr Ahern treat?",
        answer:
          "Dr Ahern provides GP consultations covering women's health (contraception including LARC, hormonal concerns, menstrual issues, perimenopause and menopause), skin concerns (acne, eczema, dermoscopy assessment of suspicious lesions), chronic disease management (hypertension, diabetes, thyroid disorders), acute illness (respiratory infections, fever, flu, UTIs), mental health (anxiety, depression), preventive care, paediatric health queries, sick notes, medical certificates and prescription renewals.",
      },
      {
        question: "Can Dr Ahern discuss contraception options including the coil?",
        answer:
          "Yes. Dr Ahern holds advanced certification in Long-Acting Reversible Contraception (LARC), covering intrauterine devices (IUDs and IUS — including the coil) and subdermal implants. She can assess, prescribe, discuss and refer for LARC insertion or removal during a GP consultation. She can also advise on all other contraception options including the combined pill, progestogen-only pill, contraceptive patch, ring and injection.",
      },
      {
        question: "How do I book a consultation with Dr Ahern?",
        answer:
          "Select 'Pick a time' on this page to view Dr Ahern's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Note: LARC insertion and removal require an in-person appointment at a clinic — Dr Ahern can discuss, assess and refer for these procedures during your online consultation.",
      },
      {
        question: "What are Dr Ahern's qualifications?",
        answer:
          "Dr Gráinne Ahern holds an MB, BCh, BAO from University College Dublin with First Class Honours in Psychiatry, Obstetrics and Gynaecology. She also holds an LLB with First Class Honours from Trinity College Dublin. She is a Member of the Irish College of General Practitioners (MICGP) and holds advanced certification in Long-Acting Reversible Contraception (LARC) and a Certificate of Dermoscopy from the Skin Cancer College Australia. She has received the John F. Cunningham Medal and the Kieran O'Driscoll Gold Medal in Obstetrics and Gynaecology.",
      },
    ],
  },
  {
    dbSlug: "dr-emmanuel-dabup",
    sheetSlug: "Dr Emmanuel Bapbin Dabup",
    displayName: "Dr Emmanuel Dabup",
    specialty: "Consultant Psychiatrist",
    seoTitle:
      "Dr Emmanuel Dabup — Consultant Psychiatrist | IMC 409877 | Global Health Ireland",
    seoDescription:
      "Book an online psychiatric consultation with Dr Emmanuel Dabup — IMC-registered Consultant Psychiatrist in Ireland (IMC 409877). MCPsychI. General Adult Psychiatry & Learning Disability. Same-day appointments available.",
    bio: `Dr. Emmanuel Bapbin Dabup is a Consultant Psychiatrist with extensive clinical experience across General Adult Psychiatry and the Mental Health of Intellectual Disabilities — a dual specialisation that is uncommon and reflects a breadth of training rarely found in a single clinician.

He completed his Doctor of Medicine (MD) at the University of Szeged and holds the Certificate of Satisfactory Completion of Specialist Training (CSCST) from the College of Psychiatrists of Ireland in both General Adult Psychiatry and Learning Disability Psychiatry. He is a Member of the College of Psychiatrists of Ireland (MCPsychI) and holds a Master's degree in Healthcare Ethics and Law from the Royal College of Surgeons in Ireland — a credential that informs his approach to complex decisions around capacity, consent and patient rights.

Dr. Dabup has worked as Locum Consultant Psychiatrist with the Cavan–Monaghan Mental Health Service, providing specialist psychiatric assessment and treatment across hospital and community settings. His clinical work includes management of complex psychiatric conditions, collaboration with multidisciplinary teams, and development of individualised patient-centred treatment plans.

His areas of expertise include comprehensive psychiatric assessment and diagnosis, psychopharmacology and medication management, autism spectrum disorders, mental health in intellectual disabilities, crisis intervention and risk assessment, and biopsychosocial treatment approaches.

Beyond clinical practice, Dr. Dabup is actively involved in medical education — serving as an educational and clinical supervisor for specialist trainees and teaching medical students at Irish universities. He contributes to clinical governance, research and quality improvement initiatives.

What he treats:
• General adult mental health — anxiety, depression, bipolar disorder, psychosis, PTSD
• Autism spectrum disorders — assessment, diagnosis and management
• Mental health in intellectual disabilities
• Psychopharmacology — medication review, optimisation and management
• Complex psychiatric assessment and second opinions
• Crisis assessment and risk evaluation
• Liaison psychiatry queries

His approach:
Dr. Dabup provides evidence-based, compassionate psychiatric care grounded in a biopsychosocial model. His MSc in Healthcare Ethics and Law from RCSI means he brings both clinical and ethical rigour to complex cases — particularly those involving capacity, consent and treatment planning. He is committed to helping patients understand their diagnosis, their options and their rights.

Languages: English`,
    qualifications: [
      "Doctor of Medicine (MD) — University of Szeged",
      "Member of the College of Psychiatrists of Ireland (MCPsychI)",
      "CSCST — General Adult Psychiatry (College of Psychiatrists of Ireland)",
      "CSCST — Learning Disability Psychiatry (College of Psychiatrists of Ireland)",
      "MSc Healthcare Ethics and Law — Royal College of Surgeons in Ireland (RCSI)",
      "Locum Consultant Psychiatrist — Cavan–Monaghan Mental Health Service",
      "Registered with the Irish Medical Council (IMC 409877 — Specialist Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question: "Is Dr Emmanuel Dabup registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Emmanuel Dabup holds active registration with the Irish Medical Council — IMC number 409877 on the Specialist Division. You can verify this registration at medicalcouncil.ie. He is also a Member of the College of Psychiatrists of Ireland (MCPsychI) — the specialist body for psychiatry in Ireland.",
      },
      {
        question: "What conditions does Dr Dabup treat?",
        answer:
          "Dr Dabup provides consultant psychiatrist assessments covering general adult mental health (anxiety, depression, bipolar disorder, psychosis, PTSD), autism spectrum disorders (assessment, diagnosis and management), mental health in intellectual disabilities, psychopharmacology and medication review, complex psychiatric assessment and second opinions, crisis assessment and risk evaluation, and liaison psychiatry queries.",
      },
      {
        question: "Do I need a GP referral to see Dr Dabup online?",
        answer:
          "No referral is required to book a consultation with Dr Dabup through Global Health — you can book directly. If you have existing psychiatric notes, GP letters or previous assessment reports, sharing these in advance will help Dr Dabup prepare for your consultation. They are not required to book.",
      },
      {
        question:
          "What is the difference between a GP mental health consultation and a psychiatric consultation?",
        answer:
          "A GP can assess, diagnose and manage common mental health conditions and prescribe a range of psychiatric medications. A Consultant Psychiatrist like Dr Dabup offers a deeper level of specialist assessment — including complex diagnosis (autism, personality disorders, treatment-resistant depression), psychopharmacological management of complex medication regimens, formal capacity assessments, and specialist reports for legal or insurance purposes. If you have previously seen a GP for mental health concerns and need a specialist review, a psychiatric consultation may be appropriate.",
      },
      {
        question: "How do I book a consultation with Dr Dabup?",
        answer:
          "Select 'Pick a time' on this page to view Dr Dabup's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call.",
      },
      {
        question: "What are Dr Dabup's qualifications?",
        answer:
          "Dr Emmanuel Dabup holds a Doctor of Medicine (MD) from the University of Szeged. He is a Member of the College of Psychiatrists of Ireland (MCPsychI) and holds the Certificate of Satisfactory Completion of Specialist Training (CSCST) in both General Adult Psychiatry and Learning Disability Psychiatry — a dual specialisation. He also holds an MSc in Healthcare Ethics and Law from the Royal College of Surgeons in Ireland (RCSI).",
      },
    ],
  },
  {
    dbSlug: "dr-mohammed-omar",
    sheetSlug: "dr-mohammed-omar",
    displayName: "Dr Mohammed Omar",
    specialty: "Consultant Cardiologist",
    seoTitle:
      "Dr Mohammed Omar — Consultant Cardiologist | IMC 412532 | Global Health Ireland",
    seoDescription:
      "Book an online cardiology consultation with Dr Mohammed Omar — IMC-registered Consultant Cardiologist (IMC 412532). FRCP (Glasgow), MRCP (UK). Trained at St James's, St Vincent's and Tallaght University Hospital. Same-day appointments available.",
    bio: `Dr Mohammed Omar Abdelaziz is a Consultant Cardiologist with specialist registration with the Irish Medical Council and international qualifications spanning the UK, Ireland and the United States. His expertise covers the full spectrum of cardiovascular care — from preventive cardiology and advanced diagnostics to complex interventional procedures.

He holds FRCP (Glasgow), MRCP (UK), and a Master's Degree in Cardiology, and has trained and worked at some of Ireland's leading tertiary cardiac centres — St James's Hospital, St Vincent's University Hospital, and Tallaght University Hospital. He currently practices as a Consultant Cardiologist at the Hermitage Clinic / Blackrock Health.

Dr Mohammed Omar is an active member of four major international cardiology societies: the Irish Society of Cardiology, the European Society of Cardiology (ESC), the American College of Cardiology (ACC), and the European Association of Percutaneous Coronary Intervention (EAPCI). He is also actively involved in clinical research and has published in leading cardiology journals and presented at major international conferences.

What he treats:
• Chest pain assessment and coronary artery disease
• Hypertension and cardiovascular risk management
• Heart failure and cardiomyopathies
• Cardiac imaging — echocardiography and cardiac CT
• Arrhythmias, pacing and device management
• Interventional cardiology including PCI and complex coronary interventions
• Preventive cardiology and cardiovascular risk reduction
• Second opinions on cardiac diagnoses and treatment plans

His approach: Dr Mohammed Omar combines evidence-based medicine with clear, direct communication — ensuring patients understand their diagnosis, their risk profile and their options. He consults in both English and Arabic, making him one of the very few cardiologists in Ireland accessible to Arabic-speaking patients through an online consultation.

Languages: English · Arabic`,
    qualifications: [
      "FRCP (Glasgow) — Fellow of the Royal College of Physicians, Glasgow",
      "MRCP (UK) — Member of the Royal College of Physicians, United Kingdom",
      "MSc — Cardiology",
      "Trained at St James's Hospital, St Vincent's University Hospital, Tallaght University Hospital, Hermitage Clinic / Blackrock Health",
      "Member — Irish Society of Cardiology",
      "Member — European Society of Cardiology (ESC)",
      "Member — American College of Cardiology (ACC)",
      "Member — European Association of Percutaneous Coronary Intervention (EAPCI)",
      "Registered with the Irish Medical Council (IMC 412532 — Specialist Division)",
    ],
    languages: ["English", "Arabic"],
    faqs: [
      {
        question: "Is Dr Mohammed Omar registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Mohammed Omar Abdelaziz holds active specialist registration with the Irish Medical Council — IMC number 412532 on the Specialist Division. You can verify this registration at medicalcouncil.ie. He also holds FRCP (Glasgow) and MRCP (UK), international specialist qualifications from the Royal Colleges of Physicians.",
      },
      {
        question: "What does Dr Mohammed Omar treat?",
        answer:
          "Dr Mohammed Omar provides consultant cardiology assessments covering chest pain and coronary artery disease, hypertension and cardiovascular risk management, heart failure and cardiomyopathies, cardiac imaging interpretation (echocardiography, cardiac CT), arrhythmias and pacing, interventional cardiology including PCI, preventive cardiology and second opinions on cardiac diagnoses or treatment plans.",
      },
      {
        question: "Do I need a GP referral to see Dr Mohammed Omar online?",
        answer:
          "No referral is required to book a cardiology consultation with Dr Mohammed Omar through Global Health — you can book directly. If you have existing cardiology reports, ECGs, echocardiography results or GP letters, sharing these in advance will help Dr Mohammed Omar prepare a more targeted assessment. They are not required to book.",
      },
      {
        question:
          "Can Dr Mohammed Omar review my ECG, echocardiogram or cardiac CT results?",
        answer:
          "Yes. Dr Mohammed Omar has specialist expertise in cardiac imaging including echocardiography and cardiac CT, and can review and interpret these results as part of your online consultation. If you have digital copies of your results or reports, you can share them securely before your appointment. He can provide a clinical interpretation, a second opinion or a management recommendation based on your results.",
      },
      {
        question: "How do I book a consultation with Dr Mohammed Omar?",
        answer:
          "Select 'Pick a time' on this page to view Dr Mohammed Omar's available appointment slots. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call and are available in English and Arabic.",
      },
      {
        question: "What are Dr Mohammed Omar's qualifications?",
        answer:
          "Dr Mohammed Omar Abdelaziz holds FRCP (Glasgow) and MRCP (UK) from the Royal Colleges of Physicians, and a Master's Degree in Cardiology. He has trained and worked at St James's Hospital, St Vincent's University Hospital, and Tallaght University Hospital, and currently practices as a Consultant Cardiologist at the Hermitage Clinic / Blackrock Health. He is a member of the Irish Society of Cardiology, the European Society of Cardiology, the American College of Cardiology, and the European Association of Percutaneous Coronary Intervention.",
      },
    ],
  },
  {
    dbSlug: "dr-saadia-irfan",
    sheetSlug: "dr-saadia-irfan",
    displayName: "Dr Saadia Irfan",
    specialty: "Paediatric Consultant",
    seoTitle:
      "Dr Saadia Irfan — Paediatric Consultant | IMC 419347 | Global Health Ireland",
    seoDescription:
      "Book an online paediatric consultation with Dr Saadia Irfan — IMC-registered Paediatric Consultant (IMC 419347). 17 years experience. CHI Tallaght, Crumlin, Temple Street. English, Urdu and Punjabi. Same-day appointments available.",
    bio: `Dr Saadia Irfan is a Paediatric Consultant with over 17 years of clinical experience across Ireland, Saudi Arabia and Pakistan — one of the most extensively trained paediatricians available through online consultation in Ireland.

She has served as a Neurodisability Registrar at Children's Health Ireland (CHI Tallaght Hospital) and held senior registrar positions at some of Ireland's most prestigious paediatric institutions: the Rotunda Hospital, Our Lady's Children's Hospital Crumlin, and Temple Street University Hospital. Her clinical background spans critical paediatric specialties including Neonatology, Paediatric Intensive Care (PICU), Emergency Paediatrics, Neurodisability and General Paediatrics.

Dr Irfan has particular expertise in neonatal resuscitation, advanced paediatric life support, and the perioperative care of infants with complex cardiac and surgical conditions — a level of clinical depth that is rarely available through an online consultation and that gives parents access to specialist-level assessment for concerns that might otherwise require months of waiting.

Beyond clinical practice, Dr Irfan is a dedicated medical educator. She has served as Adjunct Clinical Lecturer at University College Cork and has contributed to paediatric medicine through research publications and award-nominated clinical audits.

What she treats:
• General paediatrics — child health reviews, growth and development concerns, fever and acute illness
• Emergency paediatric assessment — acute respiratory distress, febrile seizures, allergic reactions and anaphylaxis
• Neurodisability and developmental paediatrics — assessment and management of children with complex neurodevelopmental needs, including autism, ADHD, developmental delay and cerebral palsy
• Neonatology queries — neonatal concerns, feeding difficulties, newborn health questions
• Paediatric intensive care and complex conditions — second opinions for parents of children with complex or chronic conditions
• Preventive paediatrics — immunisation guidance, health screenings, chronic disease management
• Paediatric mental health — anxiety, school refusal, behavioural concerns

What to expect from your consultation: Dr Irfan will take a full developmental and clinical history for your child, review any existing reports, letters or investigation results you share in advance, and provide a clear clinical assessment with recommendations for next steps. Parents are encouraged to have the child present where possible, but consultations can also take place with a parent alone where clinically appropriate. At the end of the consultation you will receive a clinical note summarising findings and recommendations.

Who this consultation is for: This consultation is suitable for parents concerned about their child's development, growth, behaviour or health — including children with existing diagnoses who need specialist review, children awaiting assessment on long HSE waiting lists, newborns and infants with feeding or health concerns, and children presenting with acute illness that requires same-day specialist review.

Her approach: Dr Irfan combines the clinical depth of a specialist trained in Ireland's leading children's hospitals with the accessibility of an online consultation. She consults in English, Urdu and Punjabi — making her one of the very few paediatric specialists in Ireland accessible to Urdu and Punjabi-speaking families without language barriers. She is known for clear communication with parents, evidence-based assessment and practical guidance that families can act on.

Languages: English · Urdu · Punjabi`,
    qualifications: [
      "Neurodisability Registrar — Children's Health Ireland, CHI Tallaght Hospital",
      "Senior Registrar — Rotunda Hospital, Dublin",
      "Senior Registrar — Our Lady's Children's Hospital Crumlin, Dublin",
      "Senior Registrar — Temple Street University Hospital, Dublin",
      "Adjunct Clinical Lecturer — University College Cork (UCC)",
      "17+ years clinical experience across Ireland, Saudi Arabia and Pakistan",
      "Advanced Paediatric Life Support certified",
      "Neonatal resuscitation specialist",
      "Registered with the Irish Medical Council (IMC 419347 — Specialist Division)",
    ],
    languages: ["English", "Urdu", "Punjabi"],
    faqs: [
      {
        question: "Is Dr Saadia Irfan registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Saadia Irfan holds active registration with the Irish Medical Council — IMC number 419347 on the Specialist Division. You can verify this registration at medicalcouncil.ie. Dr Irfan has over 17 years of paediatric experience and has trained at Children's Health Ireland (CHI Tallaght), Our Lady's Children's Hospital Crumlin, Temple Street University Hospital and the Rotunda Hospital.",
      },
      {
        question: "What paediatric conditions does Dr Irfan treat?",
        answer:
          "Dr Irfan provides paediatric consultant assessments covering general child health (growth, development, fever, acute illness), neurodisability and developmental paediatrics (autism, ADHD, developmental delay, cerebral palsy), emergency paediatric assessment (respiratory distress, febrile seizures, allergic reactions), neonatology queries (newborn concerns, feeding difficulties), second opinions for children with complex or chronic conditions, preventive paediatrics (immunisation, health screenings) and paediatric mental health (anxiety, school refusal, behavioural concerns).",
      },
      {
        question:
          "Can I book a paediatric consultation online without being referred by a GP?",
        answer:
          "Yes — no referral is required to book a paediatric consultation with Dr Irfan through Global Health. You can book directly. If your child has existing paediatric reports, developmental assessments or GP letters, sharing these in advance will help Dr Irfan prepare a more targeted assessment. They are not required to book.",
      },
      {
        question:
          "Can Dr Irfan help if my child is on a long HSE waiting list for assessment?",
        answer:
          "Yes. Many parents book a consultation with Dr Irfan while waiting for HSE paediatric or neurodevelopmental assessments — which can take 18 months or more. Dr Irfan can provide an independent specialist assessment, offer a clinical opinion on your child's needs, and produce a letter or report that may support prioritisation through the public system. She can also advise on private assessment pathways and interim management strategies while you wait.",
      },
      {
        question: "How do I book a paediatric consultation with Dr Irfan?",
        answer:
          "Select 'Pick a time' on this page to view Dr Irfan's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call and are available in English, Urdu and Punjabi. Where possible, please have your child present for the consultation.",
      },
      {
        question: "What are Dr Irfan's qualifications and experience?",
        answer:
          "Dr Saadia Irfan has over 17 years of paediatric experience across Ireland, Saudi Arabia and Pakistan. She has served as a Neurodisability Registrar at Children's Health Ireland (CHI Tallaght) and held senior registrar positions at the Rotunda Hospital, Our Lady's Children's Hospital Crumlin, and Temple Street University Hospital. She is Adjunct Clinical Lecturer at University College Cork and holds advanced certification in paediatric life support and neonatal resuscitation.",
      },
    ],
  },
  {
    dbSlug: "dr-muhammad-mataro",
    sheetSlug: "dr-muhammad-mataro",
    displayName: "Dr Muhammad Mataro",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Muhammad Mataro — GP | IMC 425239 | FRCGP | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Muhammad Mataro — IMC-registered GP in Ireland (IMC 425239). FRCGP International · MICGP · 10+ years experience. English, Arabic, Urdu, Siraiki and Sindhi. Same-day appointments available.",
    bio: `Dr Muhammad Mataro Moosani is a Specialist General Practitioner with over 10 years of independent post-residency clinical experience across Ireland, Saudi Arabia and Pakistan. He holds the Fellowship of the Royal College of General Practitioners (FRCGP International, UK) — the highest professional qualification in general practice from the UK's leading GP college — and is a Member of the Irish College of General Practitioners (MICGP), holding specialist registration with the Irish Medical Council.

His medical training began with a four-year structured residency at the Aga Khan University Hospital — one of South Asia's most internationally recognised academic medical centres — and has continued with the completion of the ICGP-IMG Rural GP Program in Ireland. He also holds the MCPS in Family Medicine from the College of Physicians and Surgeons Pakistan and an MBBS degree.

Throughout his career Dr Moosani has managed the full breadth of primary care — from acute illness and chronic disease management to paediatrics, mental health, preventive health and palliative care. He is an advocate for mental health and social justice, contributing to health education through media and community volunteering.

Dr Moosani is one of the few GPs in Ireland who can consult in English, Arabic, Urdu, Siraiki and Sindhi — making him exceptionally accessible to patients from South Asian and Arabic-speaking communities who may face significant language barriers when accessing healthcare in Ireland.

What he treats:
• Chronic disease management — diabetes, hypertension, thyroid disorders, high cholesterol, asthma and COPD
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Paediatric and child health — child health reviews, growth and development, common childhood illnesses
• Mental health — anxiety, depression, stress, sleep difficulties and specialist referral
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Palliative care — symptom management and supportive care planning
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Moosani will take a full clinical history, review any existing results or letters you share in advance, and provide a clear management plan. Consultations are available same-day and in five languages. At the end of the consultation you will receive a clinical note summarising the assessment, any prescriptions issued and recommended next steps.

Who this consultation is for: This consultation is suitable for patients who need a GP for acute illness, chronic disease review, prescription renewal, mental health assessment, preventive health screening or a sick cert. It is particularly suited to patients from South Asian and Arabic-speaking communities in Ireland who have had difficulty accessing a GP who speaks their language.

His approach: Dr Moosani practises evidence-based, patient-centred medicine with a particular sensitivity to the social and cultural dimensions of health. His background spans three countries and multiple healthcare systems — giving him a practical understanding of the barriers patients face and a flexible, pragmatic approach to primary care. He is committed to accessible healthcare and to meeting patients where they are, both clinically and culturally.

Languages: English · Arabic · Urdu · Siraiki · Sindhi`,
    qualifications: [
      "FRCGP International (UK) — Fellow of the Royal College of General Practitioners",
      "MICGP — Member of the Irish College of General Practitioners",
      "MCPS (FM) — Member of the College of Physicians and Surgeons Pakistan (Family Medicine)",
      "MBBS — Bachelor of Medicine and Bachelor of Surgery",
      "Four-year structured residency — Aga Khan University Hospital",
      "ICGP-IMG Rural GP Program — Ireland",
      "Specialist Registration — General Practice, Irish Medical Council (IMC 425239)",
    ],
    languages: ["English", "Arabic", "Urdu", "Siraiki", "Sindhi"],
    faqs: [
      {
        question: "Is Dr Muhammad Mataro registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Muhammad Mataro Moosani holds active specialist registration with the Irish Medical Council — IMC number 425239 on the Specialist Division. You can verify this registration at medicalcouncil.ie. Dr Moosani also holds the FRCGP International from the Royal College of General Practitioners (UK) and is a Member of the Irish College of General Practitioners (MICGP).",
      },
      {
        question: "What does Dr Mataro treat?",
        answer:
          "Dr Moosani provides GP consultations covering chronic disease management (diabetes, hypertension, thyroid, cholesterol, asthma, COPD), acute illness (respiratory infections, fever, flu, sore throat, UTIs), paediatric and child health, mental health (anxiety, depression, stress, sleep difficulties), preventive health screenings, palliative care, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "What languages does Dr Mataro consult in?",
        answer:
          "Dr Moosani consults in English, Arabic, Urdu, Siraiki and Sindhi — making him one of the most linguistically accessible GPs available through online consultation in Ireland. For patients from Pakistani, South Asian or Arabic-speaking communities who have experienced language barriers when accessing healthcare in Ireland, this represents a significant opportunity to receive care in their first language.",
      },
      {
        question: "What is the FRCGP and why does it matter?",
        answer:
          "The FRCGP (Fellowship of the Royal College of General Practitioners) is the highest professional qualification in general practice awarded by the Royal College of General Practitioners in the United Kingdom — the world's largest professional body for GPs. It recognises sustained excellence in clinical practice, professional development and contribution to general practice. Combined with his MICGP, Dr Moosani holds the two highest GP qualifications relevant to practice in Ireland and the UK — a level of accreditation held by a small minority of GPs.",
      },
      {
        question: "How do I book a consultation with Dr Mataro?",
        answer:
          "Select 'Pick a time' on this page to view Dr Moosani's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call and are available in English, Arabic, Urdu, Siraiki and Sindhi.",
      },
      {
        question: "What are Dr Mataro's qualifications and training?",
        answer:
          "Dr Muhammad Mataro Moosani holds the FRCGP International (UK), MICGP, MCPS in Family Medicine from the College of Physicians and Surgeons Pakistan, and an MBBS degree. He completed a four-year structured residency at the Aga Khan University Hospital and has over 10 years of post-residency clinical experience across Ireland, Saudi Arabia and Pakistan. He has also completed the ICGP-IMG Rural GP Program in Ireland.",
      },
    ],
  },
  {
    dbSlug: "dr-abdelrahman-mustafa",
    sheetSlug: "dr-abdelrahman-mustafa",
    displayName: "Dr Abdelrahman Mustafa",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Abdelrahman Mustafa — GP | IMC 431361 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Abdelrahman Mustafa — IMC-registered GP in Ireland (IMC 431361). MBBS · MSc Family Medicine · Emergency Medicine experience at Mayo University Hospital. English and Arabic. Same-day appointments available.",
    bio: `Dr Abdelrahman Mustafa is a General Practitioner with over a decade of clinical experience across Ireland, Europe and the Middle East — bringing a background that combines structured family medicine training with hands-on emergency medicine experience that few GPs in online practice can match.

He currently works as a Medical Officer at Laya Health & Wellbeing Clinic in Galway, conducting comprehensive patient assessments, developing individualised treatment plans and delivering preventive care alongside multidisciplinary healthcare teams. He has also served as an Emergency Medicine Registrar and Senior House Officer at Mayo University Hospital, where he managed acutely ill patients, performed emergency procedures and supervised junior clinical staff.

Dr Mustafa holds a Bachelor of Medicine and Surgery (MBBS) and a Master of Science in Family Medicine — a structured postgraduate qualification covering internal medicine, paediatrics, emergency medicine, obstetrics and gynaecology, surgery, psychiatry, dermatology, ENT and ophthalmology. He is certified in Basic Life Support (BLS), Advanced Life Support (ALS), and is an Immediate Life Support (ILS) Instructor — meaning he is not only certified in these techniques but qualified to train other clinicians in them.

Prior to Ireland, Dr Mustafa practiced extensively as a GP in Sudan, delivering comprehensive primary care for patients of all ages across acute, chronic and emergency presentations. This breadth of experience across multiple healthcare systems gives him a practical, adaptable approach to primary care.

What he treats:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Chronic disease management — diabetes, hypertension, thyroid disorders, high cholesterol, asthma and COPD
• Emergency and urgent care assessment — acute presentations that need same-day clinical review
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Paediatric concerns — child health queries, common childhood illnesses, developmental questions
• Men's and women's health — general health concerns, hormonal queries, sexual health
• Mental health — anxiety, depression, stress management and referral
• Prescription renewals and medication reviews
• Sick notes and medical certificates
• Dermatological concerns — acne, eczema, rashes, skin conditions

What to expect from your consultation: Dr Mustafa will take a full clinical history, review any existing results or letters you share in advance, and provide a clear management plan with next steps. His emergency medicine background means he is particularly skilled at assessing whether a concern needs urgent in-person care or can be safely managed online — giving patients a clear, confident answer rather than a generic referral.

Who this consultation is for: This consultation is suitable for patients with acute or chronic health concerns who need same-day access to a GP. It is particularly suited to patients who want a clinician with emergency medicine experience assessing an urgent but non-emergency concern, and to Arabic-speaking patients in Ireland who need a GP consultation in their first language.

His approach: Dr Mustafa is known for calm, clear clinical judgment under pressure — a skill honed through years of emergency medicine practice. He combines this with the structured, relationship-centred approach of family medicine, giving patients both the reassurance of sound clinical decision-making and the continuity of a GP who takes time to understand their full health picture. He consults in English and Arabic.

Languages: English · Arabic`,
    qualifications: [
      "MBBS — Bachelor of Medicine and Bachelor of Surgery",
      "MSc Family Medicine — structured postgraduate training",
      "ILS Instructor — Immediate Life Support (qualified to train other clinicians)",
      "ALS — Advanced Life Support certified",
      "BLS — Basic Life Support certified",
      "Emergency Medicine Registrar & Senior House Officer — Mayo University Hospital, Ireland",
      "Medical Officer — Laya Health & Wellbeing Clinic, Galway, Ireland",
      "GP experience — Sudan (primary, acute and emergency care)",
      "Registered with the Irish Medical Council (IMC 431361)",
    ],
    languages: ["English", "Arabic"],
    faqs: [
      {
        question:
          "Is Dr Abdelrahman Mustafa registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Abdelrahman Mustafa holds active registration with the Irish Medical Council — IMC number 431361. You can verify this registration at medicalcouncil.ie. Dr Mustafa currently works as a Medical Officer at Laya Health & Wellbeing Clinic in Galway and previously served as an Emergency Medicine Registrar at Mayo University Hospital.",
      },
      {
        question: "What does Dr Mustafa treat?",
        answer:
          "Dr Mustafa provides GP consultations covering acute illness (respiratory infections, fever, flu, UTIs), chronic disease management (diabetes, hypertension, thyroid, asthma, COPD), urgent care assessment, preventive health screenings, paediatric concerns, men's and women's health, mental health (anxiety, depression, stress), dermatological concerns, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "What makes Dr Mustafa's GP background different?",
        answer:
          "Dr Mustafa brings emergency medicine experience that most GPs in online practice do not have. His time as an Emergency Medicine Registrar at Mayo University Hospital means he is particularly skilled at assessing acute and urgent presentations — distinguishing what can be safely managed online from what needs same-day in-person care. He is also an ILS (Immediate Life Support) Instructor, meaning he is qualified not just to perform emergency techniques but to train other clinicians in them. His MSc in Family Medicine adds structured postgraduate depth across nine clinical specialties.",
      },
      {
        question: "Does Dr Mustafa consult in Arabic?",
        answer:
          "Yes. Dr Mustafa is fully fluent in Arabic and consults in both English and Arabic. For Arabic-speaking patients in Ireland — including patients from Sudan, Egypt, Lebanon, Syria, Iraq, Saudi Arabia and other Arabic-speaking countries — this provides access to a fully qualified Irish-registered GP in their first language, without the communication barriers that can affect the quality of clinical care.",
      },
      {
        question: "How do I book a consultation with Dr Mustafa?",
        answer:
          "Select 'Pick a time' on this page to view Dr Mustafa's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English or Arabic.",
      },
      {
        question: "What are Dr Mustafa's qualifications?",
        answer:
          "Dr Abdelrahman Mustafa holds an MBBS and an MSc in Family Medicine covering nine clinical specialty rotations. He is certified in BLS, ALS and is an ILS (Immediate Life Support) Instructor. He has served as an Emergency Medicine Registrar and Senior House Officer at Mayo University Hospital and currently works as a Medical Officer at Laya Health & Wellbeing Clinic in Galway. He has over a decade of clinical experience across Ireland, Europe and the Middle East.",
      },
    ],
  },
  {
    dbSlug: "dr-mariam-faiz",
    sheetSlug: "dr-mariam-faiz",
    displayName: "Dr Mariam Faiz",
    specialty: "General Practitioner & Aesthetic Physician",
    seoTitle:
      "Dr Mariam Faiz — GP & Aesthetic Physician | IMC 429554 | Global Health Ireland",
    seoDescription:
      "Book a GP or aesthetic consultation with Dr Mariam Faiz — IMC-registered doctor in Ireland (IMC 429554). Anaesthesia background · South Infirmary Victoria University Hospital. GP consultations and medical aesthetic planning in English, Urdu and Punjabi.",
    bio: `Dr Mariam Faiz is a General Practitioner and Aesthetic Physician with a clinical background that sets her apart from both typical GPs and typical aesthetic practitioners. Her training as an Anaesthesia Registrar at the South Infirmary Victoria University Hospital gives her a level of medical precision, anatomical knowledge and safety expertise that most aesthetic practitioners — medically qualified or otherwise — do not possess.

She provides two distinct services through Global Health: comprehensive GP consultations for acute and chronic health concerns, and online aesthetic consultations for patients who want a medically guided, evidence-based assessment before undergoing any aesthetic procedure.

As an Aesthetic Physician, Dr Faiz specialises in bespoke skin treatment planning — including assessment for Botox, dermal fillers, polynucleotides, skin boosters (Profhilo) and chemical peels. Her aesthetic online consultation provides patients with a comprehensive skin analysis, a personalised treatment plan, and clinical guidance on what procedures are appropriate for their anatomy, skin type and goals — and which are not. Her surgical background as an assistant in cosmetic procedures gives her a deep, practical understanding of facial anatomy that directly informs her treatment planning.

Beyond clinical practice, Dr Faiz is a medical educator — having lectured in Biochemistry, Anatomy and Radiology — and has contributed to health awareness through radio broadcasting and community programmes.

What she treats — GP consultations:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Chronic disease management — hypertension, diabetes, thyroid disorders, high cholesterol
• Men's and women's health — hormonal concerns, contraception, sexual health
• Mental health — anxiety, depression, stress management and referral
• Skin concerns — acne, eczema, rashes, dermatological assessment
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What she offers — Aesthetic Consultation:
• Comprehensive skin analysis by video consultation
• Personalised aesthetic treatment plan — assessment for Botox, dermal fillers, polynucleotides, Profhilo and chemical peels
• Medical screening for aesthetic suitability — identifying contraindications and risk factors before any procedure
• Guidance on realistic outcomes and treatment sequencing
• Post-procedure concern review — assessment of outcomes after in-person treatment

Important note: Aesthetic procedures (injections, peels) require an in-person appointment at a clinic. The online aesthetic consultation with Dr Faiz is the medical planning and assessment consultation that should precede any aesthetic procedure.

What to expect from your consultation: For GP consultations: Dr Faiz will take a full clinical history and provide a clear management plan with next steps. For aesthetic consultations: she will conduct a structured skin and facial analysis by video, discuss your goals and concerns, identify any contraindications, and provide a written treatment plan you can take to any clinic or use as the basis for further discussion.

Who this consultation is for: GP consultations are suitable for any health concern requiring same-day access to a doctor. Aesthetic consultations are particularly suited to patients who are considering Botox, fillers or skin treatments for the first time and want proper medical guidance before proceeding — patients who have had a previous aesthetic complication and want a medically qualified assessment — and patients who want a second opinion on a treatment plan from an aesthetic clinic.

Her approach: Dr Faiz combines the clinical rigour of an anaesthesia-trained physician with a genuine passion for aesthetic medicine. Her approach to aesthetics is medical-first — rooted in anatomical precision, safety protocols and individualised assessment rather than a one-size-fits-all treatment menu. She consults in English, Urdu and Punjabi.

Languages: English · Urdu · Punjabi`,
    qualifications: [
      "Anaesthesia Registrar — South Infirmary Victoria University Hospital, Ireland",
      "Aesthetic Physician — injectable aesthetics, skin rejuvenation, cosmetic procedure assistance",
      "Lecturer — Biochemistry, Anatomy and Radiology",
      "Advanced skills: emergency vascular occlusion management, anaphylaxis protocols",
      "BLS/ALS certified",
      "Registered with the Irish Medical Council (IMC 429554 — General Division)",
    ],
    languages: ["English", "Urdu", "Punjabi"],
    faqs: [
      {
        question: "Is Dr Mariam Faiz registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Mariam Faiz holds active registration with the Irish Medical Council — IMC number 429554 on the General Division. You can verify this registration at medicalcouncil.ie. She is a qualified medical doctor with a background in Anaesthesiology and Critical Care, currently practicing as a GP and Aesthetic Physician through Global Health.",
      },
      {
        question:
          "What is an aesthetic consultation with Dr Faiz and what does it include?",
        answer:
          "An aesthetic consultation with Dr Faiz is a structured medical assessment by video call for patients considering Botox, dermal fillers, polynucleotides, skin boosters (Profhilo) or chemical peels. During the consultation Dr Faiz will conduct a facial and skin analysis, review your medical history for contraindications, discuss your aesthetic goals and provide a personalised written treatment plan. Aesthetic procedures themselves — injections and peels — require an in-person appointment at a clinic. The online consultation is the medical planning step that should precede any aesthetic procedure.",
      },
      {
        question:
          "What makes Dr Faiz's aesthetic consultations different from a consultation at a beauty clinic?",
        answer:
          "Dr Faiz is a fully qualified medical doctor registered with the Irish Medical Council — not an aesthetic therapist or nurse prescriber. Her background as an Anaesthesia Registrar at South Infirmary Victoria University Hospital gives her specialist knowledge of facial anatomy, vascular structures and emergency protocols that most aesthetic practitioners do not have. She is trained in emergency vascular occlusion management and anaphylaxis protocols — the serious complications that can arise from aesthetic procedures — and her treatment planning reflects this clinical depth. Patients receive a medically rigorous assessment, not a sales consultation.",
      },
      {
        question: "What GP services does Dr Faiz provide?",
        answer:
          "Dr Faiz provides comprehensive GP consultations covering acute illness (respiratory infections, fever, flu, UTIs), chronic disease management (hypertension, diabetes, thyroid, cholesterol), men's and women's health, mental health assessment and referral, skin concerns, preventive health screenings, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "How do I book a consultation with Dr Faiz?",
        answer:
          "Select 'Pick a time' on this page to view Dr Faiz's available appointment slots — for both GP consultations and aesthetic consultations. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English, Urdu or Punjabi.",
      },
      {
        question: "What are Dr Faiz's qualifications?",
        answer:
          "Dr Mariam Faiz is a medical doctor registered with the Irish Medical Council (IMC 429554). She has trained as an Anaesthesia Registrar at South Infirmary Victoria University Hospital in Ireland and has extensive experience as an Aesthetic Physician with specialist skills in injectable aesthetics and skin rejuvenation. She has lectured in Biochemistry, Anatomy and Radiology and holds certification in advanced emergency protocols including vascular occlusion management.",
      },
    ],
  },
  {
    dbSlug: "dr-arooj-iqbal-lodhi",
    sheetSlug: "dr-arooj-iqbal-lodhi",
    displayName: "Dr Arooj Iqbal Lodhi",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Arooj Iqbal Lodhi — GP & Dermatology | IMC 434132 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Arooj Iqbal Lodhi — IMC-registered GP in Ireland (IMC 434132). Postgraduate Diploma in Dermatology (RCPI) · SHO at South Tipperary General Hospital. Same-day appointments available.",
    bio: `Dr Arooj Iqbal Lodhi is a General Practitioner with a strong hospital medicine background and a Postgraduate Diploma in Dermatology from the Royal College of Physicians of Ireland (RCPI) — a qualification that gives her specialist-level skin assessment skills within a GP consultation.

She currently works as a Senior House Officer in General Internal Medicine at South Tipperary General Hospital, managing both virtual and in-person outpatient follow-ups, conducting ward rounds alongside consultants, and applying evidence-based clinical decision-making across a broad range of medical presentations. This active hospital role keeps her clinical skills current and closely connected to specialist-level medicine.

Dr Lodhi is registered with both the Irish Medical Council and the Pakistan Medical & Dental Council, reflecting international clinical experience across hospital and primary care settings. Her background spans general practice, internal medicine, paediatrics, psychiatry, gynaecology and obstetrics, and ophthalmic surgery — a breadth of rotational experience that informs her approach to primary care.

She has managed acute and chronic conditions across the full GP spectrum, with a particular interest in dermatology, mental health, women's health and chronic disease management. Her procedural experience includes phlebotomy, cannulation, catheterisation, neonatal resuscitation and minor surgical procedures. She holds current certification in BLS and ACLS.

Dr Lodhi is passionate about patient education, lifestyle counselling and shared decision-making — recognising that long-term health outcomes depend on patients understanding their condition, not just their prescription.

What she treats:
• Skin conditions — acne, eczema, psoriasis, rashes, pigmentation, suspicious lesion assessment (Postgraduate Diploma in Dermatology, RCPI)
• Chronic disease management — diabetes, hypertension, asthma, COPD, thyroid disorders
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Mental health — anxiety, depression, stress management and specialist referral
• Women's health — contraception, hormonal concerns, menstrual issues, preventive screening
• Paediatric concerns — child health queries, common childhood illnesses, developmental questions
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Lodhi will take a full clinical history and review any existing results or letters you share in advance. For skin concerns, high-quality photos of the affected area shared before or during the consultation will help her provide the most accurate assessment. At the end of the consultation you will receive a clinical note with findings, any prescriptions issued and recommended next steps.

Who this consultation is for: This consultation is suitable for patients with any GP-level health concern requiring same-day access to a doctor. It is particularly suited to patients with skin conditions who want a medically qualified assessment beyond a standard GP — Dr Lodhi's RCPI Dermatology diploma means she can assess and manage skin conditions with a depth that most GPs cannot offer online.

Her approach: Dr Lodhi combines the breadth of a GP with the focus of a clinician who has invested significantly in postgraduate training. She is known for warm, clear communication and a genuine commitment to patient education — she believes patients make better health decisions when they understand the reasoning behind their care plan, not just the plan itself.

Languages: English`,
    qualifications: [
      "Postgraduate Diploma in Dermatology — Royal College of Physicians of Ireland (RCPI)",
      "Senior House Officer, General Internal Medicine — South Tipperary General Hospital, Ireland",
      "MBBS — Bachelor of Medicine and Bachelor of Surgery",
      "BLS — Basic Life Support (current)",
      "ACLS — Advanced Cardiovascular Life Support (current)",
      "Registered with the Irish Medical Council (IMC 434132 — General Division)",
      "Registered with the Pakistan Medical & Dental Council",
    ],
    languages: ["English"],
    faqs: [
      {
        question:
          "Is Dr Arooj Iqbal Lodhi registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Arooj Iqbal Lodhi holds active registration with the Irish Medical Council — IMC number 434132 on the General Division. You can verify this registration at medicalcouncil.ie. She is currently working as a Senior House Officer in General Internal Medicine at South Tipperary General Hospital and holds a Postgraduate Diploma in Dermatology from the Royal College of Physicians of Ireland (RCPI).",
      },
      {
        question: "What skin conditions does Dr Lodhi treat?",
        answer:
          "Dr Lodhi holds a Postgraduate Diploma in Dermatology from the Royal College of Physicians of Ireland (RCPI) and can assess and manage a broad range of skin conditions online — including acne (all grades), eczema, psoriasis, rosacea, pigmentation concerns, contact dermatitis, seborrhoeic dermatitis, and rashes of unclear origin. She can also assess suspicious skin lesions and advise on whether an urgent in-person dermatology referral is warranted. For best results, share clear photographs of the affected area before or during the consultation.",
      },
      {
        question:
          "What is the difference between Dr Lodhi's dermatology expertise and a standard GP skin assessment?",
        answer:
          "Most GPs can assess common skin conditions but may not have postgraduate training in dermatology. Dr Lodhi holds a Postgraduate Diploma in Dermatology from the Royal College of Physicians of Ireland — a structured academic and clinical qualification specifically in skin medicine. This means she can assess a wider range of conditions, identify patterns that might be missed in a standard GP assessment, and make more specific treatment recommendations — including for conditions that would otherwise require a specialist referral.",
      },
      {
        question: "What GP services does Dr Lodhi provide beyond dermatology?",
        answer:
          "Dr Lodhi provides comprehensive GP consultations covering chronic disease management (diabetes, hypertension, asthma, COPD, thyroid), acute illness (respiratory infections, fever, flu, UTIs), mental health (anxiety, depression, stress management), women's health (contraception, hormonal concerns, menstrual issues), paediatric health queries, preventive health screenings, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "How do I book a consultation with Dr Lodhi?",
        answer:
          "Select 'Pick a time' on this page to view Dr Lodhi's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. For skin concerns, sharing clear photographs of the affected area before the consultation will help Dr Lodhi provide the most accurate assessment.",
      },
      {
        question: "What are Dr Lodhi's qualifications?",
        answer:
          "Dr Arooj Iqbal Lodhi holds a Postgraduate Diploma in Dermatology from the Royal College of Physicians of Ireland (RCPI), an MBBS, and current certification in BLS and ACLS. She is registered with the Irish Medical Council (IMC 434132) and the Pakistan Medical & Dental Council. She currently works as a Senior House Officer in General Internal Medicine at South Tipperary General Hospital and has broad clinical experience across GP, hospital medicine, paediatrics, psychiatry, gynaecology and obstetrics.",
      },
    ],
  },
  {
    // SPECIAL CASE: primary country in DB is Czech Republic (cz); Ireland copy
    // must go to the DoctorCountry(ie) DoctorMarketTranslation EN row, never
    // to the base Doctor fields. Handled by the patch script.
    dbSlug: "khoiamul-islam",
    sheetSlug: "dr-khoiamul-islam",
    displayName: "Dr Khoiamul Islam",
    specialty: "General Practitioner",
    seoTitle: "Dr Khoiamul Islam — GP | IMC 542074 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Khoiamul Islam — IMC-registered GP in Ireland (IMC 542074). MUDr. Masaryk University Brno. Trained at University Hospital Brno, Mater Dei Malta and University of Pécs. English, Czech, Urdu, Hindi and Bangla. Same-day appointments available.",
    bio: `Dr Khoiamul Islam is a General Practitioner holding a Doctor of Medicine (MUDr.) in General Medicine from Masaryk University, Faculty of Medicine in Brno — one of Europe's most internationally recognised medical schools, with strong clinical training programmes across Czech Republic, Malta and Hungary.

His clinical internships spanned ten medical specialties — General Practice, Paediatrics, Geriatrics, Cardiology, Nephrology, Rheumatology, Gynaecology, Surgery, Radiology and ENT — at University Hospital Brno, Mater Dei Hospital in Malta and the University of Pécs in Hungary. This breadth of rotational experience across three countries and three healthcare systems gives him a genuinely holistic perspective on patient assessment that is unusual in a GP at this stage of career.

Dr Islam is trained in Basic and Advanced Life Support (BLS & ALS) according to European Resuscitation Council standards and holds phlebotomy certification. His clinical skills include patient assessment, preventive care, chronic disease follow-up, clinical documentation and coordination with specialist services.

Dr Islam consults in English, Czech, Urdu, Hindi and Bangla — giving patients from Bangladeshi, Pakistani, Indian and Czech communities in Ireland the opportunity to discuss their health in their first language with a fully IMC-registered doctor.

What he treats:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Chronic disease management — hypertension, diabetes, thyroid disorders, high cholesterol, asthma and COPD
• Preventive care — health screenings, lifestyle assessments, vaccination guidance and health checks
• Paediatric concerns — child health queries, common childhood illnesses, developmental questions
• Geriatric health — older adult health reviews, medication management, chronic condition monitoring
• Men's and women's health — hormonal concerns, contraception, sexual health
• Mental health — anxiety, depression, stress management and specialist referral
• Musculoskeletal concerns — joint pain, back pain, muscle conditions
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Islam will take a structured clinical history, identify any red flags requiring urgent in-person care, and provide a clear evidence-based management plan. He is particularly experienced in the structured clinical interview format that works well in telemedicine — asking the right questions, in the right order, to reach a safe clinical conclusion remotely. At the end of the consultation you will receive a clinical note with findings and next steps.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to patients from South Asian, Bangladeshi and Czech-speaking communities in Ireland who have experienced language barriers when accessing healthcare, and to patients who want a GP with broad hospital medicine exposure assessing a concern that bridges primary and secondary care.

His approach: Dr Islam approaches every consultation with a structured, evidence-based methodology — taking time to listen, identify warning signs, explain findings clearly and involve patients in decisions about their own care. His multidisciplinary training across ten specialties means he is comfortable assessing presentations that cross specialty boundaries, which is particularly relevant in online GP consultations where the full picture may be complex.

Languages: English · Czech · Urdu · Hindi · Bangla`,
    qualifications: [
      "Doctor of Medicine (MUDr.) — Masaryk University, Faculty of Medicine, Brno, Czech Republic",
      "Clinical internships — University Hospital Brno, Mater Dei Hospital Malta, University of Pécs Hungary",
      "Specialties trained: General Practice, Paediatrics, Geriatrics, Cardiology, Nephrology, Rheumatology, Gynaecology, Surgery, Radiology and ENT",
      "BLS & ALS — European Resuscitation Council standards",
      "Phlebotomy certification",
      "Registered with the Irish Medical Council (IMC 542074 — General Division)",
    ],
    languages: ["English", "Czech", "Urdu", "Hindi", "Bangla"],
    faqs: [
      {
        question: "Is Dr Khoiamul Islam registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Khoiamul Islam holds active registration with the Irish Medical Council — IMC number 542074 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Islam holds an MUDr. in General Medicine from Masaryk University, Faculty of Medicine in Brno, and completed clinical training at University Hospital Brno, Mater Dei Hospital in Malta and the University of Pécs in Hungary.",
      },
      {
        question: "What does Dr Islam treat?",
        answer:
          "Dr Islam provides GP consultations covering acute illness (respiratory infections, fever, flu, sore throat, UTIs), chronic disease management (hypertension, diabetes, thyroid, cholesterol, asthma, COPD), preventive health screenings, paediatric and geriatric health concerns, men's and women's health, mental health (anxiety, depression, stress), musculoskeletal concerns (joint pain, back pain), prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "What languages does Dr Islam consult in?",
        answer:
          "Dr Islam consults in English, Czech, Urdu, Hindi and Bangla — making him one of the most linguistically accessible GPs available through online consultation in Ireland. For patients from Bangladeshi, Pakistani, Indian and Czech-speaking communities who have experienced language barriers when accessing healthcare in Ireland, Dr Islam provides access to a fully IMC-registered GP in their first language.",
      },
      {
        question: "Where did Dr Islam train and why does it matter?",
        answer:
          "Dr Islam completed his MUDr. at Masaryk University, Faculty of Medicine in Brno — one of Central Europe's most internationally recognised medical schools — and undertook clinical internships at University Hospital Brno (Czech Republic), Mater Dei Hospital (Malta) and the University of Pécs (Hungary). This training across three countries and three healthcare systems, spanning ten clinical specialties, gives him a breadth of clinical exposure that is unusual for a GP and particularly relevant for telemedicine — where the ability to assess a wide range of presentations accurately from a clinical history alone is essential.",
      },
      {
        question: "How do I book a consultation with Dr Islam?",
        answer:
          "Select 'Pick a time' on this page to view Dr Islam's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call and are available in English, Czech, Urdu, Hindi or Bangla.",
      },
      {
        question: "What are Dr Islam's qualifications?",
        answer:
          "Dr Khoiamul Islam holds an MUDr. in General Medicine from Masaryk University, Faculty of Medicine, Brno. He completed clinical internships across ten specialties at University Hospital Brno, Mater Dei Hospital Malta and the University of Pécs Hungary. He holds BLS and ALS certification from the European Resuscitation Council and phlebotomy certification. He is registered with the Irish Medical Council (IMC 542074).",
      },
    ],
  },
  {
    dbSlug: "dr-mirza-aun-mohammad",
    sheetSlug: "dr-mirza-aun-muhammad",
    displayName: "Dr Mirza Aun Muhammad",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Mirza Aun Muhammad — GP | IMC 429743 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Mirza Aun Muhammad — IMC-registered GP in Ireland (IMC 429743). Clinical Audit Professional of the Year 2023 · National Maternity Hospital · CHI Crumlin · Paediatrics & Emergency Medicine background. Same-day appointments available.",
    bio: `Dr Mirza Aun Muhammad is a General Practitioner with an exceptional clinical and academic record — holding licences to practice in Ireland, the United Kingdom and Pakistan, and bringing international experience across Paediatrics, Primary Care, Emergency Medicine and Anaesthesiology to his online GP practice.

He was named Clinical Audit Professional of the Year 2023 by CASC UK — a national recognition of excellence in clinical quality and patient safety — and graduated with a Gold Medal as the Best Medical Graduate of his class. He serves as a Faculty Member and Postgraduate Clinical Assessor for Healthcare Skills Training International in Scotland, contributing to the training and assessment of the next generation of clinicians.

His Irish hospital experience includes a Postgraduate Resident post in Neonatology at the National Maternity Hospital and Paediatric Emergency Medicine at Children's Health Ireland (CHI Crumlin) — two of Ireland's most prestigious and demanding clinical environments. He has also held registrar positions in Emergency Services and Anaesthesiology, and has significant experience as a primary care physician.

Dr Mirza Aun Muhammad is a member of the Royal College of Physicians of Ireland in Paediatrics and is currently pursuing specialist training in Dermatology — adding a further layer of skin medicine expertise to his already broad clinical background.

What he treats:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Chronic disease management — hypertension, diabetes, thyroid disorders, high cholesterol, asthma and COPD
• Paediatric and child health — child health reviews, growth and development, common childhood illnesses, newborn concerns
• Skin concerns — acne, eczema, rashes, dermatological assessment (with specialist training in Dermatology in progress)
• Emergency and urgent care assessment — acute presentations requiring same-day clinical review
• Men's and women's health — hormonal concerns, contraception, sexual health
• Mental health — anxiety, depression, stress management and specialist referral
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Mirza Aun Muhammad will take a full clinical history, identify any red flags, and provide a clear evidence-based management plan. His background in clinical audit means he applies systematic, quality-focused thinking to every consultation — ensuring safe, documented and accountable care. At the end of the consultation you will receive a clinical note with findings and next steps.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to parents with concerns about their child's health — Dr Mirza's neonatology and paediatric emergency background means he can assess paediatric presentations with a level of clinical confidence few online GPs can match. It is also suited to patients who want a GP with strong quality and safety credentials managing their care.

His approach: Dr Mirza Aun Muhammad brings a quality-first approach to primary care — shaped by his award-winning work in clinical audit, his role as a postgraduate clinical assessor, and his training across multiple high-acuity hospital environments. He is known for calm, systematic clinical thinking and a genuine commitment to patient safety. He believes that the same rigour applied to a complex hospital case should apply to every online GP consultation.

Languages: English`,
    qualifications: [
      "Clinical Audit Professional of the Year 2023 — CASC UK",
      "Gold Medal — Best Medical Graduate of class",
      "Postgraduate Resident in Neonatology — National Maternity Hospital, Ireland",
      "Postgraduate Resident in Paediatric Emergency Medicine — Children's Health Ireland, CHI Crumlin",
      "Member — Royal College of Physicians of Ireland (Paediatrics)",
      "Faculty Member & Postgraduate Clinical Assessor — Healthcare Skills Training International, Scotland",
      "Currently pursuing specialist training in Dermatology",
      "Licensed to practice in Ireland, United Kingdom and Pakistan",
      "Registered with the Irish Medical Council (IMC 429743 — General Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question:
          "Is Dr Mirza Aun Muhammad registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Mirza Aun Muhammad holds active registration with the Irish Medical Council — IMC number 429743 on the General Division. You can verify this registration at medicalcouncil.ie. He is also licensed to practice in the United Kingdom and Pakistan, and is a member of the Royal College of Physicians of Ireland in Paediatrics.",
      },
      {
        question: "What does Dr Mirza Aun Muhammad treat?",
        answer:
          "Dr Mirza Aun Muhammad provides GP consultations covering acute illness (respiratory infections, fever, flu, sore throat, UTIs), chronic disease management (hypertension, diabetes, thyroid, cholesterol, asthma, COPD), paediatric and child health, skin concerns, urgent care assessment, men's and women's health, mental health (anxiety, depression, stress), preventive health screenings, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "What makes Dr Mirza Aun Muhammad's background distinctive?",
        answer:
          "Dr Mirza Aun Muhammad was named Clinical Audit Professional of the Year 2023 by CASC UK — a national recognition of excellence in clinical quality and patient safety — and graduated with a Gold Medal as the Best Medical Graduate of his class. His Irish hospital experience includes Neonatology at the National Maternity Hospital and Paediatric Emergency Medicine at Children's Health Ireland CHI Crumlin, two of Ireland's most demanding clinical environments. He also serves as a Faculty Member and Postgraduate Clinical Assessor for Healthcare Skills Training International in Scotland — meaning he trains and assesses other clinicians to the same standards he applies in his own practice.",
      },
      {
        question: "Is Dr Mirza Aun Muhammad suitable for paediatric consultations?",
        answer:
          "Yes. Dr Mirza Aun Muhammad has specialist experience in both Neonatology at the National Maternity Hospital and Paediatric Emergency Medicine at Children's Health Ireland CHI Crumlin — two of the most demanding paediatric clinical environments in Ireland. He is also a member of the Royal College of Physicians of Ireland in Paediatrics. While his Global Health profile covers general GP consultations, his paediatric background means he can assess child health concerns — from newborn queries to acute paediatric presentations — with a level of clinical confidence that most GPs cannot offer.",
      },
      {
        question: "How do I book a consultation with Dr Mirza Aun Muhammad?",
        answer:
          "Select 'Pick a time' on this page to view Dr Mirza Aun Muhammad's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call.",
      },
      {
        question: "What are Dr Mirza Aun Muhammad's qualifications and awards?",
        answer:
          "Dr Mirza Aun Muhammad holds a medical degree and is licensed to practice in Ireland, the United Kingdom and Pakistan. He is a member of the Royal College of Physicians of Ireland in Paediatrics and has completed Postgraduate Resident posts in Neonatology at the National Maternity Hospital and Paediatric Emergency Medicine at CHI Crumlin. He was named Clinical Audit Professional of the Year 2023 by CASC UK, graduated with a Gold Medal as Best Medical Graduate, and serves as a Faculty Member and Postgraduate Clinical Assessor for Healthcare Skills Training International in Scotland. He is currently pursuing specialist training in Dermatology.",
      },
    ],
  },
  {
    dbSlug: "dr-malar-vili-rajan",
    sheetSlug: "dr-malar-vili-rajan",
    displayName: "Dr Malar Vili Rajan",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Malar Vili Rajan — GP & Mental Health | IMC 512862 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Malar Vili Rajan — IMC-registered doctor in Ireland (IMC 512862). 4+ years psychiatry experience · mood disorders, anxiety, OCD, trauma, psychosis · General medicine and cardiology background. Same-day appointments available.",
    bio: `Dr Malar Vili Rajan is a General Practitioner with over four years of dedicated clinical experience in psychiatry and general medicine — making her one of the most experienced mental health clinicians available through online GP consultation in Ireland.

She has worked across inpatient, outpatient and emergency psychiatric settings, with particular experience in crisis intervention, suicide risk assessment, liaison psychiatry and mental health assessments for Emergency Department referrals. Her clinical experience spans the full spectrum of adult and adolescent psychiatric presentations — from common conditions such as anxiety and depression to complex diagnoses including OCD, trauma-related conditions, eating disorders, psychosis and personality disorders.

Beyond psychiatry, Dr Rajan brings a strong background in general medicine and cardiology — having managed patients with complex medical conditions including post-cardiac events and COVID-related complications. This dual grounding in mental and physical health allows her to take a genuinely holistic approach to patients where these two dimensions intersect, which is increasingly recognised as essential to good clinical care.

She is currently pursuing specialist training in psychiatry and actively maintains her professional development through continuous medical education, current psychiatric research and best-practice guidelines.

Dr Rajan is known for her warm, empathetic communication style and her ability to build a strong therapeutic relationship within the structure of an online consultation — an important skill given the nature of mental health discussions in a digital setting.

What she treats:
• Mental health — anxiety disorders, depression, bipolar disorder, OCD, PTSD and trauma-related conditions
• Eating disorders — assessment, support and referral
• Psychosis — early psychosis assessment and management support
• Personality disorders — assessment and management
• Adolescent mental health — mood, anxiety, behavioural and developmental concerns in young people
• Older adult mental health — depression, anxiety and cognitive concerns in older adults
• Crisis assessment — mental health crisis support and safety planning
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Chronic disease management — hypertension, diabetes, thyroid disorders
• Cardiology-related concerns — post-cardiac event queries, cardiovascular risk assessment
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Rajan will take a structured clinical and psychiatric history, assess your current presentation and provide a clear evidence-based management plan. For mental health consultations she integrates both pharmacological and psychosocial approaches — and will discuss both options with you clearly. At the end of the consultation you will receive a clinical note with findings, any prescriptions and recommended next steps including referrals where appropriate.

Who this consultation is for: This consultation is suitable for patients with any GP-level health concern. It is particularly suited to patients with mental health concerns — from first-time presentations of anxiety or depression to patients with more complex or longstanding psychiatric histories who want a clinician with real psychiatric depth assessing their care. It is also suited to patients who want a holistic assessment where mental and physical health concerns are considered together.

Her approach: Dr Rajan practises with warmth, clinical rigour and a genuine understanding of how difficult it can be to talk about mental health. She builds the kind of therapeutic relationship that makes honest clinical conversation possible — and brings the same quality of psychiatric assessment to an online consultation that patients would expect in an inpatient or outpatient setting.

Languages: English`,
    qualifications: [
      "MBBS — Bachelor of Medicine and Bachelor of Surgery",
      "4+ years clinical experience — Psychiatry and General Medicine",
      "Experience: inpatient, outpatient and emergency psychiatric settings",
      "Liaison psychiatry — Emergency Department mental health assessments",
      "General medicine and cardiology background",
      "Currently pursuing specialist training in Psychiatry",
      "Registered with the Irish Medical Council (IMC 512862 — General Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question:
          "Is Dr Malar Vili Rajan registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Malar Vili Rajan holds active registration with the Irish Medical Council — IMC number 512862 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Rajan holds an MBBS and has over four years of clinical experience in psychiatry and general medicine across inpatient, outpatient and emergency settings in Ireland.",
      },
      {
        question: "What mental health conditions does Dr Rajan treat?",
        answer:
          "Dr Rajan has extensive experience assessing and managing anxiety disorders, depression, bipolar disorder, OCD, PTSD and trauma-related conditions, eating disorders, psychosis, personality disorders, adolescent mental health presentations, older adult mental health, and crisis presentations. She integrates both pharmacological and psychosocial approaches to treatment — discussing medication options and non-medication interventions clearly with every patient.",
      },
      {
        question: "Can I see Dr Rajan for mental health without a GP referral?",
        answer:
          "Yes — no referral is required to book a mental health consultation with Dr Rajan through Global Health. You can book directly. If you have existing psychiatric letters, assessment reports or GP correspondence, sharing these in advance will help Dr Rajan prepare a more targeted assessment. They are not required to book. For patients in crisis or experiencing thoughts of self-harm, please contact emergency services (999 or 112) or your local crisis line in addition to booking a consultation.",
      },
      {
        question:
          "What is the difference between a GP mental health consultation and seeing Dr Rajan?",
        answer:
          "Most GPs can assess and manage common mental health presentations such as mild to moderate anxiety and depression. Dr Rajan brings four years of dedicated psychiatric clinical experience — including inpatient psychiatry, emergency psychiatric assessment and liaison psychiatry — which means she can assess more complex presentations, interpret psychiatric history in depth, discuss a broader range of treatment options including specific psychotropic medications, and make informed specialist referrals based on direct clinical experience in those services. For patients with more complex mental health histories, or those who have not responded to standard GP management, Dr Rajan's psychiatric background offers a meaningful step up in assessment quality.",
      },
      {
        question: "How do I book a mental health consultation with Dr Rajan?",
        answer:
          "Select 'Pick a time' on this page to view Dr Rajan's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure, confidential video call. If you are experiencing a mental health crisis or thoughts of self-harm, please contact emergency services (999 or 112) or your local crisis line immediately — do not wait for an appointment.",
      },
      {
        question: "What are Dr Rajan's qualifications and experience?",
        answer:
          "Dr Malar Vili Rajan holds an MBBS and has over four years of clinical experience in psychiatry and general medicine. She has worked across inpatient, outpatient and emergency psychiatric settings in Ireland, with particular experience in crisis intervention, suicide risk assessment, liaison psychiatry and Emergency Department mental health referrals. She also has a background in general medicine and cardiology and is currently pursuing specialist training in Psychiatry.",
      },
    ],
  },
  {
    dbSlug: "dr-raza-khan",
    sheetSlug: "dr-raza-khan",
    displayName: "Dr Raza Khan",
    specialty: "General Practitioner",
    seoTitle: "Dr Raza Khan — GP | IMC 520164 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Raza Khan — IMC-registered GP in Ireland (IMC 520164). 9+ years experience · Emergency medicine background · English, Urdu, Arabic, Pashto and Punjabi. Same-day appointments available.",
    bio: `Dr Razaullah Khan is a General Practitioner with over nine years of clinical experience across primary care and emergency medicine in Ireland, Pakistan and Saudi Arabia — bringing a breadth of international clinical exposure and adaptability to diverse healthcare systems that enriches his approach to primary care.

He is registered with the Irish Medical Council and has held full medical registration in both Pakistan and Saudi Arabia. His career spans high-volume emergency department work, out-of-hours primary care services and GP practice, giving him particular strength in the rapid assessment of urgent presentations, early identification of red-flag symptoms and appropriate referral when required.

Dr Khan has extensive hands-on procedural experience including wound suturing, abscess drainage, foreign body removal, nail procedures and basic fracture management with splinting and casting — a level of practical clinical skill that is uncommon in online GP practice and that gives him a grounded, confident approach to acute presentations.

He holds current certification in Advanced Cardiac Life Support (ACLS) and Basic Life Support (BLS) from the American Heart Association.

Dr Khan consults in English, Urdu, Arabic, Pashto and Punjabi — making him one of the most linguistically accessible GPs in Ireland, and one of the very few Irish-registered doctors who can consult in Pashto. For patients from Afghan, Pakistani, Arabic-speaking and South Asian communities in Ireland, this represents access to a fully qualified GP in their first language.

What he treats:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Emergency and urgent care assessment — rapid assessment of acute presentations, red-flag identification
• Chronic disease management — diabetes, hypertension, asthma, chronic respiratory diseases, thyroid disorders
• Women's health — contraception counselling, common gynaecological conditions, breastfeeding support
• Paediatric concerns — common childhood illnesses, paediatric emergencies including dehydration, respiratory distress and febrile seizures
• Men's health — general health concerns, hormonal queries, sexual health
• Mental health — anxiety, depression, stress management and specialist referral
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Older adult health — chronic condition monitoring, medication reviews, geriatric assessment
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Khan will take a rapid, structured clinical history and quickly identify whether your concern can be safely managed online or requires same-day in-person care. His emergency medicine background means he is particularly skilled at distinguishing urgent from non-urgent presentations — giving patients a confident, clear answer rather than a cautious generic referral. At the end of the consultation you will receive a clinical note with findings and next steps.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to patients with acute or urgent presentations who want a clinician with emergency medicine experience assessing their concern, and to patients from Afghan, Pakistani, Arabic-speaking and South Asian communities in Ireland who need a GP consultation in their first language.

His approach: Dr Khan places strong emphasis on patient-centred care, clear communication and building trust — the foundation of good primary care regardless of setting. His experience across three countries and multiple healthcare systems has given him a practical, adaptable approach and a deep sensitivity to the cultural dimensions of healthcare that make a real difference to patients from diverse backgrounds.

Languages: English · Urdu · Arabic · Pashto · Punjabi`,
    qualifications: [
      "MBBS — Bachelor of Medicine and Bachelor of Surgery",
      "ACLS — Advanced Cardiac Life Support (American Heart Association)",
      "BLS — Basic Life Support (American Heart Association)",
      "9+ years clinical experience — Ireland, Pakistan, Saudi Arabia",
      "Emergency medicine and out-of-hours primary care experience",
      "Procedural skills: wound suturing, abscess drainage, foreign body removal, nail procedures, fracture management",
      "Registered with the Irish Medical Council (IMC 520164 — General Division)",
      "Previously registered: Pakistan Medical & Dental Council, Saudi Commission for Health Specialties",
    ],
    languages: ["English", "Urdu", "Arabic", "Pashto", "Punjabi"],
    faqs: [
      {
        question: "Is Dr Raza Khan registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Razaullah Khan holds active registration with the Irish Medical Council — IMC number 520164 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Khan has over nine years of clinical experience across Ireland, Pakistan and Saudi Arabia and holds current ACLS and BLS certification from the American Heart Association.",
      },
      {
        question: "What does Dr Khan treat?",
        answer:
          "Dr Khan provides GP consultations covering acute illness (respiratory infections, fever, flu, UTIs), emergency and urgent care assessment, chronic disease management (diabetes, hypertension, asthma, respiratory diseases, thyroid), women's health (contraception, gynaecological conditions, breastfeeding support), paediatric concerns (common illnesses, febrile seizures, respiratory distress, dehydration), men's health, mental health (anxiety, depression), preventive health screenings, older adult health, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "What languages does Dr Khan consult in?",
        answer:
          "Dr Khan consults in English, Urdu, Arabic, Pashto and Punjabi. He is one of the very few Irish-registered GPs who can conduct a full medical consultation in Pashto — making him directly accessible to Afghan patients in Ireland who face significant language barriers when accessing healthcare. He is also fully fluent in Urdu, Arabic and Punjabi, serving Pakistani, South Asian and Arabic-speaking communities across Ireland.",
      },
      {
        question: "Does Dr Khan have emergency medicine experience?",
        answer:
          "Yes. Dr Khan has extensive experience in emergency departments and out-of-hours primary care services, managing high volumes of acute and unscheduled presentations through both face-to-face and remote triage. His procedural skills include wound suturing, abscess drainage, foreign body removal, nail procedures and basic fracture management. In an online GP consultation, this background means he is particularly skilled at rapid risk assessment — quickly identifying what needs urgent in-person care and what can be safely managed remotely.",
      },
      {
        question: "How do I book a consultation with Dr Khan?",
        answer:
          "Select 'Pick a time' on this page to view Dr Khan's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English, Urdu, Arabic, Pashto or Punjabi.",
      },
      {
        question: "What are Dr Khan's qualifications and experience?",
        answer:
          "Dr Razaullah Khan holds an MBBS and has over nine years of clinical experience across Ireland, Pakistan and Saudi Arabia in primary care and emergency medicine. He holds current ACLS and BLS certification from the American Heart Association. He has been registered with the Irish Medical Council, the Pakistan Medical & Dental Council and the Saudi Commission for Health Specialties. He consults in English, Urdu, Arabic, Pashto and Punjabi.",
      },
    ],
  },
  {
    dbSlug: "dr-yousif-mohamed",
    sheetSlug: "dr-yousif-mohamed",
    displayName: "Dr Yousif Mohamed",
    specialty: "General Practitioner",
    seoTitle: "Dr Yousif Mohamed — GP | IMC 424103 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Yousif Mohamed — IMC-registered GP in Ireland (IMC 424103). Express Care Physician at Affidea · Trauma & Orthopaedics · Emergency Medicine · Published researcher. Same-day appointments available.",
    bio: `Dr Yousif Mohamed is a General Practitioner and Express Care Physician currently practicing at Affidea Ireland, with extensive clinical experience across Emergency Medicine, Trauma & Orthopaedics and General Practice spanning Ireland and Sudan.

His clinical career has given him particular strength in the rapid assessment and management of acute presentations — from minor head injuries and respiratory illness to fractures, dislocations and acute allergic reactions. He is highly proficient in trauma and orthopaedic management including manual reduction of dislocations, splinting and cast application, and brings procedural skills that include expert suturing, advanced wound care, foreign body removal and intraarticular injections.

Beyond clinical practice, Dr Mohamed is an active contributor to medical research and education. He has authored multiple peer-reviewed studies on topics including cervical epidural abscesses and ultrasound treatments for bone non-union, and is a regular speaker at International Orthopaedics Conferences. He serves as a faculty member for minor injury courses and leads quality improvement projects including clinical audits on antibiotic stewardship and hip fracture admission timelines — work that reflects a systematic, evidence-driven approach to clinical practice that carries directly into his patient care.

What he treats:
• Acute and urgent illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs, acute allergic reactions
• Minor head injury assessment — assessment and safety netting for head injury presentations
• Musculoskeletal concerns — fracture assessment, joint pain, muscle injuries, acute orthopaedic queries
• Skin conditions and infections — wound assessment, skin infections, rashes, dermatological concerns
• Chronic disease management — hypertension, diabetes, obesity, ongoing condition review
• Men's and women's health — general health concerns, preventive screening
• Mental health — anxiety, depression, stress management and specialist referral
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Mohamed will take a rapid, structured clinical history and provide a clear evidence-based assessment. His Express Care background means he is particularly skilled at distinguishing presentations that can be safely managed online from those requiring urgent in-person review — and at giving patients clear, direct guidance on next steps without unnecessary delay. At the end of the consultation you will receive a clinical note with findings, any prescriptions issued and recommendations.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to patients with acute illness, musculoskeletal injuries or urgent concerns who want a clinician with emergency and trauma medicine experience assessing their presentation, and to patients with chronic conditions such as hypertension and diabetes who need an ongoing management review.

His approach: Dr Mohamed brings the precision of a trauma clinician and the rigour of a published researcher to every GP consultation. He is known for rapid, clear clinical assessment and evidence-based decision-making — shaped by years of high-volume acute care experience and a sustained commitment to quality improvement. His academic background means he stays current with the latest evidence and applies it practically to every patient encounter.

Languages: English`,
    qualifications: [
      "Express Care Physician — Affidea Ireland",
      "Trauma & Orthopaedics — fracture management, manual reduction, splinting and casting",
      "Procedural skills — expert suturing, wound care, foreign body removal, intraarticular injections",
      "Published researcher — peer-reviewed studies in cervical epidural abscesses and ultrasound bone non-union treatment",
      "Speaker — International Orthopaedics Conferences",
      "Faculty Member — minor injury courses",
      "Clinical audit lead — antibiotic stewardship, hip fracture admission timelines",
      "Clinical experience: Ireland and Sudan",
      "Registered with the Irish Medical Council (IMC 424103 — General Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question: "Is Dr Yousif Mohamed registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Yousif Mohamed holds active registration with the Irish Medical Council — IMC number 424103 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Mohamed currently works as an Express Care Physician at Affidea Ireland and has extensive clinical experience in emergency medicine, trauma and orthopaedics across Ireland and Sudan.",
      },
      {
        question: "What does Dr Mohamed treat?",
        answer:
          "Dr Mohamed provides GP consultations covering acute and urgent illness (respiratory infections, fever, flu, UTIs, acute allergic reactions), minor head injury assessment, musculoskeletal concerns (fracture assessment, joint pain, muscle injuries), skin conditions and infections, chronic disease management (hypertension, diabetes, obesity), men's and women's health, mental health (anxiety, depression), preventive health screenings, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question:
          "What makes Dr Mohamed's background distinctive for a GP consultation?",
        answer:
          "Dr Mohamed brings a combination of emergency medicine, trauma and orthopaedics experience that is uncommon in online GP practice. He currently works as an Express Care Physician at Affidea Ireland — a role focused on the rapid assessment of acute injuries and illness — and has procedural experience including expert suturing, advanced wound care, intraarticular injections and fracture management. He is also a published researcher in peer-reviewed medical journals and a regular speaker at International Orthopaedics Conferences, reflecting a commitment to evidence-based practice that is directly applied to his clinical work.",
      },
      {
        question:
          "Can Dr Mohamed assess musculoskeletal injuries and fractures online?",
        answer:
          "Yes. Dr Mohamed has specialist experience in trauma and orthopaedics including the diagnosis and management of fractures and dislocations. In an online consultation he can assess your injury history, symptoms and any imaging results you share, provide a clinical opinion on the likely diagnosis and advise on appropriate next steps — whether that is safe self-management, GP follow-up or urgent in-person assessment. For suspected acute fractures requiring imaging or reduction, he will advise on the appropriate emergency pathway.",
      },
      {
        question: "How do I book a consultation with Dr Mohamed?",
        answer:
          "Select 'Pick a time' on this page to view Dr Mohamed's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call.",
      },
      {
        question:
          "What are Dr Mohamed's qualifications and research contributions?",
        answer:
          "Dr Yousif Mohamed is an IMC-registered GP (IMC 424103) and Express Care Physician at Affidea Ireland. He has authored multiple peer-reviewed studies including research on cervical epidural abscesses and ultrasound treatments for bone non-union, and is a regular speaker at International Orthopaedics Conferences. He serves as a faculty member for minor injury courses and leads clinical audits on antibiotic stewardship and hip fracture admission timelines. His clinical experience spans emergency medicine, trauma and orthopaedics across Ireland and Sudan.",
      },
    ],
  },
  {
    dbSlug: "maristela-ferro-nepomuceno",
    sheetSlug: "dr-maristela-ferro-nepomuceno",
    displayName: "Dr Maristela Ferro Nepomuceno",
    specialty: "Psychologist",
    seoTitle:
      "Dr Maristela Ferro Nepomuceno — Psychologist | PSI 13655 | Global Health Ireland",
    seoDescription:
      "Book a therapy session with Dr Maristela Ferro Nepomuceno — PSI-registered Psychologist in Ireland (PSI 13655). PhD · CBT · DBT · Mindfulness · Children, adolescents and adults. English and Portuguese. Same-day appointments available.",
    bio: `Dr Maristela Ferro Nepomuceno is a Psychologist registered with the Psychological Society of Ireland (PSI 13655), providing evidence-based mental health therapy to children, adolescents and adults across Ireland and Brazil.

She holds a First Class Honours BSc and MSc in Psychology and a PhD in Education — an academic background that gives her both deep clinical knowledge and a sophisticated understanding of how people learn, develop and change. Her practice draws on Cognitive Behavioural Therapy (CBT), Dialectical Behaviour Therapy (DBT) and mindfulness-based interventions — three of the most evidence-supported approaches in contemporary psychological therapy.

Dr Maristela supports individuals experiencing anxiety, stress, low mood, depression, panic and challenges with emotional regulation. Her sessions focus on developing practical strategies to manage emotions, build resilience, strengthen communication and enhance self-awareness — giving clients tools they can use beyond the therapy session itself.

With clinical experience in both Ireland and Brazil, she delivers therapy in a client-centred, culturally aware and empathetic manner, with a particular sensitivity to the experience of patients from diverse cultural and linguistic backgrounds. Therapy is available in English and Portuguese — making her directly accessible to Brazilian, Portuguese and Lusophone patients in Ireland who want to engage in therapy in their first language.

What she helps with:
• Anxiety — generalised anxiety, social anxiety, health anxiety, worry and nervousness
• Depression and low mood — persistent sadness, loss of motivation, anhedonia
• Stress — work stress, life transitions, burnout and overwhelm
• Panic attacks and panic disorder
• Emotional regulation difficulties — difficulty managing intense emotions, emotional reactivity
• Trauma and PTSD — trauma-informed support and evidence-based trauma therapy
• OCD — obsessive thoughts and compulsive behaviours
• Eating and body image concerns
• Self-esteem and confidence
• Relationship and communication difficulties
• Child and adolescent mental health — anxiety, school refusal, behavioural concerns, emotional difficulties
• Life transitions — bereavement, relationship breakdown, career change, relocation

Therapeutic approaches:
• Cognitive Behavioural Therapy (CBT) — structured, evidence-based approach addressing unhelpful thought patterns and behaviours
• Dialectical Behaviour Therapy (DBT) — skills-based therapy for emotional regulation, distress tolerance and interpersonal effectiveness
• Mindfulness-based interventions — developing present-moment awareness and reducing reactivity

What to expect from your session: Your first session with Dr Maristela will focus on understanding your current concerns, your history and what you want to achieve from therapy. She will work with you to agree on a therapeutic approach and a clear plan. Sessions are collaborative, practical and focused on building skills and strategies that make a real difference outside the therapy room.

Who this is for: These sessions are suitable for children, adolescents and adults experiencing any mental health difficulty — from mild stress and low mood to more complex conditions such as PTSD, OCD or emotional dysregulation. They are particularly suited to Portuguese-speaking patients in Ireland who want to engage in therapy in their first language, and to patients who have been waiting for NHS or HSE psychology services and want to access evidence-based therapy now.

Her approach: Dr Maristela combines clinical rigour with genuine warmth and cultural sensitivity. Her academic background in education informs her understanding of how people learn and change — making her explanations of psychological concepts clear and accessible, and her therapeutic strategies practical and achievable. She is committed to making evidence-based psychological care accessible to people regardless of their background or first language.

Languages: English · Portuguese`,
    qualifications: [
      "PhD in Education",
      "MSc in Psychology — First Class Honours",
      "BSc in Psychology — First Class Honours",
      "Graduate Member — Psychological Society of Ireland (PSI 13655)",
      "Evidence-based practice: CBT, DBT, mindfulness-based interventions",
      "Clinical experience: Ireland and Brazil",
      "Therapy available in English and Portuguese",
    ],
    languages: ["English", "Portuguese"],
    faqs: [
      {
        question:
          "Is Dr Maristela Ferro Nepomuceno registered with the Psychological Society of Ireland?",
        answer:
          "Yes. Dr Maristela Ferro Nepomuceno is a Graduate Member of the Psychological Society of Ireland — PSI registration number 13655. You can verify this registration at thepsi.ie. She holds a First Class Honours BSc and MSc in Psychology and a PhD in Education, and has clinical experience in both Ireland and Brazil.",
      },
      {
        question: "What mental health concerns does Dr Maristela support?",
        answer:
          "Dr Maristela provides psychological therapy for anxiety (generalised, social, health anxiety), depression and low mood, stress and burnout, panic attacks, emotional regulation difficulties, trauma and PTSD, OCD, eating and body image concerns, self-esteem and confidence, relationship and communication difficulties, child and adolescent mental health, and life transitions including bereavement, relationship breakdown and relocation.",
      },
      {
        question: "What therapeutic approaches does Dr Maristela use?",
        answer:
          "Dr Maristela's practice draws on Cognitive Behavioural Therapy (CBT), Dialectical Behaviour Therapy (DBT) and mindfulness-based interventions — three of the most evidence-supported approaches in psychological therapy. CBT addresses unhelpful thought patterns and behaviours. DBT provides skills for emotional regulation, distress tolerance and interpersonal effectiveness. Mindfulness-based approaches develop present-moment awareness and reduce emotional reactivity. The approach used is tailored to each client's specific needs and goals.",
      },
      {
        question: "Does Dr Maristela offer therapy in Portuguese?",
        answer:
          "Yes. Dr Maristela offers therapy in both English and Portuguese — making her directly accessible to Brazilian, Portuguese and Lusophone patients in Ireland who want to engage in psychological therapy in their first language. Therapy in one's first language is particularly important for meaningful emotional and psychological work, where nuance, expression and cultural context matter significantly.",
      },
      {
        question: "How do I book a therapy session with Dr Maristela?",
        answer:
          "Select 'Pick a time' on this page to view Dr Maristela's available appointment slots. Payment is processed securely at checkout — your session is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Sessions are by secure, confidential video call in English or Portuguese. If you are in crisis or experiencing thoughts of self-harm, please contact emergency services (999 or 112) or your local crisis line immediately — do not wait for an appointment.",
      },
      {
        question: "What are Dr Maristela's qualifications?",
        answer:
          "Dr Maristela Ferro Nepomuceno holds a First Class Honours BSc and MSc in Psychology and a PhD in Education. She is a Graduate Member of the Psychological Society of Ireland (PSI 13655) and has clinical experience in both Ireland and Brazil. Her practice draws on Cognitive Behavioural Therapy (CBT), Dialectical Behaviour Therapy (DBT) and mindfulness-based interventions, and she offers therapy in English and Portuguese.",
      },
    ],
  },
  {
    dbSlug: "priscila-figueiredo",
    sheetSlug: "priscila-figueiredo",
    displayName: "Priscila Figueiredo",
    specialty: "Rehabilitation & Wellness Consultant",
    seoTitle:
      "Priscila Figueiredo — Rehabilitation & Wellness Consultant | Global Health Ireland",
    seoDescription:
      "Book an online rehabilitation consultation with Priscila Figueiredo — 10+ years physiotherapy experience. Post-operative recovery · Sports rehabilitation · Pain management · Exercise prescription. English and Portuguese.",
    bio: `Priscila Figueiredo is a Rehabilitation and Wellness Consultant with over 10 years of physiotherapy experience across clinical, sports and integrative medicine settings in Brazil and Ireland — bringing scientific expertise and a genuinely holistic approach to online rehabilitation consultations.

Her professional background spans advanced specialisations in therapeutic exercise, Pilates, myofascial release, dry needling, post-operative physiotherapy and sports recovery. She has supported elite athletes — including international CrossFit teams — at high-profile competitions, and has collaborated with medical clinics in plastic surgery and integrative medicine, providing recovery and wellness programmes tailored to each patient's individual needs.

Through Global Health, Priscila offers online rehabilitation consultations focused on assessment, personalised exercise prescription and recovery guidance — services that translate effectively to a video consultation format and that make her expertise accessible to patients regardless of location.

What she offers — online:
• Musculoskeletal assessment — assessment of back pain, neck pain, shoulder, knee, hip and joint complaints via structured video consultation
• Post-operative rehabilitation guidance — personalised home exercise programmes and recovery monitoring following surgery (orthopaedic, plastic surgery, abdominal procedures)
• Sports injury assessment — history taking, movement analysis, return-to-sport guidance and injury prevention programming
• Therapeutic exercise prescription — personalised exercise programmes for rehabilitation, strength, mobility and pain management
• Pilates-based rehabilitation programming — therapeutic Pilates programme design for core strength, posture and movement rehabilitation
• Pain management consultation — evidence-based assessment and advice for acute and chronic musculoskeletal pain
• Lymphoedema and post-surgical swelling guidance — advice on management strategies and home techniques
• Posture and ergonomics assessment — workplace and home environment assessment by video with practical recommendations

What to expect from your consultation: Priscila will take a full history of your concern, conduct a structured movement and posture assessment by video where appropriate, and provide a clear personalised plan — including a home exercise programme, recovery guidance and recommendations for in-person treatment where needed. At the end of the consultation you will receive a written summary of findings and your personalised programme.

Who this consultation is for: This consultation is suitable for patients recovering from surgery or injury who need expert rehabilitation guidance at home, athletes managing sports injuries or planning return to training, patients with chronic musculoskeletal pain who want a structured evidence-based assessment, and patients who want a personalised therapeutic exercise or Pilates programme designed by a clinician with ten years of hands-on physiotherapy experience.

Her approach: Priscila combines technical precision with a warm, patient-centred approach that focuses on achieving lasting results — not just short-term symptom relief. Her experience across sports rehabilitation, post-operative care and integrative medicine gives her a broad clinical lens that she applies to every consultation. She consults in English and Portuguese, making her directly accessible to Brazilian and Portuguese-speaking patients in Ireland and across the Global Health network.

Languages: English · Portuguese`,
    qualifications: [
      "10+ years physiotherapy experience — clinical, sports and integrative medicine settings",
      "Advanced specialisations: therapeutic exercise, Pilates, myofascial release, dry needling, post-operative physiotherapy",
      "Sports physiotherapy — elite athlete support including international CrossFit teams",
      "Collaboration with medical clinics in plastic surgery and integrative medicine",
      "Holistic therapy training: Reiki, reflexology, auriculotherapy, ozone therapy",
      "Brazilian CREFITO registration (Irish CORU registration in progress)",
      "Consultations in English and Portuguese",
    ],
    languages: ["English", "Portuguese"],
    faqs: [
      {
        question: "What is a rehabilitation consultation with Priscila Figueiredo?",
        answer:
          "A rehabilitation consultation with Priscila is a structured online assessment by video focused on musculoskeletal health, recovery and therapeutic exercise. Priscila takes a full history of your concern, conducts a movement and posture assessment by video where appropriate, and provides a personalised plan — including a home exercise programme, recovery guidance and recommendations for any in-person treatment needed. Sessions are available in English and Portuguese.",
      },
      {
        question: "What conditions and concerns does Priscila help with online?",
        answer:
          "Priscila provides online rehabilitation consultations for back pain and neck pain, shoulder, knee, hip and joint complaints, post-operative recovery (orthopaedic, plastic surgery and abdominal procedures), sports injuries and return-to-sport planning, chronic musculoskeletal pain, posture and ergonomics concerns, lymphoedema and post-surgical swelling, and therapeutic exercise and Pilates programme prescription.",
      },
      {
        question: "Does Priscila have experience with post-operative rehabilitation?",
        answer:
          "Yes. Post-operative rehabilitation is one of Priscila's core areas of expertise — she has collaborated with medical clinics in plastic surgery and integrative medicine, providing personalised recovery programmes following a range of surgical procedures. In an online consultation she can assess your current recovery progress, prescribe a personalised home exercise and rehabilitation programme, advise on movement, swelling management and return to activity, and identify when in-person physiotherapy input is needed.",
      },
      {
        question: "Can Priscila help with sports injuries and return to training?",
        answer:
          "Yes. Priscila has extensive sports physiotherapy experience, having supported elite athletes including international CrossFit teams at high-profile competitions. In an online consultation she can assess your injury history and current presentation, advise on load management and training modification, design a graduated return-to-sport programme and provide injury prevention strategies. She works with recreational and competitive athletes across all sports.",
      },
      {
        question: "How do I book a consultation with Priscila?",
        answer:
          "Select 'Pick a time' on this page to view Priscila's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English or Portuguese. After your session you will receive a written summary and your personalised exercise programme.",
      },
      {
        question: "What is Priscila's background and experience?",
        answer:
          "Priscila Figueiredo has over 10 years of physiotherapy experience across clinical, sports and integrative medicine settings in Brazil and Ireland. She holds advanced specialisations in therapeutic exercise, Pilates, myofascial release, dry needling and post-operative physiotherapy, and has supported elite athletes including international CrossFit teams at high-profile competitions. She has collaborated with medical clinics in plastic surgery and integrative medicine and consults in English and Portuguese.",
      },
    ],
  },
  {
    dbSlug: "dr-muhammad-usman-yoosuf",
    sheetSlug: "dr-muhammad-usman-yoosuf",
    displayName: "Dr Muhammad Usman Yoosuf",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Muhammad Usman Yoosuf — GP | IMC 502797 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Muhammad Usman Yoosuf — IMC-registered GP in Ireland (IMC 502797). MBBS · 8+ years experience · Women's health & antenatal care · Emergency medicine · English, Urdu and Punjabi. Same-day appointments available.",
    bio: `Dr Muhammad Usman Yoosuf is a General Practitioner with over eight years of clinical experience across family medicine, emergency care, internal medicine, paediatrics, dermatology and women's health — spanning both urban hospital settings and rural community clinics across diverse patient populations.

He earned his medical degree (MBBS) from the University of Health Sciences in Lahore and is registered with the Irish Medical Council. He has also passed USMLE Step 1 — the first component of the United States Medical Licensing Examination, reflecting an internationally benchmarked standard of medical knowledge — and is an active member of the Pakistan Medical Association. He is also a published medical researcher with several peer-reviewed studies to his name.

Dr Yoosuf has managed general outpatient services, antenatal and postnatal care, minor surgical procedures, chronic disease management and emergency triage throughout his career. He has particular experience in women's health — including antenatal and postnatal care — and in managing chronic conditions across diverse communities where language and cultural context are central to good clinical outcomes.

He consults in English, Urdu and Punjabi — giving patients from Pakistani and South Asian communities in Ireland access to a fully IMC-registered GP in their first language.

What he treats:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Chronic disease management — diabetes, hypertension, thyroid disorders, high cholesterol, asthma and COPD
• Women's health — contraception, hormonal concerns, menstrual issues, antenatal and postnatal care
• Paediatric concerns — child health queries, common childhood illnesses, developmental questions
• Emergency and urgent care assessment — acute presentations requiring same-day clinical review
• Dermatological concerns — acne, eczema, rashes, skin infections
• Mental health — anxiety, depression, stress management and specialist referral
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Yoosuf will take a full clinical history, review any existing results or letters you share in advance and provide a clear, evidence-based management plan. His experience across multiple healthcare systems and patient populations gives him a flexible, culturally sensitive approach to clinical communication. At the end of the consultation you will receive a clinical note with findings and next steps.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to patients from Pakistani and South Asian communities in Ireland who want a GP consultation in Urdu or Punjabi, women seeking antenatal or postnatal support or women's health advice, and patients with chronic conditions needing ongoing management and review.

His approach: Dr Yoosuf is known for patient-centred care and clear, empathetic communication with patients of all backgrounds. He combines eight years of hands-on clinical experience across multiple settings with an evidence-based, inclusive approach — ensuring every patient receives the same quality of care regardless of language, background or clinical complexity.

Languages: English · Urdu · Punjabi`,
    qualifications: [
      "MBBS — University of Health Sciences, Lahore",
      "USMLE Step 1 — United States Medical Licensing Examination",
      "BLS — Basic Life Support certified",
      "8+ years clinical experience — family medicine, emergency care, internal medicine, paediatrics, dermatology, women's health",
      "Published medical researcher",
      "Member — Pakistan Medical Association",
      "Registered with the Irish Medical Council (IMC 502797 — General Division)",
    ],
    languages: ["English", "Urdu", "Punjabi"],
    faqs: [
      {
        question:
          "Is Dr Muhammad Usman Yoosuf registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Muhammad Usman Yoosuf holds active registration with the Irish Medical Council — IMC number 502797 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Yoosuf holds an MBBS from the University of Health Sciences in Lahore, has passed USMLE Step 1, and has over eight years of clinical experience across family medicine, emergency care and women's health.",
      },
      {
        question: "What does Dr Yoosuf treat?",
        answer:
          "Dr Yoosuf provides GP consultations covering acute illness (respiratory infections, fever, flu, UTIs), chronic disease management (diabetes, hypertension, thyroid, cholesterol, asthma, COPD), women's health (contraception, hormonal concerns, antenatal and postnatal care), paediatric concerns, urgent care assessment, dermatological concerns (acne, eczema, rashes), mental health (anxiety, depression), preventive health screenings, prescription renewals, medication reviews, sick notes and medical certificates.",
      },
      {
        question: "What languages does Dr Yoosuf consult in?",
        answer:
          "Dr Yoosuf consults in English, Urdu and Punjabi — giving patients from Pakistani and South Asian communities in Ireland the opportunity to discuss their health, including sensitive concerns, in their first language with a fully IMC-registered GP. He is known for his ability to communicate clearly and empathetically across cultural and linguistic backgrounds.",
      },
      {
        question:
          "Does Dr Yoosuf have experience with antenatal and postnatal care?",
        answer:
          "Yes. Dr Yoosuf has clinical experience in antenatal and postnatal care from his work in both urban hospitals and rural community clinics. In an online consultation he can provide advice on antenatal health — including nutrition, screening, common pregnancy symptoms and when to seek in-person care — as well as postnatal support including recovery, breastfeeding guidance and mental health screening. He is particularly experienced in supporting patients from South Asian backgrounds navigating maternity care in Ireland.",
      },
      {
        question: "How do I book a consultation with Dr Yoosuf?",
        answer:
          "Select 'Pick a time' on this page to view Dr Yoosuf's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English, Urdu or Punjabi.",
      },
      {
        question: "What are Dr Yoosuf's qualifications?",
        answer:
          "Dr Muhammad Usman Yoosuf holds an MBBS from the University of Health Sciences in Lahore and has passed USMLE Step 1. He holds BLS certification and has over eight years of clinical experience spanning family medicine, emergency care, internal medicine, paediatrics, dermatology and women's health across urban hospitals and rural community clinics. He is a published medical researcher and a member of the Pakistan Medical Association. He is registered with the Irish Medical Council (IMC 502797).",
      },
    ],
  },
  {
    dbSlug: "dr-fatima-ali",
    sheetSlug: "dr-fatima-ali",
    displayName: "Dr Fatima Ali",
    specialty: "Medical Oncology Registrar",
    seoTitle:
      "Dr Fatima Ali — Medical Oncology | IMC 505231 | Global Health Ireland",
    seoDescription:
      "Book an oncology consultation with Dr Fatima Ali — IMC-registered Medical Oncology Registrar (IMC 505231). 11 years experience · Shaukat Khanum Memorial Cancer Hospital · Cork University Hospital · Published researcher. Same-day appointments available.",
    bio: `Dr Fatima Ali is a Medical Oncology Registrar with over 11 years of post-internship clinical experience in Medical Oncology — one of the most extensively trained oncology clinicians available through online consultation in Ireland.

She holds an MBBS from Zia Uddin Medical University, Karachi, and spent over eight years at Shaukat Khanum Memorial Cancer Hospital — a JCI-accredited cancer centre recognised as one of Asia's leading oncology institutions — where she specialised in managing both solid tumour and haematological malignancies, conducted over 3,000 independent bone marrow biopsies, and led patient education and counselling initiatives. She has also worked in Medical Oncology at Cork University Hospital in Ireland, providing oncology outpatient care, chemotherapy day ward support and clinical research in an Irish healthcare context.

Dr Ali is a published researcher in international oncology journals, has contributed to clinical audits and quality improvement initiatives, and has led structured teaching sessions for junior doctors and healthcare professionals. She is registered with the Irish Medical Council and brings a patient-centred, evidence-based approach to every consultation.

Through Global Health, Dr Ali provides oncology consultations focused on helping patients understand their diagnosis, treatment options, test results and what to expect at each stage of their cancer journey — delivered with the clinical depth of a specialist and the compassion of a clinician who has dedicated her career to oncology care.

What she offers — online:
• Cancer diagnosis support — helping patients and families understand a new cancer diagnosis, staging, and what it means in practical terms
• Second opinions — reviewing oncology reports, pathology summaries, imaging reports and treatment recommendations
• Treatment planning discussion — explaining treatment options including chemotherapy, immunotherapy, targeted therapy and radiotherapy, what each involves and what to expect
• Side effect management — advice on managing common treatment side effects and when to seek urgent in-person care
• Haematological malignancy guidance — leukaemia, lymphoma, myeloma and related conditions
• Solid tumour guidance — breast, lung, colorectal, prostate and other solid cancers
• Cancer screening advice — guidance on appropriate screening based on personal and family risk
• Post-treatment follow-up discussion — reviewing progress, interpreting follow-up scan reports and addressing ongoing concerns
• Patient education and counselling — helping patients and families navigate the cancer care system with clarity and confidence

What to expect from your consultation: Dr Ali will take a full oncology history and review any reports, letters, pathology summaries or imaging reports you share in advance. She will provide a clear clinical explanation of your situation and what it means, answer your questions in plain language, and advise on next steps — whether that is understanding your current treatment plan, seeking a second opinion from a different consultant, or managing side effects at home. At the end of the consultation you will receive a written summary.

Important note: Online oncology consultations cannot replace in-person oncology care — Dr Ali cannot review imaging or pathology slides directly, prescribe chemotherapy or make treatment decisions that require in-person assessment. Her online consultations are designed to complement your in-person oncology team — helping you understand, prepare and engage more confidently with your care.

Who this consultation is for: This consultation is suitable for patients who have recently received a cancer diagnosis and want expert help understanding what it means — patients who want a second opinion on a treatment recommendation — patients experiencing side effects who need clinical guidance — patients with a family history of cancer who want advice on appropriate screening — and carers or family members supporting someone through cancer treatment who want to understand the clinical picture more clearly.

Her approach: Dr Ali is known for clear, compassionate communication and a deep commitment to patient education. Her eight years at Shaukat Khanum Memorial Cancer Hospital — where patient counselling and education are central to the clinical model — shaped an approach that prioritises making complex oncology information accessible and actionable for patients and families. She believes that understanding your diagnosis and treatment is itself part of the care.

Languages: English`,
    qualifications: [
      "MBBS — Zia Uddin Medical University, Karachi",
      "Medical Oncology Registrar — 11+ years post-internship clinical experience",
      "8+ years — Shaukat Khanum Memorial Cancer Hospital (JCI-accredited), Karachi",
      "Medical Oncology — Cork University Hospital, Ireland",
      "3,000+ independent bone marrow biopsies",
      "Published researcher — international peer-reviewed oncology journals",
      "Clinical audit and quality improvement experience",
      "Medical educator — structured teaching for junior doctors and healthcare professionals",
      "Registered with the Irish Medical Council (IMC 505231 — Specialist Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question: "Is Dr Fatima Ali registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Fatima Ali holds active registration with the Irish Medical Council — IMC number 505231 on the Specialist Division. You can verify this registration at medicalcouncil.ie. Dr Ali has over 11 years of Medical Oncology experience, including eight years at Shaukat Khanum Memorial Cancer Hospital (JCI-accredited) and a period at Cork University Hospital in Ireland.",
      },
      {
        question: "What oncology consultations does Dr Ali offer online?",
        answer:
          "Dr Ali provides online oncology consultations covering cancer diagnosis support (helping patients understand a new diagnosis and staging), second opinions on oncology reports and treatment recommendations, treatment planning discussion (explaining chemotherapy, immunotherapy, targeted therapy and radiotherapy), side effect management, haematological malignancy guidance (leukaemia, lymphoma, myeloma), solid tumour guidance (breast, lung, colorectal, prostate and other cancers), cancer screening advice and post-treatment follow-up discussion. Online consultations complement but do not replace in-person oncology care.",
      },
      {
        question:
          "Can Dr Ali provide a second opinion on my cancer diagnosis or treatment plan?",
        answer:
          "Yes. Second opinions are one of the core services Dr Ali offers through Global Health. If you have received a cancer diagnosis or a recommended treatment plan and want an independent expert review, you can share your oncology reports, pathology summaries, imaging reports and consultant letters with Dr Ali before your consultation. She will review these and provide a clear clinical assessment — including whether she agrees with the recommended approach, what alternatives may exist, and what questions you should ask your treating team.",
      },
      {
        question: "What is Dr Ali's experience with haematological cancers?",
        answer:
          "Dr Ali has extensive experience in haematological malignancies — including leukaemia, lymphoma and myeloma — from her eight years at Shaukat Khanum Memorial Cancer Hospital, where she managed both solid and haematological cancers and performed over 3,000 independent bone marrow biopsies. In an online consultation she can help patients understand a haematological diagnosis, explain what bone marrow biopsy results mean, discuss treatment options and advise on managing the physical and emotional impact of haematological cancer care.",
      },
      {
        question: "How do I book an oncology consultation with Dr Ali?",
        answer:
          "Select 'Pick a time' on this page to view Dr Ali's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure, confidential video call. To make the most of your session, please share any relevant oncology reports, letters or investigation results in advance.",
      },
      {
        question: "What are Dr Ali's qualifications and research contributions?",
        answer:
          "Dr Fatima Ali holds an MBBS from Zia Uddin Medical University, Karachi, and has over 11 years of Medical Oncology experience. She spent eight years at Shaukat Khanum Memorial Cancer Hospital — a JCI-accredited cancer centre — where she performed over 3,000 independent bone marrow biopsies and led patient education and counselling programmes. She has worked at Cork University Hospital in Ireland and has published peer-reviewed research in international oncology journals. She is registered with the Irish Medical Council (IMC 505231 — Specialist Division).",
      },
    ],
  },
  {
    dbSlug: "dr-fahad-farooq",
    sheetSlug: "dr-fahad-farooq",
    displayName: "Dr Fahad Farooq",
    specialty: "Neurology Registrar",
    seoTitle:
      "Dr Fahad Farooq — Neurology | IMC 421252 | FEBN | Global Health Ireland",
    seoDescription:
      "Book an online neurology consultation with Dr Fahad Farooq — IMC-registered Neurology Registrar (IMC 421252). FEBN · rTMS certified · neuroimaging · epilepsy, stroke and neurodegenerative conditions. English, Arabic, Urdu and Punjabi. Same-day appointments available.",
    bio: `Dr Fahad Farooq is a Neurology Registrar with international clinical and academic experience across Ireland, Saudi Arabia and Pakistan — and a Fellow of the European Board of Neurology (FEBN), one of the highest neurology qualifications awarded by the European Academy of Neurology.

He currently serves as a Neurology Registrar in Ireland and has previously worked as a specialist neurologist in Saudi Arabia and as a consultant in emergency neurology in Pakistan. His clinical background extends beyond neurology — encompassing gastroenterology, transplant hepatology and internal medicine — giving him a broad medical perspective that informs his neurological assessments.

Dr Farooq holds additional specialist qualifications in transcranial magnetic stimulation (rTMS) and neuroradiology, placing him at the intersection of clinical neurology and advanced diagnostics and intervention. He has published several peer-reviewed research articles and is actively involved in medical education — regularly mentoring junior doctors and medical students.

He consults in English, Arabic, Urdu and Punjabi — making him one of the very few neurologists in Ireland accessible to Arabic-speaking, Pakistani and South Asian patients in their first language.

What he offers — online:
• Neurology second opinions — reviewing neurology reports, MRI findings, EEG reports and treatment recommendations
• Epilepsy management — assessment, medication review and seizure management advice
• Stroke assessment and secondary prevention — understanding stroke diagnosis, risk factor management and rehabilitation guidance
• Headache and migraine — assessment, diagnosis and treatment planning
• Neurodegenerative condition guidance — Parkinson's disease, dementia, multiple sclerosis — understanding diagnosis and what to expect
• Neuroimaging interpretation — explaining MRI brain and spine reports, CT findings and what they mean clinically
• Neurophysiology queries — understanding EEG, nerve conduction study and EMG results
• Transcranial magnetic stimulation (rTMS) — pre-assessment consultation and patient education for rTMS treatment
• Movement disorders — tremor, gait problems, coordination difficulties
• Peripheral neuropathy — numbness, tingling, weakness — assessment and management guidance
• Complex headache and facial pain

What to expect from your consultation: Dr Farooq will take a full neurological history and review any reports, imaging results, EEG reports or neurology letters you share in advance. He will provide a clear clinical explanation of your neurological presentation, explain what investigations mean in plain language, and advise on next steps — whether that is understanding your current management, seeking a second opinion, or preparing questions for your in-person neurology team. At the end of the consultation you will receive a written summary.

Important note: Online neurology consultations cannot replace in-person neurological examination or emergency care. Dr Farooq cannot review imaging or EEG traces directly, prescribe controlled medications or make decisions requiring in-person assessment. If you are experiencing a neurological emergency — sudden severe headache, loss of consciousness, acute weakness or speech disturbance — call 999 or 112 immediately.

Who this consultation is for: This consultation is suitable for patients who have received a neurology diagnosis and want help understanding what it means — patients waiting for an in-person neurology appointment who need interim guidance — patients who want a second opinion on a neurological diagnosis or treatment plan — and patients with ongoing neurological conditions such as epilepsy, migraine or Parkinson's who need a medication review or management discussion. It is also suited to Arabic-speaking, Pakistani and South Asian patients who want a neurological consultation in their first language.

His approach: Dr Farooq combines the clinical depth of a FEBN-qualified neurologist with a genuine commitment to patient education. He believes patients with neurological conditions — which are often complex, chronic and anxiety-provoking — deserve clear, unhurried explanations and the opportunity to ask every question they have. His multilingual capability means he can deliver this clarity to patients in the language they think and feel in.

Languages: English · Arabic · Urdu · Punjabi`,
    qualifications: [
      "FEBN — Fellow of the European Board of Neurology (European Academy of Neurology)",
      "MBBS — Bachelor of Medicine and Bachelor of Surgery",
      "rTMS Certification — Transcranial Magnetic Stimulation",
      "Neuroradiology qualification",
      "Neurology Registrar — Ireland",
      "Specialist Neurologist — Saudi Arabia",
      "Consultant in Emergency Neurology — Pakistan",
      "Published peer-reviewed research in neurology",
      "Medical educator — junior doctor and medical student mentorship",
      "Registered with the Irish Medical Council (IMC 421252 — Specialist Division)",
    ],
    languages: ["English", "Arabic", "Urdu", "Punjabi"],
    faqs: [
      {
        question: "Is Dr Fahad Farooq registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Fahad Farooq holds active registration with the Irish Medical Council — IMC number 421252 on the Specialist Division. You can verify this registration at medicalcouncil.ie. Dr Farooq is a Fellow of the European Board of Neurology (FEBN) and currently serves as a Neurology Registrar in Ireland, with previous specialist neurology experience in Saudi Arabia and Pakistan.",
      },
      {
        question: "What neurological conditions does Dr Farooq assess online?",
        answer:
          "Dr Farooq provides online neurology consultations covering epilepsy (assessment, medication review, seizure management), stroke assessment and secondary prevention, headache and migraine, neurodegenerative conditions (Parkinson's disease, dementia, multiple sclerosis), neuroimaging interpretation (MRI brain and spine, CT findings), neurophysiology queries (EEG, nerve conduction studies, EMG), transcranial magnetic stimulation (rTMS) pre-assessment, movement disorders (tremor, gait problems), peripheral neuropathy (numbness, tingling, weakness) and complex headache and facial pain.",
      },
      {
        question: "What is the FEBN and why does it matter?",
        answer:
          "The FEBN (Fellow of the European Board of Neurology) is an advanced specialist qualification awarded by the European Academy of Neurology — the leading professional body for neurology across Europe. It recognises demonstrated competence across the full spectrum of clinical neurology to a European standard. The examination covers neurological diagnosis, neuroimaging, neurophysiology, treatment and patient management. Dr Farooq is one of a relatively small number of neurologists in Ireland holding this qualification at registrar level.",
      },
      {
        question: "Can Dr Farooq explain my MRI brain or spine results?",
        answer:
          "Yes. Dr Farooq holds specialist qualifications in neuroimaging and neuroradiology and can explain MRI brain and spine reports, CT findings and other neuroimaging results as part of your online consultation. If you share your radiology report or imaging letter in advance, he can provide a clear clinical interpretation — explaining what the findings mean, whether they are significant, and what next steps are appropriate. He can also advise on whether additional imaging is warranted.",
      },
      {
        question: "How do I book a neurology consultation with Dr Farooq?",
        answer:
          "Select 'Pick a time' on this page to view Dr Farooq's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English, Arabic, Urdu or Punjabi. To make the most of your session please share any neurology reports, MRI results, EEG reports or consultant letters in advance. If you are experiencing a neurological emergency — sudden severe headache, acute weakness or speech disturbance — call 999 or 112 immediately rather than booking a consultation.",
      },
      {
        question: "What are Dr Farooq's qualifications?",
        answer:
          "Dr Fahad Farooq holds an MBBS and the FEBN — Fellowship of the European Board of Neurology, awarded by the European Academy of Neurology. He holds additional qualifications in transcranial magnetic stimulation (rTMS) and neuroradiology. He currently serves as a Neurology Registrar in Ireland and has worked as a specialist neurologist in Saudi Arabia and a consultant in emergency neurology in Pakistan. He has published peer-reviewed research in neurology and regularly mentors junior doctors and medical students.",
      },
    ],
  },
  {
    dbSlug: "dr-raafat-ibrahim",
    sheetSlug: "dr-raafat-ibrahim",
    displayName: "Dr Raafat Ibrahim",
    specialty: "Consultant Paediatrician",
    seoTitle:
      "Dr Raafat Ibrahim — Consultant Paediatrician | IMC 19801 | FRCPCH | Global Health Ireland",
    seoDescription:
      "Book a paediatric consultation with Dr Raafat Ibrahim — Consultant Paediatrician (IMC 19801). FRCPCH · 30+ years experience · Paediatric diabetes & endocrinology · Portiuncula Hospital Clinical Lead · Honorary Senior Lecturer UHG. Same-day appointments available.",
    bio: `Dr Raafat Ibrahim is a Consultant Paediatrician with over 30 years of clinical experience across Ireland, the UK and the Middle East — one of the most experienced paediatric clinicians available through online consultation anywhere in the world.

He holds the Fellowship of the Royal College of Paediatrics and Child Health (FRCPCH) and MRCP(UK), along with Postgraduate Diplomas in Paediatric Diabetes (York) and Endocrinology (South Wales). He is currently completing a Postgraduate Certificate in Allergy and Clinical Immunology in Cork — reflecting a commitment to expanding his expertise that is unusual in a clinician of 30 years' standing.

Dr Ibrahim served as a permanent Consultant Paediatrician and Clinical Lead in Diabetes and Endocrinology at Portiuncula Hospital, Galway — developing and leading multidisciplinary paediatric diabetes and endocrine services. He has held consultant roles at University Hospital Limerick, Bon Secours Hospital Tralee and private practices in Limerick and Northern Ireland. His academic appointments include Honorary Senior Lecturer at University Hospital Galway and Adjunct Clinical Senior Lecturer at the University of Limerick.

He serves as a tutor for the RCPI-affiliated paediatric diploma programme and as a clinical examiner for final-year medical students — meaning he not only practises at the highest clinical level but is trusted to set and assess the standards to which the next generation of paediatricians is trained.

Dr Ibrahim has contributed to numerous publications and national research presentations in paediatric diabetes, Down syndrome and neonatal care, and has received multiple awards for his contributions to paediatrics and intellectual disability care.

What he offers — online:
• General paediatric consultations — comprehensive health assessment for children and adolescents from newborn to 18 years
• Paediatric diabetes — Type 1 and Type 2 diabetes management, insulin review, HbA1c interpretation, pump therapy guidance and sick day rules
• Paediatric endocrinology — growth concerns, thyroid disorders, puberty concerns (early or delayed), adrenal conditions and hormonal queries
• Allergy and clinical immunology — food allergy, eczema, allergic rhinitis, asthma and immunological concerns (Postgraduate Certificate in Allergy and Clinical Immunology in progress)
• Down syndrome paediatric care — specialist assessment, developmental monitoring and management of associated medical conditions
• Neonatal queries — newborn health concerns, feeding difficulties, jaundice and early developmental questions
• Neurodevelopmental concerns — autism, ADHD, developmental delay and learning difficulties
• Second opinions — review of paediatric diagnoses, investigation results and management plans
• HSE waiting list support — independent specialist assessment for children waiting for public paediatric services

What to expect from your consultation: Dr Ibrahim will take a comprehensive paediatric history — including birth history, developmental milestones, previous investigations and current concerns — and provide a clear, expert clinical assessment. For endocrinology and diabetes consultations, please share any relevant blood results, HbA1c values, growth charts or specialist letters in advance. At the end of the consultation you will receive a written summary with clinical findings, recommendations and any referral advice.

Who this consultation is for: This consultation is suitable for parents with any concern about their child's health, development or wellbeing. It is particularly suited to families seeking a specialist paediatric review for diabetes, endocrine conditions or allergy — parents of children with Down syndrome who want expert specialist input — families waiting on long HSE paediatric waiting lists who need an independent assessment now — and parents who want the assurance of a Consultant with 30 years of experience reviewing their child's care.

His approach: Dr Ibrahim brings 30 years of clinical wisdom to every consultation — combined with the academic rigour of a university lecturer and clinical examiner, and the genuine commitment of a clinician who still chooses to teach, research and develop new skills alongside full-time practice. He is known for clarity, thoroughness and the kind of calm reassurance that only comes from having seen a very large number of children over a very long career.

Languages: English`,
    qualifications: [
      "FRCPCH — Fellow of the Royal College of Paediatrics and Child Health",
      "MRCP(UK) — Member of the Royal College of Physicians, United Kingdom",
      "DCH — Diploma in Child Health",
      "DPM — Diploma in Psychological Medicine",
      "MBBCh — Bachelor of Medicine and Bachelor of Surgery",
      "Postgraduate Diploma in Paediatric Diabetes — University of York",
      "Postgraduate Diploma in Endocrinology — University of South Wales",
      "Postgraduate Certificate in Allergy and Clinical Immunology — University College Cork (in progress)",
      "Consultant Paediatrician & Clinical Lead in Diabetes and Endocrinology — Portiuncula Hospital, Galway",
      "Consultant Paediatrician — University Hospital Limerick, Bon Secours Hospital Tralee",
      "Honorary Senior Lecturer — University Hospital Galway",
      "Adjunct Clinical Senior Lecturer — University of Limerick",
      "RCPI Paediatric Diploma Programme Tutor",
      "Clinical Examiner — final-year medical students",
      "30+ years clinical experience — Ireland, UK and Middle East",
      "Multiple awards — paediatrics and intellectual disability care",
      "Registered with the Irish Medical Council (IMC 19801 — Specialist Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question: "Is Dr Raafat Ibrahim registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Raafat Ibrahim holds active registration with the Irish Medical Council — IMC number 19801 on the Specialist Division. You can verify this registration at medicalcouncil.ie. Dr Ibrahim is a Fellow of the Royal College of Paediatrics and Child Health (FRCPCH) and has over 30 years of experience as a Consultant Paediatrician in Ireland, the UK and the Middle East.",
      },
      {
        question: "What paediatric conditions does Dr Ibrahim assess online?",
        answer:
          "Dr Ibrahim provides consultant paediatric assessments covering general child health (newborn to 18 years), paediatric diabetes (Type 1 and Type 2, insulin management, pump therapy, HbA1c review), paediatric endocrinology (growth concerns, thyroid, puberty, adrenal conditions), allergy and clinical immunology (food allergy, eczema, asthma, allergic rhinitis), Down syndrome specialist care, neonatal queries, neurodevelopmental concerns (autism, ADHD, developmental delay) and second opinions on paediatric diagnoses and management plans.",
      },
      {
        question: "What makes Dr Ibrahim's experience exceptional?",
        answer:
          "Dr Ibrahim has over 30 years of experience as a Consultant Paediatrician — having served as Clinical Lead in Diabetes and Endocrinology at Portiuncula Hospital, Galway, and held consultant posts at University Hospital Limerick and Bon Secours Hospital Tralee. He is Honorary Senior Lecturer at University Hospital Galway and Adjunct Clinical Senior Lecturer at the University of Limerick — trusted to shape paediatric medical education at postgraduate level. He is a tutor for the RCPI paediatric diploma programme and a clinical examiner for final-year medical students. He has contributed to national research presentations in paediatric diabetes, Down syndrome and neonatal care, and received multiple awards for his contributions to paediatrics and intellectual disability care.",
      },
      {
        question:
          "Can Dr Ibrahim help if my child is waiting on an HSE paediatric waiting list?",
        answer:
          "Yes. Many families book a consultation with Dr Ibrahim while waiting for HSE paediatric or specialist services — which can involve waiting times of 12 to 24 months or more for paediatric endocrinology and neurodevelopmental assessments in Ireland. Dr Ibrahim can provide an independent Consultant Paediatrician assessment, offer a clinical opinion on your child's diagnosis and management needs, produce a letter or report that may support prioritisation through the public system, and advise on interim management while you wait. As a former Clinical Lead at Portiuncula Hospital, he understands the Irish public paediatric system from the inside.",
      },
      {
        question: "How do I book a paediatric consultation with Dr Ibrahim?",
        answer:
          "Select 'Pick a time' on this page to view Dr Ibrahim's available appointment slots. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call. For diabetes, endocrinology or allergy consultations, please share relevant blood results, growth charts, HbA1c values or specialist letters in advance. Please have your child present for the consultation where possible.",
      },
      {
        question: "What are Dr Ibrahim's qualifications?",
        answer:
          "Dr Raafat Ibrahim holds FRCPCH (Fellow of the Royal College of Paediatrics and Child Health), MRCP(UK), DCH, DPM and MBBCh. He holds Postgraduate Diplomas in Paediatric Diabetes (University of York) and Endocrinology (University of South Wales) and is completing a Postgraduate Certificate in Allergy and Clinical Immunology at UCC. He served as Consultant Paediatrician and Clinical Lead in Diabetes and Endocrinology at Portiuncula Hospital, Galway, and has held consultant posts at University Hospital Limerick and Bon Secours Hospital Tralee. He is Honorary Senior Lecturer at University Hospital Galway and Adjunct Clinical Senior Lecturer at the University of Limerick. He has over 30 years of clinical experience across Ireland, the UK and the Middle East.",
      },
    ],
  },
  {
    dbSlug: "dr-mohamed-fadzly-bin-mohamed",
    sheetSlug: "dr-mohamed-fadzly-mustafar",
    displayName: "Dr Mohamed Fadzly Mustafar",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Mohamed Fadzly Mustafar — GP | IMC 505886 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Mohamed Fadzly Mustafar — IMC-registered GP in Ireland (IMC 505886). 12+ years experience · Former Medical Director · ATLS certified · Chronic disease, women's health, palliative care & mental health. Same-day appointments available.",
    bio: `Dr Mohamed Fadzly Mustafar is a General Practitioner with over 12 years of clinical experience across hospital and community settings in Malaysia and Ireland — bringing international clinical depth, leadership experience and a genuinely holistic approach to primary care.

He earned his medical degree from the International Islamic University of Malaysia in 2007 and has served in leadership roles including Medical Director in Malaysia — giving him both clinical and organisational experience of healthcare delivery at a senior level. Since relocating to Ireland he has continued to deliver high-quality primary care and is registered with the Irish Medical Council.

Dr Mustafar holds advanced certifications in Basic Life Support (BLS), Advanced Cardiac Life Support (ACLS), Advanced Trauma Life Support (ATLS) and Neonatal Resuscitation — a combination that reflects a level of emergency medicine preparedness that goes significantly beyond standard GP training. He also holds certification in Occupational Health, adding a workplace medicine dimension to his practice.

His approach is grounded in preventive medicine — emphasising health education, early intervention and long-term wellbeing alongside the management of acute and chronic presentations.

What he treats:
• Chronic disease management — diabetes, hypertension, obesity, thyroid disorders, high cholesterol, asthma and COPD
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Women's health — contraception, hormonal concerns, menstrual issues, antenatal and postnatal care
• Paediatric and child health — child health reviews, growth and development, common childhood illnesses
• Mental health — anxiety, depression, stress management, burnout and specialist referral
• Palliative care — symptom management, supportive care planning and guidance for patients and families
• Occupational health — work-related health concerns, fitness to work assessments, occupational illness queries
• Preventive health — health screenings, lifestyle assessments, vaccination guidance
• Neonatal and newborn queries — early newborn concerns, feeding difficulties, jaundice
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Mustafar will take a full clinical history and provide a clear, evidence-based management plan. His leadership experience as a former Medical Director means he approaches clinical care with a systems awareness — understanding how to navigate healthcare, coordinate with specialists and advocate for patients within a healthcare system. At the end of the consultation you will receive a clinical note with findings and next steps.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to patients with chronic conditions needing regular review and management, patients seeking palliative care guidance for themselves or a family member, patients with occupational health concerns, and patients who value a clinician with international healthcare experience and a strong preventive medicine philosophy.

His approach: Dr Mustafar is known for his warm, approachable manner and his commitment to patient-centred care across every stage of life. His international background — training in Malaysia, leading clinical teams as Medical Director and practicing in Ireland — gives him a broad perspective on healthcare and a practical adaptability that serves patients from diverse backgrounds. He is particularly committed to preventive health and to supporting patients not just through illness but toward sustained long-term wellbeing.

Languages: English`,
    qualifications: [
      "MBBS — International Islamic University of Malaysia (2007)",
      "ATLS — Advanced Trauma Life Support certified",
      "ACLS — Advanced Cardiac Life Support certified",
      "BLS — Basic Life Support certified",
      "Neonatal Resuscitation certification",
      "Occupational Health certification",
      "Former Medical Director — Malaysia",
      "12+ years clinical experience — Malaysia and Ireland",
      "Registered with the Irish Medical Council (IMC 505886 — General Division)",
    ],
    languages: ["English"],
    faqs: [
      {
        question:
          "Is Dr Mohamed Fadzly Mustafar registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Mohamed Fadzly Mustafar holds active registration with the Irish Medical Council — IMC number 505886 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Mustafar has over 12 years of clinical experience across Malaysia and Ireland and previously served as a Medical Director in Malaysia.",
      },
      {
        question: "What does Dr Mustafar treat?",
        answer:
          "Dr Mustafar provides GP consultations covering chronic disease management (diabetes, hypertension, obesity, thyroid, cholesterol, asthma, COPD), acute illness (respiratory infections, fever, flu, UTIs), women's health (contraception, antenatal and postnatal care), paediatric and child health, mental health (anxiety, depression, stress, burnout), palliative care and supportive care guidance, occupational health, preventive health screenings, neonatal and newborn queries, prescription renewals, sick notes and medical certificates.",
      },
      {
        question: "What makes Dr Mustafar's background distinctive?",
        answer:
          "Dr Mustafar brings three distinctions that are uncommon in online GP practice. First, leadership experience — he has served as a Medical Director in Malaysia, giving him a systems-level understanding of healthcare that most GPs do not have. Second, advanced emergency certifications — he holds ATLS (Advanced Trauma Life Support) in addition to ACLS and BLS, a combination that reflects emergency medicine preparedness beyond standard GP training. Third, occupational health expertise — his Occupational Health certification allows him to address work-related health concerns, fitness to work assessments and occupational illness queries that fall outside the scope of most GP online consultations.",
      },
      {
        question: "Does Dr Mustafar offer palliative care consultations?",
        answer:
          "Yes. Palliative care — the specialist approach to improving quality of life for patients and families facing serious illness — is one of Dr Mustafar's areas of expertise. In an online consultation he can provide guidance on symptom management, discuss care planning options, help patients and families understand what to expect at different stages of illness, and advise on how to coordinate with specialist palliative care services and the HSE. He approaches palliative care conversations with the sensitivity and clarity that these discussions require.",
      },
      {
        question: "How do I book a consultation with Dr Mustafar?",
        answer:
          "Select 'Pick a time' on this page to view Dr Mustafar's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call.",
      },
      {
        question: "What are Dr Mustafar's qualifications?",
        answer:
          "Dr Mohamed Fadzly Mustafar holds an MBBS from the International Islamic University of Malaysia (2007) and certifications in ATLS (Advanced Trauma Life Support), ACLS (Advanced Cardiac Life Support), BLS, Neonatal Resuscitation and Occupational Health. He previously served as a Medical Director in Malaysia and has over 12 years of clinical experience across Malaysia and Ireland. He is registered with the Irish Medical Council (IMC 505886).",
      },
    ],
  },
  {
    dbSlug: "silvia-alexandre-fernandes",
    sheetSlug: "silvia-fernandes",
    displayName: "Silvia Fernandes",
    specialty: "Nutritional Therapist",
    seoTitle:
      "Silvia Fernandes — Nutritional Therapist | NTOI Registered | Global Health Ireland",
    seoDescription:
      "Book a nutritional therapy consultation with Silvia Fernandes — NTOI-registered Nutritional Therapist in County Mayo, Ireland. BTEC Level 6 Nutritional Science & Therapeutics · Holistic, evidence-based approach · English and Portuguese. Same-day appointments available.",
    bio: `Silvia Fernandes is a Nutritional Therapist based in County Mayo, Ireland, holding a BTEC Level 6 Diploma in Nutritional Science and Therapeutics from the International Institute of Nutrition and Health — a comprehensive postgraduate-level qualification in nutritional science and clinical nutritional therapy. She is also a certified Nutrition and Health Coach and a member of Nutritionists in Ireland (NTOI, registration number NTOI_201).

Silvia's practice is rooted in a holistic and integrative approach to health — working to identify the root causes of symptoms rather than managing them in isolation, and developing practical, sustainable dietary and lifestyle programmes tailored to each individual's needs and goals.

What sets Silvia's practice apart is her commitment to multidisciplinary collaboration. She works closely with professionals across general practice, endocrinology, psychiatry and gastroenterology — ensuring that nutritional therapy is integrated into each client's broader healthcare picture rather than delivered in isolation. This approach is particularly valuable for clients with complex or chronic health conditions where nutrition plays a significant but often underaddressed role.

She provides nutritional therapy consultations in English and Portuguese — making her directly accessible to Brazilian and Portuguese-speaking clients in Ireland who want evidence-based nutritional guidance in their first language.

What she helps with:
• Weight management — evidence-based, sustainable weight loss and weight maintenance programmes
• Gut health — IBS, bloating, constipation, food intolerances and digestive health optimisation
• Hormonal health — thyroid support, PCOS, perimenopause and menopause nutritional management
• Blood sugar management — nutritional support for pre-diabetes, Type 2 diabetes and insulin resistance
• Cardiovascular health — cholesterol management, blood pressure and heart health nutrition
• Mental health and nutrition — the gut-brain connection, nutritional support for anxiety and depression
• Energy and fatigue — chronic fatigue, nutritional deficiencies and energy optimisation
• Autoimmune and inflammatory conditions — anti-inflammatory nutritional approaches
• Sports and performance nutrition — fuelling exercise, recovery and body composition
• Preventive nutrition — health screening nutrition review and disease prevention
• Post-operative and recovery nutrition — nutritional support following surgery or illness
• Paediatric nutrition — child and adolescent nutritional concerns

What to expect from your consultation: Silvia will take a full health and dietary history — including current symptoms, medical history, medications and lifestyle factors — and develop a personalised nutritional therapy plan. She works collaboratively with your GP and other treating clinicians where relevant. At the end of your consultation you will receive a written plan with practical dietary recommendations, supplement guidance where appropriate, and clear next steps.

Who this consultation is for: Nutritional therapy consultations are suitable for anyone who wants to improve their health through food and lifestyle — from people with specific chronic conditions to those who simply want to feel better and understand their body's nutritional needs more clearly. It is particularly suited to clients who have been told by their GP to "improve their diet" without being given specific guidance, clients with gut health concerns that haven't resolved with standard medical management, clients with hormonal or metabolic conditions where nutrition plays a central role, and Portuguese-speaking clients in Ireland who want nutritional guidance in their first language.

Her approach: Silvia combines scientific rigour with genuine empathy and a deeply practical understanding of how real people eat and live. Her holistic model looks at the whole person — not just the symptom — and her multidisciplinary network means she can integrate nutritional recommendations with the care you are already receiving from your medical team. She is committed to lasting, achievable results rather than short-term dietary fixes.

Languages: English · Portuguese`,
    qualifications: [
      "BTEC Level 6 Diploma in Nutritional Science and Therapeutics — International Institute of Nutrition and Health",
      "Certified Nutrition and Health Coach",
      "Member — Nutritionists in Ireland (NTOI, registration NTOI_201)",
      "Based in County Mayo, Ireland",
      "Multidisciplinary collaboration: GP, endocrinology, psychiatry, gastroenterology",
      "Consultations in English and Portuguese",
    ],
    languages: ["English", "Portuguese"],
    faqs: [
      {
        question:
          "Is Silvia Fernandes a registered Nutritional Therapist in Ireland?",
        answer:
          "Yes. Silvia Fernandes is a member of Nutritionists in Ireland (NTOI — registration number NTOI_201), the voluntary professional register for nutritional therapists in Ireland. She holds a BTEC Level 6 Diploma in Nutritional Science and Therapeutics from the International Institute of Nutrition and Health and is a certified Nutrition and Health Coach. You can verify NTOI membership at ntoi.ie.",
      },
      {
        question: "What health concerns does Silvia help with?",
        answer:
          "Silvia provides nutritional therapy consultations covering weight management, gut health (IBS, bloating, food intolerances), hormonal health (thyroid, PCOS, perimenopause, menopause), blood sugar management (pre-diabetes, Type 2 diabetes, insulin resistance), cardiovascular health (cholesterol, blood pressure), mental health nutrition (gut-brain connection, anxiety, depression), energy and chronic fatigue, autoimmune and inflammatory conditions, sports and performance nutrition, preventive nutrition, post-operative recovery nutrition and paediatric nutrition.",
      },
      {
        question:
          "What is the difference between a Nutritional Therapist and a Dietitian?",
        answer:
          "In Ireland, a Dietitian is a CORU-regulated healthcare professional with a recognised university degree in dietetics — typically working within the HSE or hospitals. A Nutritional Therapist like Silvia takes a holistic, integrative approach to nutrition — working with clients on root cause identification, personalised dietary and lifestyle programmes, and prevention. Silvia holds a BTEC Level 6 Diploma in Nutritional Science and Therapeutics and is a member of NTOI. Her practice is particularly suited to clients who want personalised, in-depth nutritional guidance outside the time constraints of a standard clinical dietetic appointment, and to those whose concerns bridge nutrition, lifestyle and chronic health conditions.",
      },
      {
        question: "Does Silvia work alongside my GP or other healthcare providers?",
        answer:
          "Yes — multidisciplinary collaboration is central to Silvia's practice. She works closely with GPs, endocrinologists, psychiatrists and gastroenterologists to ensure that nutritional recommendations are integrated with each client's broader medical care. If you are under the care of other healthcare providers, Silvia will communicate with them where appropriate and relevant, and her recommendations will be designed to complement — not conflict with — your existing treatment plan.",
      },
      {
        question: "How do I book a nutritional therapy consultation with Silvia?",
        answer:
          "Select 'Pick a time' on this page to view Silvia's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your session is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English or Portuguese. After your session you will receive a written nutritional plan with practical dietary recommendations and clear next steps.",
      },
      {
        question: "What are Silvia's qualifications?",
        answer:
          "Silvia Fernandes holds a BTEC Level 6 Diploma in Nutritional Science and Therapeutics from the International Institute of Nutrition and Health and is a certified Nutrition and Health Coach. She is a member of Nutritionists in Ireland (NTOI, registration NTOI_201) and is based in County Mayo, Ireland. She provides nutritional therapy consultations in English and Portuguese, with a particular focus on holistic, integrative and multidisciplinary care.",
      },
    ],
  },
  {
    dbSlug: "dr-muhammad-tahir-arain",
    sheetSlug: "dr-muhammad-tahir-arain",
    displayName: "Dr Muhammad Tahir Arain",
    specialty: "General Practitioner",
    seoTitle:
      "Dr Muhammad Tahir Arain — GP | IMC 509406 | FRCEM | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Muhammad Tahir Arain — IMC-registered GP in Ireland (IMC 509406). FRCEM Primary (UK) · MCPS Family Medicine · 7+ years experience across Ireland, Saudi Arabia, Pakistan & Maldives. English, Arabic, Urdu, Punjabi and Sindhi. Same-day appointments available.",
    bio: `Dr Muhammad Tahir Arain is a General Practitioner with over seven years of diverse clinical experience across Ireland, Saudi Arabia, Pakistan and the Maldives — bringing an international breadth of primary care, urgent care and emergency medicine experience that is exceptional for a GP at this stage of career.

He holds an MBBS from Liaquat College of Medicine and Dentistry, an MCPS in Family Medicine from Pakistan, and the FRCEM Primary from the Royal College of Emergency Medicine (UK) — one of the most rigorous emergency medicine qualifications in Europe. He is also certified by the Saudi Commission for Health Specialties as a Family Medicine Specialist and is fully registered with the Irish Medical Council.

Dr Tahir has worked extensively in primary care, urgent care and telemedicine settings — managing over 200 consultations per week at peak capacity — giving him a clinical efficiency and diagnostic breadth that is rarely found in online GP practice. His emergency medicine training through the FRCEM means he is exceptionally skilled at assessing urgent and acute presentations and at identifying when something needs immediate in-person attention.

He consults in English, Arabic, Urdu, Punjabi and Sindhi — giving patients from Pakistani, South Asian, Arabic-speaking and Sindhi-speaking communities in Ireland access to a fully IMC-registered GP in their first language.

What he treats:
• Chronic disease management — diabetes, hypertension, asthma, COPD, thyroid disorders, high cholesterol
• Acute and urgent illness — respiratory infections, fever, flu, sore throat, ear infections, UTIs
• Emergency medicine assessment — acute presentations requiring rapid risk assessment and management
• Dermatological conditions — acne, eczema, psoriasis, rashes, skin infections
• Paediatric and child health — child health reviews, common childhood illnesses, developmental concerns
• Elderly care — geriatric health reviews, polypharmacy management, falls risk assessment, chronic condition monitoring
• Women's health — contraception, hormonal concerns, menstrual issues, antenatal and postnatal care
• Infectious diseases — assessment and management of infectious conditions
• Palliative care — symptom management and supportive care planning
• Preventive health and lifestyle medicine — health screenings, vaccination guidance, lifestyle assessments
• Prescription renewals and medication reviews
• Sick notes and medical certificates

What to expect from your consultation: Dr Tahir will take a rapid, structured clinical history and provide a clear, evidence-based management plan. His experience managing 200+ weekly consultations means he is highly efficient without sacrificing clinical depth — patients receive a thorough assessment and a clear plan within a well-structured consultation. At the end of the consultation you will receive a clinical note with findings, any prescriptions and next steps.

Who this consultation is for: This consultation is suitable for any patient needing same-day GP access. It is particularly suited to patients with acute or urgent presentations who want a clinician with emergency medicine training assessing their concern, patients from Pakistani, South Asian, Arabic-speaking and Sindhi-speaking communities in Ireland who want a GP consultation in their first language, elderly patients with complex chronic conditions, and patients with chronic diseases needing regular review and management.

His approach: Dr Tahir is known for his calm, patient-centred approach and his ability to communicate clearly and effectively with patients from diverse cultural and linguistic backgrounds. His holistic and preventive philosophy means he looks beyond the immediate presenting complaint to consider the wider context of a patient's health — and his commitment to continuous professional development ensures his practice stays current with evolving evidence and best practice.

Languages: English · Arabic · Urdu · Punjabi · Sindhi`,
    qualifications: [
      "FRCEM Primary — Royal College of Emergency Medicine, United Kingdom",
      "MCPS — Family Medicine, Pakistan",
      "MBBS — Liaquat College of Medicine and Dentistry",
      "Saudi Commission for Health Specialties — Family Medicine Specialist certification",
      "ACLS — Advanced Cardiac Life Support certified",
      "BLS — Basic Life Support certified",
      "7+ years clinical experience — Ireland, Saudi Arabia, Pakistan and Maldives",
      "200+ consultations per week at peak capacity",
      "Registered with the Irish Medical Council (IMC 509406 — General Division)",
    ],
    languages: ["English", "Arabic", "Urdu", "Punjabi", "Sindhi"],
    faqs: [
      {
        question:
          "Is Dr Muhammad Tahir Arain registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Muhammad Tahir Arain holds active registration with the Irish Medical Council — IMC number 509406 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Tahir holds the FRCEM Primary from the Royal College of Emergency Medicine (UK), MCPS in Family Medicine, and Saudi Commission Family Medicine Specialist certification, with over seven years of clinical experience across Ireland, Saudi Arabia, Pakistan and the Maldives.",
      },
      {
        question: "What does Dr Tahir treat?",
        answer:
          "Dr Tahir provides GP consultations covering chronic disease management (diabetes, hypertension, asthma, COPD, thyroid, cholesterol), acute and urgent illness (respiratory infections, fever, flu, UTIs), emergency medicine assessment, dermatological conditions (acne, eczema, psoriasis, rashes), paediatric and child health, elderly care (geriatric health, polypharmacy management, falls risk), women's health (contraception, antenatal and postnatal care), infectious diseases, palliative care, preventive health screenings, prescription renewals, sick notes and medical certificates.",
      },
      {
        question: "What is the FRCEM and why is it significant for a GP?",
        answer:
          "The FRCEM Primary is the first examination of the Fellowship of the Royal College of Emergency Medicine (UK) — one of the most rigorous emergency medicine qualifications in Europe, awarded by the Royal College of Emergency Medicine. For a GP, holding this qualification means Dr Tahir has been trained and assessed to emergency medicine specialist standards in acute assessment, pathophysiology and emergency clinical management. In an online GP consultation, this means he is exceptionally skilled at identifying red-flag presentations, assessing risk and determining whether a concern requires urgent in-person care — a critical skill in telemedicine where clinical examination is limited.",
      },
      {
        question: "What languages does Dr Tahir consult in?",
        answer:
          "Dr Tahir consults in English, Arabic, Urdu, Punjabi and Sindhi — giving patients from Pakistani, South Asian, Arabic-speaking and Sindhi-speaking communities in Ireland the opportunity to discuss their health in their first language with a fully IMC-registered GP. He is one of the very few Irish-registered GPs who can conduct a full medical consultation in Sindhi, making him uniquely accessible to Sindhi-speaking patients in Ireland who often face significant language barriers when accessing healthcare.",
      },
      {
        question: "How do I book a consultation with Dr Tahir?",
        answer:
          "Select 'Pick a time' on this page to view Dr Tahir's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English, Arabic, Urdu, Punjabi or Sindhi.",
      },
      {
        question: "What are Dr Tahir's qualifications?",
        answer:
          "Dr Muhammad Tahir Arain holds an MBBS from Liaquat College of Medicine and Dentistry, MCPS in Family Medicine (Pakistan), and the FRCEM Primary from the Royal College of Emergency Medicine (UK). He is certified by the Saudi Commission for Health Specialties as a Family Medicine Specialist and holds current ACLS and BLS certification. He has over seven years of clinical experience across Ireland, Saudi Arabia, Pakistan and the Maldives and has managed over 200 consultations per week at peak capacity. He is registered with the Irish Medical Council (IMC 509406).",
      },
    ],
  },
  {
    dbSlug: "dr-ahmed-maklad",
    sheetSlug: "dr-ahmed-maklad",
    displayName: "Dr Ahmed Maklad",
    specialty: "General Practitioner",
    seoTitle: "Dr Ahmed Maklad — GP | IMC 523450 | Global Health Ireland",
    seoDescription:
      "Book a video consultation with Dr Ahmed Maklad — IMC-registered GP in Ireland (IMC 523450). MUDr. Masaryk University · Surgical Residency, University Hospital Brno · GP experience Cairo · ACLS certified. English, Arabic and Czech. Same-day appointments available.",
    bio: `About Dr Ahmed

Dr. Ahmed Maklad is a Doctor of Medicine (MUDr.) graduated in General Medicine from Masaryk University, Faculty of Medicine in Brno — one of Europe's most internationally recognised medical schools — with clinical experience spanning surgery, internal medicine, geriatrics, paediatrics, and primary care across the Czech Republic and Egypt.

Before joining Global Health Ireland, Dr. Maklad worked as a General Practitioner at Ghouraba GP Clinic in Cairo, where he provided ongoing care for patients with chronic conditions including diabetes, hypertension, and respiratory disease. Managing complex, long-term patients in a high-demand environment gave him something that hospital training alone rarely does — the ability to listen carefully, explain clearly, and build a clinical picture from a conversation rather than a full investigation panel.

He is currently undertaking his Surgical Residency at University Hospital Brno, one of the Czech Republic's leading tertiary hospitals, where he works across emergency and elective surgical procedures, trauma management, perioperative care, and acute surgical assessment. That surgical background sharpens his diagnostic thinking in primary care — he knows when something can be safely managed online, and when it needs to be escalated without delay.

As an online doctor with Global Health Ireland, Dr. Maklad brings that combination of GP continuity and surgical acuity to every video consultation. He joined the platform because he believes that access to a qualified, attentive doctor should not depend on where you live, what language you speak, or how long you can wait.

What he treats:
• Acute illness — respiratory infections, fever, flu, sore throat, ear infections
• Urinary tract infections and urinary symptoms
• Chronic disease management — hypertension, diabetes, asthma, reflux, high cholesterol
• Dermatological concerns — rashes, eczema, allergic skin reactions, mild infections
• Geriatric queries and care for patients with complex or multiple conditions
• Cardiovascular queries — chest symptoms, blood pressure management, palpitations
• Preventive care — health assessments, lifestyle counselling, screening referrals
• Mental health — anxiety, depression, stress management and specialist referral
• Medical certificates and referrals for blood tests, imaging, or specialist review
• Acute queries about existing conditions or current medication

His approach: Every consultation with Dr. Maklad is personalised, evidence-based, and delivered with the clinical standard you would expect from an in-person appointment. He takes time to understand the full picture, explains findings clearly in plain language, and ensures you leave with a concrete plan — not just reassurance.

Languages: English · Arabic · Czech`,
    qualifications: [
      "Doctor of Medicine (MUDr.) — Masaryk University, Faculty of Medicine, Brno",
      "Surgical Residency — University Hospital Brno",
      "General Practitioner — Ghouraba GP Clinic, Cairo, Egypt",
      "Clinical rotations: Internal Medicine, Cardiology, Gastroenterology, Pulmonology, Geriatrics, Paediatrics, Obstetrics & Gynaecology, Surgery — University Hospital Brno",
      "Certified in Advanced Cardiovascular Life Support (ACLS) — American Heart Association",
      "Registered with the Irish Medical Council",
    ],
    languages: ["English", "Arabic", "Czech"],
    faqs: [
      {
        question: "Is Dr Ahmed Maklad registered with the Irish Medical Council?",
        answer:
          "Yes. Dr Ahmed Maklad holds active registration with the Irish Medical Council — IMC number 523450 on the General Division. You can verify this registration at medicalcouncil.ie. Dr Maklad holds an MUDr. in General Medicine from Masaryk University, Faculty of Medicine in Brno, and is currently completing his Surgical Residency at University Hospital Brno — one of the Czech Republic's leading tertiary hospitals.",
      },
      {
        question: "What does Dr Maklad treat?",
        answer:
          "Dr Maklad provides GP consultations covering acute illness (respiratory infections, fever, flu, sore throat, ear infections), urinary tract infections and urinary symptoms, chronic disease management (hypertension, diabetes, asthma, reflux, high cholesterol), dermatological concerns (rashes, eczema, allergic skin reactions, mild infections), geriatric queries and complex multi-condition patients, cardiovascular queries (chest symptoms, blood pressure management, palpitations), preventive care (health assessments, lifestyle counselling, screening referrals), mental health (anxiety, depression, stress management), medical certificates, referrals and acute queries about existing conditions or current medication.",
      },
      {
        question: "What makes Dr Maklad's background distinctive for a GP?",
        answer:
          "Dr Maklad combines two types of clinical experience that rarely coexist in online GP practice. First, GP continuity experience — having worked as a General Practitioner at Ghouraba GP Clinic in Cairo managing complex chronic patients in a high-demand environment, he developed the ability to build a clinical picture from a conversation rather than a full investigation panel. Second, surgical acuity — his Surgical Residency at University Hospital Brno sharpens his diagnostic thinking in primary care. As he puts it himself: he knows when something can be safely managed online, and when it needs to be escalated without delay. That combination of GP depth and surgical awareness is what makes him particularly effective in telemedicine.",
      },
      {
        question: "What languages does Dr Maklad consult in?",
        answer:
          "Dr Maklad consults in English, Arabic and Czech — giving patients from Arabic-speaking communities in Ireland and Czech-speaking patients across the Global Health network access to a fully IMC-registered GP in their first language. His Arabic fluency is particularly valuable for Egyptian, Lebanese, Syrian, Sudanese and other Arabic-speaking patients who want to discuss health concerns in their first language with a doctor who shares their cultural and clinical context.",
      },
      {
        question: "How do I book a consultation with Dr Maklad?",
        answer:
          "Select 'Pick a time' on this page to view Dr Maklad's available appointment slots. Same-day appointments are typically available. Payment is processed securely at checkout — your consultation is confirmed once payment is complete. You will receive a calendar invite immediately after booking. Consultations are by secure video call in English, Arabic or Czech.",
      },
      {
        question: "What are Dr Maklad's qualifications?",
        answer:
          "Dr Ahmed Maklad holds a Doctor of Medicine (MUDr.) in General Medicine from Masaryk University, Faculty of Medicine, Brno. He is currently completing his Surgical Residency at University Hospital Brno and previously worked as a General Practitioner at Ghouraba GP Clinic in Cairo, Egypt. He completed clinical rotations in Internal Medicine, Cardiology, Gastroenterology, Pulmonology, Geriatrics, Paediatrics, Obstetrics and Gynaecology, and Surgery at University Hospital Brno. He is certified in Advanced Cardiovascular Life Support (ACLS) by the American Heart Association and is registered with the Irish Medical Council (IMC 523450).",
      },
    ],
  },
];
