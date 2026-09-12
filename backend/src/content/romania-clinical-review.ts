import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
type Row = { id: string; [key: string]: unknown };
type Query = (sql: string, values: unknown[]) => Promise<Row[]>;

type Snapshot = Awaited<ReturnType<typeof readRomaniaContent>>;
const copyFields = ['name', 'summary', 'seoTitle', 'seoDescription', 'heroTitle', 'heroDescription', 'detailBody', 'ctaLabel'];
const doctorFields = ['fullName', 'title', 'bio', 'seoTitle', 'seoDescription', 'qualifications'];
const select = (row: Row, fields: string[]) => Object.fromEntries(fields.map(key => [key, row[key] ?? null]));
const sorted = (rows: unknown[]) => rows.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Compare clinical content, not timestamps, generated FAQ IDs, contact or booking data. */
export function romanianContentStates(s: Snapshot): Record<string, string> {
  const states: Record<string, string> = {};
  for (const service of s.services) {
    const faqs = s.serviceFaqs.filter(f => f.serviceId === service.id);
    const links = s.serviceLinks.filter(l => l.sourceServiceId === service.id);
    states[`service:${service.id}`] = digest({
      base: select(service, ['countryId', ...copyFields]),
      translations: sorted(s.serviceTranslations.filter(t => t.serviceId === service.id).map(t => select(t, ['locale', ...copyFields]))),
      faqs: sorted(faqs.map(f => ({ ...select(f, ['question','answer','sortOrder','isVisible']), translations: sorted(s.serviceFaqTranslations.filter(t => t.serviceFaqId === f.id).map(t => select(t, ['locale','question','answer']))) }))),
      links: sorted(links.map(l => ({ ...select(l, ['targetServiceId','targetHref','type','priority','isActive','anchorSlot']), translations: sorted(s.serviceLinkTranslations.filter(t => t.serviceLinkId === l.id).map(t => select(t, ['locale','heading','body','ctaLabel']))) }))),
    });
  }
  for (const doctor of s.doctors) {
    const markets = s.doctorCountries.filter(m => m.doctorId === doctor.id);
    states[`doctor:${doctor.id}`] = digest({
      base: select(doctor, ['countryId', ...doctorFields]),
      translations: sorted(s.doctorTranslations.filter(t => t.doctorId === doctor.id).map(t => select(t, ['locale', ...doctorFields.slice(1,5)]))),
      markets: sorted(markets.map(m => ({ ...select(m, ['countryId','chamberEntity','registrationNumber','registrationUrl','division','isVerified']), translations: sorted(s.doctorMarketTranslations.filter(t => t.doctorCountryId === m.id).map(t => select(t, ['locale','title','bio','seoTitle','seoDescription','seoKeywords']))) }))),
      faqs: sorted(s.doctorFaqs.filter(f => f.doctorId === doctor.id).map(f => select(f, ['locale','question','answer','category','sortOrder','isActive']))),
    });
  }
  return states;
}

export class RomaniaClinicalApprovalRequiredError extends Error {
  readonly statusCode = 409;
  constructor(key: string) {
    super(`Romanian clinical content requires approval of this exact revision (${key}).`);
    this.name = 'RomaniaClinicalApprovalRequiredError';
  }
}

