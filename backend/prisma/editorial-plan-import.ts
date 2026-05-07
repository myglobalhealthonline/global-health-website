import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LocaleCode, Prisma, PrismaClient, PublishStatus, ServiceKind } from "@prisma/client";

type EditorialChecklist = {
  draft: boolean;
  editorialReviewNeeded: boolean;
  clinicalReviewNeeded: boolean;
  legalReviewNeeded: boolean;
  operationalConfirmationNeeded: boolean;
  readyToIndex: boolean;
  notes?: string[];
};

type ParsedBlock = {
  heading: string;
  fields: Record<string, string>;
};

const prismaDir = dirname(fileURLToPath(import.meta.url));
const planPath = join(prismaDir, "..", "..", "docs", "editorial-completion-plan.md");

const irelandServiceMap: Record<string, { slug: string; kind: ServiceKind }> = {
  "Medical Consultation": { slug: "medical-consultation", kind: ServiceKind.GENERAL },
  "Pain Management Consultation": { slug: "pain-management-consultation", kind: ServiceKind.GENERAL },
  "Travel Consultation": { slug: "travel-consultation", kind: ServiceKind.GENERAL },
  "Erectile Dysfunction Consultation": { slug: "erectyle-dysfunction-consultation", kind: ServiceKind.GENERAL },
  "Self Referral": { slug: "self-referral", kind: ServiceKind.GENERAL },
  "Diabetes Consultation": { slug: "diabetes-consultation", kind: ServiceKind.GENERAL },
  "Sick Leave": { slug: "sick-leave", kind: ServiceKind.GENERAL },
  "Paediatric Primary Care Consultation": {
    slug: "paediatric-primary-care-consultation",
    kind: ServiceKind.GENERAL,
  },
  "Family Medicine Consultation": { slug: "family-medicine-consultation", kind: ServiceKind.GENERAL },
  "Respiratory Infections": { slug: "respiractory-infections", kind: ServiceKind.GENERAL },
  "Hypertension Consultation": { slug: "hypertension-consultation", kind: ServiceKind.GENERAL },
  "Driving License Medical Certificate": {
    slug: "driving-license-medical-certificate",
    kind: ServiceKind.GENERAL,
  },
  "Treatment Refill": { slug: "treatment-refill", kind: ServiceKind.GENERAL },
  "Weight Loss Consultation": { slug: "weight-loss-consultation", kind: ServiceKind.GENERAL },
  "Mental Health Assessment Consultation": {
    slug: "mental-health-assessment-consultation",
    kind: ServiceKind.GENERAL,
  },
  "Referral Consultation": { slug: "referral-consultation", kind: ServiceKind.GENERAL },
  "Migraine Consultation": { slug: "migraine-consultation", kind: ServiceKind.GENERAL },
  "Aesthetic Medicine Online Consultation": {
    slug: "aesthetic-medicine-online-consultation",
    kind: ServiceKind.GENERAL,
  },
  "Cardiology Consultation": { slug: "cardiology-consultation", kind: ServiceKind.SPECIALIST },
  "Pediatric Consultation": { slug: "pediatric-consultation", kind: ServiceKind.SPECIALIST },
  "Orthopedic Consultation": { slug: "orthopedic-consultation", kind: ServiceKind.SPECIALIST },
  "Neurology Consultation": { slug: "neurology-consultation", kind: ServiceKind.SPECIALIST },
  "Gastroenterology Consultation": {
    slug: "gastroenterology-consultation",
    kind: ServiceKind.SPECIALIST,
  },
  "Urology Consultation": { slug: "urology-consultation", kind: ServiceKind.SPECIALIST },
  "Rheumatology Consultation": { slug: "rheumatology-consultation", kind: ServiceKind.SPECIALIST },
  "Psychology Consultation": { slug: "psychology-consultation", kind: ServiceKind.SPECIALIST },
  "Nutrition Consultation": { slug: "nutrition-consultation", kind: ServiceKind.SPECIALIST },
  "Endocrinology Consultation": { slug: "endocrinology-consultation", kind: ServiceKind.SPECIALIST },
  "Oncology Consultation": { slug: "oncology-consultation", kind: ServiceKind.SPECIALIST },
  "Venereology Consultation": { slug: "venereology-consultation", kind: ServiceKind.SPECIALIST },
  "Genetics Consultation": { slug: "genetics-consultation", kind: ServiceKind.SPECIALIST },
  "Psychiatry Consultation": { slug: "psychiatry-consultation", kind: ServiceKind.SPECIALIST },
  "Physiotherapy Consultation": { slug: "physiotherapy-consultation", kind: ServiceKind.SPECIALIST },
  "Geriatrics Consultation": { slug: "geriatrics-consultation", kind: ServiceKind.SPECIALIST },
  "Dermatology Consultation": { slug: "dermatology-consultation", kind: ServiceKind.SPECIALIST },
  "Immunoallergology Consultation": {
    slug: "immunoallergology-consultation",
    kind: ServiceKind.SPECIALIST,
  },
  "Pneumology Consultation": { slug: "pneumology-consultation", kind: ServiceKind.SPECIALIST },
};

