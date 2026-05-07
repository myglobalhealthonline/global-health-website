# Editorial Completion Plan

## Executive Summary

The structural cleanup is done. The remaining blocker is content maturity.

- Ireland service routes now have a safe publishing framework, but most pages still need final patient-facing copy entered into admin and exact structured fields for `durationMinutes`, `basePriceCents`, and `currencyCode` before they should index.
- Portugal, Spain, Czechia, and Romania need country-specific copy that is honest about availability and should remain `noindex` until local clinician coverage, pricing, and prescribing/referral workflows are confirmed.
- Doctor profile indexing must remain strict. A profile without a verified registration number or verification URL should stay `noindex`, even if the bio is improved.
- The blog should move from empty state to a small set of medically cautious, high-intent articles that directly support GP, referral, prescription, and consultation booking pages.
- Legal pages need plain-language summaries and clean structure, but any entity, jurisdiction, and effective-date language still requires legal approval before publication.

The content below is written for admin/CMS entry. Where facts are operational rather than editorial, the recommendation is to keep the page draft or `noindex` until those fields are confirmed.

## Index-Ready Content Checklist

Use this checklist before publishing any healthcare page.

- The page has one clear patient question and answers it above the fold.
- The H1, SEO title, and SEO description are unique to that page.
- The page explains who the service is for in plain language.
- The page clearly states what can be handled online.
- The page clearly states what cannot be handled online.
- The page includes an emergency or urgent-care warning.
- The page explains prescription, referral, certificate, or sick-note limits.
- The page explains what the patient should prepare before booking.
- The page explains what follow-up looks like.
- The page contains exact structured duration and starting-price fields in admin if it is meant to index.
- The page does not contain blocked internal language.
- The page links to the most relevant adjacent services instead of repeating generic marketing sections.
- The page should only index if the answer to all seven editorial governance questions at the end of this file is yes.

## Ireland Service Content Queue

| Service | Status | Missing Fields | Editorial Priority | Index Recommendation |
| --- | --- | --- | --- | --- |
| Medical Consultation | Draft copy complete in this plan | Confirm exact duration, price, asset | High | Keep `noindex` until structured pricing/duration are saved |
| Pain Management Consultation | Draft copy complete in this plan | Confirm exact duration, price, clinician scope | High | Keep `noindex` until scope and structured fields are saved |
| Travel Consultation | Draft copy complete in this plan | Confirm vaccine/prescribing scope, duration, price | High | Keep `noindex` until operational scope is confirmed |
| Erectile Dysfunction Consultation | Draft copy complete in this plan | Confirm prescribing pathway, duration, price | High | Keep `noindex` until clinician workflow is confirmed |
| Self Referral | Draft copy complete in this plan | Confirm referral acceptance wording, duration, price | Medium | Keep `noindex` until referral workflow is confirmed |
| Diabetes Consultation | Draft copy complete in this plan | Confirm follow-up scope, duration, price | High | Keep `noindex` until structured fields are saved |
| Sick Leave | Draft copy complete in this plan | Confirm certificate format policy, duration, price | High | Keep `noindex` until documentation rules are confirmed |
| Paediatric Primary Care Consultation | Draft copy complete in this plan | Confirm age boundaries, duration, price | High | Keep `noindex` until paediatric clinician coverage is confirmed |
| Family Medicine Consultation | Draft copy complete in this plan | Confirm continuity scope, duration, price | High | Keep `noindex` until structured fields are saved |
| Respiratory Infections | Draft copy complete in this plan | Confirm triage rules, duration, price | High | Keep `noindex` until red-flag pathway is confirmed |
| Hypertension Consultation | Draft copy complete in this plan | Confirm monitoring expectations, duration, price | High | Keep `noindex` until structured fields are saved |
| Driving License Medical Certificate | Draft copy complete in this plan | Confirm in-person requirements, duration, price | High | Keep `noindex` until certificate workflow is confirmed |
| Treatment Refill | Draft copy complete in this plan | Confirm refill policy, duration, price | High | Keep `noindex` until prescribing workflow is confirmed |
| Weight Loss Consultation | Draft copy complete in this plan | Confirm medication program scope, duration, price | High | Keep `noindex` until clinical pathway is confirmed |
| Mental Health Assessment Consultation | Draft copy complete in this plan | Confirm clinician availability, duration, price | High | Keep `noindex` until roster and escalation guidance are confirmed |
| Referral Consultation | Draft copy complete in this plan | Confirm referral output types, duration, price | Medium | Keep `noindex` until referral workflow is confirmed |
| Migraine Consultation | Draft copy complete in this plan | Confirm medication/referral scope, duration, price | High | Keep `noindex` until structured fields are saved |
| Aesthetic Medicine Online Consultation | Draft copy complete in this plan | Confirm procedure-screening scope, duration, price | Medium | Keep `noindex` until service boundaries are confirmed |
| Cardiology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | High | Keep `noindex` until specialist availability is live |
| Pediatric Consultation | Draft copy complete in this plan | Confirm specialist roster, age rules, duration, price | High | Keep `noindex` until coverage is live |
| Orthopedic Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | Medium | Keep `noindex` until coverage is live |
| Neurology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | High | Keep `noindex` until coverage is live |
| Gastroenterology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | Medium | Keep `noindex` until coverage is live |
| Urology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | Medium | Keep `noindex` until coverage is live |
| Rheumatology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | Medium | Keep `noindex` until coverage is live |
| Psychology Consultation | Draft copy complete in this plan | Confirm therapist roster, duration, price | High | Keep `noindex` until provider coverage is live |
| Nutrition Consultation | Draft copy complete in this plan | Confirm clinician roster, duration, price | Medium | Keep `noindex` until coverage is live |
| Endocrinology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | High | Keep `noindex` until coverage is live |
| Oncology Consultation | Draft copy complete in this plan | Confirm review-only scope, duration, price | High | Keep `noindex` until scope is confirmed |
| Venereology Consultation | Draft copy complete in this plan | Confirm sexual health testing/referral scope, duration, price | High | Keep `noindex` until workflow is confirmed |
| Genetics Consultation | Draft copy complete in this plan | Confirm counseling scope, duration, price | Medium | Keep `noindex` until coverage is live |
| Psychiatry Consultation | Draft copy complete in this plan | Confirm specialist roster, prescribing scope, duration, price | High | Keep `noindex` until provider coverage is live |
| Physiotherapy Consultation | Draft copy complete in this plan | Confirm movement-assessment scope, duration, price | Medium | Keep `noindex` until coverage is live |
| Geriatrics Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | Medium | Keep `noindex` until coverage is live |
| Dermatology Consultation | Draft copy complete in this plan | Confirm image-review workflow, duration, price | High | Keep `noindex` until specialist coverage is live |
| Immunoallergology Consultation | Draft copy complete in this plan | Confirm testing limits, duration, price | Medium | Keep `noindex` until workflow is confirmed |
| Pneumology Consultation | Draft copy complete in this plan | Confirm specialist roster, duration, price | Medium | Keep `noindex` until coverage is live |

## Country Content Queue

| Country | Status | Missing Fields | Index Recommendation |
| --- | --- | --- | --- |
| Portugal | Draft copy complete in this plan | Local roster, confirmed pricing, prescription/referral workflow | Keep `noindex` until local operations are confirmed |
| Spain | Draft copy complete in this plan | Local roster, confirmed pricing, prescription/referral workflow | Keep `noindex` until local operations are confirmed |
| Czechia | Draft copy complete in this plan | Local roster, confirmed pricing, language availability | Keep `noindex` until local operations are confirmed |
| Romania | Draft copy complete in this plan | Local roster, confirmed pricing, referral workflow | Keep `noindex` until local operations are confirmed |

## Doctor Profile Queue

| Doctor/Profile | Status | Missing Fields | Index Recommendation |
| --- | --- | --- | --- |
| Dr. Khoiamul Islam | Draft profile copy improved in this plan | Verified IMC number or verification URL, expanded qualifications, consultation availability note | Keep `noindex` until credentials are published |
| Any future Ireland doctor profile | Use template below | Registration number or verification URL, specific specialties, languages, real headshot, availability note | Do not index until credentials and bio pass publication validation |
| Any non-Ireland doctor profile | Use template below | Country-specific credentials, languages, consultation scope, verification URL | Do not index until local credential workflow is defined |

## Blog Production Queue

| Article | Target Service | Priority | Status |
| --- | --- | --- | --- |
| When to Book an Online GP Consultation | Medical Consultation / Family Medicine | High | Full draft included below |
| What an Online Doctor Can and Cannot Prescribe | Treatment Refill / Travel / Erectile Dysfunction | High | Full draft included below |
| When to Choose a Specialist Consultation | Specialist directory and referral pages | High | Full draft included below |
| How Online Sick Notes Work | Sick Leave / Referral Consultation | High | Full draft included below |
| Preparing for an Online Medical Consultation | Medical Consultation / Diabetes / Hypertension / Migraine | High | Full draft included below |

## Pricing Content Draft

### SEO Title
Global Health Pricing in Ireland | Online GP and Specialist Consultation Costs

### SEO Description
Review how Global Health presents online consultation pricing in Ireland, what is included before booking, and what may need a separate follow-up or in-person service.

### H1
Consultation Pricing and What to Expect

### Intro
Use this page to understand how consultation pricing is presented before you book. Global Health shows the appointment type, estimated consultation length, and starting price in the booking flow. If a service needs a longer review, follow-up appointment, or external test, that is explained before you confirm payment.

### Price Categories

#### GP and first-contact consultations
These appointments are designed for common non-emergency symptoms, routine medical questions, medication reviews, referrals, and follow-up planning. The exact price and consultation length should appear before payment.

#### Specialist consultations
Specialist pricing may differ from GP pricing because specialist appointments can involve longer history review, document review, or more focused follow-up planning. The booking page should show the exact appointment format before confirmation.

#### Documentation-focused appointments
Appointments for sick notes, referral requests, or medical certificates are priced as consultations, not document-only transactions. A document is only issued if the clinician decides it is clinically appropriate and the request can be handled online.

### What is included

- Secure online appointment with a clinician
- Review of your symptoms, medical history, and relevant questions
- Advice on next steps and self-care where appropriate
- Discussion of whether a prescription, referral, or certificate may be suitable
- Follow-up guidance when further review is needed

### What is not included

- Emergency treatment
- Hospital, imaging, or lab fees outside the consultation
- Guaranteed prescriptions, referrals, or certificates
- Physical examination, procedures, vaccinations, or urgent in-person interventions
- Specialist follow-up outside the appointment you selected

### Refund and Cancellation Notes
Patients should see the cancellation window and refund conditions before checkout. If a patient books the wrong service type, the clinic may need to reschedule or advise a more suitable route rather than complete the original booking.

### Prescription and Referral Notes
Prescriptions, referrals, and sick notes are only issued when the clinician considers them appropriate after assessment. Some requests may need in-person examination, repeat measurements, document review, or a different specialist appointment.

### FAQ

**Why do some prices vary between services?**  
Some appointments involve a more focused specialist review, longer consultation time, or more detailed follow-up planning.

**Will the listed price include tests or medication?**  
No. Consultation pricing covers the appointment itself. External tests, pharmacy costs, and third-party provider fees are separate.

**Can I get a refund if the doctor decides my issue cannot be handled online?**  
Refund and rescheduling terms should be shown before payment. Some cases require redirection to a different route or in-person care.

**Is the cheapest option always the right one?**  
Not always. Patients should choose the route that best fits the concern, symptoms, and required review.

### CTA Copy

- Primary CTA: `Compare consultation options`
- Secondary CTA: `Book the right appointment`

## Country Page Drafts

### Portugal Draft

**SEO Title**  
Online Medical Consultations in Portugal | Global Health

**SEO Description**  
Explore Global Health’s Portugal clinic hub for online consultation availability, language expectations, pricing notes, and booking guidance for patients in Portugal.

**H1**  
Online Medical Consultations in Portugal

**Availability Statement**  
The Portugal page should act as an access hub, not a promise of full local coverage. Show only the consultation types that are actively staffed and bookable for Portugal.

**Supported Services Summary**  
Portugal should present a small, clear set of live routes first: general consultation, selected specialist appointments, medication follow-up where permitted, and referral guidance where clinically appropriate.

**Language Expectations**  
Patients should expect Portuguese or English support depending on the clinician schedule shown during booking. Do not promise language availability on every slot unless the rota supports it.

**Pricing and Currency Notes**  
Show prices in euro. If service pricing is not fully configured, the page should explain that final pricing appears before payment and remain `noindex`.

**Prescription and Referral Limitations**  
Do not imply that every prescription or referral request can be completed online. The page should explain that medication continuation, specialist referrals, and certificates depend on clinician assessment and local service workflow.

**Doctor Availability Notes**  
Doctor coverage should be described in operational terms only: for example, same-day, next-available, or scheduled specialist sessions, but only if the rota supports those claims.

**Booking Flow**  
Choose Portugal, select the consultation type, complete the intake, review price and appointment details, then confirm the booking.

**Country FAQ**

- Can I book in Portuguese?  
Portuguese-speaking appointments should only be promised when those slots are available in the rota.

- Are prescriptions issued online in Portugal?  
Some medication requests may be handled online, but only after review and only when appropriate for the clinician and service route.

- Do I need to choose GP or specialist first?  
Start with the route that best matches your main concern. If the issue needs another pathway, the clinic can advise the next step.

