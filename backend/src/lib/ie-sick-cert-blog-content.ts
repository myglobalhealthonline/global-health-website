import { createHash } from "node:crypto";

export const SICK_CERT_BLOG_COPY = {
  slug: "sick-certificate-ireland-employee-rights",
  title: "How to Get a Sick Cert Online in Ireland",
  excerpt:
    "What happens during an online sick cert appointment, what your employer needs, and how sick pay differs from Illness Benefit.",
  seoTitle: "Sick Cert Online Ireland: What You Need to Know",
  seoDescription:
    "Need a sick cert online in Ireland? Learn how the appointment works, what your employer may require, and when you need an in-person assessment.",
  coverImagePath: "/images/ireland/blog/sick-cert-online-ireland-2026-v2.webp",
  coverImageAlt: "A quiet home workspace prepared for an online GP consultation in Ireland",
  authorName: "Dr Tiago Miguel Figueira",
  reviewerName: "Dr Ahmed Maklad",
} as const;

const SERVICE_PATH = "/ireland/en/services/sick-certificate-ireland";
const ILLNESS_BENEFIT_PATH = "/ireland/en/blog/illness-benefit-ireland-how-to-claim";
const ONLINE_VS_IN_PERSON_PATH = "/ireland/en/blog/when-to-see-a-gp-online-vs-in-person";