function baseChecklist(
  overrides: Partial<EditorialChecklist>,
  notes: string[] = [],
): Prisma.InputJsonValue {
  return {
    draft: false,
    editorialReviewNeeded: false,
    clinicalReviewNeeded: false,
    legalReviewNeeded: false,
    operationalConfirmationNeeded: false,
    readyToIndex: false,
    notes,
    ...overrides,
  } satisfies EditorialChecklist;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unwrapInline(value: string): string {
  return escapeHtml(value.trim()).replace(/`([^`]+)`/g, "$1");
}

function sectionSlice(markdown: string, startHeading: string, endHeading?: string) {
  const start = markdown.indexOf(startHeading);
  if (start === -1) return "";
  const from = markdown.slice(start + startHeading.length);
  if (!endHeading) return from.trim();
  const end = from.indexOf(endHeading);
  return (end === -1 ? from : from.slice(0, end)).trim();
}

function parseBlocks(section: string): ParsedBlock[] {
  const matches = [...section.matchAll(/^### (.+)$/gm)];
  return matches.map((match, index) => {
    const heading = match[1].trim();
    const start = match.index! + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index! : section.length;
    const body = section.slice(start, end).trim();
    return {
      heading,
      fields: parseLabeledFields(body),
    };
  });
}

function parseLabeledFields(block: string): Record<string, string> {
  const matches = [...block.matchAll(/^\*\*(.+?)\*\*\s*$/gm)];
  const out: Record<string, string> = {};
  for (let i = 0; i < matches.length; i += 1) {
    const label = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : block.length;
    out[label] = block.slice(start, end).trim();
  }
  return out;
}

function splitFaqPairs(raw: string | undefined): Array<{ question: string; answer: string }> {
  if (!raw) return [];
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const items: Array<{ question: string; answer: string }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith("- ")) continue;
    const question = lines[i].replace(/^- /, "").replace(/\s{2,}$/g, "").trim();
    const answer = lines[i + 1]?.replace(/\s{2,}$/g, "").trim() ?? "";
    items.push({ question, answer });
    i += 1;
  }
  return items;
}

function splitInternalLinks(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...raw.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean);
}

function paragraph(value: string | undefined) {
  if (!value) return "";
  return `<p>${unwrapInline(value)}</p>`;
}

function listFromSemicolons(value: string | undefined) {
  if (!value) return "";
  const items = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${unwrapInline(item)}</li>`).join("")}</ul>`;
}

function faqHtml(raw: string | undefined) {
  const items = splitFaqPairs(raw);
  if (items.length === 0) return "";
  return `<section><h2>Service-specific FAQ</h2>${items
    .map((item) => `<h3>${unwrapInline(item.question)}</h3><p>${unwrapInline(item.answer)}</p>`)
    .join("")}</section>`;
}

function linksHtml(raw: string | undefined) {
  const links = splitInternalLinks(raw);
  if (links.length === 0) return "";
  return `<section><h2>Related services</h2><ul>${links
    .map((href) => `<li><a href="${escapeHtml(href)}">${escapeHtml(href)}</a></li>`)
    .join("")}</ul></section>`;
}

function buildServiceHtml(fields: Record<string, string>): string {
  return [
    "<section>",
    "<h2>Who this service is for</h2>",
    paragraph(fields["Who This Is For"]),
    "<h2>Common reasons to book</h2>",
    listFromSemicolons(fields["Common Reasons to Book"]),
    "<h2>What can be handled online</h2>",
    paragraph(fields["What Can Be Handled Online"]),
    "<h2>What cannot be handled online</h2>",
    paragraph(fields["What Cannot Be Handled Online"]),
    "<h2>Emergency warning</h2>",
    paragraph(fields["Emergency Warning"]),
    "<h2>Prescription, referral, and certificate boundaries</h2>",
    paragraph(fields["Prescription, Referral, and Certificate Boundaries"]),
    "<h2>What to prepare</h2>",
    listFromSemicolons(fields["What to Prepare"]),
    "<h2>Follow-up expectations</h2>",
    paragraph(fields["Follow-Up Expectations"]),
    "<h2>Price and duration notes</h2>",
    paragraph(fields["Price and Duration Notes"]),
    faqHtml(fields.FAQ),
    linksHtml(fields["Internal Links"]),
    "</section>",
  ].join("");
}

function buildBlogBody(fields: Record<string, string>): string {
  const body = fields.Body ?? "";
  const disclaimer = fields["Medical Disclaimer"] ?? "";
  const internalLinks = splitInternalLinks(fields["Internal links"]);
  const relatedServices = (fields["Related services"] ?? "")
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
  return [
    body,
    disclaimer ? `\n\nMedical disclaimer:\n${disclaimer}` : "",
    internalLinks.length > 0 ? `\n\nInternal links:\n${internalLinks.map((href) => `- ${href}`).join("\n")}` : "",
    relatedServices.length > 0
      ? `\n\nRelated services:\n${relatedServices.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

async function parsePlan() {
  const markdown = await readFile(planPath, "utf8");
  const serviceSection = sectionSlice(markdown, "## Ireland Service Drafts", "## Legal Content Readiness");
  const blogSection = sectionSlice(markdown, "## Blog Article Drafts", "## Service Page Draft Template");
  const countrySection = sectionSlice(markdown, "## Country Page Drafts", "## Doctor Profile Draft");
  const doctorSection = sectionSlice(markdown, "## Doctor Profile Draft", "## Blog Article Drafts");
  const pricingSection = sectionSlice(markdown, "## Pricing Content Draft", "## Country Page Drafts");
  return {
    services: parseBlocks(serviceSection),
    blogs: parseBlocks(blogSection),
    countries: parseBlocks(countrySection),
    doctor: parseBlocks(doctorSection)[0],
    pricing: parseLabeledFields(pricingSection),
  };
}

async function upsertCountryContentPages(
  prisma: PrismaClient,
  countryCode: string,
  fields: Record<string, string>,
) {
  const country = await prisma.country.findUnique({ where: { code: countryCode } });
  if (!country) return;
  await prisma.contentPage.upsert({
    where: {
      pageKey_locale_countryId: {
        pageKey: "country-home",
        locale: LocaleCode.EN,
        countryId: country.id,
      },
    },
    update: {
      title: fields.H1 ?? `${country.name} Online Medical Consultations`,
      body: fields["Availability Statement"] ?? "",
      seoTitle: fields["SEO Title"] ?? null,
      seoDescription: fields["SEO Description"] ?? null,
      status: PublishStatus.DRAFT,
      editorialChecklist: baseChecklist(
        {
          draft: true,
          editorialReviewNeeded: false,
          operationalConfirmationNeeded: true,
          readyToIndex: false,
        },
        [
          "Keep noindex until local roster, pricing, language support, and prescribing/referral workflows are confirmed.",
        ],
      ),
      isActive: true,
    },
    create: {
      countryId: country.id,
      pageKey: "country-home",
      title: fields.H1 ?? `${country.name} Online Medical Consultations`,
      body: [
        fields["Availability Statement"],
        fields["Supported Services Summary"],
        fields["Language Expectations"],
        fields["Pricing and Currency Notes"],
        fields["Prescription and Referral Limitations"],
        fields["Doctor Availability Notes"],
        fields["Booking Flow"],
        fields["Country FAQ"],
      ]
        .filter(Boolean)
        .join("\n\n"),
      locale: LocaleCode.EN,
      status: PublishStatus.DRAFT,
      seoTitle: fields["SEO Title"] ?? null,
      seoDescription: fields["SEO Description"] ?? null,
      editorialChecklist: baseChecklist(
        {
          draft: true,
          editorialReviewNeeded: false,
          operationalConfirmationNeeded: true,
          readyToIndex: false,
        },
        [
          "Keep noindex until local roster, pricing, language support, and prescribing/referral workflows are confirmed.",
        ],
      ),
      isActive: true,
    },
  });
}

async function upsertGlobalContentPage(
  prisma: PrismaClient,
  input: {
    pageKey: string;
    title: string;
    body: string;
    seoTitle: string | null;
    seoDescription: string | null;
    status: PublishStatus;
    lastReviewedAt?: Date | null;
    editorialChecklist: Prisma.InputJsonValue;
  },
) {
  const existing = await prisma.contentPage.findFirst({
    where: { pageKey: input.pageKey, locale: LocaleCode.EN, countryId: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.contentPage.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        body: input.body,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        status: input.status,
        lastReviewedAt: input.lastReviewedAt ?? null,
        editorialChecklist: input.editorialChecklist,
        isActive: true,
      },
    });
    return;
  }

  await prisma.contentPage.create({
    data: {
      pageKey: input.pageKey,
      locale: LocaleCode.EN,
      countryId: null,
      title: input.title,
      body: input.body,
      status: input.status,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      lastReviewedAt: input.lastReviewedAt ?? null,
      editorialChecklist: input.editorialChecklist,
      isActive: true,
    },
  });
}