**Index Recommendation**  
Keep Portugal `noindex` until local roster, live pricing, and prescribing/referral workflow are confirmed.

### Spain Draft

**SEO Title**  
Online Medical Consultations in Spain | Global Health

**SEO Description**  
Review Global Health’s Spain consultation hub for online doctor access, language expectations, booking flow, and country-specific limits on prescriptions and referrals.

**H1**  
Online Medical Consultations in Spain

**Availability Statement**  
The Spain hub should clearly state what is currently available rather than reusing Ireland-style claims. It should feel like a local booking overview with honest limits.

**Supported Services Summary**  
Feature only active pathways such as general consultation, selected specialist appointments, and follow-up review where online care is suitable.

**Language Expectations**  
Spanish and English should only be shown as available where clinician coverage exists. Do not imply bilingual coverage on every appointment.

**Pricing and Currency Notes**  
Display euro pricing when configured. If the route is not fully operational, explain that pricing is shown before booking and keep the page `noindex`.

**Prescription and Referral Limitations**  
Explain that prescriptions, referrals, and certificates are not automatic outputs of the visit. They depend on clinical review and the local workflow attached to the Spain route.

**Doctor Availability Notes**  
Avoid generic “same-day” or “24/7” language unless supported by scheduling data.

**Booking Flow**  
Select Spain, choose the relevant service, complete intake, review availability and pricing, then confirm the appointment.

**Country FAQ**

- Can I see a doctor from anywhere in Spain?  
The booking route is online, but service availability depends on the clinic coverage currently active for Spain.

- Can an online doctor in Spain handle every medical problem?  
No. Emergencies, severe symptoms, and problems needing physical examination or urgent tests should be redirected to in-person care.

- Will I know the cost before I pay?  
Yes. The booking flow should show the final appointment details before payment.

**Index Recommendation**  
Keep Spain `noindex` until local clinician, pricing, and referral workflows are confirmed.

### Czechia Draft

**SEO Title**  
Online Medical Consultations in Czechia | Global Health

**SEO Description**  
Visit Global Health’s Czechia clinic hub for consultation availability, booking guidance, language notes, and clear online-care limits for patients in Czechia.

**H1**  
Online Medical Consultations in Czechia

**Availability Statement**  
Czechia should be presented as a country-specific access hub with current availability, not as a fully mature local service unless operations support that claim.

**Supported Services Summary**  
Lead with first-contact medical consultations and any genuinely staffed specialist routes. Avoid showing a broad grid if only a few services are active.

**Language Expectations**  
Czech and English support should be shown at booking stage based on clinician rota. Avoid a blanket claim that all appointments are bilingual.

**Pricing and Currency Notes**  
Use the configured currency shown in the booking flow. If pricing is incomplete, the page should explain that the final price is shown before payment and remain `noindex`.

**Prescription and Referral Limitations**  
The page should explain that online care can help with many non-emergency concerns, but some prescriptions, referrals, and certificates may require a different route or in-person care.

**Doctor Availability Notes**  
Use only confirmed scheduling language. If coverage is limited, say so clearly.

**Booking Flow**  
Choose Czechia, select the consultation type, complete the intake, review price and timing, and then confirm the booking.

**Country FAQ**

- Can I book in Czech?  
Only show Czech-language support when the rota includes Czech-speaking clinicians.

- Are specialist appointments available online in Czechia?  
Only for the specialties currently active on the booking route.

- Can online care replace urgent in-person treatment?  
No. Emergencies, severe breathing problems, chest pain, or rapidly worsening symptoms need urgent in-person care.

**Index Recommendation**  
Keep Czechia `noindex` until local clinician coverage, pricing, and language support are confirmed.

### Romania Draft

**SEO Title**  
Online Medical Consultations in Romania | Global Health

**SEO Description**  
Explore Global Health’s Romania clinic hub for online consultation booking, language guidance, pricing notes, and country-specific limits on online care.

**H1**  
Online Medical Consultations in Romania

**Availability Statement**  
Romania should be positioned as a practical route overview with clear scope and limitations, not as a cloned marketing page.

**Supported Services Summary**  
Highlight the service categories that are genuinely available for Romania, starting with general consultations and any active specialist pathways.

**Language Expectations**  
Romanian and English support should only be promised if supported by the live rota.

**Pricing and Currency Notes**  
Display the final appointment cost before payment. If structured price fields are not complete, keep the page `noindex`.

**Prescription and Referral Limitations**  
Explain that medication requests, referrals, and supporting documents depend on clinician review and service-specific workflow.

**Doctor Availability Notes**  
If specialist access is limited to selected sessions, say so clearly instead of using generic convenience language.

**Booking Flow**  
Select Romania, choose the most suitable consultation type, complete intake, review timing and price, then confirm the appointment.

**Country FAQ**

- Can I book online from anywhere in Romania?  
The service is online, but appointment availability depends on the Romania route and clinician schedule.

- Will I receive a prescription or referral automatically?  
No. Those decisions depend on the consultation and whether the request can be handled safely online.

- What if my problem needs an examination?  
The clinician may advise in-person assessment, imaging, testing, or urgent local care if online consultation is not enough.

**Index Recommendation**  
Keep Romania `noindex` until local clinician coverage, price data, and service scope are confirmed.

## Doctor Profile Draft

### Dr. Khoiamul Islam

**Display Name**  
Dr. Khoiamul Islam

**Title**  
General Medicine

**Country**  
Ireland

**Specialties**  
General consultation, follow-up consultation, referral and continuity planning

**Languages**  
English

**Registration and Credential Fields**  
Do not publish until a verified IMC registration number or public verification URL is added. The current seed text should not remain visible on the public page.

**Patient-Facing Bio**  
Dr. Khoiamul Islam supports online first-contact consultations for common non-emergency health concerns and follow-up planning when patients need clear next steps. Appointments may be suitable for symptom review, continuity questions, medication discussion, or deciding whether another service route is needed. Online care is not a replacement for emergency treatment, urgent in-person examination, or hospital care.

**Consultation Types**  
Medical consultation, family medicine consultation, treatment refill review, referral discussion, follow-up planning

**Availability Note**  
Availability should be shown from the live booking rota rather than written into static copy.

**SEO Title**  
Dr. Khoiamul Islam | Online General Medicine Consultations in Ireland

**SEO Description**  
Review Dr. Khoiamul Islam’s profile for online general medicine consultations in Ireland, including consultation scope, languages, and booking guidance.

**Profile FAQ**

- What type of issues can I discuss with this doctor?  
Common non-emergency symptoms, follow-up questions, referral planning, and whether another consultation route may be more suitable.

- Will I definitely receive a prescription or certificate?  
No. Prescriptions, referrals, and certificates depend on clinical assessment and whether the request can be handled safely online.

- Should this profile be indexed now?  
No. Keep it `noindex` until verified registration details are published.

## Blog Article Drafts

### Article 1

**Title**  
When to Book an Online GP Consultation

**Slug**  
when-to-book-an-online-gp-consultation

**SEO Title**  
When to Book an Online GP Consultation | Global Health

**SEO Description**  
Learn when an online GP consultation may be appropriate, what issues can often be reviewed online, and when you should choose urgent in-person care instead.

**Excerpt**  
An online GP consultation can help with many common non-emergency concerns, but it is not the right route for every problem. Here is how to decide when booking online makes sense.

**Category**  
Online GP care

**Author**  
Global Health Editorial Team

**Reviewer**  
Clinical reviewer to be assigned before publication

**Last Updated**  
Add final review date before publishing

**Reading Time**  
6 minutes

**Medical Disclaimer**  
This article is for general information only and is not a substitute for urgent medical care, diagnosis, or treatment.

**Body**

An online GP consultation is often a practical first step when you have a non-emergency health concern and want timely medical advice without travelling to a clinic. It can be useful when your symptoms are new but not severe, when you need a follow-up on an existing issue, or when you want help deciding whether you need a specialist, prescription review, or in-person assessment.

Common reasons to book an online GP consultation include coughs and colds that are not causing breathing difficulty, skin concerns, headaches, medication questions, repeat symptom review, travel-health advice, blood pressure follow-up, digestive symptoms, or requests for advice about the next step in care. Many patients also use online GP appointments for documentation questions, such as whether a sick note or referral may be appropriate after assessment.

Online GP care works best when the doctor can safely understand the issue through your history, current symptoms, and any records or photos you can share. Before the appointment, it helps to write down when the problem started, what has changed, which medicines you take, and whether you have already tried any treatments. If you have home readings such as temperature, blood pressure, blood sugar, or oxygen levels, bring those to the consultation as well.

It is equally important to understand what online GP care cannot do. An online appointment cannot replace emergency treatment or a physical examination when one is clearly needed. Chest pain, severe shortness of breath, stroke symptoms, seizures, major injury, severe allergic reaction, heavy bleeding, suicidal crisis, or a rapidly worsening child should not wait for an online consultation. Those situations need urgent in-person care or emergency services.

Some concerns may also start online but still require an in-person follow-up. For example, a doctor may advise a physical examination, blood tests, imaging, ECG, swab, or hospital review if your symptoms suggest something that cannot be assessed safely through video or questionnaire alone.

Booking the right route matters. If your concern is broad and you are not sure where to start, an online GP consultation is often the best first choice. If you already know you need a specialist review, a dedicated specialist page may be more suitable. If you mainly need medication review, documentation, or long-term disease follow-up, look for the service that matches that task most closely.

Internal links:

- `/ireland/medical-consultation`
- `/ireland/family-medicine-consultation`
- `/ireland/referral-consultation`
- `/general-consultation-ie`

Related services:

- Medical Consultation
- Family Medicine Consultation
- Referral Consultation

### Article 2

**Title**  
What an Online Doctor Can and Cannot Prescribe

**Slug**  
what-an-online-doctor-can-and-cannot-prescribe

**SEO Title**  
What an Online Doctor Can and Cannot Prescribe | Global Health

**SEO Description**  
Understand how online prescribing works, when a medication review may be possible, and why some medicines cannot be prescribed without an in-person assessment.

**Excerpt**  
Many patients book online expecting a prescription, but prescribing is never automatic. Here is what an online doctor may be able to review and why some requests need a different route.

**Category**  
Prescriptions and medication review

**Author**  
Global Health Editorial Team

**Reviewer**  
Clinical reviewer to be assigned before publication

**Last Updated**  
Add final review date before publishing

**Reading Time**  
7 minutes

**Medical Disclaimer**  
This article provides general information only. Medication decisions must be made by a clinician after reviewing your specific situation.

**Body**

An online consultation can be a suitable place to discuss medicines, but it should never be described as a guaranteed prescription service. The doctor’s job is to assess whether the request is safe, appropriate, and possible through the online route you booked.

In some cases, an online doctor may be able to review an established treatment, discuss side effects, consider whether a refill is appropriate, or explain whether another option should be explored. This tends to work best when the medication is already known, the condition is already diagnosed, and the doctor has enough information about your symptoms, medical history, allergies, and current treatment plan.

There are also many reasons why an online doctor may decide not to prescribe. The problem may need a physical examination. The requested medicine may require blood pressure checks, blood tests, recent weight measurements, or monitoring. The clinician may need more records, may want to rule out another diagnosis, or may decide that a different treatment route is safer. Some conditions are simply not suitable for online prescribing.

This is especially important for patients booking travel advice, erectile dysfunction review, treatment refill requests, mental health appointments, or weight-management consultations. These routes may involve prescribing discussions, but none of them should imply that medication will be issued automatically.

Patients can prepare for a safer medication review by bringing a current medication list, dose information, recent readings if relevant, details of allergies, previous side effects, and any recent letters or test results. The more specific the information, the easier it is for the clinician to decide whether online prescribing is appropriate.

Urgent symptoms should never be treated as a prescription problem. Chest pain, severe breathing problems, severe infection, confusion, collapse, suicidal thoughts, or rapidly worsening symptoms need urgent in-person care, not an online prescription request.

Internal links:

- `/ireland/treatment-refill`
- `/ireland/travel-consultation`
- `/ireland/erectyle-dysfunction-consultation`
- `/ireland/weight-loss-consultation`

Related services:

- Treatment Refill
- Travel Consultation
- Erectile Dysfunction Consultation
- Weight Loss Consultation

### Article 3

**Title**  
When to Choose a Specialist Consultation

**Slug**  
when-to-choose-a-specialist-consultation

**SEO Title**  
When to Choose a Specialist Consultation | Global Health

**SEO Description**  
Find out when a specialist consultation may be more appropriate than a general online appointment, and when you should start with a GP instead.

**Excerpt**  
Not every health concern needs a specialist first. This guide explains when specialist care may be helpful and when a general consultation is the better starting point.

**Category**  
Specialist care

**Author**  
Global Health Editorial Team

**Reviewer**  
Clinical reviewer to be assigned before publication

**Last Updated**  
Add final review date before publishing

**Reading Time**  
6 minutes

**Medical Disclaimer**  
This article is educational only and does not replace personal medical advice.

**Body**

Patients often know they want help quickly but are not always sure whether to book a GP or specialist appointment. In many cases, a general online consultation is the best first step because it helps clarify the problem, review red flags, and decide whether specialist care is actually needed.

A specialist consultation may make more sense when you already have an established diagnosis, have seen other clinicians for the same issue, or have a concern that clearly fits a specialty area. Examples include long-standing migraine review with neurology, recurring skin disease with dermatology, thyroid or hormone questions with endocrinology, joint inflammation with rheumatology, or follow-up discussion about known heart conditions with cardiology.

