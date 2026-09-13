import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync('seo/romania/raw/editorial-storage-before-2026-09-13.json')).data.clinical;
const staffed=new Set(d.services.filter(s=>s.isActive&&d.assignments.some(a=>a.serviceId===s.id&&a.isActive)).map(s=>s.id));
const links=new Map(d.serviceLinks.filter(l=>l.isActive&&staffed.has(l.sourceServiceId)&&d.services.find(s=>s.id===l.targetServiceId)?.slug!=='evaluare-durere').map(l=>[l.id,l]));
const targets={
 'reinnoire-tratament':['Treatment renewal','Review an established treatment with a doctor and discuss whether a prescription renewal is appropriate.'],
 'sanatate-mintala-online':['Mental health assessment','Read about a confidential online mental health assessment and the support available at GP level.'],
 'a-doua-opinie-medicala':['Second medical opinion','Discuss your diagnosis, treatment or investigation results with another doctor for an independent clinical opinion.'],
 'medic-online-romania':['General medical consultation','Read about a general medical consultation to discuss your symptoms and the appropriate next steps.'],
 'boli-cronice-online':['Chronic disease management','Read about ongoing GP-level care for chronic conditions, including treatment review and monitoring.'],
 'trimiteri-si-investigatii':['Referral letters and investigations','Discuss investigation results, tests, referrals or medical documentation with a doctor. Requests and documents depend on clinical assessment.'],
 'sanatatea-femeii-online':["Women's health","Read about an online women's health assessment, including hormonal symptoms and related concerns."],
 'caderea-parului-online':['Hair loss consultation','Read about a medical assessment of hair loss, possible causes and treatment options.'],
 'controlul-greutatii':['Weight management','Discuss factors affecting your weight and a management plan based on medical assessment.'],
 'consultatie-neurologie':['Neurology consultation','Read about specialist neurological assessment, treatment review and advice on further investigations.'],
 'consultatie-dermatologica':['Skin consultation','Read about online assessment of skin concerns and when a dermatology referral may be needed.'],
 'sanatatea-barbatului-online':["Men's health","Read about a confidential online assessment of men's health concerns."],
 'consultatie-pediatrie':['Specialist paediatric consultation','Read about specialist assessment of persistent, complex or recurring child health concerns.'],
 'medicina-calatoriei':['Travel health consultation','Discuss health concerns and medical planning before travel.'],
 'medic-pediatru-online':["Children's GP consultation",'Read about GP-level assessment of common childhood symptoms and advice on next steps.']
};
const headings={
 'What If Condition Is More Serious?':'Questions about your diagnosis',
 'If Condition Has Changed?':'Has your condition changed?',
 'If Unsure About Current Treatment?':'Unsure about your current treatment?',
 'Starting Point If Unsure?':'Unsure where to start?',
 'Diabetes, Hypertension?':'Diabetes or hypertension',
 'Investigations?':'Tests and investigations',
 'PCOS, Menopause, Hormonal Weight Gain?':'PCOS, menopause and hormonal weight changes',
 'If Broader Health Concerns?':'Other health concerns',
 'ED Related to Diabetes, Hypertension?':'Erectile dysfunction, diabetes and hypertension',
 'Hormonal Hair Loss in Men?':'Hormonal hair loss in men',
 'Hormonal Weight Gain, PCOS?':'Hormonal weight gain and PCOS',
 'Postnatal Mood, Anxiety?':'Postnatal mood changes and anxiety',
 'Hormonal Hair Loss in Women?':'Hormonal hair loss in women',
 'Physical Health Contributors to Mood?':'Physical health and mood',
 'Mental Health in Chronic Disease?':'Mental health and chronic conditions',
 'ADHD Neurological Assessment?':'Neurological assessment for ADHD concerns',
 'If Unsure About Current Diagnosis?':'Unsure about your diagnosis?',
 'Non-skin Concerns During Same Visit?':'Other symptoms alongside skin concerns',
 'Hormonal Acne in Women?':'Hormonal acne in women',
 'Scalp Conditions and Hair Loss?':'Scalp conditions and hair loss',
 'Post-travel Symptoms?':'Symptoms after travel',
 'Chronic Conditions During Travel?':'Chronic conditions during travel',
 'Travel Letters?':'Travel health letters',
 'Tropical Skin Conditions?':'Skin concerns after tropical travel',
 'If Other Health Concerns?':'Other health concerns',
 'PCOS, Thyroid, Menopause?':'PCOS, thyroid concerns and menopause',
 'Ferritin, Thyroid?':'Ferritin and thyroid tests',
 'Scalp Conditions?':'Scalp conditions',
 'Osteoarthritis, Inflammatory Arthritis?':'Osteoarthritis and inflammatory arthritis',
 'If Unsure Which Service Is Right?':'Unsure which service to choose?',
 'Neurological Second Opinion?':'A second opinion on a neurological condition',
 'Paediatric Second Opinion?':'A second opinion on your child’s health',
 'Chronic Condition Review?':'Review of a chronic condition',
 'Obesity As Chronic Condition?':'Ongoing care for obesity',
 'Depression, Anxiety At GP Level?':'GP-level care for depression and anxiety',
 "Parkinson's, MS, Epilepsy Follow-up?":"Follow-up for Parkinson's disease, MS or epilepsy",
 'If Unsure About Current Management?':'Questions about your current management plan',
 'Clinical Assessment Required First?':'Medical assessment before further investigations',
 'Ongoing Monitoring?':'Ongoing monitoring',
 'If Results Raise Concerns?':'Questions about your results',
 'Neurology Referral?':'Neurology assessment',
 'Complex Presentations?':'Complex child health concerns',
 'Eczema, Skin Infections in Children?':'Eczema and skin infections in children',
 'Adolescent Mental Health?':'Adolescent mental health',
 'Pre-travel Advice for Children?':'Travel health advice for children',
 'Cognitive Concerns, ADHD Screening?':'Cognitive concerns and ADHD screening',
 "MS, Parkinson's, Epilepsy Follow-up?":"Follow-up for MS, Parkinson's disease or epilepsy",
 'Neurodevelopmental Referral Pathway?':'Neurodevelopmental assessment and referrals'
};
const changes=[];let rows=0;
for(const r of d.serviceLinkTranslations){
 const link=links.get(r.serviceLinkId);if(!link)continue;
 assert.equal(r.locale,'EN');
 const slug=d.services.find(s=>s.id===link.targetServiceId)?.slug;
 assert(targets[slug],slug);const [label,body]=targets[slug];
 const heading=r.heading==='Other Section?'?label:r.heading==='Related care'?r.heading:headings[r.heading];
 assert(heading,r.heading);rows++;
 for(const [field,after]of Object.entries({heading,body,ctaLabel:label}))if(r[field]!==after){assert(!after.includes('—'));changes.push({table:'serviceLinkTranslations',id:r.id,field,before:r[field],after,reason:'Replace malformed promotional link copy with a clear description of the existing destination; preserve target and clinical scope.'});}
}
fs.writeFileSync('seo/romania/content-briefs/editorial-service-link-changes-2026-09-13.json',JSON.stringify(changes,null,2)+'\n');
console.log({rows,changes:changes.length});
