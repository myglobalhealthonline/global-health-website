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
// Owner-reported verbal approval, ledger §56.6; bound to manifest 8846503c… group states.
export const APPROVED_SPAIN_STATES: Record<string, SpainApproval[]> = {
  "service:cmrf0qzdm00qd01qrfcfnsjmx": [
    {
      "stateSha256": "5cc4f91eee2b80b6ac9bb50dd7b69bf3441aa023ed2444feda0908eb2a2028d8",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "f993d1587da031467c577c0abe054ec7ed727c285bc67df7e0827dfc8fbe0548",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T16:39:47.837Z",
      "evidence": "verbal, reported by the owner: super admin chose in chat on 2026-09-14 \"Dra. Ocampo, approved now\" for the phase-5 copy (Dr. Leandro Wang services and profile without specialist claims, owner confirmed he is a General Medicine Physician; EN GP hero and CS skin same-day/no-waiting promises removed) applied as phase-5 manifest 76e364744cac04a366f5d512bc468f3904f4a32bb9b0f967297dabcb50fb4649. No written record."
    }
  ],
  "doctor:cmrdpx4ah001r01rupv1od828": [
    {
      "stateSha256": "610ad9aae8449cad7757fd5145b1fb343802e5f7ad179d16d52ef052776903cd",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "ea76973d3eaa75682f34fcd380892eb37d20eb115d925b72d97047ef74e6f8cb",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T16:39:47.837Z",
      "evidence": "verbal, reported by the owner: super admin chose in chat on 2026-09-14 \"Dra. Ocampo, approved now\" for the phase-5 copy (Dr. Leandro Wang services and profile without specialist claims, owner confirmed he is a General Medicine Physician; EN GP hero and CS skin same-day/no-waiting promises removed) applied as phase-5 manifest 76e364744cac04a366f5d512bc468f3904f4a32bb9b0f967297dabcb50fb4649. No written record."
    },
    {
      "stateSha256": "a64999c1fd2bb812cb275d9d19eb45ff41a432e1dc84abf4e41a7db701c2be1a",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T17:17:33.611Z",
      "evidence": "verbal, reported by the owner: super admin chose in chat on 2026-09-14 \"Dra. Ocampo, approved now\" for the phase-6 copy (Dr. Leandro Wang services and profile without specialist claims, owner confirmed he is a General Medicine Physician; EN GP hero and CS skin same-day/no-waiting promises removed) applied as phase-6 manifest cda73159eba0d46f493b63fb139a1d8dd68d4d80e28becc36341c9ea260e3014. No written record."
    }
  ],
  "service:cmrf0phum00qa01qr0xkpwhhf": [
    {
      "stateSha256": "51e726f859d93d901829ff69db390ca0b4b4e0890bdb4d0248468f3dc132129c",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "c4be63e0fe36fd2b61e3f22b9f65b4b6324f79f6c7fc9b93aa7b983b68936c34",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T16:39:47.837Z",
      "evidence": "verbal, reported by the owner: super admin chose in chat on 2026-09-14 \"Dra. Ocampo, approved now\" for the phase-5 copy (Dr. Leandro Wang services and profile without specialist claims, owner confirmed he is a General Medicine Physician; EN GP hero and CS skin same-day/no-waiting promises removed) applied as phase-5 manifest 76e364744cac04a366f5d512bc468f3904f4a32bb9b0f967297dabcb50fb4649. No written record."
    }
  ],
  "service:cmrezwush00pq01qrtoq51csl": [
    {
      "stateSha256": "6e9365d005cb294e34dce7490a05bb0b8e9e6bbcd2e8dd5ff1cd85e3e6881ea9",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    }
  ],
  "doctor:cmrdpted5001901ru0wk0ncnd": [
    {
      "stateSha256": "d210998f37da0758cf01c353b0a79a042d16db07c09003fda87270c858d2645c",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "486110d50666f6ad4e0eeda1c3fbc6213acceaf3e3c0170625f8f53dc877e691",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    }
  ],
  "service:cmrezuq7000pn01qrkiyrthxw": [
    {
      "stateSha256": "70718d32da5f4a5fca474753144b4144811320c4f32db8fb43d33c279c48fe48",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    }
  ],
  "doctor:cmrdpz5n3001z01rukg2lecs5": [
    {
      "stateSha256": "e7302591a004705b358853b3e5283660ad4f6434e09d95bddf7bce18495d6641",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    }
  ],
  "service:cmre7qdwm004pngjuoofudwu5": [
    {
      "stateSha256": "9c1c0d16c41cbf41eb0b25cb1a32bad0408b51743a9fb736ae169be9fe63c338",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "38e1974987fe1f49c9970d038406964bcb244c2105924d8a7680c51d40e641b0",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "doctor:cmrdppjf5000u01ru1ayu78k0": [
    {
      "stateSha256": "0312d9cd45f7449a76354d149066666852d30ff0cdb2c1e792acf810f02c6c16",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "4b302dd519873c84baa3b175b11e6a2d53f9698619924869068e83625c3801b4",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T19:29:31.514Z",
      "evidence": "reported by the owner: super admin stated in chat on 2026-09-15 that each country's clinical director reviews and approves service and doctor descriptions, and instructed \"trim them and apply\"; Spain clinical director Dra. María Fernanda Ocampo Mora. Applies to the SEO description trims (<=155 characters, six locales) in phase-7 manifest 5b189c761de1245bc5fc3a1c7dee9db468aeb294659cab0342fd4bebd389245f. No written record."
    }
  ],
  "service:cmre7qeyz0050ngjund1jqnhp": [
    {
      "stateSha256": "e138ce27eb0b8f91060fb8646ee9d2895d2e119071fe02752550192065725052",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "889d9db808a2f22c6b6d0bc87b832f64767b87623dae846f103bc7597438634f",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    },
    {
      "stateSha256": "ace6256ee4de7af27b472cfc98ef71fd93d68c736e22b4a82e12601a3323ff54",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    },
    {
      "stateSha256": "984e464010045b072f7f4819c27e028ba3e9114b91eb9de72d3ed0fb72bf9b0a",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T19:29:31.514Z",
      "evidence": "reported by the owner: super admin stated in chat on 2026-09-15 that each country's clinical director reviews and approves service and doctor descriptions, and instructed \"trim them and apply\"; Spain clinical director Dra. María Fernanda Ocampo Mora. Applies to the SEO description trims (<=155 characters, six locales) in phase-7 manifest 5b189c761de1245bc5fc3a1c7dee9db468aeb294659cab0342fd4bebd389245f. No written record."
    }
  ],
  "doctor:cmrdpvch9001i01ruy7pmzmdk": [
    {
      "stateSha256": "966aa9c5d33a3b364a4e9de6801e0c8105a2cbe2845bd2885a33e7864fcf7982",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    }
  ],
  "service:cmre7qbti0042ngjumicur4m2": [
    {
      "stateSha256": "a4c6a760191c1528f5dbbc7bcda485c68096b17ce5c54a2aea82c81d3b15e0dc",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "f230825fad8f4bdf0fc23409882123acab74dd6f4cd427976e72fa41194c0cac",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "65989d07fee7a7eba5d505463cdbca24eecefae278d2c25f03fdab8cf72ce99f",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "doctor:cmrdpu7ro001e01ruc1ycm5n5": [
    {
      "stateSha256": "8e381c7100342f395dce69fe066a7301d8ec7ded97da61f5810bc8fb37b44b0d",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    }
  ],
  "doctor:cmrdpxpi0001v01ruqavjiq79": [
    {
      "stateSha256": "a1616ab574d2a47c640298c8d3329a5816bbc204c31684a71ac1d519d1b4a624",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "d2d440983ba9a8c82fb6921c7ec8d45c535cc4bea411f0fd2ccf897f928db2ff",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    }
  ],
  "doctor:cmrdq1nhe002b01ru2xmq0iab": [
    {
      "stateSha256": "00faea5e2f05d6597c67f1043d62f339eaaf1e88ea9d30828d1ae18cd9c2f9b3",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    }
  ],
  "doctor:cmrdpsayj001401ruyb4x1ze3": [
    {
      "stateSha256": "e31ed7b25cee5ebeaf078fb3b7a80287953d07cab016e3fe269643f5c6160ac8",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "c34fd7f741a87a71d92451247323b01589c0eddc9a323b2cc4ed14312a682a65",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    }
  ],
  "doctor:cmrdq2bu1002f01ru2g8317b6": [
    {
      "stateSha256": "1ef1afe2a1c7d4395c38619b5f3d7ded81231893d55f6529bd2a2ea6d7c00b80",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "1b046963f6de94d3db1fe64bf79c1245a3c267c9530f721c2054c67c10cdb563",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    }
  ],
  "doctor:cmrdq0tv2002701rupeh3nkyd": [
    {
      "stateSha256": "9f7cd229af2dbd29456d56ae38ddd457abaa6662e30d4e1af49fc4109c5a4225",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "f50a0cdd9f18e7c813ab87d3bd9f72814afeb2dde2bc679f486fc54f52f2e97d",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "4f3bacdaa61d2b2d8fc3f65848da16d3a2a92f2dea964de9c6af11b60cb0cd3f",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T19:29:31.514Z",
      "evidence": "reported by the owner: super admin stated in chat on 2026-09-15 that each country's clinical director reviews and approves service and doctor descriptions, and instructed \"trim them and apply\"; Spain clinical director Dra. María Fernanda Ocampo Mora. Applies to the SEO description trims (<=155 characters, six locales) in phase-7 manifest 5b189c761de1245bc5fc3a1c7dee9db468aeb294659cab0342fd4bebd389245f. No written record."
    }
  ],
  "service:cmre7qas1003sngjus0w2obwn": [
    {
      "stateSha256": "e9fc5d8446f7aa806b5804ed22a3c13799df515e65a748dea7747824a8dc2692",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "307a5efe5928494e33cc560d9405a2429e1f4d069fb84215c9a83632b8d805ca",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    },
    {
      "stateSha256": "795bb5fcf086c5e9de412bbf84026b31ebe04beb822a9baf522fb936168a785d",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T19:29:31.514Z",
      "evidence": "reported by the owner: super admin stated in chat on 2026-09-15 that each country's clinical director reviews and approves service and doctor descriptions, and instructed \"trim them and apply\"; Spain clinical director Dra. María Fernanda Ocampo Mora. Applies to the SEO description trims (<=155 characters, six locales) in phase-7 manifest 5b189c761de1245bc5fc3a1c7dee9db468aeb294659cab0342fd4bebd389245f. No written record."
    }
  ],
  "service:cmre7q9p1003ingjuum9voxoc": [
    {
      "stateSha256": "7f119541051d4dca4958a7b14c0d82c0af77e0e0361742813f57331826ceff8e",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "e75a89878656d75c83399bc2c616093d8ba9796a8537071430318a75fd8345fe",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "452f97d235a98f84e1c1f500d58c5fcfc31dfdf4bc616ad57c7f2089ec20a436",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7q8mg0037ngjuso41eynq": [
    {
      "stateSha256": "cf79ada7dbfa95a8637b671cbe9e1fdb32229795e30ba0f5c9e4df37dbdbc61c",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "b5e27e6b152f5bc7cbf8c76fac458db40d4fd6d939bd97839a50af806f39062a",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7qg1l005cngjub14ciym5": [
    {
      "stateSha256": "8cffaec7c0996960123e6326e73fc6f808579661f928b76973bbdc7fc866ae32",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "12173428759ab434416a5862c95c543e4d5f6ac1c54c890bf37cf22f9a0c9aca",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7q3a5001ongjur495me3b": [
    {
      "stateSha256": "6b46e80efaf86a86f1b0d78f46e6e47df924f3635513b0978d2f6b13b41dd166",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "7f3d730681fc18524b8641a06df35b669dbdccb069e0a0ad2965e48667c71829",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7q5fw002angjuebao1obt": [
    {
      "stateSha256": "518957591ecf86e8f4d1d01bb7a82a68a099dc8191023ff4408c68be6a7dd772",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T01:31:26.987Z",
      "evidence": "verbal, reported by the owner: super admin reported in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved all 25 groups of Spain manifest 8846503c21bc0b851ad82ede5b936fe0a61b1b789d90222ba53c4a0aeb2fbc65; owner super-admin approval also given. No written record."
    },
    {
      "stateSha256": "15477b5231f7de0595a9b3ca7e1ac489947f5b8b7123e490da39f9462217445f",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "52b51bdd7800c78939828ee6a28d6cbf93ad6fd8f1f9546eb94c8d6d643c3d28",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7pwwv0000ngjuwvmiacw9": [
    {
      "stateSha256": "5f3961ca76cfc7afff7484264f711a9b66c6a20bf735863aed0b0654a1590be4",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "2af4c9706d065d09e41bf01e05724ba83df4e1ccaeab5f67a06549a9872d2c05",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    },
    {
      "stateSha256": "580196de7c3788088339bd291e35497a87b70a16e300ea5711eff856a952cf84",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    },
    {
      "stateSha256": "a55e035adf23b15a6caa95e16a240e6b2b27ee1574a37751597c69810b604fcf",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T16:39:47.837Z",
      "evidence": "verbal, reported by the owner: super admin chose in chat on 2026-09-14 \"Dra. Ocampo, approved now\" for the phase-5 copy (Dr. Leandro Wang services and profile without specialist claims, owner confirmed he is a General Medicine Physician; EN GP hero and CS skin same-day/no-waiting promises removed) applied as phase-5 manifest 76e364744cac04a366f5d512bc468f3904f4a32bb9b0f967297dabcb50fb4649. No written record."
    }
  ],
  "doctor:cmrdpwar1001n01ruwhfioqs6": [
    {
      "stateSha256": "9f9cdc7e79680be83cb01ac3f054b8802f32d607233d5976f5de8c680d13ca0d",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    }
  ],
  "service:cmre7q4co001yngjucbez1gc0": [
    {
      "stateSha256": "fbd758fb4c2cbf70ce686defedd6909f3d78d77a79222e229338e31f2e544b59",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "cce6c0ca745ea87b4e93dd4eb43688c0c7241d413e668ea2494b502cff20229b",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    },
    {
      "stateSha256": "21ea85bb586c5fff9d1a9983420be7cfb8e4905baab4605760460f71b67bdc3d",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T16:39:47.837Z",
      "evidence": "verbal, reported by the owner: super admin chose in chat on 2026-09-14 \"Dra. Ocampo, approved now\" for the phase-5 copy (Dr. Leandro Wang services and profile without specialist claims, owner confirmed he is a General Medicine Physician; EN GP hero and CS skin same-day/no-waiting promises removed) applied as phase-5 manifest 76e364744cac04a366f5d512bc468f3904f4a32bb9b0f967297dabcb50fb4649. No written record."
    }
  ],
  "service:cmre7pxza000angjubr3s2h65": [
    {
      "stateSha256": "49cde8248e26520fa54f11eec5192a2d93e3358a6e3506861c0faeb5aa87ae60",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "6fe08e7d5d67c4c6bd73a54a2e5e56aa245c42e52aba1cfe6c1ad8e099146a0a",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    },
    {
      "stateSha256": "6107a14467f5432e2b7a1e10a27f1d03c883da4657465e27c840e465343c5a81",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T15:02:33.821Z",
      "evidence": "verbal, reported by the owner: super admin stated in chat on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the sick-leave draft copy (seo/spain/sick-leave-wording-review-2026-09-14.md §3) applied as phase-4 manifest 65ffc902a0326c9f2a76a3204add6e6e34a78e428a91d269aa3b35de5530a809; owner chose to include the legal-sensitive passages without separate legal review. No written record."
    },
    {
      "stateSha256": "22789979324e88ade82f8809685fef230bb5a54ed4ea5ad15a36def6110d4d96",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T19:29:31.514Z",
      "evidence": "reported by the owner: super admin stated in chat on 2026-09-15 that each country's clinical director reviews and approves service and doctor descriptions, and instructed \"trim them and apply\"; Spain clinical director Dra. María Fernanda Ocampo Mora. Applies to the SEO description trims (<=155 characters, six locales) in phase-7 manifest 5b189c761de1245bc5fc3a1c7dee9db468aeb294659cab0342fd4bebd389245f. No written record."
    }
  ],
  "service:cmre7q6hn002lngju3chey2ai": [
    {
      "stateSha256": "4e7327b4a353f2b16cce07be19fde453cff76d2ad4e6b7adf66336d4ff05da8f",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T03:46:07.151Z",
      "evidence": "verbal, reported by the owner: super admin instructed on 2026-09-14 to publish Luz Marina Zuluaga Ríos's drafted groups (hold overridden despite CGCOM 'ALTA sin ejercicio') and to correct Tomás Ruiz Palacios's registration typo MUO5691 to MU05691 (COP Murcia record); covered by the owner-reported approval of Dra. María Fernanda Ocampo Mora of all Spain drafts. Phase-2 manifest 3cfecca07d21ac2c93e11b14531c82126f1eb1a8e1631445e92754577e5926ea. No written record."
    },
    {
      "stateSha256": "fd6acc786827379107eab2d7e78c61abe40d423f5d6e2830913fc6ee7cb93eab",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7pz0n000kngjuib862zxl": [
    {
      "stateSha256": "e769187e17f67a9ab34e37261bdd1e1d15e2c4684ab1b3a9cacbdac438f9c503",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7q038000ungjuxs5rkyxy": [
    {
      "stateSha256": "a31504d54a725e0827e3f34c3bf88c29a160628547b48d6424f612d2477a2f83",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7qcvw004engju2es5log3": [
    {
      "stateSha256": "7a5cdf01c134ad06f0dcaaf7f30fd909898fa9c872735af6413fbe2125b82ca7",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7q7k0002vngju6v73lt8h": [
    {
      "stateSha256": "6980d69d6233f69011f1562e24a75680d1792288fe200d520c9244cf0e8aa3b5",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    },
    {
      "stateSha256": "f9ae2efe37276f42a08507af82f434f5986b52c00c66366cc23a58144e993eaf",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T19:29:31.514Z",
      "evidence": "reported by the owner: super admin stated in chat on 2026-09-15 that each country's clinical director reviews and approves service and doctor descriptions, and instructed \"trim them and apply\"; Spain clinical director Dra. María Fernanda Ocampo Mora. Applies to the SEO description trims (<=155 characters, six locales) in phase-7 manifest 5b189c761de1245bc5fc3a1c7dee9db468aeb294659cab0342fd4bebd389245f. No written record."
    }
  ],
  "service:cmre7q27m001dngju2395w6dl": [
    {
      "stateSha256": "afbdb0f74b1c74dff067e6be9deb6fdca198b9fc3318b2dc98aeb4b4b5b80306",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7q1550013ngjujfvwl58k": [
    {
      "stateSha256": "7338ae3399f5d55421041d517b5994c552481fa25dc6b59d8ebb022d3e00676b",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ],
  "service:cmre7qh33005ongju25lilrfq": [
    {
      "stateSha256": "e648ceac6e00ae8a192372d41b095181570f7d19f69285ad91ae7e5dbd471fc7",
      "reviewerDoctorId": "cmrdpted5001901ru0wk0ncnd",
      "reviewedAt": "2026-09-14T05:08:32.368Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dra. María Fernanda Ocampo Mora approved the service summaries and name corrections in phase-3 manifest 93272d41675b88bc135294d5c65bc84f3a7c78a08b11ad21d2c79e5579d35884. No written record."
    }
  ]
};
// Review-age policy chosen by the owner on 2026-09-14.
export const BRAZIL_REVIEW_POLICY: { maxAgeDays: number | null } = { maxAgeDays: 365 };
export const APPROVED_BRAZIL_STATES: Record<string, SpainApproval[]> = {
  "service:cmrf53m7j0000mwjud779ur6k": [
    {
      "stateSha256": "57a1b0a76a0bfc918d4eecb6769cac8aa648482c3c0367d6e4fac24f50cc7c84",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "b8716bf0dd3afadc7ae7062bef0e7c5a1d0b98ef5113142b0608d32c0d5a9193",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53n1n000amwjufjd0mt0z": [
    {
      "stateSha256": "7ecf290c6d999ccca2fb9551af4f0dcd2f47191feb950f640b1630c9c137361e",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "774682585b51b2169e1263d1cc2f2588dfd37b6b9429d4be7a22f63dceedce5f",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53rx9001tmwjuheylxq9n": [
    {
      "stateSha256": "c776ef12a65e17894d101c53ab04b5c2d9d40fbd90e2022f2b3c3827f86bf4e5",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "370b70c53c2760a74da6017b6ff1505426ec9dfb43781e43c0707d3db3badf26",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53tja002amwju4a3yubyx": [
    {
      "stateSha256": "db1a62428109be0e272aa349394c5f57aa222f10c004ccb2cd4c1a6248ff8a09",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "8d8b746748695a505c2d8c52f2ada0b573ce49a2730a77f5656e41e27b7c9ede",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53xm1003kmwjuwuaixgfg": [
    {
      "stateSha256": "6cef1c826c133f9690f6dd821d0a91e4bbd789952488ec10a240926205131786",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "193c077a3ecc111ec7f3d0c6b0d50d06bf42e7b432459d850f23ec5e84e5739b",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53uch002jmwjuj0cs6n1f": [
    {
      "stateSha256": "c9736374617876f8c7680448828bc9510397adc8837af516bf9843b9a4959d6e",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "03b607172238da592eca10b40f7ace2e8491be79e1444175282f7187481e0ea4",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53vzd0032mwjuyq6qq26r": [
    {
      "stateSha256": "9986d82ef3707789835ec964b21ffe0c93a1833e49a655a525302a6bb05fbdac",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "b20f2685ebde7753da03ffdadcbe0563de8ffd98b579e753307188f4c1c5c525",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53yfs003tmwju9a9kb6n6": [
    {
      "stateSha256": "cb4ec9f22436bb40775cb26255c5c2f35885bbf1329182d3b48f7fcf32484349",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "2ea14b8ebebf454f04b08a6c37dfeffec888a8bfaba2472baedd1220960c9229",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53nux000jmwjuzhearx4t": [
    {
      "stateSha256": "1e7b78c863536a1d44a9f3d314d01123c0502e60bdeb8ba1ea4e1532c057a299",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "7cca4074f9fae9bb6f5f5c0e5d6cbfe9f4dfc49007e5295d578e13f5d95d897f",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53v60002tmwjukdoh6mvz": [
    {
      "stateSha256": "0fd3a9c260ed97fbfcd92ac6ab0ccb40a0082245bea6af05a14c58710d0a9b3f",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "5988aaa1b49eed722c675b9a6eca00b890318fb29057cddb375a5f7f064881a0",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53phb0012mwjugm5jp41p": [
    {
      "stateSha256": "e822a4b21feea9a5b9917619de8f841c45811738e37c1678887a33c694fbb590",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "10d74947e7317e6225f2b44831507f7b5c3bd9dca901a228f362e8047e3744c0",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53r40001kmwjug6ly0nla": [
    {
      "stateSha256": "950e7c53e87afa7a5dd3737a6fac0474d27cc0d85fcc07169e59d46f2bd5b7e6",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "40a8f8530028096e75f0662de5d0e2b7d51aa692e01a1fcc398e03955d3d2e0c",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53qak001bmwju7ufg2pb5": [
    {
      "stateSha256": "b8be6dedbe54e92a61181712ad3f81c73b885c24850db6b83ad1613c8a62a8c9",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "650b81790b1939b7891a9622f0fb10f2bf33f1791cbede9d5d9e7d9b828bfca4",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53z930043mwjumjntd7c9": [
    {
      "stateSha256": "28bb1c27b2f8528c493a85c49f2e1f8dc461a3597b547dd76366bfa017627ee1",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "b8a22d1d50bc43ff1544bd37bfda11e69287cb9872dae78418f7b7a2fd2ef56d",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53onw000smwjugx2rt50j": [
    {
      "stateSha256": "16bb476f256a1b4ac65dc21c35d0e185d0f3788646b732d4738daf080529b996",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "892b76953cb422b678608312caf4c4539290cedb6f4b6b075aa6ee2b48cdddaa",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf54032004dmwjuodh62mcc": [
    {
      "stateSha256": "52364baead8a430b370e1c994874030343b22c45d7af24fba7f72d2083edcea0",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "2535523cbf2d04c757159ef5a022c6c4fd7a11d8ec75f782eeeace6692a08854",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53sq40021mwjuiu3pf1z7": [
    {
      "stateSha256": "4835eb2b47b70564ae535c9c9bf88fbe8d8b6bed17877704d8e1b634c624dfb5",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "b6541685668845e856457cbc113b8603704038ad12a26fddb4a96cb81b4d0b31",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    }
  ],
  "service:cmrf53wsr003bmwjuz15y0o32": [
    {
      "stateSha256": "4b9f9bc9e25f8b356670b087ac0e9cf7f4ff975addca3782cc0cf639aa567328",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T05:08:32.516Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-14 that Dr. Renato Sarmento approved the service summaries in phase-3 manifest 06e665c2c95c4af79516280794b6cc8a50570146fdf3a4222d8b20921761e441. No written record."
    },
    {
      "stateSha256": "30f1b24f2e72cedc9b26edc3c8b651471da3c12f0ac4ceb603e7141a4e2068cc",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    },
    {
      "stateSha256": "1b459f151560032707dea2a5c33914ce2cb4abf37ca4b5313bffe376c6bff8fb",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T23:55:35.761Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-15 that Dr. Renato Sarmento verbally approved the solicitacao-exames-online summary (PT/EN/ES) in phase-5 manifest e48b9296c20fdb634b70a81ea497244c9843308c5beb9dc5ddce6bf4f59654ae, removing \"valid at laboratories throughout Brazil\". No written record."
    }
  ],
  "doctor:cmqyzr0fb000o01lu9deh6mf5": [
    {
      "stateSha256": "599ea8de89fda337ee12712f91ec2544cf5bea2a8dae71153041807ebc19ab36",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-14T21:24:30.383Z",
      "evidence": "Owner confirmation 2026-09-15 in this session (\"I approve\"): reviews of the Brazil packet (57 page drafts, 19 groups, reviewed manifest c7c575373b597efffb66b8e24aa7775fb4567bc98b3d381119df8e320d707640) were done by Dr. Renato Sarmento and Dr tiago; re-planned unchanged as phase-4 manifest f87bf107c934bd2f0faee36d0c589777bf94c663dd66b7b1456c82351ba33880 after phase 3. No written record."
    },
    {
      "stateSha256": "3ed285a689a868bc0e6d06374315c1afa169867d3a077c2441dfdfcafae7a8b3",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-15T02:01:51.959Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-15 that Dr. Renato Sarmento verbally approved the phase-6 deletions in manifest 57e67109039339f4bd2f44f34bdb1bad1a0a4010002be6f21e675f0207010285 (superlatives \"um dos profissionais mais completos\" / \"um dos poucos médicos de família\" and EN/ES equivalents in bio and FAQ; \"Consulta no mesmo dia.\" in the stored PT SEO description). No written record."
    },
    {
      "stateSha256": "aa6576593d3adc1900cf2e0cb3aa06fc32545a1af9322fa8e55afb04146f72f3",
      "reviewerDoctorId": "cmqyzr0fb000o01lu9deh6mf5",
      "reviewedAt": "2026-09-15T04:51:51.115Z",
      "evidence": "verbal, reported by the owner: super admin confirmed on 2026-09-15 that Dr. Renato Sarmento approves the phase-7 deletion in manifest c1bea18fbaa035de92eed709637fd497e8a10494cd2ff0c3b89cfaf063163fed (\"um dos formatos mais inovadores de telemedicina no SUS\" and EN/ES equivalents in the profile FAQ). No written record."
    }
  ]
};
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
