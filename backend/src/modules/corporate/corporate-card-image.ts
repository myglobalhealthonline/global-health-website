import type { LocaleCode } from "@prisma/client";
import {
  cardStatusLabel,
  countryDisplayName,
  type CardCopy,
  type MembershipCardContent,
} from "../memberships/membership-card-content.js";
import { renderMembershipCardPng } from "../memberships/membership-card-image.js";

/**
 * The corporate benefit card as a downloadable PNG.
 *
 * Deliberately NOT a second renderer: it maps the corporate row onto
 * `MembershipCardContent` and hands it to the private-membership card renderer,
 * so both cards stay one design and one localisation surface. A corporate card
 * that drifted from the membership one would be a visible inconsistency in the
 * thing members actually show at a desk.
 *
 * The mapping is the only interesting part:
 *   levelName        ← the company name (a corporate card's "tier" is the
 *                      employer, and the face already prints this line)
 *   memberType       ← EMPLOYEE → PRIMARY, BENEFICIARY → DEPENDENT
 *   benefitsByCountry← the plan's percentage rules, already localised by the
 *                      caller, under the company's own market
 */
export type CorporateCardInput = {
  cardNumber: string;
  holderName: string;
  email: string;
  firstName: string;
  companyName: string;
  planName: string;
  status: string;
  /** Already-localised, e.g. "Valid through 12 / 2027". */
  validThrough: string;
  countryCode: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
  /** Already-localised benefit sentences, e.g. "20% off GP consultations". */
  benefitLines: string[];
  locale: LocaleCode;
};

export function buildCorporateCardContent(
  input: CorporateCardInput,
): MembershipCardContent {
  const countryCode = input.countryCode.toUpperCase();
  return {
    // No enrollment backs a corporate card; the card number is its identity.
    enrollmentId: input.cardNumber,
    membershipId: input.cardNumber,
    holderName: input.holderName,
    email: input.email,
    accountEmail: null,
    // Corporate cards are not a membership programme, so there is no plan
    // translation to carry an opening note.
    intro: null,
    firstName: input.firstName,
    planName: input.planName,
    levelName: input.companyName,
    status: input.status,
    validThrough: input.validThrough,
    countryCodes: [countryCode],
    memberType: input.memberType === "EMPLOYEE" ? "PRIMARY" : "DEPENDENT",
    // Corporate has no shared-allowance pool — every benefit is a percentage
    // rule applied at checkout, so the §43 shared wording never applies.
    sharesPool: false,
    primaryMembershipId: null,
    palette: null,
    benefitsByCountry: input.benefitLines.length
      ? [
          {
            countryCode,
            countryName: countryDisplayName(countryCode, input.locale),
            lines: input.benefitLines.map((text) => ({ text, sharedPool: false })),
          },
        ]
      : [],
    locale: input.locale,
  };
}

export async function renderCorporateCardPng(
  input: CorporateCardInput,
  copy: CardCopy,
): Promise<Buffer> {
  const content = buildCorporateCardContent(input);
  return renderMembershipCardPng(content, copy, cardStatusLabel(content, copy));
}

/** `corporate-card-GHC-ABC123DEF4.png` — safe on every filesystem. */
export function corporateCardFilename(cardNumber: string): string {
  return `corporate-card-${cardNumber.replace(/[^A-Za-z0-9._-]/g, "-")}.png`;
}