Specialist consultations are often helpful for interpretation, management review, second opinions, and next-step planning. They are not a substitute for emergency treatment. New chest pain, sudden weakness, fainting, rapidly worsening breathing, severe abdominal pain, suicidal crisis, or suspected cancer emergencies need urgent in-person care.

It is also important to understand that a specialist online consultation may still lead to in-person care. A clinician may recommend physical examination, procedure-based treatment, imaging, blood tests, or hospital review if the issue cannot be assessed fully online. An online specialist appointment should be framed as decision support, symptom review, follow-up planning, and triage where appropriate.

If you are not sure which route to choose, start with the broadest route that matches your symptoms. A medical consultation, family medicine consultation, or referral consultation can help you decide whether you need cardiology, dermatology, psychiatry, endocrinology, or another specialist pathway.

Internal links:

- `/specialty-ie`
- `/ireland/referral-consultation`
- `/ireland/medical-consultation`
- `/ireland-specialist-consultations/cardiology-consultation`

Related services:

- Referral Consultation
- Medical Consultation
- Cardiology Consultation
- Dermatology Consultation

### Article 4

**Title**  
How Online Sick Notes Work

**Slug**  
how-online-sick-notes-work

**SEO Title**  
How Online Sick Notes Work | Global Health

**SEO Description**  
Learn when an online consultation may support a sick note request, why certificates are not automatic, and when an in-person assessment may still be needed.

**Excerpt**  
An online appointment may help if you need advice about work absence or a medical certificate, but a sick note is never guaranteed and depends on clinical assessment.

**Category**  
Certificates and documentation

**Author**  
Global Health Editorial Team

**Reviewer**  
Clinical reviewer to be assigned before publication

**Last Updated**  
Add final review date before publishing

**Reading Time**  
5 minutes

**Medical Disclaimer**  
This article is general information only. Certificate decisions are clinical decisions made during the consultation.

**Body**

Patients often search for an online sick note when they are unwell and need documentation for work, study, or another formal requirement. An online consultation can be a suitable way to discuss the situation, but the appointment should be presented honestly: it is a clinical review first, not a guaranteed document service.

During the consultation, the doctor may ask about your symptoms, how long they have been affecting you, what work you do, whether you can safely carry out your duties, and whether any red flags suggest the problem needs urgent in-person review. If the doctor believes the issue can be assessed online and that documentation is clinically justified, they may issue a sick note or explain the next step.

There are also cases where an online appointment is not enough. Severe symptoms, injuries, mental health crisis, repeated certificate requests without enough clinical information, or issues requiring physical examination may need another route. Some employers or institutions may require specific forms that cannot be completed without additional review.

Patients should not assume that backdated certificates, long absence periods, or highly specific fitness-for-work wording can be provided automatically. If you need documentation, explain exactly what is being requested and by whom. Bring previous notes, discharge papers, or employer instructions if you have them.

If your condition feels urgent, especially with chest pain, breathing difficulty, collapse, severe infection, or acute mental health risk, do not wait for an online sick-note appointment. Seek urgent in-person care.

Internal links:

- `/ireland/sick-leave`
- `/ireland/referral-consultation`
- `/ireland/medical-consultation`

Related services:

- Sick Leave
- Medical Consultation
- Referral Consultation

### Article 5

**Title**  
Preparing for an Online Medical Consultation

**Slug**  
preparing-for-an-online-medical-consultation

**SEO Title**  
How to Prepare for an Online Medical Consultation | Global Health

**SEO Description**  
Prepare for your online medical appointment with a simple checklist covering symptoms, medications, records, and questions to ask during the consultation.

**Excerpt**  
Good preparation can make an online consultation more useful. Here is what to gather before your appointment and what details help the doctor assess your concerns safely.

**Category**  
Booking and patient preparation

**Author**  
Global Health Editorial Team

**Reviewer**  
Clinical reviewer to be assigned before publication

**Last Updated**  
Add final review date before publishing

**Reading Time**  
5 minutes

**Medical Disclaimer**  
This article is for general guidance only and should not delay urgent medical care.

**Body**

An online consultation is often more effective when patients prepare a few key details in advance. The goal is not to make the appointment formal or complicated. It is simply to make sure the clinician has enough clear information to understand the issue and advise the safest next step.

Start with your main reason for booking. Write down what symptoms you have, when they started, what makes them better or worse, and whether anything has changed recently. If you have several concerns, list them in order of importance so the appointment stays focused.

Next, gather your medication list. Include prescription medicines, over-the-counter products, supplements, and any recent changes in dose. If you have allergies, side effects, or previous reactions to treatment, note those too.

Bring any useful records. This could include recent blood pressure readings, blood sugar logs, temperature, oxygen saturation, weight, previous clinic letters, discharge notes, or photos of a rash or swelling if relevant. If you are booking about a long-term condition, it also helps to know the name of your usual medication and the last time it was reviewed.

It is also worth preparing a few practical questions. Ask what the likely next step is, whether you need tests, whether the issue can be managed online, and what warning signs should prompt urgent in-person review. If you are hoping for a prescription, referral, or certificate, explain that clearly, but remember that these decisions depend on clinical assessment.

Finally, know when online consultation is not enough. Severe chest pain, shortness of breath, stroke symptoms, heavy bleeding, sudden collapse, seizures, or suicidal crisis need emergency help rather than an online appointment.

Internal links:

- `/ireland/medical-consultation`
- `/ireland/diabetes-consultation`
- `/ireland/hypertension-consultation`
- `/ireland/migraine-consultation`

Related services:

- Medical Consultation
- Diabetes Consultation
- Hypertension Consultation
- Migraine Consultation

## Service Page Draft Template

Use this structure for every Ireland service page in admin.

### Required Admin Fields

- `name`
- `summary`
- `heroTitle`
- `heroDescription`
- `detailBody`
- `ctaLabel`
- `durationMinutes`
- `basePriceCents`
- `currencyCode`
- `imagePath`
- `isActive`

### Editorial Template

**SEO Title**  
`[Unique service title] | Online [service type] in Ireland | Global Health`

**SEO Description**  
`[One clear sentence describing who the service is for, what can be reviewed online, and the main limitation.]`

**H1**  
`[Patient-facing service name]`

**Hero Summary**  
`[Two-sentence explanation of what this service helps with and when it may be suitable.]`

**Who This Is For**  
`[One short paragraph or three bullets describing the right patient.]`

**Common Reasons to Book**  
`[Three to five bullets tied to that service only.]`

**What Can Be Handled Online**  
`[One short paragraph plus concrete examples.]`

**What Cannot Be Handled Online**  
`[One short paragraph naming examination, tests, urgent symptoms, or procedures that need another route.]`

**Emergency Warning**  
`[One direct paragraph naming red flags that need urgent in-person care.]`

**Prescription, Referral, and Certificate Boundaries**  
`[One paragraph explaining what may be possible and what is never guaranteed.]`

**What to Prepare**  
`[Three to five practical items.]`

**Follow-Up Expectations**  
`[One paragraph explaining whether the likely next step is self-care, follow-up, referral, test, or in-person review.]`

**Price and Duration Notes**  
`The booking flow should show the exact consultation length and starting price before payment. Do not publish the page as indexable until structured price and duration fields are complete.`

**FAQ**  
`Use two or three service-specific questions only.`

**Internal Links**  
`Link to the closest GP, referral, or specialist route. Avoid generic sitewide link dumps.`

## Ireland Service Drafts

### Medical Consultation

**SEO Title**  
Online Medical Consultation in Ireland | General Doctor Appointment | Global Health

**SEO Description**  
Book an online medical consultation in Ireland for common non-emergency symptoms, follow-up questions, and advice on the next step in your care.

**H1**  
Online Medical Consultation

**Hero Summary**  
This appointment is designed for common non-emergency health concerns when you need timely medical advice without attending a clinic in person. It is a good starting point if you need symptom review, follow-up guidance, or help deciding whether you need tests, treatment, or referral.

**Who This Is For**  
Adults and older teenagers with new but non-urgent symptoms, patients who need follow-up on an existing issue, and people who want medical advice before deciding on another care route.

**Common Reasons to Book**  
Cough or sore throat without severe breathing difficulty; headache; skin concerns; digestive upset; medication questions; follow-up after a recent illness.

**What Can Be Handled Online**  
History-taking, symptom review, self-care advice, medication discussion, referral discussion, and deciding whether you need in-person follow-up.

**What Cannot Be Handled Online**  
Problems needing physical examination, urgent tests, procedures, wound care, severe dehydration, or emergency treatment.

**Emergency Warning**  
Do not use this route for chest pain, severe shortness of breath, stroke symptoms, collapse, seizures, severe allergic reaction, suicidal crisis, or rapidly worsening illness.

**Prescription, Referral, and Certificate Boundaries**  
Prescriptions, referrals, and certificates may be considered if appropriate after assessment, but they are never guaranteed from an online consultation.

**What to Prepare**  
Symptom timeline, medication list, allergies, relevant home readings, recent letters or test results.

**Follow-Up Expectations**  
You may receive self-care advice, a treatment plan, a follow-up recommendation, referral guidance, or advice to attend in person.

**Price and Duration Notes**  
Show exact consultation length and price in booking before payment.

**FAQ**

- Is this the right route if I am not sure what I need?  
Yes. It is the best starting point for many non-emergency concerns.

- Can the doctor order more tests?  
The doctor may advise tests or referral if your symptoms need more assessment.

**Internal Links**  
`/ireland/family-medicine-consultation`, `/ireland/referral-consultation`, `/general-consultation-ie`

### Pain Management Consultation

**SEO Title**  
Online Pain Management Consultation in Ireland | Global Health

**SEO Description**  
Discuss ongoing non-emergency pain symptoms online in Ireland and get guidance on treatment review, next steps, and when in-person assessment is needed.

**H1**  
Online Pain Management Consultation

**Hero Summary**  
This service is for patients with non-emergency pain who need review, advice, and a clearer plan. It is most useful for persistent or recurring pain that needs assessment rather than urgent treatment.

**Who This Is For**  
Adults with recurring musculoskeletal pain, chronic pain flare questions, or pain that is affecting daily life but is not an emergency.

**Common Reasons to Book**  
Back pain review; neck pain; joint pain; recurring pain flare; treatment side-effect review; deciding whether specialist or physiotherapy follow-up is needed.

**What Can Be Handled Online**  
Pain history review, discussion of triggers, current treatment review, non-drug advice, and planning for follow-up or referral.

**What Cannot Be Handled Online**  
New severe injuries, suspected fractures, uncontrolled severe pain, sudden weakness, numbness with loss of bladder or bowel control, or problems needing urgent examination.

**Emergency Warning**  
Seek urgent care for severe trauma, chest pain, sudden neurological changes, severe weakness, or pain with red-flag symptoms such as fever, collapse, or loss of function.

**Prescription, Referral, and Certificate Boundaries**  
Medication review may be possible, but pain medication is not guaranteed online. Some cases need physical examination, imaging, or specialist referral.

**What to Prepare**  
Pain location, how long it has been present, what worsens or relieves it, previous imaging or reports, current medicines.

**Follow-Up Expectations**  
You may be advised on self-management, physiotherapy, imaging, referral, or another specialist pathway.

**Price and Duration Notes**  
Show exact appointment length and price during booking.

**FAQ**

- Is this suitable for sudden severe pain?  
No. Sudden severe pain may need urgent in-person assessment.

- Can this replace a physical examination?  
No. Some pain problems cannot be assessed safely online alone.

**Internal Links**  
`/ireland-specialist-consultations/physiotherapy-consultation`, `/ireland-specialist-consultations/orthopedic-consultation`, `/ireland/medical-consultation`

### Travel Consultation

**SEO Title**  
Online Travel Health Consultation in Ireland | Global Health

**SEO Description**  
Get online travel-health advice in Ireland for destination risks, medication questions, and planning before your trip.

**H1**  
Online Travel Consultation

**Hero Summary**  
This appointment helps patients prepare for travel with practical medical advice based on destination, trip type, and current health background. It is for planning and review, not for emergency illness while travelling.

**Who This Is For**  
Adults planning international travel, patients with existing medical conditions travelling abroad, and travellers with questions about medication or prevention.

**Common Reasons to Book**  
Travel medicine advice; existing-condition planning; medication packing questions; jet lag and sleep advice; destination-specific health questions; post-travel symptom review that is non-urgent.

**What Can Be Handled Online**  
Risk review, travel history planning, discussion of current medicines, general prevention advice, and guidance on whether in-person vaccination or testing is needed.

**What Cannot Be Handled Online**  
Vaccinations, urgent illness during travel, severe dehydration, high fever with red flags, or conditions needing physical examination.

**Emergency Warning**  
Seek urgent in-person care for severe breathing problems, chest pain, confusion, severe dehydration, persistent vomiting, fainting, or symptoms suggesting serious infection.

**Prescription, Referral, and Certificate Boundaries**  
Travel-related prescriptions may be discussed, but medication is never guaranteed and some travel needs require in-person vaccination or specialist assessment.

**What to Prepare**  
Travel destination list, dates, itinerary type, current medical conditions, current medications, vaccine history if known.

**Follow-Up Expectations**  
You may be advised to book a vaccine clinic, adjust medicines before travel, or seek in-person review depending on your itinerary and risk.

**Price and Duration Notes**  
Show exact consultation length and price before payment.

**FAQ**

