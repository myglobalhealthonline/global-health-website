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

type SpainApproval = { stateSha256: string; reviewerDoctorId: string; reviewedAt: string; evidence: string };
// Review-age policy chosen by the owner on 2026-09-14 (ledger §56.4). Approved states stay
// empty until the named reviewer approves exact state hashes from the Spain manifest.
export const SPAIN_REVIEW_POLICY: { maxAgeDays: number | null } = { maxAgeDays: 365 };
export const APPROVED_SPAIN_STATES: Record<string, SpainApproval[]> = {};
export const BRAZIL_REVIEW_POLICY: { maxAgeDays: number | null } = { maxAgeDays: null };
export const APPROVED_BRAZIL_STATES: Record<string, SpainApproval[]> = {};
export const assertSpainClinicalChanges = (before: Snapshot, after: Snapshot, now = Date.now()) => assertReviewedChanges(before, after, 'Spain', SPAIN_REVIEW_POLICY, APPROVED_SPAIN_STATES, now);
export const assertBrazilClinicalChanges = (before: Snapshot, after: Snapshot, now = Date.now()) => assertReviewedChanges(before, after, 'Brazil', BRAZIL_REVIEW_POLICY, APPROVED_BRAZIL_STATES, now);
function assertReviewedChanges(before: Snapshot, after: Snapshot, market: string, policy: { maxAgeDays: number | null }, approvals: Record<string, SpainApproval[]>, now: number): void {
  const previous = romanianContentStates(before), next = romanianContentStates(after);
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    if (previous[key] === next[key]) continue;
    const age = policy.maxAgeDays;
    const valid = Number.isFinite(age) && age !== null && age > 0 && next[key] && approvals[key]?.some(a => {
      const date = Date.parse(a.reviewedAt);
      return a.stateSha256 === next[key] && a.evidence.trim() && Number.isFinite(date) && date <= now && now - date <= age * 86400000
        && after.doctors.some(d => d.id === a.reviewerDoctorId && d.active)
        && after.doctorCountries.some(c => c.doctorId === a.reviewerDoctorId && c.countryId === after.country.id && c.active && c.isVerified);
    });
    if (!valid) {
      const error = new RomaniaClinicalApprovalRequiredError(key);
      error.message = `${market} clinical content requires approval of this exact revision and a current review policy (${key}).`;
      throw error;
    }
  }
}

