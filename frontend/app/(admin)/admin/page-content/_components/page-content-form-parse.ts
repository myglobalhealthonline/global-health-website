import type { AdminPageContentUpsertBody } from "@/lib/admin/admin-api";

// Fixed-slot repeatable rows (mirrors doctors/_components/faq-language-tabs.tsx
// — simpler than dynamic add/remove client state; a blank slot is dropped on
// save). Slot counts have headroom over the largest known dataset (Ireland:
// 13 whoFor items, 6 whyChoose items, 8 FAQs, 5 disclaimer paragraphs).
export const WHO_FOR_SLOTS = 16;
export const WHY_CHOOSE_SLOTS = 8;
export const FAQ_SLOTS = 10;
export const DISCLAIMER_SLOTS = 6;

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function rawStr(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function slots(formData: FormData, prefix: string, locale: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const v = str(formData, `${prefix}__${locale}__${i}`);
    if (v) out.push(v);
  }
  return out;
}

function faqSlots(formData: FormData, locale: string): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (let i = 0; i < FAQ_SLOTS; i++) {
    const question = str(formData, `faq_q__${locale}__${i}`);
    const answer = str(formData, `faq_a__${locale}__${i}`);
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

export function parsePageContentForm(formData: FormData): AdminPageContentUpsertBody {
  const localeCodes = String(formData.get("locales") ?? "")
    .split(",")
    .map((l) => l.trim().toUpperCase())
    .filter(Boolean);

  const translations = localeCodes.map((locale) => ({
    locale,
    heroTitle: str(formData, `heroTitle__${locale}`),
    heroTitleLead: str(formData, `heroTitleLead__${locale}`),
    heroTitleAccent: str(formData, `heroTitleAccent__${locale}`),
    heroSubtitle: str(formData, `heroSubtitle__${locale}`),
    ctaLabel: str(formData, `ctaLabel__${locale}`),
    intro: str(formData, `intro__${locale}`),
    whoForTitle: str(formData, `whoForTitle__${locale}`),
    whoForIntro: str(formData, `whoForIntro__${locale}`),
    whoForItems: slots(formData, "whoForItems", locale, WHO_FOR_SLOTS),
    whyChooseTitle: str(formData, `whyChooseTitle__${locale}`),
    whyChooseItems: slots(formData, "whyChooseItems", locale, WHY_CHOOSE_SLOTS),
    faq: faqSlots(formData, locale),
    disclaimerParagraphs: slots(formData, "disclaimerParagraphs", locale, DISCLAIMER_SLOTS),
    disclaimerShort: str(formData, `disclaimerShort__${locale}`),
    body: rawStr(formData, `body__${locale}`),
    seoTitle: str(formData, `seoTitle__${locale}`),
    seoDescription: str(formData, `seoDescription__${locale}`),
  }));

  return {
    status: formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    isActive: formData.get("isActive") === "on",
    heroImagePath: str(formData, "heroImagePath"),
    ogImagePath: str(formData, "ogImagePath"),
    ctaHref: str(formData, "ctaHref"),
    showIntro: formData.get("showIntro") === "on",
    showWhoFor: formData.get("showWhoFor") === "on",
    showWhyChoose: formData.get("showWhyChoose") === "on",
    showFaq: formData.get("showFaq") === "on",
    showDisclaimer: formData.get("showDisclaimer") === "on",
    showBody: formData.get("showBody") === "on",
    translations,
  };
}