const ARTICLE = `<main class="gh-blog" lang="en-IE">
<header class="article-intro article-lede">
  <div class="hero-copy">
    <span class="eyebrow">Ireland · Work certificate guide</span>
    <p class="hero-deck">You can get a sick cert online when a video consultation gives the doctor enough information to assess you safely.</p>
    <p class="intro-lead">The doctor will ask about your symptoms, when they started and how they affect your work. If the clinical evidence supports it, they may issue a certificate after the appointment. You are booking a medical assessment, not buying a document, and a certificate is never automatic.</p>
    <div class="hero-facts"><span class="hero-fact">Secure video consultation</span><span class="hero-fact">IMC-registered doctor</span><span class="hero-fact">Clinical decision after assessment</span></div>
    <div class="hero-actions"><a class="btn-lime" href="${SERVICE_PATH}">Check appointments and current fee</a></div>
  </div>
  <aside class="hero-panel">
    <span class="meta-chip">What this guide covers</span>
    <p class="intro-support">What happens in an online appointment and what information to have ready.</p>
    <p class="intro-support">What an employer may check, and how statutory sick pay differs from Illness Benefit.</p>
    <p class="intro-support">When video care is unsuitable, including urgent symptoms and requests that need another service.</p>
    <div class="hero-author"><div aria-hidden="true" class="hero-author-mark">TF</div><div><strong>${SICK_CERT_BLOG_COPY.authorName}</strong><span>IMC 523449 · Clinical Director, Global Health</span></div></div>
    <span class="hero-review-line">Clinically reviewed by ${SICK_CERT_BLOG_COPY.reviewerName}, General Practitioner, Global Health Ireland.</span>
  </aside>
</header>

<nav class="article-nav" aria-label="In this article"><div class="article-nav-inner"><span class="article-nav-label">In this article</span><div class="article-nav-list"><a href="#appointment">The appointment</a><a href="#employer">Employer rules</a><a href="#sick-pay">Sick pay</a><a href="#limits">When video is unsuitable</a><a href="#faq">FAQ</a></div></div></nav>

<section class="article-section section-ivory"><div class="section-inner">
  <hr class="section-anchor" id="appointment">
  <span class="eyebrow">The appointment</span>
  <h2>What happens during an online sick cert appointment?</h2>
  <p class="section-lead">The consultation is a focused medical assessment. The doctor needs to understand what is wrong and why you cannot do your usual work safely.</p>
  <p>Choose somewhere private where you can speak openly. You do not need a polished account of the illness. Dates, symptoms and practical details about your job are more useful.</p>
  <ul class="check-list">
    <li><strong>Know when the symptoms began.</strong> Include the days you have already missed or expect to miss.</li>
    <li><strong>Have your medical details nearby.</strong> The doctor may ask about medicines, relevant conditions and treatment you have already tried.</li>
    <li><strong>Explain what your work involves.</strong> Describe the duties you cannot manage and whether your condition could put you or someone else at risk.</li>
    <li><strong>Check your employer's process.</strong> Find out whether there is a deadline, form or submission portal.</li>
  </ul>
  <p>If a certificate is clinically appropriate, check your details and the dates when you receive it. Keep a copy and submit it through the channel your employer normally uses.</p>
</div></section>

<section class="article-section section-forest"><div class="section-inner">
  <hr class="section-anchor" id="employer">
  <span class="eyebrow">Employer rules</span>
  <h2>Will an employer accept a sick cert from an online doctor?</h2>
  <p class="section-lead">For statutory sick leave, the certificate must come from a registered medical practitioner and confirm that illness or injury has left you unable to work.</p>
  <p>The <a href="https://www.workplacerelations.ie/en/what_you_should_know/leave/sick-leave/" target="_blank" rel="noopener noreferrer">Workplace Relations Commission</a> sets out the certification requirement. The <a href="https://www.irishstatutebook.ie/eli/2022/act/24/enacted/en/html" target="_blank" rel="noopener noreferrer">Sick Leave Act 2022</a> and current WRC guidance do not appear to distinguish between an in-person and remote consultation for this purpose.</p>
  <p>An employer can still check that the doctor is registered, that the document is genuine and that the dates are clear. It may also require you to follow a reasonable absence-reporting procedure.</p>
  <div class="alert-warn"><strong>If your certificate is refused</strong><span>Ask for the reason in writing. The issue may be a missing date, late submission, a company-policy requirement or your eligibility for the statutory scheme. Address the specific problem before sharing any additional medical information.</span></div>
</div></section>

<section class="article-section section-ivory"><div class="section-inner">
  <hr class="section-anchor" id="sick-pay">
  <span class="eyebrow">Pay and benefits</span>
  <h2>How statutory sick pay works in Ireland</h2>
  <p class="section-lead">The statutory scheme currently provides five paid sick-leave days per calendar year after 13 weeks of continuous service.</p>
  <ul class="check-list">
    <li><strong>Rate of pay.</strong> Statutory sick pay is 70% of normal daily earnings, capped at €110 per day.</li>
    <li><strong>Medical certification.</strong> You need a certificate from a registered medical practitioner for a day claimed under the statutory scheme.</li>
    <li><strong>Company schemes.</strong> Your workplace may offer full pay, more days or self-certification for a short absence, so check your contract or staff handbook.</li>
  </ul>
  <p>The Department of Enterprise confirmed in <a href="https://enterprise.gov.ie/en/news-and-events/department-news/2025/april/20250414.html" target="_blank" rel="noopener noreferrer">April 2025</a> that the planned increase would not proceed. Current WRC guidance continues to list five days.</p>
  <h3>A work sick cert is not the Illness Benefit certificate</h3>
  <p>A certificate for your employer and the medical certification used for an Illness Benefit claim belong to different processes. Illness Benefit is administered by the Department of Social Protection and uses a Certificate of Incapacity for Work.</p>
  <p>Global Health's online sick-cert service provides work documentation when clinically appropriate. It does not issue the Department's Certificate of Incapacity for Work. Start with the official <a href="https://www.gov.ie/en/service/ddf6e3-illness-benefit/" target="_blank" rel="noopener noreferrer">Illness Benefit guidance</a> or read our guide to <a href="${ILLNESS_BENEFIT_PATH}">claiming Illness Benefit in Ireland</a> if you intend to apply.</p>
</div></section>

<section class="article-section section-forest"><div class="section-inner">
  <hr class="section-anchor" id="limits">
  <span class="eyebrow">Clinical limits</span>
  <h2>When an online appointment may not be suitable</h2>
  <p class="section-lead">Video care works for many straightforward illnesses, but the doctor may need to examine you, check observations or arrange tests before making a safe decision.</p>
  <ul class="check-list">
    <li><strong>Backdating is not automatic.</strong> The history and available evidence must support the earlier dates you request.</li>
    <li><strong>Some documents need another service.</strong> Fitness-to-return reports for safety-critical work, insurance forms and specialist occupational-health reports may need an in-person or specialist assessment.</li>
    <li><strong>Privacy still matters.</strong> A routine work cert does not give your employer access to your consultation notes or full medical record.</li>
  </ul>
  <p>The <a href="https://dataprotection.ie/en/dpc-guidance/case-studies/disclosure-unauthorised-disclosure/processing-occupational-health-data" target="_blank" rel="noopener noreferrer">Data Protection Commission</a> treats health information as special-category data. Any workplace request should be limited to information it genuinely needs. If you are unsure whether video care suits your symptoms, see our guide to <a href="${ONLINE_VS_IN_PERSON_PATH}">using an online GP versus attending in person</a>.</p>
  <div class="alert-warn"><strong>Get urgent help first</strong><span>Call 112 or 999, or attend an Emergency Department, for severe breathing difficulty, chest pain, collapse, confusion or signs of stroke. Do not wait for a certificate appointment.</span></div>
</div></section>

<section class="article-section section-ivory"><div class="section-inner">
  <hr class="section-anchor" id="faq">
  <span class="eyebrow">Common questions</span>
  <h2>Questions people ask before booking</h2>
  <div class="faq-section">
    <details class="faq-item"><summary class="faq-q">Do I need a sick cert for one day off?</summary><div class="faq-a"><p>You need medical certification if you are claiming that day under statutory sick pay. Your employer may have a more generous scheme that allows self-certification for a short absence, so check its policy.</p></div></details>
    <details class="faq-item"><summary class="faq-q">Can an online doctor backdate a sick cert?</summary><div class="faq-a"><p>Only when the doctor considers the earlier dates clinically supportable. Backdating is not guaranteed and may be inappropriate when there is not enough evidence about your condition on those dates.</p></div></details>
    <details class="faq-item"><summary class="faq-q">Can I get a sick cert for stress or anxiety?</summary><div class="faq-a"><p>A doctor can assess mental-health symptoms by video when remote care is suitable. The consultation should consider how the symptoms affect your work, what treatment or follow-up you need, and whether there are immediate safety concerns.</p></div></details>
    <details class="faq-item"><summary class="faq-q">Can my employer contact the doctor?</summary><div class="faq-a"><p>An employer may seek to verify that a certificate is genuine. That does not give it access to your consultation notes. Any medical disclosure needs an appropriate legal basis and should be limited to what the workplace needs.</p></div></details>
  </div>
</div></section>

<section class="article-section section-forest"><div class="section-inner"><div class="disclaimer"><strong>Medical and legal information notice</strong><span>This article gives general information for Ireland. It does not replace medical care, legal advice, your employment contract or your employer's policy. Rules and service availability can change. A certificate is issued only after clinical assessment and is never guaranteed.</span></div></div></section>
</main>`;