- Can I get every travel vaccine through this service?  
No. Vaccinations themselves require an in-person route.

- Is this suitable if I am already acutely unwell after travel?  
Only for non-urgent review. Severe symptoms need urgent care.

**Internal Links**  
`/ireland/treatment-refill`, `/ireland/medical-consultation`

### Erectile Dysfunction Consultation

**SEO Title**  
Online Erectile Dysfunction Consultation in Ireland | Global Health

**SEO Description**  
Speak to a clinician online in Ireland about erectile dysfunction, possible causes, treatment review, and when in-person assessment is needed.

**H1**  
Online Erectile Dysfunction Consultation

**Hero Summary**  
This service offers a private route to discuss erectile dysfunction, contributing health factors, and possible treatment options. It is designed for careful review rather than automatic medication supply.

**Who This Is For**  
Adults with erectile dysfunction symptoms, medication questions, or concerns about sexual function that are not urgent.

**Common Reasons to Book**  
New erectile dysfunction symptoms; ongoing treatment review; side effects; questions about possible causes; concerns linked to blood pressure, diabetes, or stress.

**What Can Be Handled Online**  
History-taking, symptom review, medication discussion, assessment of risk factors, and advice on whether further tests or in-person review are needed.

**What Cannot Be Handled Online**  
Acute pain, trauma, priapism, severe urinary symptoms, or problems needing physical examination or urgent blood tests.

**Emergency Warning**  
Seek urgent care for an erection lasting more than four hours, severe genital pain, trauma, or sudden severe swelling.

**Prescription, Referral, and Certificate Boundaries**  
Medication may be considered only if appropriate after clinical review. Some patients need cardiovascular review, diabetes assessment, hormone testing, or urology follow-up first.

**What to Prepare**  
Current medications, major medical conditions, smoking status, symptom timeline, blood pressure or diabetes history if relevant.

**Follow-Up Expectations**  
You may receive advice, medication discussion, further test recommendations, or referral to another service.

**Price and Duration Notes**  
Show price and duration in booking before payment.

**FAQ**

- Will I automatically receive treatment?  
No. The doctor first needs to assess whether treatment is appropriate.

- Can this identify underlying causes?  
It can help decide whether more tests or specialist review are needed.

**Internal Links**  
`/ireland/treatment-refill`, `/ireland/diabetes-consultation`, `/ireland-specialist-consultations/urology-consultation`

### Self Referral

**SEO Title**  
Online Self Referral Consultation in Ireland | Global Health

**SEO Description**  
Use an online self referral consultation in Ireland to discuss whether a referral route is appropriate and what information is needed next.

**H1**  
Online Self Referral Consultation

**Hero Summary**  
This route is for patients who believe they may need another service and want clinical guidance on the right next step. It helps clarify whether a self-directed referral plan makes sense or whether a different appointment should come first.

**Who This Is For**  
Patients who want advice on specialist routing, test pathways, or next-step planning for a non-emergency issue.

**Common Reasons to Book**  
Not sure which specialist is appropriate; need help understanding previous advice; planning next steps after symptoms continue; want help preparing for another clinic route.

**What Can Be Handled Online**  
Review of symptoms and history, discussion of likely pathways, and advice on whether GP, specialist, testing, or in-person care is more suitable.

**What Cannot Be Handled Online**  
Direct access to every service or document without assessment, emergency problems, or conditions that need examination first.

**Emergency Warning**  
Seek urgent in-person care for severe symptoms, collapse, chest pain, breathing difficulty, or rapidly worsening illness.

**Prescription, Referral, and Certificate Boundaries**  
This is a guidance consultation. A referral or other document may only be issued when clinically appropriate and possible through the chosen route.

**What to Prepare**  
Current symptoms, previous reports, questions about the next step, and any prior referrals or test results.

**Follow-Up Expectations**  
You may be directed to a GP consultation, specialist booking, testing pathway, or in-person local care.

**Price and Duration Notes**  
Show exact price and duration during booking.

**FAQ**

- Is this the same as booking a specialist directly?  
No. It is a routing and decision-support consultation.

- Will all hospitals or clinics accept any referral?  
Acceptance depends on the receiving provider’s requirements.

**Internal Links**  
`/ireland/referral-consultation`, `/specialty-ie`, `/general-consultation-ie`

### Diabetes Consultation

**SEO Title**  
Online Diabetes Consultation in Ireland | Global Health

**SEO Description**  
Book an online diabetes consultation in Ireland for medication review, symptom discussion, monitoring questions, and advice on when in-person care is needed.

**H1**  
Online Diabetes Consultation

**Hero Summary**  
This service is for patients who need support with diabetes-related questions, follow-up planning, or treatment review. It is suitable for non-emergency management, not for diabetic emergencies.

**Who This Is For**  
Adults with diabetes, prediabetes concerns, medication questions, or changes in readings that need review but are not urgent.

**Common Reasons to Book**  
Blood sugar pattern review; medication questions; side effects; diet and monitoring discussion; advice after recent results; deciding whether specialist care is needed.

**What Can Be Handled Online**  
Review of home readings, medication discussion, symptom review, prevention advice, and planning for tests or follow-up.

**What Cannot Be Handled Online**  
Severe low blood sugar, confusion, dehydration, diabetic ketoacidosis concerns, severe infection, or urgent foot complications.

**Emergency Warning**  
Seek urgent care for severe drowsiness, confusion, vomiting, marked dehydration, severe shortness of breath, or severe low blood sugar symptoms.

**Prescription, Referral, and Certificate Boundaries**  
Medication review may be possible, but treatment changes are not automatic and may require readings, recent tests, or specialist review.

**What to Prepare**  
Blood sugar readings, current medication list, recent blood tests if available, symptom timeline, weight changes if relevant.

**Follow-Up Expectations**  
You may receive self-management advice, medication review, recommendations for tests, or referral to endocrinology or local in-person care.

**Price and Duration Notes**  
Show confirmed consultation length and price before payment.

**FAQ**

- Can this replace regular diabetes follow-up?  
It can support follow-up, but some patients still need in-person checks and routine testing.

- Can I discuss insulin or medication side effects?  
Yes, but any medication change depends on full clinical review.

**Internal Links**  
`/ireland/weight-loss-consultation`, `/ireland-specialist-consultations/endocrinology-consultation`, `/ireland/medical-consultation`

### Sick Leave

**SEO Title**  
Online Sick Leave Consultation in Ireland | Global Health

**SEO Description**  
Discuss time off work and possible medical certificate needs through an online sick leave consultation in Ireland.

**H1**  
Online Sick Leave Consultation

**Hero Summary**  
This service is for patients who are unwell and need clinical review related to work absence. It is a consultation first, not a guaranteed document service.

**Who This Is For**  
Adults who need advice about illness affecting work, possible fitness-for-work documentation, or follow-up on a recent medical absence.

**Common Reasons to Book**  
Acute non-emergency illness affecting work; follow-up after recent illness; clarification on fitness for work; request for a sick note where clinically appropriate.

**What Can Be Handled Online**  
Symptom review, advice about work capacity, and discussion of whether documentation is appropriate.

**What Cannot Be Handled Online**  
Emergency illness, severe mental health crisis, major injury, or situations needing physical examination before any document decision.

**Emergency Warning**  
Do not use this route for chest pain, severe breathing difficulty, collapse, severe infection, suicidal crisis, or other emergencies.

**Prescription, Referral, and Certificate Boundaries**  
Sick notes are not automatic. The clinician decides whether documentation is appropriate, what period can be supported, and whether in-person review is needed.

**What to Prepare**  
Employer or school requirements, symptom dates, prior notes, discharge letters, and a clear explanation of work duties if relevant.

**Follow-Up Expectations**  
You may receive documentation, advice on self-care, a follow-up plan, or direction to another route.

**Price and Duration Notes**  
Show exact consultation time and cost before payment.

**FAQ**

- Can you backdate a sick note?  
That depends on the clinical situation and cannot be promised.

- Is a note guaranteed if I book?  
No. Documentation depends on assessment.

**Internal Links**  
`/ireland/referral-consultation`, `/ireland/medical-consultation`

### Paediatric Primary Care Consultation

**SEO Title**  
Online Paediatric Primary Care Consultation in Ireland | Global Health

**SEO Description**  
Book an online paediatric primary care consultation in Ireland for common non-emergency child health concerns and follow-up advice.

**H1**  
Online Paediatric Primary Care Consultation

**Hero Summary**  
This service is for parents or guardians seeking medical advice for a child with a non-emergency health concern. It supports triage, symptom review, and next-step planning when a child does not appear acutely unwell.

**Who This Is For**  
Parents or guardians of children with common non-urgent symptoms, follow-up questions, or concerns about whether in-person review is needed.

**Common Reasons to Book**  
Fever review when the child is otherwise stable; cough and cold symptoms; rash photos; feeding or tummy concerns; follow-up after recent illness.

**What Can Be Handled Online**  
History review, symptom discussion, basic safety-net advice, and guidance on whether the child needs urgent or routine in-person care.

**What Cannot Be Handled Online**  
A child with breathing difficulty, lethargy, seizures, dehydration, severe rash with illness, newborn concerns needing examination, or rapidly worsening symptoms.

**Emergency Warning**  
Seek urgent in-person care for difficulty breathing, poor responsiveness, seizures, blue lips, severe dehydration, or a child who seems seriously unwell.

**Prescription, Referral, and Certificate Boundaries**  
Treatment advice may be given, but prescriptions and referral decisions depend on clinical review and age-specific safety.

**What to Prepare**  
Child’s age, temperature or other readings, symptom timeline, current medications, weight if known, and photos if relevant.

**Follow-Up Expectations**  
You may receive home-care advice, a follow-up plan, or direction to urgent or routine in-person paediatric assessment.

**Price and Duration Notes**  
Show exact appointment details before payment.

**FAQ**

- Is this suitable for babies?  
Only within the age range and service limits supported by the rota. Some younger children need in-person care sooner.

- Can this replace emergency care?  
No. A very unwell child needs urgent in-person assessment.

**Internal Links**  
`/ireland/family-medicine-consultation`, `/ireland-specialist-consultations/pediatric-consultation`

### Family Medicine Consultation

**SEO Title**  
Online Family Medicine Consultation in Ireland | Global Health

**SEO Description**  
Book an online family medicine consultation in Ireland for broad, non-emergency health concerns and continuity-focused medical advice.

**H1**  
Online Family Medicine Consultation

**Hero Summary**  
This service is for patients who want broad, generalist medical advice with a continuity-of-care mindset. It is useful when a concern affects ongoing health rather than a single isolated symptom.

**Who This Is For**  
Adults and families with general health concerns, follow-up needs, recurring issues, or questions that need a wider view of their overall care.

**Common Reasons to Book**  
Recurring symptoms; medication review; multi-issue consultation; family health planning; follow-up after urgent care; continuity questions.

**What Can Be Handled Online**  
Broad symptom review, health history discussion, treatment planning, medication review, and decisions about next-step referrals or tests.

**What Cannot Be Handled Online**  
Emergencies, urgent examination needs, severe acute infection, chest pain, or conditions requiring procedures or physical assessment.

**Emergency Warning**  
Do not use for severe or rapidly worsening symptoms. Seek urgent care instead.

**Prescription, Referral, and Certificate Boundaries**  
Prescriptions, referrals, and documents may be considered when appropriate, but none are guaranteed and some cases need further assessment.

**What to Prepare**  
Main concerns list, medical history, medication list, recent readings, and any useful reports.

**Follow-Up Expectations**  
The consultation may lead to a treatment plan, a follow-up review, referral, or advice to seek in-person care.

**Price and Duration Notes**  
Show duration and price before payment.

**FAQ**

- When is this better than a standard medical consultation?  
When your concern needs a broader review of your overall health or follow-up plan.

- Can I discuss more than one issue?  
Yes, but the doctor may still need a follow-up if the list is extensive.

**Internal Links**  
`/ireland/medical-consultation`, `/ireland/referral-consultation`, `/general-consultation-ie`

### Respiratory Infections

**SEO Title**  
Online Respiratory Infection Consultation in Ireland | Global Health

**SEO Description**  
Get online medical advice in Ireland for non-emergency respiratory infection symptoms and guidance on when urgent in-person assessment is needed.

**H1**  
Online Respiratory Infection Consultation

**Hero Summary**  
This service is for patients with common upper or lower respiratory symptoms who need non-emergency review and safety-net advice. It helps determine whether online treatment guidance is enough or whether you need examination, testing, or urgent care.

**Who This Is For**  
Adults with cough, congestion, sore throat, mild fever, sinus symptoms, or ongoing respiratory symptoms that are not causing severe distress.

**Common Reasons to Book**  
Cough review; sore throat; sinus symptoms; chesty cold; non-urgent viral symptoms; lingering respiratory symptoms.

**What Can Be Handled Online**  
Symptom review, risk assessment, treatment advice, and guidance on whether testing or in-person review is needed.

**What Cannot Be Handled Online**  
Severe breathlessness, oxygen concerns, chest pain, confusion, high-risk deterioration, or suspected severe infection needing examination.

**Emergency Warning**  
Seek urgent care for severe shortness of breath, blue lips, confusion, chest pain, fainting, or rapidly worsening symptoms.

**Prescription, Referral, and Certificate Boundaries**  
Treatment advice may be discussed, but prescriptions, sick notes, or referrals depend on clinical review and symptom severity.