// Owner-reported Dr Robert Gabriel Brindus approval, 2026-09-13.
// Evidence: seo/romania/clinical-approval-2026-09-13.json. Values below are derived
// from the reviewed 20-group manifest, including retained fields and hidden rows.
// Additional editorial states use the super admin's reported verbal approvals
// and rewrite/publication authorization in editorial-publication-authorization-2026-09-13.json.
export const APPROVED_ROMANIA_STATES: Record<string, string[]> = {
  "doctor:cmrc4gtzl00s901p2yh3ukaox": [
    "446ea2aee67953f30b2cfbb3e69597b072d82fe1c67425f393e197b9959e4660",
    "c60003b755bc078cc04515d5bda4e7077a3e826ebe7795e0d687b32e0fb75bc4"
  ],
  "doctor:cmrc4j7oc00se01p2gf7y9ldw": [
    "e7c7e85b2368951d51e8976fb1e016b74639135dab53d3c46876da86d58866eb",
    "4a3c123f3306284baf02d11d3630384c3964b6eec86aa2f9a0cc374efa87f11f"
  ],
  "service:cmr8ee87d000ifsjuydqk0htg": [
    "3c4e595c46143d395d52820b75cb143264d5e68cb7d0afdf9565aa80e19e041a",
    "e52d5b0e367f0e1581f45de330cf7dcbd64a6daff1e28724b4986159415f04de",
    "94910c5661507cf1539386682c34e80ad6c5db7b392958aac13aaea6ffd46849"
  ],
  "service:cmr8ee8lf000jfsju7gwzzohg": [
    "dd6732c0094f7dd47c5dd1b59d552c6a6291783897c669fdff51c7c2c953e9f8",
    "9d416d603c3cbdaf55ee1af2d2f8a9233ddf488123dea679364b3970e02d550c",
    "cf07f5cb146a21555457a9d0de86b6dbef933559b3dd42e1446ee68b7022efc4"
  ],
  "doctor:cmrc4axni00rn01p2n3r2bopf": [
    "53ba6c57f4977950e5da4c8da8775eaac16bfdc8659d796c98ea7851f3a05899",
    "50cc5a9630fa6ebe771ccf44fa12b12eee424e49dc637cdf048803472ddece69"
  ],
  "service:cmr8ee69c000dfsju48a77n99": [
    "a1f00fd665df42253ffd2e6ee7f405a90a09f08add60ac9154f97d6c59c0969e",
    "f4440e6d6d581ddf1d818774c5510885c6e936ee8b161e0598d069aae07d078c",
    "970d1ea686bd5d683474578c304d9f5f8ae9fa7890f77e48ca3d8edbef243bdb"
  ],
  "service:cmr8ee6nb000efsjuk0bbcp7f": [
    "e47ccdc9f378bfe47333108a26305d9a0d40f79c2bf9ab1f2cff1e66d821dc1e",
    "57f19f6368b86200a1cf571a4a8ac7c3f17e5abc8279b4d1ee5780f104433092",
    "872744315b76958fcadcaf335f67b94bfc9b5993c86d62a005878c5a7db6e84c"
  ],
  "service:cmr8ee5ha000bfsju94p8e37o": [
    "53a90fc61701ba3b14b951b6dd58ccf0b74a437d7129b69861da54dc19710f44",
    "6df8fd85ed7685e7dc7c374401a39c4c5c99e90a40b553778f92c28b48f20224",
    "dd199b417208205db3cf2bfaeeea283d663fd5267480bd1cac010ef614968cc8"
  ],
  "service:cmr8ee4p90009fsju5xgwdoao": [
    "06f03ab7528108e94021c4c7e7dd0ea433a80479e3f48e8ce0afd76d28cf90d8",
    "76e331edd72d71d9e86417c514a70ed6f65130e1ba2daf68b046b1d803b18185",
    "d26fab74f9a067b705a0c992feb4d2b9804e93cb2e5388997de05270914504aa"
  ],
  "service:cmr8ee3510005fsjunqgfmxn2": [
    "5f357e6fad8c7aa107e4fad4c36f1c7e064870bc465958c6d033603d9f5d029d",
    "27e0d8b5f5a449a76dbbc86657d90004221c3c5d0e07fa5c552738461a09bdf5",
    "70e82fd58d4810279645a222755d17452d09eaea0359766bed50fc2a3e9d5ae3"
  ],
  "service:cmr8ee5va000cfsju0urkl4di": [
    "840bbda69e7d348776770a4f50419091ce33e4cab028112fef37dba5c8605c19",
    "4e9a118e19504a8473280bfdbe09f0868f515f64db556a1de26b3bd020f92bb3",
    "dc7de73c22569e058e0d2417480e1a4ce9035879693d9b47f45b19bd67eb9d17"
  ],
  "service:cmr8ee1ko0000fsjuh80zxo7q": [
    "7fbd5b2dc4ac025e13310204292b6330167852af0ad94e46336617b56ecb923d",
    "e10b9e7fc7f0ba650a9fd87848dd1447b3d0d52ac8d7bfbcee5c3cb31cdac137",
    "3d211da6b75bd68e02338a20e026974e22e5b50b012f1705148b53c89925ffc2",
    "ad973fc345be6aa02e3e5c5247fdb314004246997748d6f5c78ce0557453a7e8"
  ],
  "service:cmr8ee7fb000gfsjuxxgacs5y": [
    "5a0b301d54085f2ca10f15b4939a5092eb5e9548962a6e35468deb68fa98b138",
    "51c4b9c0d23d435c531f78520bbc8282c80193c03e1b5472372a8bd37c24caae",
    "892d4963ac8388a8a4c6f87ad65f6a5d03cd59b596847a498b93d18cc08e8657"
  ],
  "service:cmr8ee53a000afsjukz2fq2rv": [
    "5197b8a3c348d3552c2b45754fa2fce7a4cd9b2cffb05aeb9a454f12685b5b43",
    "5d6f86d9036795338ded93aa8bfaa2563063b2bf5d4e2b449f26e0041490f6c7",
    "5964789b8374939c8359f82ee981f0222cadb3494afdd76c35861570d9d4b25b"
  ],
  "service:cmr8ee2r00004fsjubgjloy9a": [
    "a7e6fba2de490cb732dda470a6ebb52a20293118cc4ce650c89d6203d25357b7",
    "d1975de2f83a082b91b8db73638b4df4ccf0ddc86300b3db11ca5aa4d6f8ba33",
    "c89c98f6947a62ad9f9fa5f4f199838df6c2c7bc5ef1e9e34a8f18d0fbd716f6"
  ],
  "service:cmr8ee4ba0008fsju6xyj8lnh": [
    "6a3fd473984cb32ee3f1b652c43ecdaed0ec85230cb4405199dc59df10e8d563",
    "33d1be747504ae61a3bb41b5f90397d9b6d782d7c173bbb5d150b8118e46e57b",
    "a05f6f2f9a70bb834c9ee6e54505aeabb72b8a47f2d99b6e016e6ef183111c5e"
  ],
  "service:cmr8ee3j30006fsju24727btu": [
    "3de556f149b201135d6273ccb63d059cf803486cf50c830967fe95c482c240a1",
    "2b37e6651172a57a8f23893c91d43c76e255695332a37969b3eddc90760b76b2",
    "afeb267a356528e3de0a728d4f498cfdac0da946976925ceb3f99d5308dfa364"
  ],
  "service:cmr8ee3x70007fsju2pfu3ygw": [
    "f575f4a71977a79903db99fa83c0f77847152009492839c6877a2c28410fb32c",
    "e0ab0f36b9e8d8fa1a0cd649d1e9d6499f40f57319c69e86f46097b99b216544",
    "371844a1ec77a7c68f56936e48906335991eb2ce43bc8896659663dddc8bf056"
  ],
  "service:cmr8ee71b000ffsju3t9my2rm": [
    "e8b78c84d990097d43687f9a07cebbb53880c4b0a3dbcb6147fafe0f8f3a5bdd",
    "b275b221cb0c32c098d8de7814a7470705ea03d81602b8ce4607f99fbb49654b",
    "20d72c254cbf55ec47f7f594fad2e378bb3f0de2a995d5458ccee14a92bda622"
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
    // ponytail: full reviewed-country catalogues on low-volume CMS writes; scope by entity if admin throughput grows.
    const query: Query = (sql, values) => tx.$queryRawUnsafe<Row[]>(sql, ...values);
    const before = await tx.country.findUnique({ where: { code: 'ro' }, select: { id: true } }) ? await readRomaniaContent(query) : null;
    const spain = await tx.country.findUnique({ where: { code: 'es' }, select: { id: true } }) ? await readCountryClinicalContent(query, 'es', 'spain') : null;
    const brazil = await tx.country.findUnique({ where: { code: 'br' }, select: { id: true } }) ? await readCountryClinicalContent(query, 'br', 'brazil') : null;
    const result = await work(tx);
    if (before) assertRomaniaClinicalChanges(before, await readRomaniaContent(query));
    if (spain) assertSpainClinicalChanges(spain, await readCountryClinicalContent(query, 'es', 'spain'));
    if (brazil) assertBrazilClinicalChanges(brazil, await readCountryClinicalContent(query, 'br', 'brazil'));
    return result;
  }, { maxWait: 10000, timeout: 30000, ...options, isolationLevel: 'Serializable' });
}