// Owner-reported Dr Robert Gabriel Brindus approval, 2026-09-13.
// Evidence: seo/romania/clinical-approval-2026-09-13.json. Values below are derived
// from the reviewed 20-group manifest, including retained fields and hidden rows.
export const APPROVED_ROMANIA_STATES: Record<string, string[]> = {
  "doctor:cmrc4gtzl00s901p2yh3ukaox": [
    "446ea2aee67953f30b2cfbb3e69597b072d82fe1c67425f393e197b9959e4660"
  ],
  "doctor:cmrc4j7oc00se01p2gf7y9ldw": [
    "e7c7e85b2368951d51e8976fb1e016b74639135dab53d3c46876da86d58866eb"
  ],
  "service:cmr8ee87d000ifsjuydqk0htg": [
    "3c4e595c46143d395d52820b75cb143264d5e68cb7d0afdf9565aa80e19e041a"
  ],
  "service:cmr8ee8lf000jfsju7gwzzohg": [
    "dd6732c0094f7dd47c5dd1b59d552c6a6291783897c669fdff51c7c2c953e9f8"
  ],
  "doctor:cmrc4axni00rn01p2n3r2bopf": [
    "53ba6c57f4977950e5da4c8da8775eaac16bfdc8659d796c98ea7851f3a05899"
  ],
  "service:cmr8ee69c000dfsju48a77n99": [
    "a1f00fd665df42253ffd2e6ee7f405a90a09f08add60ac9154f97d6c59c0969e"
  ],
  "service:cmr8ee6nb000efsjuk0bbcp7f": [
    "e47ccdc9f378bfe47333108a26305d9a0d40f79c2bf9ab1f2cff1e66d821dc1e"
  ],
  "service:cmr8ee5ha000bfsju94p8e37o": [
    "53a90fc61701ba3b14b951b6dd58ccf0b74a437d7129b69861da54dc19710f44"
  ],
  "service:cmr8ee4p90009fsju5xgwdoao": [
    "06f03ab7528108e94021c4c7e7dd0ea433a80479e3f48e8ce0afd76d28cf90d8"
  ],
  "service:cmr8ee3510005fsjunqgfmxn2": [
    "5f357e6fad8c7aa107e4fad4c36f1c7e064870bc465958c6d033603d9f5d029d"
  ],
  "service:cmr8ee5va000cfsju0urkl4di": [
    "840bbda69e7d348776770a4f50419091ce33e4cab028112fef37dba5c8605c19"
  ],
  "service:cmr8ee1ko0000fsjuh80zxo7q": [
    "7fbd5b2dc4ac025e13310204292b6330167852af0ad94e46336617b56ecb923d",
    "e10b9e7fc7f0ba650a9fd87848dd1447b3d0d52ac8d7bfbcee5c3cb31cdac137"
  ],
  "service:cmr8ee7fb000gfsjuxxgacs5y": [
    "5a0b301d54085f2ca10f15b4939a5092eb5e9548962a6e35468deb68fa98b138"
  ],
  "service:cmr8ee53a000afsjukz2fq2rv": [
    "5197b8a3c348d3552c2b45754fa2fce7a4cd9b2cffb05aeb9a454f12685b5b43"
  ],
  "service:cmr8ee2r00004fsjubgjloy9a": [
    "a7e6fba2de490cb732dda470a6ebb52a20293118cc4ce650c89d6203d25357b7"
  ],
  "service:cmr8ee4ba0008fsju6xyj8lnh": [
    "6a3fd473984cb32ee3f1b652c43ecdaed0ec85230cb4405199dc59df10e8d563"
  ],
  "service:cmr8ee3j30006fsju24727btu": [
    "3de556f149b201135d6273ccb63d059cf803486cf50c830967fe95c482c240a1"
  ],
  "service:cmr8ee3x70007fsju2pfu3ygw": [
    "f575f4a71977a79903db99fa83c0f77847152009492839c6877a2c28410fb32c"
  ],
  "service:cmr8ee71b000ffsju3t9my2rm": [
    "e8b78c84d990097d43687f9a07cebbb53880c4b0a3dbcb6147fafe0f8f3a5bdd"
  ]
};

export function assertRomaniaClinicalChanges(before: Snapshot, after: Snapshot): void {
  const previous = romanianContentStates(before), next = romanianContentStates(after);
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    if (previous[key] === next[key]) continue;
    if (!next[key] || !APPROVED_ROMANIA_STATES[key]?.includes(next[key])) throw new RomaniaClinicalApprovalRequiredError(key);
    const reviewer = after.doctors.find(d => d.id === 'cmrc4axni00rn01p2n3r2bopf');
    if (!reviewer?.active || !after.doctorCountries.some(c => c.doctorId === reviewer.id && c.countryId === after.country.id && c.active && c.isVerified)) {
      throw new RomaniaClinicalApprovalRequiredError('reviewer registration is no longer active/verified');
    }
  }
}