**What to Prepare**  
Symptom duration, temperature, oxygen reading if available, current medications, and any relevant medical conditions such as asthma or COPD.

**Follow-Up Expectations**  
You may receive self-care advice, a treatment review, a sick-note decision if appropriate, or advice to attend local in-person care.

**Price and Duration Notes**  
Show exact duration and price during booking.

**FAQ**

- Can this help with chest infections?  
Only when symptoms are stable enough for online review. Severe symptoms need urgent assessment.

- Should I book if I am wheezing or short of breath?  
Only mild stable symptoms are appropriate. Severe breathlessness needs urgent care.

**Internal Links**  
`/ireland/sick-leave`, `/ireland/medical-consultation`, `/ireland-specialist-consultations/pneumology-consultation`

### Hypertension Consultation

**SEO Title**  
Online Hypertension Consultation in Ireland | Global Health

**SEO Description**  
Book an online hypertension consultation in Ireland for blood pressure review, medication discussion, and advice on monitoring and follow-up.

**H1**  
Online Hypertension Consultation

**Hero Summary**  
This service supports patients who need non-emergency blood pressure review and a clearer management plan. It is suitable for ongoing monitoring questions and treatment discussion, not for hypertensive emergencies.

**Who This Is For**  
Adults with known high blood pressure, new concerning readings without acute severe symptoms, or medication questions.

**Common Reasons to Book**  
Home blood pressure readings are high; side effects from treatment; follow-up on recent diagnosis; review of monitoring plan.

**What Can Be Handled Online**  
Review of readings, treatment discussion, lifestyle guidance, and planning for follow-up tests or specialist review.

**What Cannot Be Handled Online**  
Severe headache with neurological symptoms, chest pain, severe shortness of breath, or dangerously high readings with acute symptoms.

**Emergency Warning**  
Seek urgent care if very high blood pressure is accompanied by chest pain, severe headache, weakness, confusion, visual changes, or breathing difficulty.

**Prescription, Referral, and Certificate Boundaries**  
Medication review may be possible, but treatment changes are not automatic and may require readings, tests, or in-person examination.

**What to Prepare**  
Recent blood pressure readings, medication list, side effects, other medical conditions, recent lab results if available.

**Follow-Up Expectations**  
You may be advised on monitoring, medication follow-up, further testing, or cardiology review.

**Price and Duration Notes**  
Show price and duration during booking.

**FAQ**

- Is one high reading enough to book?  
It can be, especially if you need advice, but keep a record of several readings where possible.

- Can this replace in-person blood pressure checks?  
Not always. Some patients still need local examination or testing.

**Internal Links**  
`/ireland-specialist-consultations/cardiology-consultation`, `/ireland/medical-consultation`, `/ireland/treatment-refill`

### Driving License Medical Certificate

**SEO Title**  
Driving Licence Medical Certificate Consultation in Ireland | Global Health

**SEO Description**  
Discuss driving licence medical certificate requirements online in Ireland and find out whether your request can be completed remotely or needs an in-person exam.

**H1**  
Driving Licence Medical Certificate Consultation

**Hero Summary**  
This route is for patients who need guidance on a driving licence medical certificate and want to understand what information or examination may be required. It should be positioned cautiously because some forms cannot be completed online.

**Who This Is For**  
Patients with a driving-related medical form request who need to know whether online review is appropriate or whether in-person examination is required.

**Common Reasons to Book**  
Medical certificate request; questions about form completion; health-condition review related to fitness to drive; preparing documents before an in-person exam.

**What Can Be Handled Online**  
Initial discussion of the request, review of current medical history, explanation of what information may be needed, and triage to the right next step.

**What Cannot Be Handled Online**  
Any form that requires physical measurements, examination, eyesight testing, or other checks that cannot be completed remotely.

**Emergency Warning**  
This service is not for urgent medical symptoms. Use urgent care routes if you are acutely unwell.

**Prescription, Referral, and Certificate Boundaries**  
A driving certificate is not guaranteed. Some requests can only be completed after in-person examination or additional records review.

**What to Prepare**  
The exact form requested, deadline, current medical conditions, medications, previous certificates, and any instructions from the licensing authority.

**Follow-Up Expectations**  
You may be advised that online review is enough to prepare the request, or that a local in-person examination is necessary.

**Price and Duration Notes**  
Show appointment details before payment.

**FAQ**

- Can my driving medical form be completed fully online?  
Not always. Many forms require in-person checks.

- Should I book this if I only need guidance on the form?  
Yes, if you need help understanding the next step.

**Internal Links**  
`/ireland/medical-consultation`, `/ireland/referral-consultation`

### Treatment Refill

**SEO Title**  
Online Treatment Refill Consultation in Ireland | Global Health

**SEO Description**  
Request an online treatment refill review in Ireland for ongoing medication, side-effect discussion, and advice on whether a repeat prescription may be appropriate.

**H1**  
Online Treatment Refill Consultation

**Hero Summary**  
This service is for patients who need review of an ongoing treatment and want to know whether a refill or medication change is appropriate. It is not a guaranteed repeat prescription service.

**Who This Is For**  
Adults already using a regular medicine who need review, refill consideration, or discussion of side effects.

**Common Reasons to Book**  
Repeat medication review; running low on treatment; side effects; questions about dose or adherence; deciding if another follow-up route is needed.

**What Can Be Handled Online**  
Medication history review, symptom update, treatment discussion, and clinician advice on whether a refill can be considered safely.

**What Cannot Be Handled Online**  
Requests needing physical examination, controlled monitoring, urgent deterioration, or medicines that require recent tests not yet available.

**Emergency Warning**  
Do not use this route for severe withdrawal symptoms, severe adverse reactions, chest pain, breathing problems, confusion, or rapidly worsening illness.

**Prescription, Referral, and Certificate Boundaries**  
Repeat prescriptions are not automatic. The clinician may decline, request more information, recommend tests, or suggest an in-person route.

**What to Prepare**  
Medication name and dose, last supply date, reason for treatment, side effects, recent readings or test results if relevant.

**Follow-Up Expectations**  
The outcome may be a refill, medication advice, another review, or a different clinical route.

**Price and Duration Notes**  
Show price and duration before payment.

**FAQ**

- Can I use this for any medication?  
No. Suitability depends on the medicine and the clinical context.

- What if I have not been reviewed in a long time?  
The doctor may recommend a broader consultation or in-person follow-up.

**Internal Links**  
`/ireland/medical-consultation`, `/ireland/diabetes-consultation`, `/ireland/hypertension-consultation`

### Weight Loss Consultation

**SEO Title**  
Online Weight Loss Consultation in Ireland | Global Health

**SEO Description**  
Book an online weight loss consultation in Ireland for clinically responsible advice on weight management, treatment options, and when further assessment is needed.

**H1**  
Online Weight Loss Consultation

**Hero Summary**  
This service supports adults who want medical guidance on weight management, health risks, and treatment options. It should be framed as clinical review and suitability assessment, not a quick medication route.

**Who This Is For**  
Adults concerned about weight-related health issues, metabolic risk, or whether medical support for weight management is appropriate.

**Common Reasons to Book**  
Weight-management plan review; questions about treatment options; medication suitability discussion; weight linked to diabetes, blood pressure, or sleep concerns.

**What Can Be Handled Online**  
Medical history review, discussion of goals, risk-factor assessment, treatment discussion, and planning for tests or specialist follow-up.

**What Cannot Be Handled Online**  
Emergency symptoms, severe eating-disorder concerns needing urgent specialist care, or treatment decisions requiring measurements or tests not yet available.

**Emergency Warning**  
Seek urgent support for severe dehydration, chest pain, suicidal thoughts, severe weakness, or any acute medical emergency.

**Prescription, Referral, and Certificate Boundaries**  
Weight-loss medication is never guaranteed. The clinician may decide that lifestyle support, tests, endocrinology review, or in-person assessment is needed first.

**What to Prepare**  
Current weight if known, height, medical history, medication list, previous weight-loss treatments, and any relevant blood results.

**Follow-Up Expectations**  
You may receive advice, a monitoring plan, a request for tests, or referral to another service.

**Price and Duration Notes**  
Show price and duration before payment.

**FAQ**

- Can I book this only to request medication?  
You can discuss treatment, but medication is not guaranteed.

- Is this suitable if I have other health conditions?  
Yes, but those conditions should be disclosed because they affect treatment suitability.

**Internal Links**  
`/ireland/diabetes-consultation`, `/ireland-specialist-consultations/endocrinology-consultation`, `/ireland/medical-consultation`

### Mental Health Assessment Consultation

**SEO Title**  
Online Mental Health Assessment Consultation in Ireland | Global Health

**SEO Description**  
Book an online mental health assessment consultation in Ireland for non-emergency review of mood, anxiety, stress, and next-step support.

**H1**  
Online Mental Health Assessment Consultation

**Hero Summary**  
This service offers non-emergency mental health assessment and guidance on the next step in care. It should be presented as supportive review, not crisis intervention.

**Who This Is For**  
Adults with low mood, anxiety, stress, sleep-related distress, concentration concerns, or uncertainty about whether psychological or psychiatric follow-up is needed.

**Common Reasons to Book**  
Persistent anxiety; low mood; burnout concerns; sleep disturbance; panic symptoms; questions about the right mental health route.

**What Can Be Handled Online**  
History review, symptom discussion, functional impact assessment, support planning, and guidance on whether therapy, psychiatry, GP follow-up, or local urgent care is needed.

**What Cannot Be Handled Online**  
Mental health crisis, active suicidal intent, violent risk, acute psychosis, severe intoxication, or emergencies needing immediate in-person support.

**Emergency Warning**  
If you are in immediate danger, have suicidal thoughts with intent, cannot stay safe, or are in crisis, use emergency services or urgent local mental health support now.

**Prescription, Referral, and Certificate Boundaries**  
Medication, referral, and documentation decisions depend on assessment and may require psychiatrist or in-person follow-up.

**What to Prepare**  
Symptom timeline, current supports, medications, previous mental health treatment, and the main change you have noticed.

**Follow-Up Expectations**  
You may be advised to book psychology, psychiatry, GP follow-up, or urgent in-person support depending on the assessment.

**Price and Duration Notes**  
Show appointment details before payment.

**FAQ**

- Is this suitable if I feel unsafe?  
No. Crisis situations need urgent in-person help.

- Will I be diagnosed in one appointment?  
Not always. The consultation may instead guide the most suitable next step.

**Internal Links**  
`/ireland-specialist-consultations/psychology-consultation`, `/ireland-specialist-consultations/psychiatry-consultation`

### Referral Consultation

**SEO Title**  
Online Referral Consultation in Ireland | Global Health

**SEO Description**  
Use an online referral consultation in Ireland to discuss whether you need specialist review, tests, or another clinical route.

**H1**  
Online Referral Consultation

**Hero Summary**  
This service helps patients understand whether a referral is appropriate and what kind of follow-up may be needed. It is useful when you already suspect the next step involves another provider or specialty.

**Who This Is For**  
Adults who need guidance on specialist referral, test pathway planning, or documentation for onward care.

**Common Reasons to Book**  
Symptoms continue despite treatment; need help choosing a specialty; need referral discussion after a recent diagnosis; need advice on tests or hospital follow-up.

**What Can Be Handled Online**  
History review, symptom review, advice on next-step pathways, and whether referral is clinically appropriate.

**What Cannot Be Handled Online**  
Emergency conditions, direct acceptance into all specialist services, or cases requiring physical examination before any referral decision.

**Emergency Warning**  
Use urgent in-person care for severe symptoms, acute neurological changes, severe breathing problems, or chest pain.

**Prescription, Referral, and Certificate Boundaries**  
Referrals are not automatic. The clinician may recommend a different route, request more information, or advise in-person assessment first.

**What to Prepare**  
Symptom history, prior letters, previous tests, and the reason you believe referral may be needed.

**Follow-Up Expectations**  
The result may be a referral, a recommendation for a GP route, specialist booking guidance, or further local assessment.

**Price and Duration Notes**  
Show price and duration during booking.

**FAQ**

- Can I choose the exact specialist myself?  
You can discuss your preference, but the doctor may advise a different route.

- Will a referral guarantee an appointment elsewhere?  
No. Acceptance depends on the receiving provider.

**Internal Links**  
`/specialty-ie`, `/ireland/medical-consultation`, `/ireland/self-referral`

### Migraine Consultation

**SEO Title**  
Online Migraine Consultation in Ireland | Global Health

**SEO Description**  
Book an online migraine consultation in Ireland for symptom review, treatment discussion, and advice on when headache symptoms need urgent assessment.

**H1**  
Online Migraine Consultation

**Hero Summary**  
This service is for patients with suspected migraine or known migraine who need advice on symptoms, treatment review, or next-step planning. It is not suitable for sudden severe neurological emergencies.

**Who This Is For**  
Adults with recurring migraine symptoms, treatment questions, or headache patterns that need non-urgent review.

**Common Reasons to Book**  
Recurring migraine attacks; side effects from treatment; aura questions; headache triggers; deciding whether neurology review is needed.

**What Can Be Handled Online**  
History review, pattern recognition, treatment discussion, lifestyle trigger advice, and planning for follow-up or referral.

**What Cannot Be Handled Online**  
Sudden thunderclap headache, stroke-like symptoms, severe head injury, new seizure, meningitis red flags, or rapidly worsening neurological symptoms.

**Emergency Warning**  
Seek urgent care for the worst headache of your life, sudden neurological weakness, confusion, fever with stiff neck, or new severe headache after injury.