export async function importEditorialPlan(prisma: PrismaClient) {
  const parsed = await parsePlan();
  const ireland = await prisma.country.findUnique({ where: { code: "ie" } });
  if (!ireland) return;

  for (const serviceBlock of parsed.services) {
    const mapping = irelandServiceMap[serviceBlock.heading];
    if (!mapping) continue;
    await prisma.service.updateMany({
      where: {
        countryId: ireland.id,
        slug: mapping.slug,
        kind: mapping.kind,
      },
      data: {
        name: serviceBlock.heading,
        summary: serviceBlock.fields["Hero Summary"] ?? null,
        seoTitle: serviceBlock.fields["SEO Title"] ?? null,
        seoDescription: serviceBlock.fields["SEO Description"] ?? null,
        heroTitle: serviceBlock.fields.H1 ?? serviceBlock.heading,
        heroDescription: serviceBlock.fields["Hero Summary"] ?? null,
        detailBody: buildServiceHtml(serviceBlock.fields),
        ctaLabel:
          mapping.kind === ServiceKind.SPECIALIST ? "Book specialist consultation" : "Book consultation",
        editorialChecklist: baseChecklist(
          {
            clinicalReviewNeeded: true,
            operationalConfirmationNeeded: true,
            readyToIndex: false,
          },
          [
            "Imported from editorial completion plan.",
            "Keep noindex until exact duration, starting price, currency, and final service scope are confirmed.",
          ],
        ),
        isActive: true,
      },
    });
  }

  if (parsed.doctor?.heading === "Dr. Khoiamul Islam") {
    const fields = parsed.doctor.fields;
    await prisma.doctor.updateMany({
      where: { countryId: ireland.id, slug: "dr-khoiamul-islam" },
      data: {
        fullName: fields["Display Name"]?.replace(/\.$/, "") ?? "Dr. Khoiamul Islam",
        title: fields.Title ?? "General Medicine",
        bio: fields["Patient-Facing Bio"] ?? null,
        seoTitle: fields["SEO Title"] ?? null,
        seoDescription: fields["SEO Description"] ?? null,
        languages: (fields.Languages ?? "English")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        qualifications: [],
        editorialChecklist: baseChecklist(
          {
            clinicalReviewNeeded: true,
            operationalConfirmationNeeded: true,
            readyToIndex: false,
          },
          [
            "Keep noindex until verified IMC number or public verification URL is added.",
          ],
        ),
        active: true,
      },
    });
  }

  const countryMap: Record<string, string> = {
    "Portugal Draft": "pt",
    "Spain Draft": "sp",
    "Czechia Draft": "cz",
    "Romania Draft": "rm",
  };
  for (const countryBlock of parsed.countries) {
    const code = countryMap[countryBlock.heading];
    if (!code) continue;
    await upsertCountryContentPages(prisma, code, countryBlock.fields);
  }

  await upsertGlobalContentPage(prisma, {
    pageKey: "plans-pricing",
    title: parsed.pricing.H1 ?? "Consultation Pricing and What to Expect",
    body: pricingBody(parsed.pricing),
    seoTitle: parsed.pricing["SEO Title"] ?? null,
    seoDescription: parsed.pricing["SEO Description"] ?? null,
    status: PublishStatus.PUBLISHED,
    lastReviewedAt: new Date(),
    editorialChecklist: baseChecklist(
      {
        draft: false,
        readyToIndex: true,
      },
      ["Pricing copy imported from editorial completion plan."],
    ),
  });

  const legalPages = [
    {
      pageKey: "privacy-policy",
      title: "Privacy Policy",
      summary:
        "Explains what data is collected, why it is used, how long it is kept, and how patients can exercise their rights.",
    },
    {
      pageKey: "terms-and-conditions",
      title: "Terms and Conditions",
      summary:
        "Explains the rules for using the site, booking services, payment, cancellations, and acceptable use.",
    },
    {
      pageKey: "refund-and-return-policy",
      title: "Return and Refund Policy",
      summary:
        "Explains consultation cancellation terms, eligibility for refunds, and any exceptions.",
    },
    {
      pageKey: "legal-notices",
      title: "Legal Notices",
      summary:
        "States the site owner, contact details, intellectual property notices, and required legal disclosures.",
    },
  ];

  for (const page of legalPages) {
    await upsertGlobalContentPage(prisma, {
      pageKey: page.pageKey,
      title: page.title,
      body: `${page.summary}\n\nLast updated: [to be confirmed by legal team]\nLegal entity: [to be confirmed by legal team]`,
      seoTitle: page.title,
      seoDescription: page.summary,
      status: PublishStatus.DRAFT,
      editorialChecklist: baseChecklist(
        {
          draft: true,
          legalReviewNeeded: true,
          readyToIndex: false,
        },
        ["Keep pending until legal entity, jurisdiction, and effective date are confirmed."],
      ),
    });
  }

  for (const blog of parsed.blogs) {
    await prisma.blogPost.upsert({
      where: {
        slug_locale_countryId: {
          slug: blog.fields.Slug,
          locale: LocaleCode.EN,
          countryId: ireland.id,
        },
      },
      update: {
        title: blog.fields.Title,
        excerpt: blog.fields.Excerpt ?? null,
        body: buildBlogBody(blog.fields),
        category: blog.fields.Category ?? null,
        authorDisplayName: blog.fields.Author ?? null,
        reviewerDisplayName: null,
        seoTitle: blog.fields["SEO Title"] ?? null,
        seoDescription: blog.fields["SEO Description"] ?? null,
        lastReviewedAt: null,
        status: PublishStatus.DRAFT,
        editorialChecklist: baseChecklist(
          {
            draft: true,
            clinicalReviewNeeded: true,
            readyToIndex: false,
          },
          ["Keep draft/noindex until reviewer and final review date are added."],
        ),
        isActive: true,
      },
      create: {
        countryId: ireland.id,
        slug: blog.fields.Slug,
        title: blog.fields.Title,
        excerpt: blog.fields.Excerpt ?? null,
        body: buildBlogBody(blog.fields),
        locale: LocaleCode.EN,
        category: blog.fields.Category ?? null,
        authorDisplayName: blog.fields.Author ?? null,
        reviewerDisplayName: null,
        seoTitle: blog.fields["SEO Title"] ?? null,
        seoDescription: blog.fields["SEO Description"] ?? null,
        lastReviewedAt: null,
        status: PublishStatus.DRAFT,
        editorialChecklist: baseChecklist(
          {
            draft: true,
            clinicalReviewNeeded: true,
            readyToIndex: false,
          },
          ["Keep draft/noindex until reviewer and final review date are added."],
        ),
        isActive: true,
      },
    });
  }
}

function pricingBody(fields: Record<string, string>) {
  return [
    fields.Intro,
    fields["Refund and Cancellation Notes"],
    fields["Prescription and Referral Notes"],
    fields.FAQ,
    fields["CTA Copy"],
  ]
    .filter(Boolean)
    .join("\n\n");
}