/** Gate the actual resulting rows inside the writer's transaction. */
export function reviewedRomaniaTransaction<T>(
  client: Pick<PrismaClient, '$transaction'>,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { maxWait?: number; timeout?: number } = {},
): Promise<T> {
  return client.$transaction(async tx => {
    if (!await tx.country.findUnique({ where: { code: 'ro' }, select: { id: true } })) return work(tx);
    // ponytail: full Romania catalogue on low-volume CMS writes; scope by entity if admin throughput grows.
    const query: Query = (sql, values) => tx.$queryRawUnsafe<Row[]>(sql, ...values);
    const before = await readRomaniaContent(query);
    const result = await work(tx);
    assertRomaniaClinicalChanges(before, await readRomaniaContent(query));
    return result;
  }, { maxWait: 10000, timeout: 30000, ...options, isolationLevel: 'Serializable' });
}

export async function readRomaniaContent(query: Query) {
  const rows = (sql: string, values: unknown[] = []) => query(sql, values);
  const [country] = await rows('SELECT id, code, slug, "defaultLocale", "isActive" FROM "Country" WHERE code = $1', ['ro']);
  if (!country || country.slug !== 'romania') throw new Error('Romania country mismatch');
  const services = await rows('SELECT * FROM "Service" WHERE "countryId" = $1 ORDER BY id', [country.id]);
  const ids = services.map(s => s.id);
  const serviceTranslations = await rows('SELECT * FROM "ServiceTranslation" WHERE "serviceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const serviceFaqs = await rows('SELECT * FROM "ServiceFaq" WHERE "serviceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const serviceFaqTranslations = await rows('SELECT * FROM "ServiceFaqTranslation" WHERE "serviceFaqId" = ANY($1::text[]) ORDER BY id', [serviceFaqs.map(f => f.id)]);
  const assignments = await rows('SELECT * FROM "ServiceDoctor" WHERE "serviceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const doctors = await rows(`SELECT id, "countryId", slug, "fullName", title, bio, "seoTitle", "seoDescription", languages, qualifications,
    active, "lastReviewedAt", "bookingPausedFrom", "bookingPausedUntil", "updatedAt" FROM "Doctor"
    WHERE "countryId" = $1 OR id IN (SELECT "doctorId" FROM "DoctorCountry" WHERE "countryId" = $1)
    OR id = ANY($2::text[]) ORDER BY id`, [country.id, assignments.map(a => a.doctorId)]);
  const doctorIds = doctors.map(d => d.id);
  const doctorCountries = await rows(`SELECT id, "doctorId", "countryId", active, "chamberEntity", "registrationNumber", "registrationUrl", division, "isVerified"
    FROM "DoctorCountry" WHERE "doctorId" = ANY($1::text[]) ORDER BY id`, [doctorIds]);
  const doctorTranslations = await rows('SELECT * FROM "DoctorTranslation" WHERE "doctorId" = ANY($1::text[]) ORDER BY id', [doctorIds]);
  const doctorMarketTranslations = await rows('SELECT * FROM "DoctorMarketTranslation" WHERE "doctorCountryId" = ANY($1::text[]) ORDER BY id', [doctorCountries.map(d => d.id)]);
  const doctorFaqs = await rows('SELECT * FROM "DoctorFaq" WHERE "doctorId" = ANY($1::text[]) ORDER BY id', [doctorIds]);
  const countryLocales = await rows('SELECT * FROM "CountryLocale" WHERE "countryId" = $1 ORDER BY id', [country.id]);
  const allDoctorAssignments = await rows('SELECT * FROM "ServiceDoctor" WHERE "doctorId" = ANY($1::text[]) ORDER BY id', [doctorIds]);
  const serviceLinks = await rows('SELECT * FROM "ServiceLink" WHERE "sourceServiceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const serviceLinkTranslations = await rows('SELECT * FROM "ServiceLinkTranslation" WHERE "serviceLinkId" = ANY($1::text[]) ORDER BY id', [serviceLinks.map(l => l.id)]);
  return { country, countryLocales, services, serviceTranslations, serviceFaqs, serviceFaqTranslations, assignments, doctors, doctorCountries, doctorTranslations, doctorMarketTranslations, doctorFaqs, allDoctorAssignments, serviceLinks, serviceLinkTranslations };
}