**Prescription, Referral, and Certificate Boundaries**  
Treatment review may be possible, but prescribing and referral decisions depend on the clinician’s assessment and your medical history.

**What to Prepare**  
Headache frequency, symptom pattern, current medicines, triggers, headache diary if available, and any recent scans or letters.

**Follow-Up Expectations**  
You may receive treatment advice, trigger-management guidance, neurology referral advice, or recommendation for in-person assessment.

**Price and Duration Notes**  
Show appointment details before payment.

**FAQ**

- Is this suitable for my first severe headache?  
No. A sudden severe first headache needs urgent assessment.

- Can I discuss preventive treatment?  
Yes, but treatment decisions depend on your history and current medicines.

**Internal Links**  
`/ireland-specialist-consultations/neurology-consultation`, `/ireland/medical-consultation`

### Aesthetic Medicine Online Consultation

**SEO Title**  
Aesthetic Medicine Online Consultation in Ireland | Global Health

**SEO Description**  
Discuss aesthetic medicine suitability, treatment questions, and next-step planning through an online consultation in Ireland.

**H1**  
Online Aesthetic Medicine Consultation

**Hero Summary**  
This service is for patients who want a medically responsible discussion about aesthetic treatment suitability, expectations, and whether an in-person procedure consultation is needed.

**Who This Is For**  
Adults with questions about aesthetic treatment options, skin-related procedure suitability, or follow-up after previous aesthetic care.

**Common Reasons to Book**  
Suitability questions; review of prior treatment; concern about whether a symptom is a normal post-treatment change; deciding whether a procedure consultation is appropriate.

**What Can Be Handled Online**  
History review, discussion of expectations, image-based review where appropriate, and planning for safe next steps.

**What Cannot Be Handled Online**  
Any procedure itself, urgent complications, injection treatment, severe infection, or anything needing physical examination.

**Emergency Warning**  
Seek urgent in-person care for severe swelling, difficulty breathing, sudden severe pain, tissue-color change, or signs of significant infection after treatment.

**Prescription, Referral, and Certificate Boundaries**  
This route does not guarantee any treatment or prescription. Some concerns need in-person review by the relevant clinician.

**What to Prepare**  
Photos if relevant, treatment history, product names if known, dates of prior procedures, and current symptoms or goals.

**Follow-Up Expectations**  
You may be advised on suitability, expected recovery, or the need for in-person aesthetic or dermatology follow-up.

**Price and Duration Notes**  
Show exact appointment details before payment.

**FAQ**

- Can I book this instead of an in-person procedure appointment?  
It can help decide whether an in-person appointment is appropriate, but it does not replace a procedure consultation.

- Is this suitable for complications after treatment?  
Only if symptoms are mild and stable. Significant complications need urgent in-person review.

**Internal Links**  
`/ireland-specialist-consultations/dermatology-consultation`, `/ireland/medical-consultation`

### Cardiology Consultation

**SEO Title**  
Online Cardiology Consultation in Ireland | Global Health

**SEO Description**  
Book an online cardiology consultation in Ireland for non-emergency heart-health review, follow-up planning, and advice on when urgent assessment is needed.

**H1**  
Online Cardiology Consultation

**Hero Summary**  
This service supports patients who need non-emergency specialist review of a heart-health concern, previous diagnosis, or follow-up question. It is for discussion and planning, not for acute chest-pain emergencies.

**Who This Is For**  
Adults with known cardiac history, test-result questions, palpitations that are not acute, blood pressure-related specialist follow-up, or advice on next-step review.

**Common Reasons to Book**  
Known heart-condition follow-up; palpitations review; ECG or test discussion; medication questions; deciding if in-person cardiology review is needed.

**What Can Be Handled Online**  
History review, symptom discussion, document review, medication discussion, and planning for tests or in-person follow-up.

**What Cannot Be Handled Online**  
New chest pain, severe shortness of breath, collapse, suspected heart attack, or unstable symptoms needing urgent examination.

**Emergency Warning**  
Seek urgent emergency care for chest pain, fainting, severe breathlessness, sudden sweating with discomfort, or new severe cardiac symptoms.

**Prescription, Referral, and Certificate Boundaries**  
Treatment changes, referrals, and certificates depend on specialist assessment and may require tests or in-person examination.

**What to Prepare**  
Symptoms, previous letters, ECGs or reports, medication list, blood pressure log, and questions about current treatment.

**Follow-Up Expectations**  
You may be advised on monitoring, medication review, local testing, or in-person specialist follow-up.

**Price and Duration Notes**  
Show exact duration and specialist price before payment.

**FAQ**

- Is this suitable for active chest pain?  
No. That needs urgent emergency assessment.

- Can the cardiologist review my ECG or prior reports?  
Yes, if you can provide them and the service workflow supports document review.

**Internal Links**  
`/ireland/hypertension-consultation`, `/ireland/medical-consultation`

### Pediatric Consultation

**SEO Title**  
Online Pediatric Specialist Consultation in Ireland | Global Health

**SEO Description**  
Speak to a pediatric specialist online in Ireland about non-emergency child health concerns and follow-up planning.

**H1**  
Online Pediatric Consultation

**Hero Summary**  
This specialist route is for child health concerns that may need a more focused review than general primary care. It should be used for stable non-emergency concerns only.

**Who This Is For**  
Parents or guardians of children who need specialist-level review for a non-urgent concern or follow-up question.

**Common Reasons to Book**  
Ongoing symptoms needing specialist input; chronic child health follow-up; developmental or feeding concerns needing review; second opinion on next-step care.

**What Can Be Handled Online**  
History review, parent discussion, previous record review, and advice on whether in-person pediatric assessment is needed.

**What Cannot Be Handled Online**  
An acutely unwell child, breathing difficulty, seizures, dehydration, severe pain, or conditions needing urgent examination.

**Emergency Warning**  
Seek urgent in-person care for a child who is drowsy, struggling to breathe, dehydrated, fitting, or rapidly worsening.

**Prescription, Referral, and Certificate Boundaries**  
Treatment decisions depend on specialist review and age-appropriate safety. Some issues will still need in-person pediatric examination.

**What to Prepare**  
Child’s age, growth or weight if known, symptom timeline, previous pediatric notes, and current medications.

**Follow-Up Expectations**  
You may receive specialist advice, recommendations for tests, or a plan for local in-person pediatric follow-up.

**Price and Duration Notes**  
Show specialist pricing and duration before payment.

**FAQ**

- Is this different from the paediatric primary care consultation?  
Yes. This is positioned as a more specialist review route.

- Can I use this for an acutely sick child?  
No. A very unwell child needs urgent local care.

**Internal Links**  
`/ireland/paediatric-primary-care-consultation`, `/ireland/medical-consultation`

### Orthopedic Consultation

**SEO Title**  
Online Orthopedic Consultation in Ireland | Global Health

**SEO Description**  
Book an online orthopedic consultation in Ireland for non-emergency bone, joint, and movement concerns and next-step planning.

**H1**  
Online Orthopedic Consultation

**Hero Summary**  
This service is for non-emergency musculoskeletal concerns that may need specialist review of symptoms, prior imaging, or treatment options. It is not suitable for acute severe injuries.

**Who This Is For**  
Adults with persistent joint pain, injury follow-up, back or limb concerns, or questions about orthopaedic next steps.

**Common Reasons to Book**  
Knee pain; shoulder pain; prior injury review; imaging discussion; chronic joint symptoms; post-treatment follow-up.

**What Can Be Handled Online**  
History review, movement-history discussion, previous imaging review, symptom assessment, and next-step planning.

**What Cannot Be Handled Online**  
Suspected fractures, acute deformity, severe swelling after trauma, loss of circulation, or problems needing urgent examination.

**Emergency Warning**  
Seek urgent care for major trauma, suspected fracture with deformity, loss of sensation, severe weakness, or acute inability to bear weight after injury.

**Prescription, Referral, and Certificate Boundaries**  
Medication review or referrals may be discussed, but many orthopaedic decisions require examination or imaging.

**What to Prepare**  
Symptom timeline, prior scans or X-rays, current medications, history of injury, and current function limits.

**Follow-Up Expectations**  
You may be advised on physiotherapy, imaging, pain management, or in-person orthopaedic review.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can the specialist diagnose a fracture online?  
No. Suspected fractures usually need urgent imaging and examination.

- Is this useful if I already have an MRI or X-ray?  
Yes, especially for review and next-step planning.

**Internal Links**  
`/ireland/pain-management-consultation`, `/ireland-specialist-consultations/physiotherapy-consultation`

### Neurology Consultation

**SEO Title**  
Online Neurology Consultation in Ireland | Global Health

**SEO Description**  
Book an online neurology consultation in Ireland for non-emergency neurological symptoms, migraine review, and next-step planning.

**H1**  
Online Neurology Consultation

**Hero Summary**  
This service is for stable neurological concerns that need specialist discussion, record review, or follow-up planning. It is not for stroke symptoms or other neurological emergencies.

**Who This Is For**  
Adults with known neurological diagnoses, recurrent migraine, tremor, nerve symptoms, or specialist follow-up questions that are not urgent.

**Common Reasons to Book**  
Migraine follow-up; numbness review; tremor; nerve-pain symptoms; medication side effects; document review.

**What Can Be Handled Online**  
History review, previous report discussion, symptom pattern review, and planning for testing or in-person neurology follow-up.

**What Cannot Be Handled Online**  
Stroke symptoms, first seizure, sudden severe weakness, severe confusion, or any rapidly worsening neurological emergency.

**Emergency Warning**  
Seek urgent emergency care for sudden weakness, face droop, speech difficulty, seizure, sudden severe headache, or new confusion.

**Prescription, Referral, and Certificate Boundaries**  
Medication or referral decisions depend on specialist review and may still require in-person examination or testing.

**What to Prepare**  
Symptom history, triggers, previous scans or letters, medication list, and timeline of any recent change.

**Follow-Up Expectations**  
You may be advised on migraine management, further tests, specialist follow-up, or urgent local assessment depending on symptoms.

**Price and Duration Notes**  
Show specialist pricing and duration in booking.

**FAQ**

- Can I use this for a new sudden neurological symptom?  
No. Sudden neurological symptoms need urgent assessment.

- Can the specialist review prior MRI or CT reports?  
Yes, where records are available and the workflow supports review.

**Internal Links**  
`/ireland/migraine-consultation`, `/ireland/medical-consultation`

### Gastroenterology Consultation

**SEO Title**  
Online Gastroenterology Consultation in Ireland | Global Health

**SEO Description**  
Book an online gastroenterology consultation in Ireland for non-emergency digestive symptoms, chronic gut concerns, and specialist follow-up planning.

**H1**  
Online Gastroenterology Consultation

**Hero Summary**  
This service is for non-emergency digestive or bowel concerns that may need specialist review, especially when symptoms are persistent or recurring.

**Who This Is For**  
Adults with chronic digestive symptoms, reflux questions, bowel-pattern changes, IBS-type symptoms, or previous GI diagnosis follow-up that is stable.

**Common Reasons to Book**  
Recurring abdominal discomfort; reflux; bloating; bowel habit changes; treatment side effects; specialist follow-up questions.

**What Can Be Handled Online**  
History review, symptom discussion, treatment review, and advice on testing, diet, or specialist next steps.

**What Cannot Be Handled Online**  
Severe abdominal pain, heavy bleeding, collapse, dehydration, persistent vomiting, or acute surgical abdomen concerns.

**Emergency Warning**  
Seek urgent in-person care for severe worsening abdominal pain, black stools, heavy rectal bleeding, repeated vomiting, or signs of dehydration.

**Prescription, Referral, and Certificate Boundaries**  
Medication review or referral may be possible, but some digestive concerns need examination, tests, imaging, or urgent local review.

**What to Prepare**  
Symptom diary, bowel-pattern changes, trigger foods, medication list, previous tests, and weight change if relevant.

**Follow-Up Expectations**  
You may be advised on treatment adjustments, testing, diet review, or in-person gastroenterology follow-up.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Is this suitable for severe abdominal pain?  
No. Severe or rapidly worsening abdominal pain needs urgent assessment.

- Can I discuss previous endoscopy or scan results?  
Yes, if they are available for review.

**Internal Links**  
`/ireland/medical-consultation`, `/ireland/referral-consultation`

### Urology Consultation

**SEO Title**  
Online Urology Consultation in Ireland | Global Health

**SEO Description**  
Discuss non-emergency urinary or male urology concerns online in Ireland and get guidance on treatment review and next steps.

**H1**  
Online Urology Consultation

**Hero Summary**  
This service is for stable urinary or male reproductive concerns that need specialist review, not for acute pain or emergency urinary retention.

**Who This Is For**  
Adults with urinary symptoms, prostate-related questions, recurrent urology issues, or erectile dysfunction needing specialist follow-up.

**Common Reasons to Book**  
Persistent urinary symptoms; recurrent prostatism questions; erectile dysfunction follow-up; test-result review; deciding whether in-person assessment is needed.

**What Can Be Handled Online**  
History review, symptom discussion, prior result review, and planning for testing or treatment next steps.

**What Cannot Be Handled Online**  
Severe pain, visible heavy bleeding, acute urinary retention, fever with urinary obstruction, or trauma.

**Emergency Warning**  
Seek urgent care for inability to pass urine, severe testicular pain, heavy bleeding, or fever with severe urinary symptoms.