function stripEmbeddedCode(html: string): string {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
}

function visibleText(html: string): string {
  return stripEmbeddedCode(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const REQUIRED_DESIGN_SELECTORS = [
  ".gh-blog",
  ".article-intro",
  ".hero-panel",
  ".article-nav",
  ".article-section",
  ".section-ivory",
  ".section-forest",
  ".check-list",
  ".alert-warn",
  ".faq-section",
  ".disclaimer",
] as const;

function missingDesignSelectors(body: string): string[] {
  const style = body.match(/<style\b[^>]*>[\s\S]*?<\/style>/i)?.[0] ?? "";
  return REQUIRED_DESIGN_SELECTORS.filter((selector) => !style.includes(selector));
}

export function validateSickCertBlogBody(body: string): string[] {
  const errors: string[] = [];
  const prose = visibleText(body);
  const required = [
    "You can get a sick cert online",
    SERVICE_PATH,
    ILLNESS_BENEFIT_PATH,
    "workplacerelations.ie",
    "gov.ie/en/service/ddf6e3-illness-benefit",
    "medical assessment, not buying a document",
  ];

  for (const value of required) if (!body.includes(value)) errors.push(`Missing required content: ${value}`);
  if (!/<style\b/i.test(body)) errors.push("Missing the established blog design style block");
  const missingSelectors = missingDesignSelectors(body);
  if (missingSelectors.length > 0) {
    errors.push(`Established blog design is missing selectors: ${missingSelectors.join(", ")}`);
  }
  if (!/<main class="gh-blog"/i.test(body)) errors.push("Missing the established gh-blog root");
  if (!/class="article-intro article-lede"/i.test(body)) errors.push("Missing the established article lead component");
  if (!/class="article-nav"/i.test(body)) errors.push("Missing the established article navigation");
  if ((body.match(/class="article-section section-(?:ivory|forest)"/g) ?? []).length !== 6) {
    errors.push("Article must contain the five content sections and closing disclaimer section");
  }
  if ((body.match(/<h2\b/gi) ?? []).length !== 5) errors.push("Article must contain exactly five H2 sections");
  if ((body.match(/<details\b/gi) ?? []).length !== 4) errors.push("Article must contain exactly four FAQs");

  const wordCount = prose ? prose.split(" ").length : 0;
  if (wordCount < 1_000 || wordCount > 1_300) errors.push(`Visible word count must be 1000-1300, got ${wordCount}`);
  if ((body.match(new RegExp(`href="${SERVICE_PATH}"`, "g")) ?? []).length !== 1) {
    errors.push("Article must contain exactly one service CTA");
  }
  if (/€39|same legal standing|employers? (?:must|will) accept/i.test(body)) {
    errors.push("Article contains a stale price or absolute acceptance claim");
  }
  if (/[—–]/.test(prose)) errors.push("Article prose contains a dash outside the project style");
  return errors;
}

export function buildSickCertBlogBody(currentBody: string): string {
  const styleMatch = currentBody.match(/<style\b[^>]*>[\s\S]*?<\/style>/i);
  if (!styleMatch) throw new Error("Current article is missing the established designed <style> block");
  const body = `${styleMatch[0]}${ARTICLE}`;
  const errors = validateSickCertBlogBody(body);
  if (errors.length > 0) throw new Error(`Invalid sick-cert replacement body:\n- ${errors.join("\n- ")}`);
  return body;
}

export function parseIsoReviewDate(value: string | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("--reviewed-at must use YYYY-MM-DD");
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("--reviewed-at must be a valid calendar date");
  }
  return parsed;
}

export function sickCertApprovalSha256(body: string): string {
  return createHash("sha256").update(JSON.stringify({ copy: SICK_CERT_BLOG_COPY, body })).digest("hex");
}

export function assertClinicalReviewGate(
  apply: boolean,
  reviewedAt: Date | null,
  providedHash?: string,
  expectedHash?: string,
): void {
  if (apply && !reviewedAt) throw new Error("Refusing to apply without --reviewed-at=YYYY-MM-DD after clinical approval");
  if (apply && (!providedHash || !expectedHash || providedHash !== expectedHash)) {
    throw new Error("Refusing to apply without --approved-sha256 matching the exact reviewed copy");
  }
}