export async function readRomaniaContent(query: Query) {
  return readCountryClinicalContent(query, 'ro', 'romania');
}

/** Shared content-only snapshot, including every market of associated doctors. */
export async function readCountryClinicalContent(query: Query, code: string, slug: string) {
  const rows = (sql: string, values: unknown[] = []) => query(sql, values);
  const [country] = await rows('SELECT id, code, slug, "defaultLocale", "isActive" FROM "Country" WHERE code = $1', [code]);
  if (!country || country.slug !== slug) throw new Error('Clinical snapshot country mismatch');
  const serviceProjection = ['es', 'br'].includes(code) ? 'id, "countryId", kind, slug, name, summary, "seoTitle", "seoDescription", "seoKeywords", "heroTitle", "heroDescription", "detailBody", "ctaLabel", "sortOrder", "durationMinutes", "basePriceCents", "currencyCode", "isActive", visibility, "bookingPausedFrom", "bookingPausedUntil", "lastReviewedAt", "updatedAt"' : '*';
  const services = await rows(`SELECT ${serviceProjection} FROM "Service" WHERE "countryId" = $1 ORDER BY id`, [country.id]);
  const ids = services.map(s => s.id);
  const serviceTranslations = await rows('SELECT * FROM "ServiceTranslation" WHERE "serviceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const serviceFaqs = await rows('SELECT * FROM "ServiceFaq" WHERE "serviceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const serviceFaqTranslations = await rows('SELECT * FROM "ServiceFaqTranslation" WHERE "serviceFaqId" = ANY($1::text[]) ORDER BY id', [serviceFaqs.map(f => f.id)]);
  const assignmentProjection = ['es', 'br'].includes(code) ? 'id, "serviceId", "doctorId", "isActive", "sortOrder", "selectedBy", status, "createdAt", "updatedAt"' : '*';
  const assignments = await rows(`SELECT ${assignmentProjection} FROM "ServiceDoctor" WHERE "serviceId" = ANY($1::text[]) ORDER BY id`, [ids]);
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
  const allDoctorAssignments = await rows(`SELECT ${assignmentProjection} FROM "ServiceDoctor" WHERE "doctorId" = ANY($1::text[]) ORDER BY id`, [doctorIds]);
  const serviceLinks = await rows('SELECT * FROM "ServiceLink" WHERE "sourceServiceId" = ANY($1::text[]) ORDER BY id', [ids]);
  const serviceLinkTranslations = await rows('SELECT * FROM "ServiceLinkTranslation" WHERE "serviceLinkId" = ANY($1::text[]) ORDER BY id', [serviceLinks.map(l => l.id)]);
  return { country, countryLocales, services, serviceTranslations, serviceFaqs, serviceFaqTranslations, assignments, doctors, doctorCountries, doctorTranslations, doctorMarketTranslations, doctorFaqs, allDoctorAssignments, serviceLinks, serviceLinkTranslations };
}