**Prescription, Referral, and Certificate Boundaries**  
Medication or referral may be discussed, but many urology problems need examination, urine testing, imaging, or in-person review.

**What to Prepare**  
Symptom timeline, medication list, prior PSA or urine results if relevant, and any previous letters.

**Follow-Up Expectations**  
You may be advised on tests, in-person urology review, medication discussion, or another clinical route.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Is this suitable for acute urinary retention?  
No. That needs urgent in-person care.

- Can this help with ongoing urinary symptoms?  
Yes, especially for review and planning of next steps.

**Internal Links**  
`/ireland/erectyle-dysfunction-consultation`, `/ireland/medical-consultation`

### Rheumatology Consultation

**SEO Title**  
Online Rheumatology Consultation in Ireland | Global Health

**SEO Description**  
Book an online rheumatology consultation in Ireland for joint pain, inflammatory symptom review, and specialist next-step planning.

**H1**  
Online Rheumatology Consultation

**Hero Summary**  
This service is for non-emergency joint, autoimmune, or inflammatory concerns that may need specialist interpretation and follow-up planning.

**Who This Is For**  
Adults with chronic joint pain, stiffness, suspected inflammatory symptoms, or existing rheumatology follow-up needs.

**Common Reasons to Book**  
Morning stiffness; flare review; swollen joints; autoimmune follow-up; medication questions; interpretation of prior tests.

**What Can Be Handled Online**  
History review, symptom-pattern discussion, document review, and advice on tests, follow-up, or medication questions.

**What Cannot Be Handled Online**  
Acute septic joint concerns, sudden severe swelling with fever, trauma, or conditions needing urgent physical examination.

**Emergency Warning**  
Seek urgent care for a hot swollen joint with fever, severe infection concern, sudden immobility, or severe worsening symptoms.

**Prescription, Referral, and Certificate Boundaries**  
Treatment and referral decisions depend on the specialist assessment and often require blood tests, imaging, or in-person examination.

**What to Prepare**  
Symptom timeline, flare pattern, previous blood results, scans, current medications, and prior rheumatology letters.

**Follow-Up Expectations**  
You may receive advice on next tests, follow-up review, or in-person specialist care.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can this diagnose autoimmune disease online?  
It can guide next steps, but diagnosis often needs tests and examination.

- Is this suitable for longstanding joint stiffness?  
Yes, if the symptoms are stable and non-emergency.

**Internal Links**  
`/ireland/pain-management-consultation`, `/ireland/medical-consultation`

### Psychology Consultation

**SEO Title**  
Online Psychology Consultation in Ireland | Global Health

**SEO Description**  
Book an online psychology consultation in Ireland for non-emergency support with anxiety, stress, mood concerns, and coping strategies.

**H1**  
Online Psychology Consultation

**Hero Summary**  
This service is for patients seeking psychological support, guided discussion, or help deciding on a therapy pathway. It is not a crisis service.

**Who This Is For**  
Adults with stress, anxiety, low mood, adjustment difficulty, emotional overwhelm, or questions about psychological support.

**Common Reasons to Book**  
Anxiety symptoms; stress and burnout; low mood; coping after life changes; deciding whether therapy is the right route.

**What Can Be Handled Online**  
Initial psychological discussion, coping support, symptom review, and planning for therapy or related follow-up.

**What Cannot Be Handled Online**  
Immediate mental health crisis, active suicidal risk, violence risk, or emergencies needing urgent in-person intervention.

**Emergency Warning**  
If you are at immediate risk, feel unsafe, or cannot stay safe, contact emergency or urgent local mental health support now.

**Prescription, Referral, and Certificate Boundaries**  
Psychology is not a medication service. Referral guidance may be discussed, but crisis and medication decisions may require psychiatry, GP, or urgent in-person support.

**What to Prepare**  
Main concerns, symptom timeline, current supports, previous therapy history, and what you hope to get from the appointment.

**Follow-Up Expectations**  
You may be advised to continue with psychology, book psychiatry, see a GP, or seek urgent local support depending on risk.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Is this the same as psychiatry?  
No. Psychology focuses on psychological assessment and support, not primarily medication.

- Can I book this in crisis?  
No. Crisis care needs urgent in-person support.

**Internal Links**  
`/ireland/mental-health-assessment-consultation`, `/ireland-specialist-consultations/psychiatry-consultation`

### Nutrition Consultation

**SEO Title**  
Online Nutrition Consultation in Ireland | Global Health

**SEO Description**  
Book an online nutrition consultation in Ireland for practical advice on diet, weight-related health concerns, and ongoing nutritional support.

**H1**  
Online Nutrition Consultation

**Hero Summary**  
This service is for patients who need structured advice about nutrition, eating patterns, and food-related health goals. It is suitable for planning and follow-up, not emergency care.

**Who This Is For**  
Adults with dietary questions, chronic-condition nutrition needs, weight-related goals, or digestive concerns where nutrition support may help.

**Common Reasons to Book**  
Healthy eating planning; weight-management support; cholesterol or blood sugar diet questions; digestive trigger review; follow-up after diagnosis.

**What Can Be Handled Online**  
Diet history review, practical nutrition planning, and coordination with broader medical follow-up when needed.

**What Cannot Be Handled Online**  
Acute dehydration, severe eating disorder crisis, severe malnutrition concerns, or emergencies requiring urgent medical care.

**Emergency Warning**  
Seek urgent support for severe weakness, collapse, suicidal crisis, or any emergency symptom rather than waiting for a nutrition consultation.

**Prescription, Referral, and Certificate Boundaries**  
This service focuses on nutritional guidance. Medication or medical certificates are not the primary purpose and may need another route.

**What to Prepare**  
Typical diet pattern, goals, current conditions, medications, recent weight if known, and relevant blood tests if available.

**Follow-Up Expectations**  
You may receive dietary goals, a follow-up plan, or advice to see another clinician for medical management.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can this help with diabetes or blood pressure goals?  
Yes, nutrition support can complement medical care.

- Is this a weight-loss medication service?  
No. For medication discussions, use the weight-loss consultation route.

**Internal Links**  
`/ireland/weight-loss-consultation`, `/ireland/diabetes-consultation`

### Endocrinology Consultation

**SEO Title**  
Online Endocrinology Consultation in Ireland | Global Health

**SEO Description**  
Book an online endocrinology consultation in Ireland for hormone, thyroid, metabolic, and diabetes-related specialist review.

**H1**  
Online Endocrinology Consultation

**Hero Summary**  
This service is for non-emergency hormone, thyroid, metabolic, and complex diabetes-related questions that may need specialist input.

**Who This Is For**  
Adults with thyroid concerns, endocrine test questions, complex metabolic issues, or specialist follow-up needs.

**Common Reasons to Book**  
Thyroid treatment review; abnormal endocrine blood results; diabetes specialist follow-up; weight and hormone questions; adrenal or pituitary follow-up.

**What Can Be Handled Online**  
Review of results, symptom discussion, medication questions, and planning for tests or ongoing specialist care.

**What Cannot Be Handled Online**  
Endocrine emergencies, severe dehydration, sudden collapse, severe low blood sugar, or problems needing urgent examination.

**Emergency Warning**  
Seek urgent in-person care for confusion, severe vomiting, collapse, severe low blood sugar symptoms, or other acute endocrine emergencies.

**Prescription, Referral, and Certificate Boundaries**  
Treatment changes may need recent blood tests or further review. Prescriptions and referrals depend on full clinical assessment.

**What to Prepare**  
Recent blood tests, medication list, symptom timeline, weight changes, and prior specialist letters.

**Follow-Up Expectations**  
You may receive interpretation of results, a plan for further testing, follow-up care, or local in-person specialist review.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can the specialist review thyroid results online?  
Yes, if you provide the results and the issue is suitable for online review.

- Is this suitable for diabetic emergency symptoms?  
No. Emergencies need urgent care.

**Internal Links**  
`/ireland/diabetes-consultation`, `/ireland/weight-loss-consultation`

### Oncology Consultation

**SEO Title**  
Online Oncology Consultation in Ireland | Global Health

**SEO Description**  
Book an online oncology consultation in Ireland for non-emergency cancer-care review, treatment questions, and next-step planning.

**H1**  
Online Oncology Consultation

**Hero Summary**  
This service is for patients who need non-emergency specialist discussion related to cancer diagnosis, treatment questions, or follow-up planning. It must be positioned carefully and never as emergency cancer care.

**Who This Is For**  
Adults with an existing cancer diagnosis, treatment-related questions, or a need for specialist interpretation and follow-up planning.

**Common Reasons to Book**  
Discussion of treatment questions; side-effect review; understanding next steps; review of records; planning what type of in-person follow-up is needed.

**What Can Be Handled Online**  
Record review, symptom discussion when stable, treatment questions, and planning for onward oncology care.

**What Cannot Be Handled Online**  
Cancer emergencies, neutropenic fever concerns, severe uncontrolled pain, sudden breathing problems, or acute oncological complications.

**Emergency Warning**  
Seek urgent care for fever during treatment, severe breathlessness, uncontrolled pain, severe bleeding, confusion, or any rapidly worsening condition.

**Prescription, Referral, and Certificate Boundaries**  
This service should not imply that active treatment prescriptions or major care decisions can always be managed online. Many cases need direct oncology team involvement.

**What to Prepare**  
Diagnosis details, current treatment plan, recent letters, scans or reports, medication list, and current symptoms.

**Follow-Up Expectations**  
You may receive clarification, next-step advice, or direction to urgent or scheduled in-person oncology care.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Is this suitable during severe treatment side effects?  
Only if stable. Severe side effects need urgent oncology or emergency support.

- Can this replace my treating oncology team?  
No. It is for review and planning support.

**Internal Links**  
`/ireland/referral-consultation`, `/ireland/medical-consultation`

### Venereology Consultation

**SEO Title**  
Online Sexual Health Consultation in Ireland | Global Health

**SEO Description**  
Discuss non-emergency sexual health concerns online in Ireland, including symptom review, testing advice, and follow-up planning.

**H1**  
Online Venereology Consultation

**Hero Summary**  
This service is for patients with non-emergency sexual health concerns who need confidential review and next-step advice. It is not for severe pelvic or testicular emergencies.

**Who This Is For**  
Adults with sexual health questions, stable genital symptoms, questions about STI testing, or follow-up after previous care.

**Common Reasons to Book**  
Testing advice; symptom review; partner-exposure questions; treatment follow-up; deciding whether in-person examination is needed.

**What Can Be Handled Online**  
History review, risk discussion, symptom assessment, testing advice, and discussion of the most suitable next step.

**What Cannot Be Handled Online**  
Severe pelvic pain, acute testicular pain, heavy bleeding, high fever with severe symptoms, or problems needing urgent examination.

**Emergency Warning**  
Seek urgent care for severe pain, swelling, fever with rapid worsening symptoms, or inability to pass urine.

**Prescription, Referral, and Certificate Boundaries**  
Treatment discussion may be possible, but prescriptions and referrals depend on the consultation and may require in-person examination or testing first.

**What to Prepare**  
Symptom timeline, recent exposure concerns, previous STI tests if relevant, current medications, and specific questions.

**Follow-Up Expectations**  
You may be advised to arrange testing, start another service route, or attend local in-person care.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can this replace STI testing?  
No. Testing itself may need another route.

- Is the consultation confidential?  
It should be positioned as private and clinically focused, with no overclaiming beyond site privacy policy.

**Internal Links**  
`/ireland/medical-consultation`, `/ireland/treatment-refill`

### Genetics Consultation

**SEO Title**  
Online Genetics Consultation in Ireland | Global Health

**SEO Description**  
Book an online genetics consultation in Ireland for non-emergency family-history review, test interpretation, and specialist next-step planning.

**H1**  
Online Genetics Consultation

**Hero Summary**  
This service is for patients who need guidance on family history, genetic testing questions, or interpretation of previous advice in a non-emergency setting.

**Who This Is For**  
Adults with family-history concerns, previous genetic test questions, or referral planning related to hereditary conditions.

**Common Reasons to Book**  
Family history review; understanding whether referral is appropriate; discussion of prior genetic reports; planning next-step counseling.

**What Can Be Handled Online**  
History review, interpretation discussion, family-pattern assessment, and guidance on whether formal testing or referral is needed.

**What Cannot Be Handled Online**  
Emergency symptoms, immediate diagnostic decisions without enough information, or issues needing in-person genetic counseling infrastructure.

**Emergency Warning**  
This service is not for urgent symptoms. Acute illness should use the relevant urgent or emergency pathway.

**Prescription, Referral, and Certificate Boundaries**  
This route is primarily for discussion and planning. Testing, referral, and final recommendations depend on the specialist review and available pathway.

**What to Prepare**  
Family history details, previous test results, clinic letters, and the specific reason you are seeking review.

**Follow-Up Expectations**  
You may be advised on referral, formal counseling, further records gathering, or another specialist route.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can this provide a diagnosis on its own?  
Usually not. It helps clarify the next step and whether formal testing or counseling is appropriate.

- Should I book if I have no previous records?  
Yes, but the clinician may need more information before advising fully.

**Internal Links**  
`/ireland/referral-consultation`, `/specialty-ie`

### Psychiatry Consultation

**SEO Title**  
Online Psychiatry Consultation in Ireland | Global Health

**SEO Description**  
Book an online psychiatry consultation in Ireland for non-emergency specialist review of mental health symptoms, treatment questions, and follow-up planning.

**H1**  
Online Psychiatry Consultation

**Hero Summary**  
This service is for patients who may need psychiatrist-level assessment of mental health symptoms, diagnosis review, or medication planning. It is not a crisis route.

**Who This Is For**  
Adults with ongoing mental health concerns, previous diagnosis, medication questions, or referral needs that may require psychiatric review.

**Common Reasons to Book**  
Medication review; diagnosis clarification; persistent anxiety or mood symptoms; follow-up after prior psychiatric care; deciding on the next treatment route.

**What Can Be Handled Online**  
History review, treatment discussion, medication review, and planning for therapy, further review, or in-person support.

**What Cannot Be Handled Online**  
Active suicidal intent, acute psychosis, severe agitation, violence risk, intoxication crisis, or any immediate psychiatric emergency.

**Emergency Warning**  
If you cannot stay safe, have suicidal intent, or are in acute crisis, seek emergency or urgent local mental health support now.

**Prescription, Referral, and Certificate Boundaries**  
Medication discussion may be part of the visit, but prescribing is never guaranteed and may depend on records, follow-up, and risk assessment.

**What to Prepare**  
Current symptoms, previous diagnosis, current and prior medications, previous letters, and the main reason for seeking psychiatric review.

**Follow-Up Expectations**  
You may be advised on medication follow-up, therapy support, GP coordination, or urgent in-person mental health care.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Is this suitable for crisis support?  
No. Crisis situations need urgent local help.

- Can the psychiatrist review my current medication?  
Yes, but any change depends on full assessment and safety.

**Internal Links**  
`/ireland/mental-health-assessment-consultation`, `/ireland-specialist-consultations/psychology-consultation`

### Physiotherapy Consultation

**SEO Title**  
Online Physiotherapy Consultation in Ireland | Global Health

**SEO Description**  
Book an online physiotherapy consultation in Ireland for movement assessment, rehabilitation advice, and next-step planning for non-emergency pain or injury concerns.

**H1**  
Online Physiotherapy Consultation

**Hero Summary**  
This service is for patients with stable movement, pain, or rehabilitation concerns who may benefit from guided assessment and exercise-based advice online.

**Who This Is For**  
Adults with stable joint or muscle pain, post-injury recovery questions, posture or movement concerns, or rehabilitation follow-up needs.

**Common Reasons to Book**  
Back pain; shoulder pain; post-injury rehab; exercise guidance; flare management; deciding whether in-person physio is needed.

**What Can Be Handled Online**  
Symptom history, guided movement assessment, rehabilitation planning, and self-management advice.

**What Cannot Be Handled Online**  
Acute severe injury, suspected fracture, major neurological deficit, severe swelling after trauma, or problems needing hands-on examination urgently.

**Emergency Warning**  
Seek urgent in-person care for major trauma, severe weakness, loss of sensation, suspected fracture, or red-flag spinal symptoms.

**Prescription, Referral, and Certificate Boundaries**  
This service focuses on assessment and rehabilitation advice. Medication or formal documentation may require another clinical route.

**What to Prepare**  
Injury timeline, pain triggers, what movements are difficult, prior scans if available, and enough space to move during the consultation.

**Follow-Up Expectations**  
You may receive exercises, self-management advice, or recommendation for in-person imaging, orthopaedics, or hands-on physiotherapy.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can the physiotherapist assess movement online?  
Yes, to a degree, but some cases still need in-person examination.

- Is this suitable after a fresh injury?  
Only if the injury is clearly stable and non-emergency.

**Internal Links**  
`/ireland/pain-management-consultation`, `/ireland-specialist-consultations/orthopedic-consultation`

### Geriatrics Consultation

**SEO Title**  
Online Geriatrics Consultation in Ireland | Global Health

**SEO Description**  
Book an online geriatrics consultation in Ireland for non-emergency review of complex health concerns in older adults and next-step planning.

**H1**  
Online Geriatrics Consultation

**Hero Summary**  
This service is for older adults or caregivers who need specialist review of complex but stable health concerns, medication burden, or follow-up planning.

**Who This Is For**  
Older adults with multiple conditions, caregivers needing guidance, or patients who need review of function, frailty-related concerns, or treatment complexity.

**Common Reasons to Book**  
Medication review; falls-risk discussion; memory or function concerns; chronic-disease complexity; caregiver questions.

**What Can Be Handled Online**  
History review, medication-burden discussion, functional concerns, and planning of next-step support or referrals.

**What Cannot Be Handled Online**  
Acute confusion, stroke symptoms, major falls with injury, severe dehydration, or any emergency requiring urgent in-person review.

**Emergency Warning**  
Seek urgent care for sudden confusion, chest pain, severe weakness, new stroke symptoms, or injury after a fall.

**Prescription, Referral, and Certificate Boundaries**  
Medication review and referral planning may be possible, but complex cases often still need local examination, testing, or multidisciplinary input.

**What to Prepare**  
Medication list, major diagnoses, recent hospital letters, mobility concerns, home support context, and caregiver observations.

**Follow-Up Expectations**  
You may receive medication-review guidance, local support recommendations, or referral to another specialist or in-person route.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can a family member attend the consultation?  
Yes, caregiver input may help when the patient agrees.

- Is this suitable for sudden confusion?  
No. Sudden confusion needs urgent medical assessment.

**Internal Links**  
`/ireland/family-medicine-consultation`, `/ireland/referral-consultation`

### Dermatology Consultation

**SEO Title**  
Online Dermatology Consultation in Ireland | Global Health

**SEO Description**  
Book an online dermatology consultation in Ireland for non-emergency skin concerns, rash review, and specialist next-step planning.

**H1**  
Online Dermatology Consultation

**Hero Summary**  
This service is for patients with stable skin concerns that may be suitable for image-supported specialist review and treatment planning.

**Who This Is For**  
Adults with rashes, acne, eczema, lesion questions, or follow-up review of a skin condition that is not urgent.

**Common Reasons to Book**  
Persistent rash; acne review; eczema flare; mole or lesion question; treatment side effects; chronic skin condition follow-up.

**What Can Be Handled Online**  
Photo-supported history review, symptom discussion, treatment guidance, and deciding whether in-person dermatology review is needed.

**What Cannot Be Handled Online**  
Rapidly spreading severe infection, facial swelling affecting breathing, severe allergic reaction, extensive blistering, or urgent skin emergencies.

**Emergency Warning**  
Seek urgent care for breathing difficulty with rash, severe swelling, widespread blistering, high fever with rash, or rapidly worsening infection signs.

**Prescription, Referral, and Certificate Boundaries**  
Treatment may be discussed, but prescriptions and referrals depend on image quality, history, and whether the issue is safe to assess online.

**What to Prepare**  
Clear photos in good light, symptom duration, what you have already used, triggers, and previous dermatology letters if relevant.

**Follow-Up Expectations**  
You may receive treatment advice, image-based review, or recommendation for biopsy, urgent care, or in-person skin examination.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Do I need to upload photos?  
Photos are often helpful for online skin review.

- Can every skin concern be handled online?  
No. Some lesions or severe rashes need in-person examination.

**Internal Links**  
`/ireland/aesthetic-medicine-online-consultation`, `/ireland/medical-consultation`

### Immunoallergology Consultation

**SEO Title**  
Online Allergy and Immunology Consultation in Ireland | Global Health

**SEO Description**  
Book an online allergy and immunology consultation in Ireland for non-emergency allergy review, symptom discussion, and next-step planning.

**H1**  
Online Immunoallergology Consultation

**Hero Summary**  
This service is for patients with stable allergy or immune-related concerns who need specialist guidance and next-step planning. It is not for active anaphylaxis or severe allergic reaction.

**Who This Is For**  
Adults with recurring allergy symptoms, medication reactions needing follow-up review, chronic immune-related concerns, or questions about further testing.

**Common Reasons to Book**  
Seasonal allergy review; recurring hives; food-reaction history discussion; treatment review; deciding whether allergy testing is needed.

**What Can Be Handled Online**  
History review, trigger discussion, treatment planning, and guidance on testing or in-person specialist next steps.

**What Cannot Be Handled Online**  
Active anaphylaxis, severe breathing difficulty, severe swelling, or urgent allergic emergencies.

**Emergency Warning**  
Call emergency services for breathing difficulty, throat swelling, collapse, or signs of anaphylaxis.

**Prescription, Referral, and Certificate Boundaries**  
Treatment advice may be discussed, but definitive testing and some prescriptions may require in-person follow-up.

**What to Prepare**  
Trigger history, symptom pattern, reaction timeline, current allergy medicines, and prior test results if available.

**Follow-Up Expectations**  
You may be advised on avoidance, medication follow-up, testing, or local in-person specialist review.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Can this confirm a food allergy online?  
It can guide next steps, but formal testing may still be needed.

- Is this suitable during an active severe reaction?  
No. Severe reactions need emergency care.

**Internal Links**  
`/ireland/medical-consultation`, `/ireland-specialist-consultations/pneumology-consultation`

### Pneumology Consultation

**SEO Title**  
Online Respiratory Specialist Consultation in Ireland | Global Health

**SEO Description**  
Book an online pneumology consultation in Ireland for non-emergency breathing-related concerns, chronic respiratory follow-up, and next-step planning.

**H1**  
Online Pneumology Consultation

**Hero Summary**  
This service is for stable breathing-related concerns or chronic respiratory follow-up that may benefit from specialist review. It is not suitable for acute breathing emergencies.

**Who This Is For**  
Adults with chronic cough, known asthma or COPD follow-up questions, breathing symptoms needing specialist planning, or document review.

**Common Reasons to Book**  
Chronic cough; inhaler questions; specialist follow-up after tests; stable breathlessness review; deciding whether local testing is needed.

**What Can Be Handled Online**  
History review, treatment discussion, prior-test review, and planning for monitoring or in-person follow-up.

**What Cannot Be Handled Online**  
Acute severe breathlessness, low oxygen concerns, chest pain, sudden respiratory distress, or urgent infection complications.

**Emergency Warning**  
Seek urgent care for severe shortness of breath, blue lips, chest pain, confusion, or rapidly worsening breathing symptoms.

**Prescription, Referral, and Certificate Boundaries**  
Medication review may be possible, but some changes require examination, testing, or another route. Certificates and referrals depend on specialist assessment.

**What to Prepare**  
Symptom timeline, inhaler list, oxygen or peak-flow readings if available, prior scans or lung-function reports, and smoking history if relevant.

**Follow-Up Expectations**  
You may be advised on inhaler technique, local testing, pulmonary follow-up, or urgent in-person review depending on symptoms.

**Price and Duration Notes**  
Show specialist appointment details before payment.

**FAQ**

- Is this suitable if I am short of breath right now?  
Only if symptoms are mild and stable. Severe breathlessness needs urgent care.

- Can the specialist review prior respiratory test results?  
Yes, where those records are available for the consultation.

**Internal Links**  
`/ireland/respiractory-infections`, `/ireland/medical-consultation`

## Legal Content Readiness

These pages should remain plain-document layouts without marketing CTA modules.

| Page | Public Title | Plain-Language Summary | Required Structured Sections | Approval Status |
| --- | --- | --- | --- | --- |
| `/privacy` | Privacy Policy | Explains what data is collected, why it is used, how long it is kept, and how patients can exercise their rights. | Summary, data collected, lawful basis, sharing, retention, patient rights, contact details, last updated, legal entity | Legal approval required |
| `/term-and-conditions` | Terms and Conditions | Explains the rules for using the site, booking services, payment, cancellations, and acceptable use. | Summary, service scope, user responsibilities, payments, cancellations, limitations, governing details, last updated, legal entity | Legal approval required |
| `/return-and-refund-policy` | Return and Refund Policy | Explains consultation cancellation terms, eligibility for refunds, and any exceptions. | Summary, cancellations, refunds, rescheduling, excluded items, contact route, last updated, legal entity | Legal approval required |
| `/legal-notices` | Legal Notices | States the site owner, contact details, intellectual property notices, and required legal disclosures. | Summary, entity details, contact, intellectual property, platform use, last updated | Legal approval required |

For all legal pages:

- Add `Last updated: [to be confirmed by legal team]`
- Add `Legal entity: [to be confirmed by legal team]`
- Remove all marketing copy and trust-band language
- Do not invent jurisdiction, entity number, or statutory wording

## Editorial Governance Rules

### Publishing Rules

- Do not publish a medical service page without exact structured duration and starting-price fields.
- Do not publish a doctor profile without a real registration number or verification URL.
- Do not publish a blog article without a named reviewer and final reviewed date.
- Do not publish non-Ireland country pages until local coverage and workflow claims are operationally confirmed.
- Do not publish legal pages until legal signs off entity details and effective dates.

### Content Rules

- Every page must answer one real patient question.
- Every page must state what cannot be handled online.
- Every page must include a red-flag or emergency boundary when the topic is medical.
- Do not promise same-day access, prescriptions, referrals, or certificates unless the rota and workflow guarantee it.
- Do not use country-name-swapped copy across non-Ireland hubs.
- Do not use filler trust language when a concrete process explanation is available instead.

### Indexing Rules

Index only when all seven answers below are yes.

1. Does the page answer a real user question?
2. Is it meaningfully different from adjacent pages?
3. Is the medical scope clear?
4. Are online-care limits clear?
5. Is the CTA appropriate to the route?
6. Is the metadata unique?
7. Are structured fields and review requirements complete enough to index today?

If the answer to number 7 is no, keep the page draft or `noindex`.
